import assert from 'node:assert/strict';
import { createServer, type ServerResponse } from 'node:http';
import { after, afterEach, mock, test } from 'node:test';
import { getCliToken, _resetRenewMemoryForTest } from '../src/core/cli-token.ts';
import { setExternalCliTokenFile } from '../src/core/external-cli-token.ts';
import { logger } from '../src/core/logger.ts';

const environmentKeys = ['AE_CLI_TOKEN', 'AE_CLI_TOKEN_HOST', 'AE_CLI_TOKEN_FILE'] as const;
const originalEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
const token = 'cli_synthetic_renew_cancellation';
const info = mock.method(logger, 'info', () => undefined);
const warn = mock.method(logger, 'warn', () => undefined);

after(() => {
  info.mock.restore();
  warn.mock.restore();
});

afterEach(() => {
  for (const key of environmentKeys) {
    if (originalEnvironment[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnvironment[key];
  }
  setExternalCliTokenFile(undefined);
  _resetRenewMemoryForTest();
});

async function within<T>(promise: Promise<T>, milliseconds = 1000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([promise, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Local test deadline exceeded')), milliseconds);
    })]);
  } finally {
    clearTimeout(timer!);
  }
}

type RenewalRequest = { response: ServerResponse; closed: Promise<void> };

async function withRenewServer(run: (host: string, next: () => Promise<RenewalRequest>, count: () => number) => Promise<void>) {
  const requests: RenewalRequest[] = [];
  const awaiting: ((request: RenewalRequest) => void)[] = [];
  let count = 0;
  const server = createServer((request, response) => {
    assert.equal(request.url, '/v1/ta/cli/token/renew');
    assert.equal(request.headers['cli-token'], token);
    count++;
    const renewal = { response, closed: new Promise<void>((resolve) => response.once('close', resolve)) };
    const resolve = awaiting.shift();
    if (resolve) resolve(renewal);
    else requests.push(renewal);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const host = `http://127.0.0.1:${address.port}`;
  setExternalCliTokenFile(undefined);
  process.env.AE_CLI_TOKEN = token;
  process.env.AE_CLI_TOKEN_HOST = host;
  delete process.env.AE_CLI_TOKEN_FILE;
  _resetRenewMemoryForTest();
  const next = () => within(new Promise<RenewalRequest>((resolve) => {
    const request = requests.shift();
    if (request) resolve(request);
    else awaiting.push(resolve);
  }));
  try {
    await run(host, next, () => count);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('an already canceled token lookup never starts a renewal', async () => {
  await withRenewServer(async (host, _next, count) => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(within(getCliToken(host, controller.signal)), { name: 'AbortError' });
    assert.equal(count(), 0);
  });
});

test('a local deadline rejects the token waiter and closes its pending renewal connection', async () => {
  await withRenewServer(async (host, next) => {
    const controller = new AbortController();
    const result = getCliToken(host, controller.signal);
    const rejected = assert.rejects(within(result), { name: 'AbortError' });
    const request = await next();
    const timer = setTimeout(() => controller.abort(), 30);
    try {
      await rejected;
      await within(request.closed);
      assert.equal(request.response.writableEnded, false);
    } finally {
      clearTimeout(timer);
    }
  });
});

test('canceling one waiter keeps a shared renewal alive for an ordinary caller', async () => {
  await withRenewServer(async (host, next, count) => {
    const controller = new AbortController();
    const canceled = getCliToken(host, controller.signal);
    const rejected = assert.rejects(within(canceled), { name: 'AbortError' });
    const ordinary = getCliToken(host);
    const request = await next();
    controller.abort();
    await rejected;
    assert.equal(request.response.destroyed, false);
    request.response.end('{"return_code":0}');
    assert.equal(await within(ordinary), token);
    assert.equal(await getCliToken(host), token);
    assert.equal(count(), 1);
  });
});

test('canceling all waiters closes the renewal and a fresh retry is still deduplicated', async () => {
  await withRenewServer(async (host, next, count) => {
    const first = new AbortController();
    const second = new AbortController();
    const firstRejected = assert.rejects(within(getCliToken(host, first.signal)), { name: 'AbortError' });
    const secondRejected = assert.rejects(within(getCliToken(host, second.signal)), { name: 'AbortError' });
    const oldRequest = await next();
    first.abort();
    second.abort();
    await Promise.all([firstRejected, secondRejected]);
    const retry = getCliToken(host);
    const newRequest = await next();
    await within(oldRequest.closed);
    const sharedRetry = getCliToken(host);
    newRequest.response.end('{"return_code":0}');
    assert.deepEqual(await within(Promise.all([retry, sharedRetry])), [token, token]);
    assert.equal(count(), 2);
  });
});

test('cancellation also closes a renewal whose response body has stalled', async () => {
  await withRenewServer(async (host, next) => {
    const controller = new AbortController();
    const rejected = assert.rejects(within(getCliToken(host, controller.signal)), { name: 'AbortError' });
    const request = await next();
    request.response.writeHead(200, { 'content-type': 'application/json' });
    request.response.write('{"return_code":');
    controller.abort();
    await rejected;
    await within(request.closed);
    assert.equal(request.response.writableEnded, false);
  });
});

test('ordinary renewal failures remain best effort and do not populate the daily success cache', async () => {
  await withRenewServer(async (host, next, count) => {
    const first = getCliToken(host);
    const failed = await next();
    failed.response.writeHead(503);
    failed.response.end('unavailable');
    assert.equal(await within(first), token);
    const retry = getCliToken(host);
    const renewed = await next();
    renewed.response.end('{"return_code":0}');
    assert.equal(await within(retry), token);
    assert.equal(await getCliToken(host), token);
    assert.equal(count(), 2);
  });
});
