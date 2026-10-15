import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { test } from 'node:test';
import { usageList } from '../src/commands/te-kb/usage-list.ts';

function context(values = {}) {
  return {
    str: (name) => values[name] ?? '',
    num: (name) => values[name] ?? (name === 'page' ? 1 : 20),
    host: () => 'https://example.test/',
  };
}

test('usage list validates identity and integer pagination and previews a read', () => {
  const ctx = context({ name: ' Handbook ', scope: 'company', page: 2, 'page-size': 100 });
  usageList.validate(ctx);
  assert.equal(usageList.risk, 'read');
  assert.deepEqual(usageList.dryRun(ctx), {
    method: 'GET', url: 'https://example.test/agent/api/external/knowledge-bases/usage-logs',
    params: { name: 'Handbook', scope: 'company', page: 2, pageSize: 100 },
  });
  for (const values of [
    { name: ' ' }, { name: 'x'.repeat(201) }, { name: 'KB', scope: 'system' },
    { name: 'KB', page: 0 }, { name: 'KB', page: 1.5 }, { name: 'KB', page: 2147483648 },
    { name: 'KB', 'page-size': 0 }, { name: 'KB', 'page-size': 101 }, { name: 'KB', 'page-size': 1.5 },
  ]) assert.throws(() => usageList.validate(context(values)));
});

function run(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts', '--no-update-check', ...args], {
      env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });
    child.on('error', reject);
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

test('registered usage list preserves milliseconds and nulls through JSON and table output', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'kb-usage-list-'));
  const received = [];
  let responseStatus = 200;
  let responseBody = {
    items: [
      { id: 'success', status: 'success', durationMs: 268170 },
      { id: 'failed', status: 'failed', usageAvailable: false, durationMs: 8473 },
      { id: 'zero', status: 'success', durationMs: 0 },
      { id: 'historical', status: 'success', durationMs: null },
    ], total: 4, page: 2, pageSize: 100,
  };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/agent/api/external/knowledge-bases/usage-logs') {
      res.writeHead(404); res.end('{}'); return;
    }
    received.push({ method: req.method, headers: req.headers, query: Object.fromEntries(url.searchParams) });
    res.writeHead(responseStatus, { 'content-type': 'application/json' });
    res.end(JSON.stringify(responseBody));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const host = `http://127.0.0.1:${server.address().port}`;
  const runtime = path.join(root, 'runtime');
  mkdirSync(path.join(runtime, '.ae-config'), { recursive: true });
  writeFileSync(path.join(runtime, '.ae-config/cli-token.json'), JSON.stringify({ url: host, token: 'cli_usage_test' }));
  const env = { HOME: path.join(root, 'home'), SANDBOX_RUNTIME_ROOT: runtime };
  const args = ['--host', host, 'kb', 'usage', 'list', '--name', 'Handbook', '--scope', 'company', '--page', '2', '--page-size', '100'];
  try {
    const help = await run(['kb', 'usage', 'list', '--help'], env);
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /--page-size/);
    assert.match(help.stdout, /milliseconds/);
    assert.doesNotMatch(help.stdout, /[\u4e00-\u9fff]/);
    const preview = await run([...args, '--dry-run'], env);
    assert.equal(preview.status, 0, preview.stderr);
    assert.equal(received.length, 0);
    const result = await run(args, env);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).data, responseBody);
    assert.deepEqual(received[0].query, { name: 'Handbook', scope: 'company', page: '2', pageSize: '100' });
    assert.equal(received[0].method, 'GET');
    assert.equal(received[0].headers['cli-token'], 'cli_usage_test');
    assert.equal(received[0].headers.authorization, undefined);
    const table = await run([...args, '--jq', '.items | map({id, durationMs})', '--format', 'table'], env);
    assert.equal(table.status, 0, table.stderr);
    assert.match(table.stdout, /durationMs/);
    assert.match(table.stdout, /268170/);
    assert.match(table.stdout, /8473/);
    assert.match(table.stdout, /historical/);
    const defaults = await run(['--host', host, 'kb', 'usage', 'list', '--name', 'Handbook'], env);
    assert.equal(defaults.status, 0, defaults.stderr);
    assert.deepEqual(received.at(-1).query, { name: 'Handbook', page: '1', pageSize: '20' });
    const count = received.length;
    const invalid = await run([...args, '--page', '1.5'], env);
    assert.notEqual(invalid.status, 0);
    assert.equal(received.length, count);
    responseStatus = 400;
    responseBody = { error: '\u53c2\u6570\u4e0d\u5408\u6cd5', code: 'KB_USAGE_LOGS_INVALID_REQUEST' };
    const failure = await run(args, env);
    assert.notEqual(failure.status, 0);
    const apiError = JSON.parse(failure.stderr).error;
    assert.equal(apiError.code, 'KB_USAGE_LOGS_INVALID_REQUEST');
    assert.match(apiError.message, /Invalid knowledge base usage/);
    assert.doesNotMatch(apiError.message, /[\u4e00-\u9fff]/);
    responseStatus = 429;
    responseBody = { error: '\u8bf7\u6c42\u8fc7\u4e8e\u9891\u7e41', code: 'KB_USAGE_LOGS_RATE_LIMITED' };
    const limited = await run(args, env);
    assert.notEqual(limited.status, 0);
    const limitError = JSON.parse(limited.stderr).error;
    assert.equal(limitError.code, 'KB_USAGE_LOGS_RATE_LIMITED');
    assert.match(limitError.message, /rate limit exceeded/);
    assert.doesNotMatch(limitError.message, /[\u4e00-\u9fff]/);
    responseStatus = 403;
    responseBody = { error: '\u65e0\u6743\u9650' };
    const denied = await run(args, env);
    assert.notEqual(denied.status, 0);
    const permissionError = JSON.parse(denied.stderr).error;
    assert.equal(permissionError.type, 'permission');
    assert.match(permissionError.message, /Permission denied/);
    assert.doesNotMatch(permissionError.message, /[\u4e00-\u9fff]/);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    rmSync(root, { recursive: true, force: true });
  }
});
