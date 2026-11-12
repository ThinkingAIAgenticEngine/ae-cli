import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { sourceLoggedFetch, CLI_REQUEST_ID_HEADER } from '../src/core/source-logged-fetch.js';
import { logger } from '../src/core/logger.js';
import { internalCallSourceHeaders } from '../src/core/internal-call-source.js';
import { requestCapabilityGateway, callCapabilityApi, uploadInputFileBytes, downloadCapabilityArtifact } from '../src/core/capability-api.js';
import { callMcpTool } from '../src/core/mcp.js';
import { callDataopsApi, downloadDataopsApi } from '../src/commands/te-dataops/shared.js';

const host = 'https://source-log.invalid';
const token = 'cli_fixture-not-a-real-credential';
const originalFetch = globalThis.fetch;
const originalInfo = logger.info;
const savedEnv = { ...process.env };
let logs: string[];
let sent: RequestInit[];
function setup(): void {
  logs = []; sent = [];
  logger.info = (message) => { logs.push(message); };
  process.env.AE_CLI_TOKEN = token;
  process.env.AE_CLI_TOKEN_HOST = host;
  globalThis.fetch = async (_url, init) => {
    sent.push(init!);
    return new Response(JSON.stringify({ ok: true, data: {}, result: { content: [] } }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  };
}
function entries(): any[] {
  return logs.filter((line) => line.startsWith('CLI_SOURCE_SEND ')).map((line) => JSON.parse(line.slice('CLI_SOURCE_SEND '.length)));
}
function cleanup(): void { globalThis.fetch = originalFetch; logger.info = originalInfo; process.env = { ...savedEnv }; }

for (const [name, headers, expected, state] of [
  ['missing', {}, null, 'missing'],
  ['empty', { 'X-Source': '' }, '', 'empty'],
  ['internal', { 'X-Source': 'te-agent' }, 'te-agent', 'present'],
  ['external fallback', { 'X-Source': 'ae-cli' }, 'ae-cli', 'present'],
  ['case duplicates', { 'X-Source': 'te-agent', 'x-source': 'te-agent' }, 'te-agent, te-agent', 'multiple'],
] as const) {
  await test(`records the actual ${name} source without logging credentials or query strings`, async () => {
    setup();
    try {
      await sourceLoggedFetch(`${host}/api/cli/v1/capabilities?secret=must-not-log`, {
        method: 'POST', headers: { ...headers, 'cli-token': token, Cookie: 'private-cookie' }, body: 'private-body',
      });
      const [entry] = entries();
      assert.equal(entry.source, expected); assert.equal(entry.source_state, state);
      assert.equal(entry.request_id, new Headers(sent[0].headers).get(CLI_REQUEST_ID_HEADER));
      assert.match(entry.request_id, /^[a-f0-9-]{36}$/);
      assert.equal(entry.path, '/api/cli/v1/capabilities');
      assert.equal(sent[0].body, 'private-body');
      assert.equal(new Headers(sent[0].headers).get('cli-token'), token);
      for (const secret of [token, 'private-cookie', 'private-body', 'must-not-log']) assert.ok(!logs.join('').includes(secret));
    } finally { cleanup(); }
  });
}

await test('supports Headers and tuple headers; assigns a distinct ID to every attempt', async () => {
  setup();
  try {
    for (const headers of [new Headers({ 'X-Source': 'te-agent' }), [['X-Source', 'te-agent']] as [string, string][]]) {
      await sourceLoggedFetch(host, { headers });
    }
    assert.equal(new Set(entries().map((entry) => entry.request_id)).size, 2);
    assert.deepEqual(entries().map((entry) => entry.source), ['te-agent', 'te-agent']);
  } finally { cleanup(); }
});

await test('bounds logged values and preserves full outgoing headers', async () => {
  setup();
  try {
    const source = 'a'.repeat(300);
    await sourceLoggedFetch(host, { headers: { 'X-Source': source } });
    assert.equal(new Headers(sent[0].headers).get('X-Source'), source);
    assert.match(entries()[0].source, /\[truncated\]$/);
  } finally { cleanup(); }
});

await test('logging failures preserve fetch options and the original network failure', async () => {
  setup();
  try {
    logger.info = () => { throw new Error('log unavailable'); };
    const failure = new Error('network fixture');
    const signal = new AbortController().signal;
    globalThis.fetch = async (_url, init) => { sent.push(init!); throw failure; };
    await assert.rejects(sourceLoggedFetch(host, { method: 'POST', body: 'body', signal, redirect: 'error' }), (error) => error === failure);
    assert.equal(sent[0].signal, signal); assert.equal(sent[0].redirect, 'error'); assert.equal(sent[0].body, 'body');
  } finally { cleanup(); }
});

await test('all source-bearing transports log normal, upload, download and explicit retry attempts', async () => {
  setup();
  const downloadDir = mkdtempSync(join(tmpdir(), 'ae-source-download-'));
  try {
    process.env.SANDBOX_RUNTIME_ROOT = '/fixture/ae-sandbox';
    const ctx = { host: () => host } as any;
    await requestCapabilityGateway(host, 'analysis', 'capabilities', 'GET');
    await uploadInputFileBytes(host, 'analysis', 1, 'fixture', new Uint8Array([1]), 'fixture.bin');
    await downloadCapabilityArtifact(host, 'analysis', 'run', 'artifact');
    await callMcpTool(`${host}/mcp`, 'fixture', {}, host);
    await callDataopsApi(ctx, 'flow_get_flow_params', { project_id: 1 });
    await downloadDataopsApi(ctx, '/api/cli/dataops/v1/fixture', {}, join(downloadDir, 'fixture.bin'));
    let attempt = 0;
    globalThis.fetch = async (_url, init) => {
      sent.push(init!);
      return new Response(JSON.stringify({ ok: true, data: {} }), { status: ++attempt === 1 ? 401 : 200 });
    };
    await callCapabilityApi(host, 'analysis', 'capabilities', 'GET', {}, { retryOnUnauthorized: true });
    assert.equal(entries().length, 8);
    assert.equal(new Set(entries().map((entry) => entry.request_id)).size, 8);
    assert.ok(entries().every((entry) => entry.source === 'te-agent' && entry.sandbox_detected));
    const businessRequests = sent.filter((init) => new Headers(init.headers).has(CLI_REQUEST_ID_HEADER));
    assert.equal(businessRequests.length, 8);
    assert.ok(businessRequests.every((init) => new Headers(init.headers).get('X-Source') === 'te-agent'));
    assert.ok(businessRequests.some((init) => init.body instanceof FormData));
  } finally { cleanup(); rmSync(downloadDir, { recursive: true, force: true }); }
});

await test('public conversion keeps outgoing logs while removing the internal source header', async () => {
  setup();
  const dir = mkdtempSync(join(tmpdir(), 'ae-public-source-log-'));
  try {
    for (const name of ['package.json', 'open-source/config-open-source.sh', 'open-source/README.opensource.md', 'open-source/README.opensource.zh.md',
      'src/core/internal-call-source.ts', 'src/core/source-logged-fetch.ts', 'src/core/mcp.ts', 'src/core/capability-api.ts', 'src/commands/te-dataops/shared.ts']) {
      mkdirSync(dirname(join(dir, name)), { recursive: true }); copyFileSync(name, join(dir, name));
    }
    execFileSync('bash', [join(dir, 'open-source/config-open-source.sh')], { cwd: dir, stdio: 'pipe' });
    const converted = await import(pathToFileURL(join(dir, 'src/core/internal-call-source.ts')).href);
    const publicHeaders = (converted.internalCallSourceHeaders ?? converted.default.internalCallSourceHeaders)();
    assert.deepEqual(publicHeaders, {});
    assert.match(readFileSync(join(dir, 'src/core/source-logged-fetch.ts'), 'utf8'), /CLI_SOURCE_SEND/);
    assert.equal(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name, '@thinkingai/ae-cli');
    await sourceLoggedFetch(host, { headers: publicHeaders });
    assert.equal(entries()[0].source_state, 'missing');
    delete process.env.SANDBOX_RUNTIME_ROOT;
    assert.equal(internalCallSourceHeaders()['X-Source'], 'ae-cli');
  } finally { cleanup(); rmSync(dir, { recursive: true, force: true }); }
});
