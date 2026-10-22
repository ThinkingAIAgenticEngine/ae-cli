import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { normalizeUrl } from '../src/core/url-utils.ts';
import type { Command, RuntimeContext } from '../src/framework/types.ts';

// Execute the unchanged command source with isolated auth/output boundaries. Native
// fetch and HTTP sockets exercise the actual mid-body failure, without stored credentials.
function compile(relative: string): string {
  return ts.transpileModule(fs.readFileSync(new URL(relative, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}
const commandSource = compile('../src/commands/te-team/run/watch-run.ts');
const tokenSource = compile('../src/core/external-cli-token.ts');
const token = 'cli_synthetic_watch_fixture';
const event = (name: string, payload: unknown) => `event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`;
const completed = { id: 'fixture-run', status: 'completed' };
const log = { timestamp: 123456789, type: 'info', stepId: 'step-1', content: 'fixture progress' };
const streamPath = '/agent/api/external/team/teamrun/stream/fixture-run';

class Exit extends Error {
  constructor(readonly code: number) { super(`Exit ${code}`); }
}

function fixture(host: string, options: {
  quiet?: boolean;
  afterLog?: number;
  fetch?: typeof fetch;
  auth?: (attempt: number) => Record<string, string>;
  output?: () => void;
} = {}) {
  let authCalls = 0;
  let released = 0;
  let cancelled = 0;
  const sleeps: number[] = [];
  const output: unknown[] = [];
  const errors: { type: string; message: string }[] = [];
  let stderr = '';
  const tokenModule = { exports: {} };
  new Function('require', 'module', 'exports', 'process', tokenSource)(
    (name: string) => {
      if (name === 'node:fs') return { default: fs };
      if (name === './url-utils.js') return { normalizeUrl };
      throw new Error(`Unexpected token dependency: ${name}`);
    }, tokenModule, tokenModule.exports,
    { env: { AE_CLI_TOKEN: token, AE_CLI_TOKEN_HOST: host } },
  );
  const dependencies: Record<string, unknown> = {
    '../shared.js': { BASE_RUN_PATH: '/agent/api/external/team/teamrun' },
    '../../../core/mcp-access.js': { getAuthHeaders: async () => {
      authCalls += 1;
      return options.auth?.(authCalls) ?? { 'cli-token': token };
    } },
    '../../../core/external-cli-token.js': tokenModule.exports,
    '../../../framework/output.js': {
      printOutput: async (payload: unknown, format: string) => {
        assert.equal(format, 'json'); options.output?.(); output.push(payload);
      },
      printError: (type: string, message: string) => errors.push({ type, message }),
    },
  };
  const commandModule = { exports: {} };
  new Function('require', 'module', 'exports', 'process', 'fetch', 'setTimeout', commandSource)(
    (name: string) => {
      assert.ok(name in dependencies, `Unexpected command dependency: ${name}`);
      return dependencies[name];
    }, commandModule, commandModule.exports,
    { stderr: { write: (text: string) => { stderr += text; } }, exit: (code: number) => { throw new Exit(code); } },
    async (input: string, init: RequestInit) => {
      assert.equal(init.redirect, 'error', 'external credentials must stay on the selected origin');
      const response = await (options.fetch ?? fetch)(input, init);
      if (response.body) {
        const getReader = response.body.getReader.bind(response.body);
        response.body.getReader = (() => {
          const reader = getReader();
          const cancel = reader.cancel.bind(reader);
          const release = reader.releaseLock.bind(reader);
          reader.cancel = (...args) => { cancelled += 1; return cancel(...args); };
          reader.releaseLock = () => { released += 1; release(); };
          return reader;
        }) as typeof response.body.getReader;
      }
      return response;
    },
    (callback: () => void, ms: number) => { sleeps.push(ms); queueMicrotask(callback); },
  );
  const command = (commandModule.exports as { watchRun: Command }).watchRun;
  const ctx = {
    str: () => 'fixture-run', bool: () => Boolean(options.quiet),
    num: () => options.afterLog ?? 0, host: () => host,
  } as RuntimeContext;
  return {
    async run() {
      try { await command.execute(ctx); }
      catch (error) {
        if (error instanceof Exit) return { code: error.code, output, errors, stderr, authCalls, released, cancelled, sleeps };
        throw error;
      }
      throw new Error('Watch returned without an exit code');
    },
    state: () => ({ authCalls, released, cancelled, sleeps }),
  };
}

async function serverFixture(handle: (request: http.IncomingMessage, response: http.ServerResponse, attempt: number) => void) {
  const urls: string[] = [];
  const server = http.createServer((request, response) => {
    urls.push(request.url!);
    assert.equal(request.headers['cli-token'], token);
    response.setHeader('Content-Type', 'text/event-stream');
    handle(request, response, urls.length);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  return {
    host: `http://127.0.0.1:${address.port}`, urls,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    },
  };
}

test('native SSE socket reset after snapshot/log reconnects with the cursor and reaches final', async () => {
  const server = await serverFixture((_request, response, attempt) => {
    if (attempt > 1) { response.end(event('final', completed)); return; }
    response.write(event('snapshot', { status: 'running' }) + event('log', log) + 'event: final\ndata: {');
    // Flush real headers/body first; destroy the socket before a final event or normal EOF.
    setTimeout(() => response.destroy(), 50);
  });
  try {
    const result = await fixture(server.host).run();
    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(server.urls, [streamPath, `${streamPath}?afterLog=${log.timestamp}`]);
    assert.deepEqual(result.output, [completed]);
    assert.deepEqual(result.errors, []);
    assert.match(result.stderr, /stream read error: terminated/);
    assert.equal(result.stderr.match(/fixture progress/g)?.length, 1);
    assert.equal(result.authCalls, 2);
    assert.equal(result.released, 2);
    assert.deepEqual(result.sleeps, [2000]);
  } finally { await server.close(); }
});

for (const failure of ['eof', 'connect-reset'] as const) {
  test(`${failure} reconnects without losing an explicit or received log cursor`, async () => {
    const server = await serverFixture((request, response, attempt) => {
      if (attempt > 1) { response.end(event('final', completed)); return; }
      if (failure === 'connect-reset') request.socket.destroy();
      else response.end(event('log', log));
    });
    try {
      const result = await fixture(server.host, { afterLog: 42 }).run();
      assert.equal(result.code, 0);
      assert.deepEqual(server.urls, [`${streamPath}?afterLog=42`, `${streamPath}?afterLog=${failure === 'eof' ? log.timestamp : 42}`]);
      assert.equal(result.authCalls, 2);
      assert.equal(result.released, failure === 'eof' ? 2 : 1);
      assert.deepEqual(result.sleeps, [2000]);
    } finally { await server.close(); }
  });
}

test('mixed connection, EOF, and native read failures share ten retries and stop without a final sleep', async () => {
  const server = await serverFixture((request, response, attempt) => {
    if (attempt % 3 === 1) request.socket.destroy();
    else if (attempt % 3 === 2) response.end(event('log', log));
    else {
      response.write(event('log', log));
      setTimeout(() => response.destroy(), 30);
    }
  });
  try {
    const result = await fixture(server.host).run();
    assert.equal(result.code, 1);
    assert.equal(server.urls.length, 11, 'one initial connection plus ten retries');
    assert.equal(result.authCalls, 11);
    assert.equal(result.released, 7);
    assert.deepEqual(result.sleeps, Array(10).fill(2000));
    assert.deepEqual(result.errors, [{ type: 'api', message: 'Stream closed after 10 reconnect attempts' }]);
    assert.ok(!result.stderr.includes('11/10'));
    assert.ok(server.urls.slice(2).every(url => url.endsWith(`afterLog=${log.timestamp}`)));
  } finally { await server.close(); }
});

for (const status of [401, 403, 500]) {
  test(`HTTP ${status} exits without a transport retry`, async () => {
    let requests = 0;
    const result = await fixture('http://fixture.invalid', { fetch: async () => {
      requests += 1; return new Response('', { status });
    } }).run();
    assert.equal(result.code, 1);
    assert.equal(requests, 1);
    assert.equal(result.errors.length, 1);
    assert.deepEqual(result.sleeps, []);
  });
}

for (const [name, payload, code] of [
  ['final', completed, 0],
  ['final', { status: 'partial_success' }, 0],
  ['final', { status: 'failed', errorMessage: 'Business failure' }, 1],
  ['final', { status: 'cancelled' }, 1],
  ['snapshot', { status: 'waiting_user', pendingQuestion: 'Continue?' }, 2],
  ['update', { status: 'waiting_user', pendingQuestion: 'Continue?' }, 2],
  ['error', { error: 'Permission denied' }, 1],
] as const) {
  test(`${name} ${JSON.stringify(payload)} preserves its exit/output without reconnecting`, async () => {
    const result = await fixture('http://fixture.invalid', {
      fetch: async () => new Response(event(name, payload)),
    }).run();
    assert.equal(result.code, code);
    assert.deepEqual(result.output, name === 'error' ? [] : [payload]);
    assert.deepEqual(result.errors, name === 'error' ? [{ type: 'api', message: 'Permission denied' }] : []);
    assert.equal(result.authCalls, 1);
    assert.equal(result.released, 1);
    assert.equal(result.cancelled, 1);
    assert.deepEqual(result.sleeps, []);
  });
}

test('quiet hides read-error diagnostics while preserving final output', async () => {
  let requests = 0;
  const result = await fixture('http://fixture.invalid', { quiet: true, fetch: async () => {
    if (++requests === 1) return new Response(new ReadableStream({ start(controller) { controller.error(new TypeError('terminated')); } }));
    return new Response(event('final', completed));
  } }).run();
  assert.equal(result.code, 0);
  assert.equal(requests, 2);
  assert.equal(result.stderr, '');
  assert.deepEqual(result.output, [completed]);
});

test('read-error diagnostics redact external credentials', async () => {
  let requests = 0;
  const result = await fixture('http://fixture.invalid', { fetch: async () => {
    if (++requests === 1) return new Response(new ReadableStream({ start(controller) { controller.error(new TypeError(`terminated ${token}`)); } }));
    return new Response(event('final', completed));
  } }).run();
  assert.equal(result.code, 0);
  assert.match(result.stderr, /\[REDACTED\]/);
  assert.ok(!result.stderr.includes(token));
});

test('a credential failure on reconnect stops before another business request', async () => {
  const denied = new Error('Credential was removed');
  let requests = 0;
  const run = fixture('http://fixture.invalid', {
    auth: attempt => { if (attempt > 1) throw denied; return { 'cli-token': token }; },
    fetch: async () => { requests += 1; return new Response(''); },
  });
  await assert.rejects(run.run, error => error === denied);
  assert.equal(requests, 1);
  assert.equal(run.state().authCalls, 2);
  assert.equal(run.state().released, 1);
});

test('output errors escape without being mistaken for a dropped stream, and release the reader', async () => {
  const failure = new TypeError('Output failed');
  const run = fixture('http://fixture.invalid', {
    output: () => { throw failure; }, fetch: async () => new Response(event('final', completed)),
  });
  await assert.rejects(run.run, error => error === failure);
  assert.equal(run.state().authCalls, 1);
  assert.equal(run.state().released, 1);
  assert.deepEqual(run.state().sleeps, []);
});

test('an aborted read escapes without reconnecting and releases the reader', async () => {
  const aborted = new DOMException('Cancelled', 'AbortError');
  const run = fixture('http://fixture.invalid', {
    fetch: async () => new Response(new ReadableStream({ start(controller) { controller.error(aborted); } })),
  });
  await assert.rejects(run.run, error => error === aborted);
  assert.equal(run.state().authCalls, 1);
  assert.equal(run.state().released, 1);
  assert.deepEqual(run.state().sleeps, []);
});

test('the full CLI reconnects a native broken stream and prints one final JSON envelope', { timeout: 15000 }, async () => {
  const streamUrls: string[] = [];
  const unexpectedUrls: string[] = [];
  let terminalStreamClosed = false;
  const server = http.createServer((request, response) => {
    assert.equal(request.headers['cli-token'], token);
    if (request.url === '/v1/ta/cli/token/renew') {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ return_code: 0 }));
      return;
    }
    if (request.url === '/v1/ta/cli/config') {
      response.writeHead(404).end(); // No startup version-sync target in the isolated server.
      return;
    }
    if (!request.url?.startsWith(streamPath)) {
      unexpectedUrls.push(request.url ?? ''); response.writeHead(404).end(); return;
    }
    streamUrls.push(request.url!);
    response.setHeader('Content-Type', 'text/event-stream');
    if (streamUrls.length === 1) {
      response.write(event('snapshot', { status: 'running' }) + event('log', log));
      setTimeout(() => response.destroy(), 50);
    } else {
      response.on('close', () => { terminalStreamClosed = true; });
      response.write(event('final', completed));
      // The client must exit after final even if the server leaves the stream open.
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const host = `http://127.0.0.1:${address.port}`;
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts', '--no-update-check',
    'team', '+run-watch', '--host', host, '--id', 'fixture-run'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: { ...process.env, AE_API_PREFIX: '/agent', AE_CLI_TOKEN: token, AE_CLI_TOKEN_HOST: host,
      AE_CLI_NO_COMPAT_CHECK: '1', NO_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = ''; let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const timeout = setTimeout(() => child.kill(), 10000);
  try {
    const code = await new Promise<number | null>((resolve, reject) => {
      child.on('error', reject); child.on('close', resolve);
    });
    assert.equal(code, 0, stderr);
    assert.deepEqual(unexpectedUrls, []);
    assert.deepEqual(streamUrls, [streamPath, `${streamPath}?afterLog=${log.timestamp}`]);
    assert.deepEqual(JSON.parse(stdout), { ok: true, data: completed });
    assert.match(stderr, /stream read error: terminated/);
    assert.ok(!stderr.includes(token));
    assert.ok(terminalStreamClosed);
  } finally {
    clearTimeout(timeout); child.kill(); server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
