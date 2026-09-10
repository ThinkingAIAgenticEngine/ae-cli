import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PassThrough } from 'node:stream';
import { Command } from 'commander';
import type { RuntimeContext } from '../src/framework/types.js';
import { registerCapability } from '../src/commands/capability/index.js';
import { baseCommands } from '../src/commands/te-analysis/index.js';
import '../src/commands/metadata/index.js';
import { inputFileUpload } from '../src/commands/te-analysis/input-file/upload.js';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.js';

const temporary = mkdtempSync(join(tmpdir(), 'cross-source-l3-test-'));
const host = `https://cross-source-${randomUUID()}.invalid`;
const originalFetch = globalThis.fetch;
const originalExit = process.exitCode;
const sent: { url: string; init?: RequestInit; input?: any }[] = [];
let reply: (url: string, input: any) => Response = () => ok({});
let passed = 0;
const fileId = 'ifile_' + '1'.repeat(32);
const prefix = 'metadata.cross_source_config.';
const trace = { request_id: 'request-test', invocation_id: 'invocation-test' };
const inputs: Record<string, Record<string, unknown>> = {
  list: { query: 'route', limit: 50, offset: 0 },
  upload: { input_file_id: fileId },
  check: { ids: [101, 102] },
  check_status: { ids: [101, 102] },
};

function ok(data: unknown, meta: Record<string, unknown> = trace): Response {
  return new Response(JSON.stringify({ ok: true, data, meta }), { status: 200 });
}

function ctx(values: Record<string, unknown> = {}): RuntimeContext {
  const args: Record<string, unknown> = { 'project-id': 1, ...values };
  return {
    str: name => args[name] === undefined ? '' : String(args[name]),
    num: name => Number(args[name]),
    bool: name => args[name] === true,
    host: () => host,
    service: () => 'analysis',
    out: async () => undefined,
  } as RuntimeContext;
}

async function invoke(args: string[]) {
  const program = new Command().option('--host <url>').option('--yes').option('--dry-run').option('--validate')
    .option('--format <format>').option('--jq <expression>').exitOverride();
  registerCapability(program);
  let stdout = '', stderr = '';
  const writeOut = process.stdout.write, writeErr = process.stderr.write;
  process.stdout.write = ((data: any) => { stdout += String(data); return true; }) as typeof process.stdout.write;
  process.stderr.write = ((data: any) => { stderr += String(data); return true; }) as typeof process.stderr.write;
  process.exitCode = 0;
  try {
    await program.parseAsync(['node', 'ae-cli', '--host', host, 'capability', ...args]);
    return { stdout, stderr, code: process.exitCode, data: stdout ? JSON.parse(stdout) : undefined };
  } finally {
    process.stdout.write = writeOut;
    process.stderr.write = writeErr;
    process.exitCode = originalExit;
  }
}

async function run(action: string, input: Record<string, unknown> = inputs[action], options: string[] = ['--yes']) {
  return invoke(['run', prefix + action, '--input', JSON.stringify({ project_id: 1, ...input }), ...options]);
}

async function test(name: string, body: () => unknown) {
  sent.length = 0;
  reply = () => ok({});
  await body();
  passed++;
  process.stdout.write(`PASS ${name}\n`);
}

globalThis.fetch = (async (request: any, init?: RequestInit) => {
  const url = String(request instanceof Request ? request.url : request);
  if (url.includes('/cli/token/renew')) return new Response(JSON.stringify({ return_code: 0, data: {} }));
  const input = typeof init?.body === 'string' ? JSON.parse(init.body).input : undefined;
  sent.push({ url, init, input });
  return reply(url, input);
}) as typeof fetch;
setCliTokenManual('cross-source-test-cli-token', host);

try {
  await test('workflow remains L3-only and reuses shared input-file upload', () => {
    assert(!baseCommands.some(item => item.resource === 'cross-source-config' || item.capabilityId?.startsWith(prefix)));
    assert(baseCommands.includes(inputFileUpload));
  });

  await test('metadata discovery is limited to four upload and validation capabilities', async () => {
    reply = () => ok([...Object.keys(inputs).map(action => ({ id: prefix + action, description: 'Cross-source configuration' })),
      { id: 'analysis.report.list', description: 'Unrelated report' }]);
    const result = await invoke(['search', 'cross_source_config', '--domain', 'metadata', '--project-id', '1']);
    assert.equal(result.data.data.count, 4);
    assert.deepEqual(result.data.data.capabilities.map((item: any) => item.id), Object.keys(inputs).map(action => prefix + action));
    assert.match(sent[0].url, /\/api\/cli\/analysis\/v1\/capabilities\?project_id=1$/);
  });

  for (const action of Object.keys(inputs)) {
    await test(`${action}: sends exact snake_case input with CLI-token-only auth`, async () => {
      reply = (_url, input) => ok(input);
      const result = await run(action);
      assert.equal(result.code, 0);
      assert.equal(sent.length, 1);
      assert(sent[0].url.endsWith(`/api/cli/analysis/v1/capabilities/${prefix}${action}/execute`));
      assert.deepEqual(sent[0].input, { project_id: 1, ...inputs[action] });
      assert.deepEqual(result.data.meta, trace);
      const headers = new Headers(sent[0].init?.headers);
      assert.equal(headers.get('cli-token'), 'cross-source-test-cli-token');
      assert.equal(headers.get('authorization'), null);
    });
  }

  await test('page_path becomes a directly openable Host page_url', async () => {
    reply = () => ok({ status: 'check_fail', page_path: '/#/data/assetAllocation?currentProjectId=1' });
    const result = await run('check_status');
    assert.equal(result.data.data.page_path, '/#/data/assetAllocation?currentProjectId=1');
    assert.equal(result.data.data.page_url, `${host}/#/data/assetAllocation?currentProjectId=1`);
  });

  await test('protocol-relative page_path is never promoted to a page_url', async () => {
    reply = () => ok({ page_path: '//outside.invalid/review' });
    const result = await run('list');
    assert.equal(result.data.data.page_path, '//outside.invalid/review');
    assert.equal(result.data.data.page_url, undefined);
  });

  await test('failed capability also adds page_url to top-level error metadata', async () => {
    reply = () => new Response(JSON.stringify({
      ok: false,
      error: { code: 'CROSS_SOURCE_UPLOAD_FAILED', message: 'Invalid workbook' },
      meta: { ...trace, page_path: '/#/data/assetAllocation?currentProjectId=1' },
    }), { status: 400 });
    const result = await run('upload');
    assert.equal(result.code, 1);
    const error = JSON.parse(result.stderr);
    assert.equal(error.meta.page_url, `${host}/#/data/assetAllocation?currentProjectId=1`);
    assert.equal(sent.length, 1);
  });

  await test('shared file upload feeds the single upload capability without an artifact continuation', async () => {
    const path = join(temporary, 'configured.xlsx');
    writeFileSync(path, 'mock workbook bytes');
    reply = url => url.endsWith('/input-files')
      ? ok({ input_file_id: fileId })
      : ok({ status: 'success', result: { ready: ['route_a'], fail: [] }, page_path: '/#/data/assetAllocation?currentProjectId=1' });
    const uploaded = await inputFileUpload.execute(ctx({ file: path, purpose: 'cross_source_config.workbook' }));
    assert.equal(uploaded.input_file_id, fileId);
    const form = sent[0].init?.body as FormData;
    assert.equal(form.get('purpose'), 'cross_source_config.workbook');
    assert.equal(form.get('project_id'), '1');
    assert.equal((await run('upload')).data.data.status, 'success');
    assert.equal(sent.filter(call => call.url.endsWith('/input-files')).length, 1);
    assert.equal(sent.filter(call => call.url.includes('.upload/execute')).length, 1);
  });

  await test('upload requires confirmation unless --yes is supplied', async () => {
    const stdin = Object.getOwnPropertyDescriptor(process, 'stdin')!;
    try {
      const input = new PassThrough();
      Object.defineProperty(process, 'stdin', { configurable: true, value: input });
      reply = () => {
        setImmediate(() => input.write('n\n'));
        return ok({ risk: 'high-risk-write' });
      };
      const result = await run('upload', inputs.upload, []);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /Aborted/);
      input.destroy();
    } finally {
      Object.defineProperty(process, 'stdin', stdin);
    }
    assert.equal(sent.length, 1);
    assert.equal(sent[0].init?.method, 'GET');
  });

  await test('shared upload dry-run never uploads bytes', async () => {
    const result = await inputFileUpload.dryRun!(ctx({ file: 'not-read.xlsx', purpose: 'cross_source_config.workbook' }));
    assert.equal(result.method, 'POST');
    assert.equal(sent.length, 0);
  });

  process.stdout.write(`Cross-source L3 tests: ${passed} passed\n`);
} finally {
  globalThis.fetch = originalFetch;
  process.exitCode = originalExit;
  clearCliToken(host);
  rmSync(temporary, { recursive: true, force: true });
}
