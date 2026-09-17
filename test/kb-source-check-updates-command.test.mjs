import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { test } from 'node:test';
import { sourceCheckUpdates } from '../src/commands/te-kb/source-check-updates.ts';

function context(values = {}) { return { str: (name) => values[name] ?? '', host: () => 'https://example.test/' }; }
test('source check-updates validates identity and previews a scoped write without execution', () => {
  assert.equal(sourceCheckUpdates.risk, 'write');
  const ctx = context({ name: ' Handbook ', id: ' source-1 ', scope: 'company' });
  sourceCheckUpdates.validate(ctx);
  assert.deepEqual(sourceCheckUpdates.dryRun(ctx), { method: 'POST', url: 'https://example.test/agent/api/external/knowledge-bases/sources/check-updates', body: { name: 'Handbook', sourceId: 'source-1', scope: 'company' } });
  for (const values of [{ name: ' ', id: 'src' }, { name: 'KB', id: ' ' }, { name: 'KB', id: 'src', scope: 'system' }]) assert.throws(() => sourceCheckUpdates.validate(context(values)));
});
function run(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts', '--no-update-check', ...args], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', (data) => { stdout += data; }); child.stderr.on('data', (data) => { stderr += data; });
    child.on('error', reject); child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}
test('registered command uses CLI token, preserves counts, never sends dry-run and propagates failure', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'kb-source-check-'));
  let status = 200; const received = [];
  const responseBody = { sourceId: 'src', scanned: 1, updated: 0, failed: 0, urlChangeState: 'change', updateStatus: 'changed' };
  const server = http.createServer((req, res) => {
    const chunks = []; req.on('data', (chunk) => chunks.push(chunk)); req.on('end', () => {
      if (req.url !== '/agent/api/external/knowledge-bases/sources/check-updates') { res.writeHead(404); res.end('{}'); return; }
      received.push({ method: req.method, headers: req.headers, body: JSON.parse(Buffer.concat(chunks).toString()) });
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(status === 200 ? responseBody : { error: '\u98de\u4e66\u6765\u6e90\u66f4\u65b0\u68c0\u67e5\u5931\u8d25', code: 'SOURCE_CHECK_FAILED', failed: 1 }));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const host = `http://127.0.0.1:${server.address().port}`;
  const runtime = path.join(root, 'runtime'); mkdirSync(path.join(runtime, '.ae-config'), { recursive: true });
  writeFileSync(path.join(runtime, '.ae-config/cli-token.json'), JSON.stringify({ url: host, token: 'cli-source-check-test' }));
  const env = { HOME: path.join(root, 'home'), SANDBOX_RUNTIME_ROOT: runtime };
  const args = ['--host', host, 'kb', 'source', 'check-updates', '--name', 'Handbook', '--id', 'src', '--scope', 'company'];
  try {
    const preview = await run([...args, '--dry-run'], env); assert.equal(preview.status, 0, preview.stderr); assert.equal(received.length, 0);
    const result = await run(args, env); assert.equal(result.status, 0, result.stderr); assert.deepEqual(JSON.parse(result.stdout).data, responseBody);
    assert.equal(received.length, 1); assert.equal(received[0].method, 'POST');
    assert.deepEqual(received[0].body, { name: 'Handbook', sourceId: 'src', scope: 'company' });
    assert.equal(received[0].headers['cli-token'], 'cli-source-check-test'); assert.equal(received[0].headers.authorization, undefined);
    status = 502;
    const failed = await run(args, env); assert.notEqual(failed.status, 0); assert.match(failed.stdout + failed.stderr, /SOURCE_CHECK_FAILED|Check failed/); assert.equal(received.length, 2);
    const failure = JSON.parse(failed.stderr).error; assert.equal(failure.code, 'SOURCE_CHECK_FAILED'); assert.match(failure.message, /Feishu source update check failed/); assert.doesNotMatch(failure.message + failure.hint, /[\u4e00-\u9fff]/);
    status = 403;
    const denied = await run(args, env); const deniedError = JSON.parse(denied.stderr).error; assert.equal(deniedError.type, 'permission'); assert.match(deniedError.message, /write permission/); assert.doesNotMatch(deniedError.message + deniedError.hint, /[\u4e00-\u9fff]/); assert.equal(received.length, 3);
    const help = await run(['kb', 'source', 'check-updates', '--help'], env); assert.equal(help.status, 0, help.stderr); assert.match(help.stdout, /--id/); assert.match(help.stdout, /--scope/);
  } finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); rmSync(root, { recursive: true, force: true }); }
});
