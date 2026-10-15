import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync, truncateSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { sourceCreateText } from '../src/commands/te-kb/source-text.ts';
import { sourceReplace } from '../src/commands/te-kb/source-mutation.ts';
import { parseKbResponse } from '../src/core/mcp-access.ts';

const maxBytes = 50 * 1024 * 1024;
const digest = content => createHash('sha256').update(content).digest('hex');

test('text transport keeps old-host and nested failure diagnostics body-free', () => {
  const options = { preserveErrorMetadata: true, redactErrorDetails: true };
  for (const body of ['', '<html>Private transport body</html>']) {
    assert.throws(() => parseKbResponse(new Response(body, { status: 404 }), body, options), error => {
      assert.match(error.message, /does not support the KB text API/);
      assert.doesNotMatch(error.message + error.hint, /Private transport/);
      return true;
    });
  }
  const nested = JSON.stringify({ error: { code: 'SOURCE_FORBIDDEN', message: 'Private transport body' }, hint: 'Private transport body' });
  assert.throws(() => parseKbResponse(new Response(nested, { status: 200 }), nested, options), error => {
    assert.equal(error.code, 'SOURCE_FORBIDDEN');
    assert.doesNotMatch(error.message + error.hint, /Private transport/);
    return true;
  });
  const auth = JSON.stringify({ return_code: -1001, return_message: 'Private transport body' });
  assert.throws(() => parseKbResponse(new Response(auth), auth, options), error => {
    assert.doesNotMatch(error.message, /Private transport/);
    return true;
  });
});

function run(args, env, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--max-old-space-size=2048', '--import', 'tsx', 'src/index.ts', '--no-update-check', ...args], {
      env: { ...process.env, ...env }, stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '';
    child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', status => resolve({ status, stdout, stderr }));
    if (input !== undefined) {
      child.stdin.on('error', error => { if (error.code !== 'EPIPE') reject(error); });
      child.stdin.end(input);
    }
  });
}

test('text diagnostic projection and auth errors preserve codes without logging content', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'ae-kb-text-diagnostics-'));
  const secret = 'Private projection response Ω\n"quoted" \\ path';
  let unauthorized = false;
  let requestCount = 0;
  const server = http.createServer(async (req, res) => {
    for await (const _chunk of req) { /* Consume the request without recording content. */ }
    if (!req.url.startsWith('/agent/api/external/knowledge-bases')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ return_code: 0, data: { version: '6.0.53' } }));
      return;
    }
    requestCount += 1;
    res.writeHead(unauthorized ? 401 : 200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(unauthorized
      ? { code: 'TOKEN_EXPIRED', error: secret, hint: secret }
      : { item: { id: 'text-1', contentRevision: 1, displayName: secret }, content: secret, contentFormat: 'text' }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const host = `http://127.0.0.1:${server.address().port}`;
  const home = path.join(root, 'home');
  const runtime = path.join(root, 'runtime');
  mkdirSync(path.join(runtime, '.ae-config'), { recursive: true });
  writeFileSync(path.join(runtime, '.ae-config/cli-token.json'), JSON.stringify({ url: host, token: 'fixture-diagnostics-token' }));
  const env = { HOME: home, SANDBOX_RUNTIME_ROOT: runtime };
  const target = ['--host', host, '--name', 'Text KB', '--scope', 'company'];
  const read = ['kb', 'source', 'read-text', ...target, '--id', 'text-1'];
  function assertBodyFree(result) {
    const output = result.stdout + result.stderr;
    assert.equal(output.includes(secret), false);
    assert.equal(output.includes(JSON.stringify(secret).slice(1, -1)), false);
    assert.doesNotMatch(output, /Private projection|quoted/);
  }
  try {
    let result = await run(read, env);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).data.content, secret, 'Successful explicit reads remain complete.');
    result = await run([...read, '--jq', '.content'], env);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).data, secret, 'Successful output projections preserve requested content.');
    result = await run([...read, '--jq', '.content | error'], env);
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).error.code, 'OUTPUT_PROJECTION_FAILED');
    assert.equal(JSON.parse(result.stdout).ok, false);
    assert.deepEqual(JSON.parse(result.stdout).data, { item: { id: 'text-1', contentRevision: 1 }, contentFormat: 'text' });
    assert.match(JSON.parse(result.stdout).error.hint, /read-text again without --out/);
    assertBodyFree(result);
    const output = path.join(root, 'read.txt');
    result = await run([...read, '--out', output, '--jq', '.content | error'], env);
    assert.equal(result.status, 1);
    assert.equal(readFileSync(output, 'utf8'), secret);
    assert.deepEqual(JSON.parse(result.stdout).data, { item: { id: 'text-1', contentRevision: 1 }, contentFormat: 'text', out: output });
    assertBodyFree(result);
    unauthorized = true;
    result = await run(['kb', 'source', 'create-text', ...target, '--text', secret], env);
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).error.type, 'auth');
    assert.equal(JSON.parse(result.stderr).error.code, 'TOKEN_EXPIRED');
    assert.match(JSON.parse(result.stderr).error.hint, /auth login/);
    assert.doesNotMatch(result.stderr, /Private projection/);
    result = await run(['kb', '+list-sources', ...target], env);
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).error.type, 'auth');
    assert.equal(JSON.parse(result.stderr).error.code, undefined, 'Legacy commands retain their existing auth envelope.');
    assert.equal(requestCount, 6, 'Read and auth failures never replay a business request.');
    const logs = readdirSync(path.join(home, '.ae-cli', 'log')).map(file => readFileSync(path.join(home, '.ae-cli', 'log', file), 'utf8')).join('');
    assert.doesNotMatch(logs, /Private projection|fixture-diagnostics-token/);
    assert.equal(logs.includes(JSON.stringify(secret).slice(1, -1)), false);
  } finally {
    await new Promise(resolve => server.close(resolve));
    rmSync(root, { recursive: true, force: true });
  }
});

test('text commands preserve complete bytes, revisions, exact scope, local output and safe diagnostics', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'ae-kb-text-'));
  const requests = [];
  let content = '';
  let revision = 1;
  let failure;
  let loseResponse = false;
  let raceOutput;
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/agent/api/external/knowledge-bases')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ return_code: 0, data: { version: '6.0.53' } }));
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks);
    const body = raw.length ? JSON.parse(raw.toString('utf8')) : undefined;
    requests.push({ method: req.method, url, headers: req.headers, body: body && { ...body, content: undefined },
      contentHash: body?.content === undefined ? undefined : digest(body.content), requestBytes: raw.length });
    if (loseResponse) { req.socket.destroy(); return; }
    if (failure) {
      res.writeHead(failure.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: `Fixture echo: ${content}`, code: failure.code, hint: content }));
      return;
    }
    res.setHeader('content-type', 'application/json');
    if (url.pathname.endsWith('/sources') && req.method === 'GET') {
      res.end(JSON.stringify({ items: [{ id: 'text-1', sourceType: 'file', contentRevision: revision }], pendingDeletions: null }));
      return;
    }
    if (req.method === 'POST') {
      content = body.content;
      revision = 1;
      res.statusCode = 201;
      res.end(JSON.stringify({ item: { id: 'text-1', sourceType: 'file', displayName: 'Notes.md', contentRevision: revision, compileStatus: 'pending' } }));
    } else if (req.method === 'GET') {
      if (raceOutput) { writeFileSync(raceOutput, 'Keep the concurrent file.'); raceOutput = undefined; }
      res.end(JSON.stringify({ item: { id: 'text-1', displayName: 'Notes.md', contentRevision: revision, sizeBytes: String(Buffer.byteLength(content)), compileStatus: 'pending' }, content, contentFormat: 'markdown' }));
    } else {
      if (body.expectedRevision !== revision) {
        res.statusCode = 409;
        res.end(JSON.stringify({ error: `Conflict: ${body.content}`, code: 'SOURCE_CONTENT_REVISION_CONFLICT', hint: body.content }));
        return;
      }
      const outcome = content === body.content ? 'unchanged' : 'replaced';
      if (outcome !== 'unchanged') { content = body.content; revision += 1; }
      res.end(JSON.stringify({ kind: 'mutation', outcome, item: { id: 'text-1', displayName: 'Notes.md', contentRevision: revision, compileStatus: 'pending' } }));
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const host = `http://127.0.0.1:${server.address().port}`;
  const runtime = path.join(root, 'runtime');
  const home = path.join(root, 'home');
  mkdirSync(path.join(runtime, '.ae-config'), { recursive: true });
  writeFileSync(path.join(runtime, '.ae-config/cli-token.json'), JSON.stringify({ url: host, token: 'fixture-text-token' }));
  const env = { SANDBOX_RUNTIME_ROOT: runtime, HOME: home };
  const target = ['--host', host, '--name', 'Text KB', '--scope', 'company'];
  const create = ['kb', 'source', 'create-text', ...target];
  const read = ['kb', 'source', 'read-text', ...target, '--id', 'text-1'];
  const replace = () => ['kb', 'source', 'replace', ...target, '--id', 'text-1', '--source-type', 'file', '--expected-revision', String(revision)];
  const secret = '\uFEFF# Private fixture Ω😀\r\n`$()` "quoted" \\ slash\rnext\nfinal';
  const sourceFile = path.join(root, 'original.MARKDOWN');
  writeFileSync(sourceFile, secret);
  try {
    assert.equal(sourceCreateText.flags.find(flag => flag.name === 'text').sensitive, true);
    assert.equal(sourceReplace.flags.find(flag => flag.name === 'text').sensitive, true);
    for (const [flags, input] of [[['--text', secret], undefined], [['--file', sourceFile], undefined], [['--stdin'], Buffer.from(secret)]]) {
      const before = requests.length;
      let result = await run([...create, ...flags, '--dry-run'], env, input);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(requests.length, before, 'Dry-run sends no business request.');
      assert.equal(JSON.parse(result.stdout).data.sizeBytes, Buffer.byteLength(secret));
      assert.doesNotMatch(result.stdout + result.stderr, /Private fixture|fixture-text-token/);
      result = await run([...create, ...flags, '--title', 'Notes'], env, input);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(content, secret);
      assert.equal(requests.at(-1).method, 'POST');
      assert.equal(requests.at(-1).url.pathname, '/agent/api/external/knowledge-bases/sources/text');
      assert.equal(requests.at(-1).body.inputMethod, 'text_input');
      assert.equal(requests.at(-1).body.scope, 'company');
      assert.equal(requests.at(-1).body.name, 'Text KB');
      assert.equal(requests.at(-1).headers['cli-token'], 'fixture-text-token');
      assert.equal(requests.at(-1).headers.authorization, undefined);
      assert.equal(JSON.parse(result.stdout).data.item.displayName, 'Notes.md');
    }
    let result = await run(read, env);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).data.content, secret);
    assert.equal(JSON.parse(result.stdout).data.item.contentRevision, revision);
    assert.equal(requests.at(-1).url.searchParams.get('scope'), 'company');
    result = await run([...read, '--jq', '.content | error'], env);
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).error.code, 'OUTPUT_PROJECTION_FAILED');
    assert.doesNotMatch(result.stderr, /Private fixture|quoted/);
    assert.equal(JSON.parse(result.stdout).data.content, undefined, 'Sensitive projection failures never include source content in the error envelope.');
    assert.deepEqual(JSON.parse(result.stdout).data.item, { id: 'text-1', contentRevision: revision });
    assert.doesNotMatch(result.stdout, /Private fixture|quoted/);
    const output = path.join(root, 'read.md');
    result = await run([...read, '--out', output], env);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readFileSync(output), Buffer.from(secret));
    assert.equal(JSON.parse(result.stdout).data.content, undefined);
    assert.equal(JSON.parse(result.stdout).data.out, output);
    const beforeOverwrite = requests.length;
    result = await run([...read, '--out', output], env);
    assert.equal(result.status, 1);
    assert.equal(requests.length, beforeOverwrite);
    assert.deepEqual(readFileSync(output), Buffer.from(secret));
    const link = path.join(root, 'dangling.md');
    symlinkSync(path.join(root, 'missing.md'), link);
    result = await run([...read, '--out', link], env);
    assert.equal(result.status, 1, 'An existing dangling symlink is not an available output path.');
    assert.equal(requests.length, beforeOverwrite);
    const concurrent = path.join(root, 'concurrent.md');
    raceOutput = concurrent;
    result = await run([...read, '--out', concurrent], env);
    assert.equal(result.status, 1, 'Exclusive creation protects a path created after the precheck.');
    assert.equal(readFileSync(concurrent, 'utf8'), 'Keep the concurrent file.');

    const currentRevision = revision;
    result = await run([...replace(), '--text', secret], env);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).data.outcome, 'unchanged');
    assert.equal(revision, currentRevision);
    result = await run([...replace(), '--stdin', '--dry-run'], env, Buffer.from(secret));
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /Private fixture/);
    result = await run([...replace(), '--stdin'], env, Buffer.from(`${secret}\r\nchanged`));
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).data.outcome, 'replaced');
    assert.equal(revision, currentRevision + 1);
    assert.equal(requests.at(-1).method, 'PUT');
    assert.equal(requests.at(-1).url.pathname, '/agent/api/external/knowledge-bases/sources/text-1/text');
    assert.equal(requests.at(-1).body.expectedRevision, currentRevision);
    const beforeConflict = requests.length;
    result = await run([...replace(), '--expected-revision', String(currentRevision), '--text', secret], env);
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).error.code, 'SOURCE_CONTENT_REVISION_CONFLICT');
    assert.doesNotMatch(result.stderr, /Private fixture/);
    assert.equal(requests.length, beforeConflict + 1, 'Conflict never retries or reads another revision.');
    assert.equal(content, `${secret}\r\nchanged`);

    for (const [status, code] of [[400, 'SOURCE_TEXT_EMPTY'], [413, 'SOURCE_FILE_TOO_LARGE'], [403, 'SOURCE_FORBIDDEN'], [409, 'SOURCE_COMPILE_IN_PROGRESS'], [503, 'SOURCE_COMMIT_UNKNOWN'], [404, 'SOURCE_NOT_FOUND'], [401, 'TOKEN_EXPIRED']]) {
      failure = { status, code };
      const before = requests.length;
      result = await run([...create, '--text', secret], env);
      assert.equal(result.status, 1);
      assert.equal(JSON.parse(result.stderr).error.code, code);
      assert.equal(requests.length, before + 1);
      assert.doesNotMatch(result.stdout + result.stderr, /Private fixture|fixture-text-token/);
    }
    failure = undefined;
    loseResponse = true;
    const beforeLoss = requests.length;
    result = await run([...replace(), '--text', secret], env);
    assert.equal(result.status, 1);
    assert.equal(requests.length, beforeLoss + 1, 'A lost response is never replayed.');
    assert.doesNotMatch(result.stderr, /Private fixture/);
    loseResponse = false;

    const invalidFile = path.join(root, 'invalid.txt');
    writeFileSync(invalidFile, Buffer.from([0xef, 0xbb, 0xbf, 0xc3, 0x28]));
    const oversized = path.join(root, 'large.md');
    writeFileSync(oversized, ''); truncateSync(oversized, maxBytes + 1);
    const beforeInvalid = requests.length;
    for (const [args, input] of [
      [create], [[...create, '--text', secret, '--file', sourceFile]], [[...create, '--text', secret, '--stdin']],
      [[...create, '--text', ' \r\n\t']], [[...create, '--text', '']], [[...create, '--file', invalidFile]],
      [[...create, '--file', oversized]], [[...create, '--file', path.join(root, 'file.pdf')]],
      [[...create, '--stdin'], Buffer.from([0xff])], [[...create, '--stdin'], Buffer.alloc(maxBytes + 1, 65)],
      [[...create, '--text', secret, '--scope', 'system']], [[...create, '--text', secret, '--title', '../bad']],
      [[...create, '--text', secret, '--title', 'C1\u0085title']],
      [[...replace(), '--source-type', 'zip', '--text', secret]], [[...replace(), '--expected-revision', '0', '--text', secret]],
      [['kb', 'source', 'create-text', '--host', host, '--name', 'Text KB', '--text', secret]],
    ]) {
      result = await run(args, env, input);
      assert.equal(result.status, 1, result.stdout);
      assert.doesNotMatch(result.stdout + result.stderr, /Private fixture/);
    }
    assert.equal(requests.length, beforeInvalid);

    for (const filter of ['all', 'text']) {
      result = await run(['kb', '+list-sources', ...target, '--content-type', filter], env);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(requests.at(-1).url.searchParams.get('contentType'), filter);
      assert.equal(JSON.parse(result.stdout).data.items[0].contentRevision, revision);
    }
    result = await run(['kb', '+list-sources', ...target, '--content-type', 'zip'], env);
    assert.equal(result.status, 1);
    const logs = readdirSync(path.join(home, '.ae-cli', 'log')).map(file => readFileSync(path.join(home, '.ae-cli', 'log', file), 'utf8')).join('');
    assert.doesNotMatch(logs, /Private fixture|quoted|fixture-text-token/);
    assert.match(logs, /--text=\*\*\*/);

    for (const [separator, bom, trailing] of [
      ['\n', false, false], ['\n', true, true], ['\r\n', false, true],
      ['\r\n', true, false], ['\r', false, false], ['\r', true, true],
    ]) {
      const original = `${bom ? '\uFEFF' : ''}first${separator}second${trailing ? separator : ''}`;
      result = await run([...create, '--stdin'], env, Buffer.from(original));
      assert.equal(result.status, 0, result.stderr);
      result = await run(read, env);
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(Buffer.from(JSON.parse(result.stdout).data.content), Buffer.from(original));
    }

    // Exercise JSON escaping above the former preview limit through real child-process HTTP calls.
    const escaped = `\uFEFF${'\u0001"\\\r\nΩ'.repeat(150000)}`;
    result = await run([...create, '--stdin'], env, Buffer.from(escaped));
    assert.equal(result.status, 0, result.stderr);
    assert.ok(Buffer.byteLength(escaped) > 1024 * 1024);
    result = await run(read, env);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).data.content, escaped);

    // The inclusive 50 MiB limit is independent of JSON escaping overhead.
    const exact = path.join(root, 'exact.txt');
    writeFileSync(exact, Buffer.alloc(maxBytes, 1));
    result = await run([...create, '--file', exact], env);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(Buffer.byteLength(content), maxBytes);
    assert.ok(requests.at(-1).requestBytes > maxBytes * 5);
    const exactOutput = path.join(root, 'exact-read.txt');
    result = await run([...read, '--out', exactOutput], env);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(digest(readFileSync(exactOutput)), digest(readFileSync(exact)));
    result = await run([...replace(), '--stdin'], env, Buffer.concat([Buffer.alloc(maxBytes - 1, 1), Buffer.from('X')]));
    assert.equal(result.status, 0, result.stderr);
    assert.equal(revision, 2);
    const updatedOutput = path.join(root, 'updated-read.txt');
    result = await run([...read, '--out', updatedOutput], env);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(digest(readFileSync(updatedOutput)), digest(content));
  } finally {
    await new Promise(resolve => server.close(resolve));
    rmSync(root, { recursive: true, force: true });
  }
});
