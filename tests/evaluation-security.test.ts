import assert from 'node:assert/strict';
import { runCommand } from '../src/framework/runner.ts';
import { logger } from '../src/core/logger.ts';
import { EvalApiError, evalRequest } from '../src/core/eval-client.ts';
import { requestSandboxEvaluationSession } from '../src/core/eval-session.ts';
import { createCredential } from '../src/commands/evaluation/create-credential.ts';
import { rotateCredential } from '../src/commands/evaluation/rotate-credential.ts';
import { enableCredential } from '../src/commands/evaluation/enable-credential.ts';
import { disableCredential } from '../src/commands/evaluation/disable-credential.ts';
import { createDatasetCase } from '../src/commands/evaluation/create-dataset-case.ts';
import { updateDatasetCase } from '../src/commands/evaluation/update-dataset-case.ts';
import { batchCreateDatasetCases } from '../src/commands/evaluation/batch-create-dataset-cases.ts';
import { importAiMonitorTraces } from '../src/commands/evaluation/import-ai-monitor-traces.ts';
import { saveAiMonitorConnection } from '../src/commands/evaluation/save-ai-monitor-connection.ts';


const original = {
  fetch: globalThis.fetch, exit: process.exit,
  stdout: process.stdout.write, stderr: process.stderr.write,
  info: logger.info, error: logger.error,
  stdinTTY: Object.getOwnPropertyDescriptor(process.stdin, 'isTTY'),
  token: process.env.AE_EVAL_ACCESS_TOKEN, base: process.env.AE_EVAL_BASE_URL,
};
const session = 'synthetic-evaluation-session';
const secret = 'synthetic-credential-"quoted"/value';
const dataToken = 'synthetic-data-token';
const reportSource = 'synthetic-report-source';
const privateNote = 'private-upstream-diagnostic';
const logs: string[] = [];
let stdout = '';
let stderr = '';
let requests = 0;
const exit = Symbol('exit');
const options = { host: 'https://ae.example.com', format: 'json' as const, dryRun: false, validate: false, yes: false };

async function expectExit(operation: () => Promise<void>) {
  await assert.rejects(operation, (error) => error === exit);
}
function assertProtectedOutput() {
  assert.equal(stdout, '');
  const output = JSON.parse(stderr);
  assert.equal(output.error.code, 'VALIDATION_ERROR');
  assert.match(output.error.message, /\[REDACTED\]/);
  for (const value of [session, secret, dataToken, reportSource]) {
    for (const form of [value, JSON.stringify(value).slice(1, -1), encodeURIComponent(value)]) {
      assert.ok(!JSON.stringify(output).includes(form), 'error output must not expose a credential');
      assert.ok(!logs.join('\n').includes(form), 'logs must not expose a credential');
    }
  }
  assert.ok(!logs.join('\n').includes(privateNote), 'remote error text must not be persisted');
}

try {
  process.env.AE_EVAL_ACCESS_TOKEN = session;
  delete process.env.AE_EVAL_BASE_URL;
  Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: false });
  process.exit = (() => { throw exit; }) as typeof process.exit;
  process.stdout.write = ((chunk: any) => { stdout += String(chunk); return true; }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: any) => { stderr += String(chunk); return true; }) as typeof process.stderr.write;
  logger.info = (message) => { logs.push(message); };
  logger.error = (message) => { logs.push(message); };
  globalThis.fetch = async () => { requests++; return new Response('{}'); };

  // Actual runner confirmation, including zero network calls without explicit bypass.
  for (const command of [enableCredential, disableCredential]) {
    stdout = ''; stderr = '';
    await expectExit(() => runCommand(command, { id: 'credential-1', lockVersion: 0 }, options));
    assert.equal(JSON.parse(stderr).error.code, 'CONFIRMATION_REQUIRED');
    assert.equal(requests, 0);
  }
  for (const command of [enableCredential, disableCredential]) {
    await runCommand(command, { id: 'credential-1', lockVersion: 0 }, { ...options, yes: true });
  }
  assert.equal(requests, 2, 'authorized legacy commands retain their request behavior');

  // Single-case content remains usable in requests/previews, but never reaches command logs.
  const caseMarker = 'synthetic-private-case-input';
  const expectedMarker = 'synthetic-private-expected-output';
  for (const command of [createDatasetCase, updateDatasetCase]) {
    for (const dryRun of [false, true]) {
      stdout = ''; stderr = ''; logs.length = 0;
      let submittedBody: any;
      globalThis.fetch = async (_url, init) => {
        requests++;
        submittedBody = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ id: 'case-1' }));
      };
      const before = requests;
      await runCommand(command, {
        id: 'dataset-1', caseId: 'case-1', lockVersion: 0,
        data: JSON.stringify({ input: caseMarker, expected: expectedMarker }),
      }, { ...options, dryRun });
      assert.equal(stderr, '');
      assert.equal(requests - before, dryRun ? 0 : 1);
      const body = dryRun ? JSON.parse(stdout).data.body : submittedBody;
      assert.deepEqual(body.data, { input: caseMarker, expected: expectedMarker });
      assert.ok(!logs.join('\n').includes(caseMarker));
      assert.ok(!logs.join('\n').includes(expectedMarker));
    }
  }

  // Parsing failures respect the same sensitivity as command logging, before any request.
  const invalidMarker = 'synthetic-sensitive-invalid-json';
  for (const [command, flag, flags] of [
    [createDatasetCase, 'data', { id: 'dataset-1' }],
    [updateDatasetCase, 'data', { id: 'dataset-1', caseId: 'case-1', lockVersion: 0 }],
    [batchCreateDatasetCases, 'cases-json', { id: 'dataset-1' }],
    [importAiMonitorTraces, 'selection-json', { name: 'test' }],
    [saveAiMonitorConnection, 'session-claims-json', { baseUrl: 'https://monitor.example.com', credentialId: 'credential-1' }],
  ] as const) {
    for (const dryRun of [false, true]) {
      stdout = ''; stderr = ''; logs.length = 0;
      const before = requests;
      const optionName = flag.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      await expectExit(() => runCommand(command, { ...flags, [optionName]: `{"private":"${invalidMarker}",` }, { ...options, dryRun }));
      assert.equal(requests, before);
      assert.equal(stdout, '');
      const error = JSON.parse(stderr).error;
      assert.equal(error.type, 'validation');
      assert.ok(error.message.includes(`--${flag}`));
      assert.match(error.hint, /valid JSON/);
      assert.ok(!stderr.includes(invalidMarker));
      assert.ok(!logs.join('\n').includes(invalidMarker));
    }
  }

  // A server echo must not undo sensitive flag or dry-run redaction.
  globalThis.fetch = async (_url, init) => {
    const submitted = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ error: {
      code: 'VALIDATION_ERROR',
      message: `${privateNote} ${submitted.secret} ${JSON.stringify(submitted.secret).slice(1, -1)} ${encodeURIComponent(submitted.secret)} ${session}`,
      details: [privateNote, submitted.data_token, submitted.report_source, session].filter(Boolean).join(' '),
    } }), { status: 422 });
  };
  for (const [command, flags] of [
    [createCredential, { name: 'test', type: 'AI_MONITOR_SESSION', secret, dataToken, reportSource }],
    [rotateCredential, { id: 'credential-1', lockVersion: 0, secret }],
  ] as const) {
    stdout = ''; stderr = ''; logs.length = 0;
    await expectExit(() => runCommand(command, flags, options));
    assertProtectedOutput();
  }

  // Structured details are redacted; malformed remote codes use a stable HTTP fallback.
  await assert.rejects(evalRequest({
    baseUrl: options.host, method: 'POST', path: '/agenteval/api/v1/credentials',
    headers: { Authorization: `Bearer ${session}` }, body: { secret },
    fetchImpl: async () => new Response(JSON.stringify({ error: {
      message: secret, code: `ERROR_${session}`, details: { [secret]: [{ nested: encodeURIComponent(secret) }] },
    } }), { status: 400 }),
  }), (error: unknown) => {
    assert.ok(error instanceof EvalApiError);
    assert.equal(error.httpStatus, 400);
    assert.equal(error.code, 'EVAL_API_HTTP_400');
    for (const value of [session, secret, encodeURIComponent(secret)]) assert.ok(!JSON.stringify(error).includes(value));
    return true;
  });

  // A valid credential value must not corrupt a matching substring in a business code.
  await assert.rejects(evalRequest({
    baseUrl: options.host, method: 'POST', path: '/agenteval/api/v1/credentials/credential-1/rotate',
    headers: { Authorization: `Bearer ${session}` }, body: { secret: 'VERSION', lock_version: 0 },
    fetchImpl: async () => new Response(JSON.stringify({ error: {
      code: 'CREDENTIAL_VERSION_CONFLICT', message: 'Rejected secret VERSION', details: 'Current VERSION does not match.',
    } }), { status: 409 }),
  }), (error: unknown) => {
    assert.ok(error instanceof EvalApiError);
    assert.equal(error.code, 'CREDENTIAL_VERSION_CONFLICT');
    assert.equal(error.httpStatus, 409);
    assert.ok(!error.message.includes('VERSION'));
    assert.ok(!error.hint?.includes('VERSION'));
    return true;
  });

  // Ordinary business codes, messages and actionable hints retain their public contract.
  await assert.rejects(evalRequest({
    baseUrl: options.host, method: 'POST', path: '/agenteval/api/v1/datasets',
    headers: { Authorization: `Bearer ${session}` },
    fetchImpl: async () => new Response(JSON.stringify({ error: {
      code: 'VALIDATION_ERROR', message: 'Dataset name is required.', details: 'Pass --name.',
    } }), { status: 422 }),
  }), (error: unknown) => {
    assert.ok(error instanceof EvalApiError);
    assert.equal(error.code, 'VALIDATION_ERROR');
    assert.equal(error.message, 'Dataset name is required.');
    assert.equal(error.hint, 'Pass --name.');
    return true;
  });

  // The mint endpoint can echo the stored CLI token or a returned session on failure.
  const cliToken = 'synthetic-stored-cli-token';
  const returnedSession = 'synthetic-returned-session';
  await assert.rejects(requestSandboxEvaluationSession(options.host, cliToken, undefined,
    async () => new Response(JSON.stringify({ error: `${cliToken} ${returnedSession}`, session_token: returnedSession }), { status: 403 })),
  (error: unknown) => {
    assert.ok(error instanceof EvalApiError);
    assert.equal(error.code, 'EVAL_SANDBOX_SESSION_FAILED');
    assert.ok(!error.message.includes(cliToken));
    assert.ok(!error.message.includes(returnedSession));
    return true;
  });
} finally {
  globalThis.fetch = original.fetch; process.exit = original.exit;
  process.stdout.write = original.stdout; process.stderr.write = original.stderr;
  logger.info = original.info; logger.error = original.error;
  if (original.stdinTTY) Object.defineProperty(process.stdin, 'isTTY', original.stdinTTY);
  else delete (process.stdin as any).isTTY;
  for (const [key, value] of [['AE_EVAL_ACCESS_TOKEN', original.token], ['AE_EVAL_BASE_URL', original.base]]) {
    if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
  }
}
console.log('evaluation error privacy and credential confirmation tests passed');
