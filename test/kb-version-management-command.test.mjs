import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import commands, { versions, versionShow, versionSources, versionDiff, versionTree, versionRead, versionDownload, rollback, rollbackStatus } from '../src/commands/te-kb/index.ts';
const commandSet = [versions, versionShow, versionSources, versionDiff, versionTree, versionRead, versionDownload, rollback, rollbackStatus];
function ctx(values = {}) { return { str: (key) => String(values[key] ?? ''), num: (key) => Number(values[key] ?? (key === 'limit' ? 100 : 0)), host: () => 'https://example.test' }; }
test('all nine version commands have precise read/high-risk-write registration and bounded inputs', () => {
  for (const command of commandSet) { assert.ok(commands.includes(command)); assert.equal(command.risk, command === rollback ? 'high-risk-write' : 'read'); }
  assert.equal(commandSet.length, 9);
  const valid = ctx({ name: 'KB', scope: 'company', version: 2, id: 'source', path: 'guide.md', from: 1, to: 2, output: './file', 'request-id': 'request_1', 'expected-latest-version-id': 'v3', 'operation-id': 'op' });
  for (const command of commandSet) assert.doesNotThrow(() => command.validate(valid));
  assert.throws(() => versions.validate(ctx({ name: 'KB', scope: 'system' })), /scope/);
  assert.throws(() => versions.validate(ctx({ name: 'KB', limit: 201 })), /limit/);
  assert.throws(() => versionShow.validate(ctx({ name: 'KB', version: 1.5 })), /version/);
  assert.throws(() => versionRead.validate(ctx({ name: 'KB', version: 1, id: 's', path: '../secret' })), /path/);
  assert.throws(() => rollback.validate(ctx({ name: 'KB', version: 1, 'request-id': 'bad request' })), /request-id/);
  assert.deepEqual(rollback.dryRun(valid).body, { requestId: 'request_1', expectedLatestVersionId: 'v3' });
  assert.equal(rollback.dryRun(valid).params.scope, 'company');
});
function run(args, env) { return new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts', '--no-update-check', ...args], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = ''; child.stdout.on('data', (chunk) => { stdout += chunk; }); child.stderr.on('data', (chunk) => { stderr += chunk; }); child.on('error', reject); child.on('close', (status) => resolve({ status, stdout, stderr }));
}); }
test('version transport preserves scope, cursor, binary downloads, stable retries and review-required status', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'ae-kb-version-'));
  const requests = [];
  const binary = Buffer.from([0, 255, 128, 1]);
  let responseStatus = 200, responseBody = { items: [], nextCursor: null, latestVersionId: 'v3' };
  const server = http.createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const url = new URL(req.url, 'http://localhost');
    requests.push({ method: req.method, url, headers: req.headers, data: Buffer.concat(chunks) });
    if (url.pathname.endsWith('/raw') && responseStatus === 200) { res.writeHead(200, { 'content-type': 'application/octet-stream' }); res.end(binary); }
    else { res.writeHead(responseStatus, { 'content-type': 'application/json' }); res.end(JSON.stringify(responseBody)); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const host = `http://127.0.0.1:${server.address().port}`;
  const runtime = path.join(root, 'runtime'); mkdirSync(path.join(runtime, '.ae-config'), { recursive: true });
  writeFileSync(path.join(runtime, '.ae-config/cli-token.json'), JSON.stringify({ url: host, token: 'fixture-version-token' }));
  const env = { SANDBOX_RUNTIME_ROOT: runtime };
  const flags = ['--host', host, '--name', 'Test KB', '--scope', 'company'];
  try {
    for (const [command, additional, suffix] of [
      ['+versions', ['--cursor', '3', '--limit', '2'], ''],
      ['+version-show', ['--version', '2'], '/2'],
      ['+version-sources', ['--version', '2', '--source-type', 'zip', '--cursor', 's+1'], '/2/sources'],
      ['+version-diff', ['--from', '1', '--to', '2'], '/compare'],
      ['+version-tree', ['--version', '2', '--id', 's1', '--path', 'guide', '--limit', '2'], '/2/sources/s1/tree'],
      ['+version-read', ['--version', '2', '--id', 's1', '--path', 'guide/a.md'], '/2/sources/s1/file'],
    ]) {
      const result = await run(['kb', command, ...flags, ...additional], env); assert.equal(result.status, 0, result.stderr);
      assert.equal(requests.at(-1).url.pathname, '/agent/api/external/knowledge-bases/versions' + suffix);
      assert.equal(requests.at(-1).url.searchParams.get('scope'), 'company'); assert.equal(requests.at(-1).method, 'GET');
      assert.equal(requests.at(-1).headers['cli-token'], 'fixture-version-token'); assert.equal(requests.at(-1).headers.authorization, undefined);
      if (command === '+version-sources') { assert.equal(requests.at(-1).url.searchParams.get('cursor'), 's+1'); assert.equal(requests.at(-1).url.searchParams.get('sourceType'), 'zip'); }
    }
    const output = path.join(root, 'download.bin');
    const download = ['kb', '+version-download', ...flags, '--version', '2', '--id', 'file-source', '--output', output];
    let result = await run(download, env); assert.equal(result.status, 0, result.stderr); assert.deepEqual(readFileSync(output), binary);
    result = await run(download, env); assert.equal(result.status, 1); assert.deepEqual(readFileSync(output), binary);
    responseStatus = 400; responseBody = { code: 'KB_VERSION_DIRECTORY_DOWNLOAD_UNSUPPORTED', error: 'Directory download is unsupported.' };
    result = await run(download, env); assert.equal(result.status, 1); assert.match(result.stderr, /KB_VERSION_DIRECTORY_DOWNLOAD_UNSUPPORTED/);

    const write = ['kb', '+rollback', ...flags, '--version', '1', '--request-id', 'stable-request', '--expected-latest-version-id', 'v3'];
    const before = requests.length;
    result = await run([...write, '--dry-run'], env); assert.equal(result.status, 0, result.stderr); assert.equal(requests.length, before);
    result = await run(write, env); assert.notEqual(result.status, 0); assert.equal(requests.length, before);
    responseStatus = 202; responseBody = { operationId: 'op1', status: 'queued', requestId: 'stable-request', resultVersionId: null };
    for (let n = 0; n < 2; n++) { result = await run([...write, '--yes'], env); assert.equal(result.status, 0, result.stderr); assert.equal(JSON.parse(result.stdout).data.operationId, 'op1'); assert.deepEqual(JSON.parse(requests.at(-1).data), { requestId: 'stable-request', expectedLatestVersionId: 'v3' }); }
    responseStatus = 409; responseBody = { code: 'KB_VERSION_LATEST_CONFLICT', error: 'Latest version changed.' };
    const previous = requests.length; result = await run([...write, '--yes'], env); assert.equal(result.status, 1); assert.match(result.stderr, /KB_VERSION_LATEST_CONFLICT/); assert.equal(requests.length, previous + 1);
    responseStatus = 200; responseBody = { operationId: 'op1', status: 'running', errorCode: 'KB_PUBLICATION_COMMIT_UNKNOWN', errorMessage: 'Administrator review required.', resultVersionId: null };
    const beforeStatus = requests.length; result = await run(['kb', '+rollback-status', ...flags, '--operation-id', 'op1'], env); assert.equal(result.status, 0, result.stderr); assert.equal(JSON.parse(result.stdout).data.errorCode, 'KB_PUBLICATION_COMMIT_UNKNOWN'); assert.equal(requests.length, beforeStatus + 1);
  } finally { await new Promise((resolve) => server.close(resolve)); rmSync(root, { recursive: true, force: true }); }
});
