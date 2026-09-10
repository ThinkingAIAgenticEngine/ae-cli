import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

function run(args, env, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts', '--no-update-check', ...args], {
      env: { ...process.env, ...env }, stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (status) => resolve({ status, stdout, stderr }));
    if (input !== undefined) child.stdin.end(input);
  });
}

test('ZIP CLI preserves file bytes, paths, revisions, conflict codes and explicit deletion', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'ae-zip-cli-'));
  const requests = [];
  let replyCode = 200;
  let rawJson = false;
  const binary = Buffer.from([0, 255, 137, 80, 78, 71]);
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const data = Buffer.concat(chunks);
    const url = new URL(req.url, 'http://localhost');
    requests.push({ method: req.method, url, headers: req.headers, data });
    if (replyCode !== 200) {
      res.writeHead(replyCode, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ code: replyCode === 409 ? 'SOURCE_CONTENT_REVISION_CONFLICT' : 'KB_SOURCE_FORBIDDEN', error: 'Rejected.' }));
    } else if (url.pathname.endsWith('/raw') && rawJson) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Raw access rejected.', code: 'RAW_REJECTED' }));
    } else if (url.pathname.endsWith('/raw')) {
      res.writeHead(200, { 'content-type': 'application/octet-stream' }); res.end(binary);
    } else {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ revision: 8, nextCursor: 'next+page', items: [], success: true }));
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const host = `http://127.0.0.1:${server.address().port}`;
  const runtime = path.join(root, 'runtime');
  mkdirSync(path.join(runtime, '.ae-config'), { recursive: true });
  writeFileSync(path.join(runtime, '.ae-config/cli-token.json'), JSON.stringify({ url: host, token: 'test-zip-token' }));
  const env = { SANDBOX_RUNTIME_ROOT: runtime };
  const flags = ['--host', host, '--name', 'Test KB', '--id', 'zip-1'];
  const file = path.join(root, 'input.md');
  const contents = Buffer.from('# Fixture\nUnicode: \u4e2d\u6587\n');
  writeFileSync(file, contents);
  try {
    let result = await run(['kb', '+source-ls', ...flags, '--path', 'country/province', '--cursor', 'next+page', '--limit', '2'], env);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).data.revision, 8);
    assert.equal(requests.at(-1).url.searchParams.get('cursor'), 'next+page');
    assert.equal(requests.at(-1).data.length, 0);
    assert.equal(requests.at(-1).headers['cli-token'], 'test-zip-token');
    assert.equal(requests.at(-1).headers.authorization, undefined);

    const put = ['kb', '+source-put', ...flags, '--path', 'country/new.md', '--file', file, '--expected-revision', '7'];
    const beforeDry = requests.length;
    result = await run([...put, '--dry-run'], env);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(requests.length, beforeDry);
    assert.doesNotMatch(result.stdout, /Fixture/);
    for (const action of ['add', 'replace']) {
      result = await run([...put, '--action', action], env);
      assert.equal(result.status, 0, result.stderr);
      const body = JSON.parse(requests.at(-1).data);
      assert.equal(body.expectedRevision, 7);
      assert.equal(body.operations[0].action, action);
      assert.equal(body.operations[0].path, 'country/new.md');
      assert.deepEqual(Buffer.from(body.operations[0].contentBase64, 'base64'), contents);
      assert.equal(body.operations[0].confirmed, action === 'replace' ? true : undefined);
    }
    replyCode = 409;
    const beforeConflict = requests.length;
    result = await run(put, env);
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).error.code, 'SOURCE_CONTENT_REVISION_CONFLICT');
    assert.equal(requests.length, beforeConflict + 1);
    replyCode = 403;
    result = await run(['kb', '+source-read', ...flags, '--path', 'file.png'], env);
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).error.type, 'permission');
    replyCode = 200;

    rawJson = true;
    result = await run(['kb', '+source-read', ...flags, '--path', 'file.png'], env);
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).error.code, 'RAW_REJECTED');
    rawJson = false;
    result = await run(['kb', '+source-read', ...flags, '--path', 'file.png'], env);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /not UTF-8/);

    result = await run(['kb', '+source-read', ...flags, '--path', 'file.png', '--encoding', 'base64'], env);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(Buffer.from(JSON.parse(result.stdout).data.content, 'base64'), binary);
    const output = path.join(root, 'download.png');
    result = await run(['kb', '+source-read', ...flags, '--path', 'file.png', '--output', output], env);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readFileSync(output), binary);
    result = await run(['kb', '+source-read', ...flags, '--path', 'file.png', '--output', output], env);
    assert.equal(result.status, 1);
    assert.deepEqual(readFileSync(output), binary);

    const del = ['kb', '+source-rm', ...flags, '--path', 'country/subdir', '--recursive', '--expected-revision', '8'];
    const beforeCancel = requests.length;
    result = await run(del, env, 'n\n');
    assert.equal(requests.length, beforeCancel);
    result = await run([...del, '--yes'], env);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(requests.at(-1).data).operations, [{ action: 'delete', path: 'country/subdir', confirmed: true, recursive: true }]);

    for (const bad of ['../outside.md', '/root/file.md', 'a//file.md', 'a/../file.md', 'a\\file.md']) {
      const before = requests.length;
      result = await run(['kb', '+source-read', ...flags, '--path', bad], env);
      assert.equal(result.status, 1);
      assert.equal(requests.length, before);
    }
    for (const revision of ['0', '1.5', '9007199254740992']) {
      const before = requests.length;
      result = await run([...put, '--expected-revision', revision], env);
      assert.equal(result.status, 1);
      assert.equal(requests.length, before);
    }
    const archive = path.join(root, 'source.zip');
    const archiveBytes = Buffer.from('PK\x03\x04zip-fixture');
    writeFileSync(archive, archiveBytes);
    result = await run(['kb', '+add', '--host', host, '--name', 'Test KB', '--files', JSON.stringify([archive])], env);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(requests.at(-1).data.includes(archiveBytes));
    assert.ok(requests.at(-1).data.includes(Buffer.from('application/zip')));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(root, { recursive: true, force: true });
  }
});
