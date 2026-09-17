import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, truncateSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parseKbResponse } from '../src/core/mcp-access.ts';

function run(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts', '--no-update-check', ...args], {
      env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', status => resolve({ status, stdout, stderr }));
  });
}

test('source commands preserve multipart bytes, preview boundaries, exact scope, revisions and failures', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'ae-source-mutation-'));
  const requests = [];
  let failure;
  let unchanged = false;
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const data = Buffer.concat(chunks);
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/agent/api/external/knowledge-bases/')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ return_code: 0, data: { version: '6.0.48' } }));
      return;
    }
    const entry = { method: req.method, url, headers: req.headers, data };
    if (req.headers['content-type']?.startsWith('multipart/')) {
      const form = await new Response(data, { headers: { 'content-type': req.headers['content-type'] } }).formData();
      entry.form = Object.fromEntries(form);
      entry.file = Buffer.from(await form.get('file').arrayBuffer());
    }
    requests.push(entry);
    if (failure) {
      res.writeHead(failure.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ code: failure.code, error: 'Rejected by fixture.', hint: 'Inspect the current source state.' }));
      return;
    }
    if (req.method === 'DELETE') { res.writeHead(204); res.end(); return; }
    res.writeHead(200, { 'content-type': 'application/json' });
    if (unchanged) res.end(JSON.stringify({ kind: 'mutation', outcome: 'unchanged', item: { contentRevision: 7 } }));
    else if (url.pathname.includes('/directory/previews') && !url.pathname.endsWith('/commit')) {
      res.end(JSON.stringify({ kind: 'preview', previewId: 'preview-1', expectedRevision: 7, entries: [{ action: 'delete', path: 'old.md' }], nextCursor: 'next+page' }));
    } else res.end(JSON.stringify({ kind: 'mutation', outcome: 'replaced', item: { contentRevision: 8 } }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const host = `http://127.0.0.1:${server.address().port}`;
  const runtime = path.join(root, 'runtime');
  mkdirSync(path.join(runtime, '.ae-config'), { recursive: true });
  writeFileSync(path.join(runtime, '.ae-config/cli-token.json'), JSON.stringify({ url: host, token: 'fixture-source-token' }));
  const env = { SANDBOX_RUNTIME_ROOT: runtime };
  const flags = ['--host', host, '--name', 'Source KB', '--scope', 'company', '--id', 'source-1'];
  const binary = Buffer.from([0, 255, 137, 80, 10, 13, 34]);
  const file = path.join(root, 'different-name.pdf');
  const zip = path.join(root, 'different-name.ZIP');
  writeFileSync(file, binary); writeFileSync(zip, binary);
  const replace = type => ['kb', 'source', 'replace', ...flags, '--source-type', type, '--file', type === 'zip' ? zip : file, '--expected-revision', '7'];
  const restore = type => ['kb', 'source', 'restore', ...flags, '--source-type', type, '--version', '3', '--expected-revision', '7'];
  const preview = ['kb', 'source', 'preview', ...flags, '--preview-id', 'preview-1'];
  const commit = ['kb', 'source', 'commit', ...flags, '--preview-id', 'preview-1', '--expected-revision', '7'];
  try {
    for (const type of ['file', 'zip']) {
      const before = requests.length;
      let result = await run([...replace(type), '--dry-run'], env);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(requests.length, before);
      assert.match(result.stdout, /redacted/);
      assert.doesNotMatch(result.stdout, /fixture-source-token/);
      result = await run(replace(type), env);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(requests.length, before + 1);
      const sent = requests.at(-1);
      assert.equal(sent.method, type === 'zip' ? 'POST' : 'PUT');
      assert.equal(sent.url.pathname, `/agent/api/external/knowledge-bases/sources/source-1/${type === 'zip' ? 'directory/previews' : 'raw'}`);
      assert.equal(sent.url.searchParams.get('scope'), 'company');
      assert.equal(sent.url.searchParams.get('name'), 'Source KB');
      assert.equal(sent.headers['cli-token'], 'fixture-source-token');
      assert.equal(sent.headers.authorization, undefined);
      assert.equal(sent.form.expectedRevision, '7');
      assert.equal(sent.form.mode, type === 'zip' ? 'archive' : undefined);
      assert.equal(sent.form.file.name, path.basename(type === 'zip' ? zip : file));
      assert.deepEqual(sent.file, binary);
      assert.equal(JSON.parse(result.stdout).data.kind, type === 'zip' ? 'preview' : 'mutation');
    }
    unchanged = true;
    const noOp = await run(replace('zip'), env);
    assert.equal(noOp.status, 0, noOp.stderr);
    assert.equal(JSON.parse(noOp.stdout).data.outcome, 'unchanged');
    unchanged = false;

    for (const [type, childPath] of [['file', ''], ['zip', ''], ['zip', 'nested/old.md']]) {
      const result = await run([...restore(type), ...(childPath ? ['--path', childPath] : [])], env);
      assert.equal(result.status, 0, result.stderr);
      const sent = requests.at(-1);
      assert.equal(sent.url.pathname, '/agent/api/external/knowledge-bases/versions/3/sources/source-1/restore');
      assert.deepEqual(JSON.parse(sent.data), { expectedRevision: 7, ...(type === 'zip' ? { target: childPath ? 'file' : 'source', ...(childPath ? { path: childPath } : {}) } : {}) });
    }
    let result = await run([...preview, '--cursor', 'next+page', '--limit', '2'], env);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(requests.at(-1).method, 'GET');
    assert.equal(requests.at(-1).url.searchParams.get('cursor'), 'next+page');
    assert.equal(requests.at(-1).data.length, 0);

    const beforeConfirm = requests.length;
    result = await run(commit, env);
    assert.notEqual(result.status, 0);
    assert.equal(requests.length, beforeConfirm);
    result = await run([...commit, '--dry-run'], env);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(requests.length, beforeConfirm);
    result = await run([...commit, '--yes'], env);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(requests.at(-1).data), { expectedRevision: 7, confirmed: true });
    assert.match(requests.at(-1).url.pathname, /\/preview-1\/commit$/);

    for (const [status, code] of [[409, 'SOURCE_CONTENT_REVISION_CONFLICT'], [409, 'SOURCE_REPLACE_FORMAT_MISMATCH'], [409, 'SOURCE_PREVIEW_EXPIRED'], [503, 'SOURCE_COMMIT_UNKNOWN'], [403, 'SOURCE_FORBIDDEN'], [401, 'TOKEN_EXPIRED']]) {
      failure = { status, code };
      const before = requests.length;
      result = await run([...commit, '--yes'], env);
      assert.equal(result.status, 1, result.stdout);
      assert.equal(requests.length, before + 1, 'Writes must not retry or fall back.');
      if (status !== 401) assert.equal(JSON.parse(result.stderr).error.code, code);
    }
    failure = undefined;
    result = await run(['kb', 'source', 'cancel', ...flags, '--preview-id', 'preview-1', '--yes'], env);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(requests.at(-1).method, 'DELETE');
    assert.deepEqual(JSON.parse(result.stdout).data, { previewId: 'preview-1', cancelled: true });
    assert.throws(() => parseKbResponse(new Response(null, { status: 204 }), ''), /empty response body/);

    const oversized = path.join(root, 'large.md');
    writeFileSync(oversized, ''); truncateSync(oversized, 50 * 1024 * 1024 + 1);
    const invalidArgs = [
      [...replace('file'), '--file', zip], [...replace('zip'), '--file', file],
      [...replace('file'), '--file', oversized], [...replace('file'), '--source-type', 'url'],
      [...replace('file'), '--scope', 'system'], [...replace('file'), '--expected-revision', '1.5'],
      [...replace('file'), '--expected-revision', '2147483648'],
      [...restore('file'), '--path', 'a.md'], [...restore('zip'), '--path', '../a.md'],
      [...restore('zip'), '--version', '0'], [...preview, '--limit', '201'],
    ];
    const beforeInvalid = requests.length;
    for (const args of invalidArgs) {
      result = await run(args, env);
      assert.notEqual(result.status, 0, JSON.stringify(args));
    }
    assert.equal(requests.length, beforeInvalid);
  } finally {
    await new Promise(resolve => server.close(resolve));
    rmSync(root, { recursive: true, force: true });
  }
});
