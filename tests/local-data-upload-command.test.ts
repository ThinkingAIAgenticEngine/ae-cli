import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RuntimeContext } from '../src/framework/types.js';
import { CliValidationError, LocalDataUploadError } from '../src/core/errors.js';
import { sha256File } from '../src/commands/data-integration/local-data/input.js';
import {
  assembleSyncJsonBody,
  resolveSyncJsonEndpoint,
  dataIntegrationUpload,
} from '../src/commands/data-integration/local-data/upload.js';
import type { LocalDataManifest } from '../src/commands/data-integration/local-data/types.js';

const root = mkdtempSync(join(tmpdir(), 'ae-local-data-upload-command-'));
try {
  const ueFile = join(root, 'valid.ue.jsonl');
  const lines = Array.from({ length: 5 }, (_, index) =>
    `{"#type":"track","#time":"2026-08-10 10:00:0${index}.000","#account_id":"u-${index}","#event_name":"open","big":922337203685477580${index}}`);
  writeFileSync(ueFile, `${lines.join('\n')}\n`, { mode: 0o600 });
  const manifestPath = join(root, 'manifest.json');
  const manifest: LocalDataManifest = {
    version: 'ae-local-data-manifest/v1',
    run_id: 'test',
    created_at: new Date().toISOString(),
    status: 'ready',
    source: { sha256: 'a'.repeat(64), format: 'jsonl', data_set: '$', size_bytes: 1 },
    output: {
      valid_file: 'valid.ue.jsonl',
      valid_sha256: await sha256File(ueFile),
      invalid_file: 'invalid.rows.jsonl',
      valid_records: 5,
      invalid_records: 0,
      valid_bytes: 1,
      record_types: { track: 5, user_set: 0 },
    },
    blocked_reasons: [],
  };
  writeFileSync(manifestPath, JSON.stringify(manifest), { mode: 0o600 });

  assert.equal(dataIntegrationUpload.risk, 'write');
  assert.equal(dataIntegrationUpload.usesAeHost, false);
  for (const flag of ['ue-file', 'manifest', 'endpoint', 'appid']) {
    assert.equal(dataIntegrationUpload.flags.find((item) => item.name === flag)?.sensitive, true);
  }
  assert.equal(resolveSyncJsonEndpoint('https://receiver.example.test/sync_json'), 'https://receiver.example.test/sync_json');
  assert.throws(() => resolveSyncJsonEndpoint('https://receiver.example.test/sync_json?token=x'), CliValidationError);
  assert.throws(() => resolveSyncJsonEndpoint('https://receiver.example.test/other'), CliValidationError);

  const lossless = assembleSyncJsonBody([lines[0]], 'app-secret');
  assert.match(lossless, /9223372036854775800/);
  assert.match(lossless, /"appid":"app-secret"/);
  assert.match(lossless, /"debug":0/);
  assert.match(assembleSyncJsonBody([lines[0]], 'app-secret', true), /"debug":1/);

  const calls: string[] = [];
  const options: Record<string, unknown> = {
    'ue-file': ueFile,
    manifest: manifestPath,
    endpoint: 'https://receiver-secret.example.test/sync_json',
    appid: 'very-secret-appid',
    'batch-size': 2,
    'resume-from': 0,
    'allow-clean-subset': false,
  };
  const ctx = createContext(options, async (_endpoint, body) => {
    calls.push(body);
    return { code: 0, http_status: 200, request_bytes: Buffer.byteLength(body), response_bytes: 10 };
  });
  const dryRun = await dataIntegrationUpload.dryRun!(ctx) as Record<string, unknown>;
  assert.equal(dryRun.record_count, 5);
  assert.equal(dryRun.batch_count, 3);
  assert.equal(dryRun.transport_retries, 3);
  assert.equal(dryRun.split_uncertain_batches, false);
  assert.equal(dryRun.compression, 'none');
  assert.doesNotMatch(JSON.stringify(dryRun), /receiver-secret|very-secret-appid|valid\.ue\.jsonl/);
  const result = await dataIntegrationUpload.execute(ctx) as Record<string, unknown>;
  assert.equal(result.status, 'receiver_accepted');
  assert.equal(result.persistence_verified, false);
  assert.equal(calls.length, 3);
  assert.match(calls[0], /u-0/);
  assert.match(calls[1], /u-2/);
  assert.match(calls[2], /u-4/);

  const retryDryRunCtx = createContext({ ...options, retry: true, compress: 'gzip' }, async () => ({ code: 0 }));
  const retryDryRun = await dataIntegrationUpload.dryRun!(retryDryRunCtx) as Record<string, unknown>;
  assert.equal(retryDryRun.split_uncertain_batches, true);
  assert.equal(retryDryRun.transport_retries, 3);
  assert.equal(retryDryRun.compression, 'gzip');

  const debugDryRunCtx = createContext({ ...options, debug: true }, async () => ({ code: 0 }));
  const debugDryRun = await dataIntegrationUpload.dryRun!(debugDryRunCtx) as Record<string, unknown>;
  assert.equal(debugDryRun.debug, true);

  const cliHome = join(root, 'cli-home');
  mkdirSync(cliHome);
  const cliDryRun = spawnSync(process.execPath, [
    '--import', 'tsx', 'src/index.ts', '--no-update-check', '--dry-run',
    'data-integration', 'upload',
    '--ue-file', ueFile,
    '--manifest', manifestPath,
    '--endpoint', 'https://runner-secret.example.test/sync_json',
    '--appid', 'runner-secret-appid',
    '--batch-size', '2',
  ], { cwd: process.cwd(), env: { ...process.env, HOME: cliHome }, encoding: 'utf8' });
  assert.equal(cliDryRun.status, 0, cliDryRun.stderr);
  assert.doesNotMatch(cliDryRun.stdout, /runner-secret\.example|runner-secret-appid|valid\.ue\.jsonl/);
  const cliLogs = readdirSync(join(cliHome, '.ae-cli', 'log'))
    .map((name) => readFileSync(join(cliHome, '.ae-cli', 'log', name), 'utf8'))
    .join('\n');
  assert.doesNotMatch(cliLogs, /runner-secret\.example|runner-secret-appid|valid\.ue\.jsonl/);
  assert.match(cliLogs, /--endpoint=\*\*\*/);
  assert.match(cliLogs, /--appid=\*\*\*/);

  calls.length = 0;
  const resumeCtx = createContext({ ...options, 'resume-from': 2 }, async (_endpoint, body) => {
    calls.push(body);
    return { code: 0, http_status: 200, request_bytes: body.length, response_bytes: 1 };
  });
  const resumed = await dataIntegrationUpload.execute(resumeCtx) as Record<string, unknown>;
  assert.equal(resumed.submitted_records, 3);
  assert.equal(calls.length, 2);
  assert.doesNotMatch(calls[0], /u-0|u-1/);

  // --retry/--compress are forwarded to the transport as a single options object.
  let capturedOptions: Record<string, unknown> | undefined;
  const passthroughCtx = createContext({ ...options, retry: true, compress: 'gzip' }, async (_endpoint, _body, transportOptions) => {
    capturedOptions = transportOptions;
    return { code: 0, http_status: 200, request_bytes: 1, response_bytes: 1 };
  });
  await dataIntegrationUpload.execute(passthroughCtx);
  assert.deepEqual(capturedOptions, { retries: 3, retryDelayMs: 2000, compress: 'gzip' });

  // Transport retries are always 3 (2000ms backoff), even without --retry/--compress.
  let defaultOptions: Record<string, unknown> | undefined;
  const defaultCtx = createContext(options, async (_endpoint, _body, transportOptions) => {
    defaultOptions = transportOptions;
    return { code: 0, http_status: 200, request_bytes: 1, response_bytes: 1 };
  });
  await dataIntegrationUpload.execute(defaultCtx);
  assert.deepEqual(defaultOptions, { retries: 3, retryDelayMs: 2000, compress: undefined });

  // --debug marks every sync_json record debug=1 in the request body.
  let debugBody: string | undefined;
  const debugCtx = createContext({ ...options, debug: true }, async (_endpoint, body) => {
    debugBody = body;
    return { code: 0, http_status: 200, request_bytes: body.length, response_bytes: 1 };
  });
  await dataIntegrationUpload.execute(debugCtx);
  assert.match(debugBody!, /"debug":1/);
  assert.doesNotMatch(debugBody!, /"debug":0/);

  // An uncertain first batch is split into single-record retries; still-failing records are
  // reported individually instead of aborting the whole upload.
  let uploadCall = 0;
  const splitCtx = createContext({ ...options, retry: true }, async () => {
    uploadCall += 1;
    if (uploadCall === 1 || uploadCall === 3) {
      throw new LocalDataUploadError('Delivery state is unknown.', {
        code: 'LOCAL_DATA_UPLOAD_TIMEOUT',
        meta: { delivery_state: 'unknown', retry_attempted: false },
      });
    }
    return { code: 0, http_status: 200, request_bytes: 1, response_bytes: 1 };
  });
  const splitResult = await dataIntegrationUpload.execute(splitCtx) as Record<string, unknown>;
  assert.equal(splitResult.status, 'partially_delivered');
  assert.equal(splitResult.submitted_records, 4);
  assert.equal(splitResult.submitted_batches, 3);
  assert.deepEqual(splitResult.failed_records, [1]);
  assert.equal(splitResult.failed_count, 1);
  assert.equal(splitResult.retry_attempted, true);

  manifest.status = 'blocked';
  manifest.output.invalid_records = 1;
  manifest.blocked_reasons = ['Some source rows failed UE validation.'];
  writeFileSync(manifestPath, JSON.stringify(manifest));
  const blockedCtx = createContext(options, async () => ({ code: 0 }));
  await assert.rejects(
    dataIntegrationUpload.execute(blockedCtx),
    (error: unknown) => error instanceof CliValidationError
      && error.code === 'LOCAL_DATA_CLEAN_SUBSET_CONFIRMATION_REQUIRED',
  );
  const allowedCtx = createContext({ ...options, 'allow-clean-subset': true }, async (_endpoint, body) => ({
    code: 0, http_status: 200, request_bytes: body.length, response_bytes: 1,
  }));
  assert.equal((await dataIntegrationUpload.execute(allowedCtx) as Record<string, unknown>).submitted_records, 5);

  let invocation = 0;
  const unknownCtx = createContext({ ...options, 'allow-clean-subset': true }, async () => {
    invocation += 1;
    if (invocation === 2) {
      throw new LocalDataUploadError('Delivery state is unknown.', {
        code: 'LOCAL_DATA_UPLOAD_TIMEOUT',
        meta: { delivery_state: 'unknown', retry_attempted: false },
      });
    }
    return { code: 0, http_status: 200, request_bytes: 1, response_bytes: 1 };
  });
  await assert.rejects(dataIntegrationUpload.execute(unknownCtx), (error: unknown) => {
    assert(error instanceof LocalDataUploadError);
    assert.equal(error.meta?.completed_records, 2);
    assert.equal(error.meta?.uncertain_batch_start, 2);
    assert.equal(error.meta?.resume_from_after_verification, 2);
    return true;
  });
  assert.equal(invocation, 2, 'unknown delivery must stop later batches');

  process.stdout.write('local data upload command tests: passed\n');
} finally {
  rmSync(root, { recursive: true, force: true });
}

function createContext(
  values: Record<string, unknown>,
  upload: (endpoint: string, body: string, options?: Record<string, unknown>) => Promise<any>,
): RuntimeContext {
  return {
    str: (name) => String(values[name] ?? ''),
    num: (name) => Number(values[name] ?? 0),
    optionalNum: (name) => values[name] === undefined ? undefined : Number(values[name]),
    bool: (name) => Boolean(values[name]),
    json: (name) => values[name],
    api: async () => undefined,
    communityReport: async () => undefined,
    localDataUpload: upload,
    querySql: async () => undefined,
    queryReportData: async () => undefined,
    token: async () => '',
    host: () => '',
    mcpUrl: () => undefined,
    service: () => 'tracking',
    out: async () => undefined,
  };
}
