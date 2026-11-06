import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { waitForCompileRun } from '../skills/ae-analysis/scripts/project-semantic-knowledge-wiki/wait-compile-run.mjs';

const config = { name: 'Project KB', runId: 'run-1', host: 'https://example.test', timeoutMs: 100, pollIntervalMs: 10 };
const response = (status, extra = {}) => ({ ok: true, data: {
  knowledgeBase: { id: 'kb-1', scope: 'company' },
  compileRun: { id: 'run-1', status, errorMessage: null }, ...extra,
} });

test('polls the submitted run through queued/running/succeeded with company scope', async () => {
  const statuses = ['queued', 'running', 'succeeded'], calls = [];
  let elapsed = 0;
  const result = await waitForCompileRun(config, async (flags, options) => {
    calls.push(flags);
    assert.ok(options.timeoutMs <= 100 - elapsed);
    return response(statuses.shift());
  }, { now: () => elapsed, sleep: async ms => { elapsed += ms; } });
  assert.equal(result.data.compileRun.status, 'succeeded');
  assert.equal(calls.length, 3);
  for (const flags of calls) {
    assert.equal(flags[flags.indexOf('--run-id') + 1], 'run-1');
    assert.equal(flags[flags.indexOf('--scope') + 1], 'company');
  }
});

test('a failed run stops immediately despite compiled aggregate state or a newer successful run', async () => {
  let calls = 0;
  await assert.rejects(waitForCompileRun(config, async () => {
    calls++;
    return response('failed', { status: 'wiki_pending', buildStatus: 'compiled', activeRunId: null,
      compileRun: { id: 'run-1', status: 'failed', errorMessage: 'No publication progress' } });
  }), error => error.code === 'KB_COMPILE_FAILED' && /No publication progress/.test(error.message));
  assert.equal(calls, 1);
});

test('cancelled runs preserve failure semantics', async () => {
  await assert.rejects(waitForCompileRun(config, async () => response('cancelled')),
    error => error.code === 'KB_COMPILE_CANCELLED');
});

test('administrator review stops immediately with the original stable code and no further polling', async () => {
  for (const code of ['KB_PUBLICATION_REVIEW_REQUIRED', 'KB_PUBLICATION_COMMIT_UNKNOWN', 'KB_PUBLICATION_ROLLBACK_INCOMPLETE']) {
    let calls = 0;
    await assert.rejects(waitForCompileRun(config, async () => {
      calls++;
      return response('running', { publicationReview: { code } });
    }, { now: () => 0, sleep: async () => { throw new Error('Must not sleep while administrator review is required.'); } }),
    error => error.code === code && /administrator review/i.test(error.message));
    assert.equal(calls, 1);
  }
});

test('legacy aggregate responses and mismatched identities never become successful completion', async () => {
  for (const data of [
    { status: 'wiki_compiled', buildStatus: 'compiled' },
    { knowledgeBase: { id: 'kb-1', scope: 'company' }, compileRun: { id: 'other-run', status: 'succeeded' } },
    { knowledgeBase: { id: 'kb-1', scope: 'personal' }, compileRun: { id: 'run-1', status: 'succeeded' } },
  ]) {
    await assert.rejects(waitForCompileRun(config, async () => ({ ok: true, data })),
      error => error.code === 'KB_COMPILE_RUN_STATUS_UNSUPPORTED');
  }
});

test('a busy run reaches a bounded deadline without starting or cancelling compilation', async () => {
  let elapsed = 0, calls = 0;
  await assert.rejects(waitForCompileRun(config, async flags => {
    assert.equal(flags[1], '+status'); calls++; return response('running');
  }, { now: () => elapsed, sleep: async ms => { elapsed += ms; } }),
  error => error.code === 'KB_COMPILE_WAIT_TIMEOUT');
  assert.equal(elapsed, 100);
  assert.equal(calls, 10);
});

test('permission errors stop without scope fallback or another request', async () => {
  let calls = 0;
  await assert.rejects(waitForCompileRun(config, async () => {
    calls++; return { ok: false, error: { code: 'FORBIDDEN' } };
  }), error => error.code === 'FORBIDDEN');
  assert.equal(calls, 1);
});

for (const reviewCode of [null, 'KB_PUBLICATION_COMMIT_UNKNOWN']) {
  test(`real CLI polling preserves exact failed/review state over HTTP (${reviewCode ?? 'failed'})`, async () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'kb-run-poll-'));
    const requests = [];
    const server = http.createServer((request, reply) => {
      if (request.url !== '/agent/api/external/knowledge-bases/status') {
        reply.writeHead(200, { 'content-type': 'application/json' });
        reply.end(JSON.stringify({ return_code: 0, data: { version: '6.0.58' } }));
        return;
      }
      const chunks = [];
      request.on('data', chunk => chunks.push(chunk));
      request.on('end', () => {
        requests.push({ url: request.url, method: request.method, body: JSON.parse(Buffer.concat(chunks).toString()) });
        reply.writeHead(200, { 'content-type': 'application/json' });
        const result = response(requests.length === 1 || reviewCode ? 'running' : 'failed');
        if (requests.length > 1) {
          if (reviewCode) result.data.publicationReview = { code: reviewCode };
          else result.data.compileRun.errorMessage = 'No publication progress';
        }
        reply.end(JSON.stringify(result.data));
      });
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const host = `http://127.0.0.1:${server.address().port}`;
    const runtimeRoot = path.join(directory, 'runtime');
    mkdirSync(path.join(runtimeRoot, '.ae-config'), { recursive: true });
    writeFileSync(path.join(runtimeRoot, '.ae-config/cli-token.json'), JSON.stringify({ url: host, token: 'fixture-poll-only' }));
    const invoke = (flags, options) => new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts', '--no-update-check', ...flags], {
        cwd: path.resolve(import.meta.dirname, '..'),
        env: { ...process.env, HOME: path.join(directory, 'home'), SANDBOX_RUNTIME_ROOT: runtimeRoot },
        stdio: ['ignore', 'pipe', 'pipe'], timeout: options.timeoutMs,
      });
      let out = '', err = '';
      child.stdout.on('data', data => { out += data; });
      child.stderr.on('data', data => { err += data; });
      child.once('error', reject);
      child.once('close', code => {
        if (code !== 0) return reject(new Error(err));
        try { resolve(JSON.parse(out)); } catch (error) { reject(error); }
      });
    });
    try {
      await assert.rejects(waitForCompileRun({ ...config, host, timeoutMs: 30_000, pollIntervalMs: 1 }, invoke),
        error => reviewCode ? error.code === reviewCode && /administrator review/.test(error.message)
          : error.code === 'KB_COMPILE_FAILED' && /No publication progress/.test(error.message));
      assert.equal(requests.length, 2);
      for (const request of requests) {
        assert.equal(request.url, '/agent/api/external/knowledge-bases/status');
        assert.equal(request.method, 'POST');
        assert.deepEqual(request.body, { name: 'Project KB', scope: 'company', runId: 'run-1' });
      }
    } finally {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
      rmSync(directory, { recursive: true, force: true });
    }
  });
}

test('stdin and eval imports are safe and do not execute the CLI entrypoint', () => {
  const moduleUrl = new URL('../skills/ae-analysis/scripts/project-semantic-knowledge-wiki/wait-compile-run.mjs', import.meta.url).href;
  const source = `await import(${JSON.stringify(moduleUrl)}); console.log('imported');`;
  for (const args of [['--input-type=module', '-'], ['--input-type=module', '-e', source]]) {
    const child = spawnSync(process.execPath, args, { input: source, encoding: 'utf8' });
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stdout.trim(), 'imported');
  }
});

test('symlink CLI entry still runs argument validation without sending requests', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'kb-run-entry-'));
  try {
    const link = path.join(directory, 'wait.mjs');
    symlinkSync(path.resolve(import.meta.dirname, '../skills/ae-analysis/scripts/project-semantic-knowledge-wiki/wait-compile-run.mjs'), link);
    const child = spawnSync(process.execPath, [link], { encoding: 'utf8' });
    assert.equal(child.status, 1);
    assert.equal(child.stdout, '');
    const result = JSON.parse(child.stderr);
    assert.equal(result.error.code, 'KB_COMPILE_WAIT_FAILED');
    assert.match(result.error.message, /--name, --run-id and --host are required/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
