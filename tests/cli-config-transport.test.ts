import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net, { type Socket } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import test, { after, before, type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';

const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ae-config-transport-')));
const repository = fileURLToPath(new URL('..', import.meta.url));
const childFile = fileURLToPath(new URL('./fixtures/cli-config-transport-child.mjs', import.meta.url));
const certificate = path.join(directory, 'localhost-cert.pem');
const privateKey = path.join(directory, 'localhost-key.pem');
const fixtureToken = 'cli_transport_fixture';
const payload = { data: { versions: { clusterVersion: '6.0', aeCliVersion: '6.0.56' }, businesses: { dataops: false } } };
const expected = { clusterVersion: '6.0', aeCliVersion: '6.0.56', businesses: { dataops: false } };
let certificateAvailable = false;

before(() => {
  // Trust only this temporary loopback certificate; certificate verification stays enabled.
  try {
    execFileSync('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
      '-keyout', privateKey, '-out', certificate, '-subj', '/CN=localhost',
      '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1',
    ], { stdio: 'pipe', timeout: 15_000 });
    certificateAvailable = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
});
after(() => fs.rmSync(directory, { recursive: true, force: true }));

interface ChildEvent {
  event: string;
  elapsed: number;
  receivedAt: number;
  result?: unknown;
  status?: number;
  body?: string;
}

function loopback(t: TestContext, server: net.Server, protocol = 'http:') {
  const sockets = new Set<Socket>();
  const closedAt: number[] = [];
  server.on('connection', socket => {
    sockets.add(socket);
    socket.on('error', () => {});
    socket.on('close', () => { sockets.delete(socket); closedAt.push(performance.now()); });
  });
  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    if (server.listening) await new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  });
  return {
    sockets,
    closedAt,
    async listen() {
      await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      assert.ok(address && typeof address !== 'string');
      return `${protocol}//127.0.0.1:${address.port}`;
    },
  };
}

async function configurationChild(
  t: TestContext,
  host: string,
  options: { external?: boolean; unrelated?: string } = {},
) {
  const home = fs.mkdtempSync(path.join(directory, 'home-'));
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, USERPROFILE: home };
  for (const key of Object.keys(env)) {
    if (/^(AE_CLI_|TE_AGENT_|SANDBOX_)/.test(key)
      || ['NODE_OPTIONS', 'NODE_TLS_REJECT_UNAUTHORIZED', 'NODE_EXTRA_CA_CERTS'].includes(key)) delete env[key];
  }
  if (certificateAvailable) env.NODE_EXTRA_CA_CERTS = certificate;
  if (options.external) {
    env.AE_CLI_TOKEN = fixtureToken;
    env.AE_CLI_TOKEN_HOST = host;
  }
  const events: ChildEvent[] = [];
  let stdout = '';
  let pending = '';
  let stderr = '';
  let timedOut = false;
  const child = spawn(process.execPath, ['--import', 'tsx', childFile, host, ...(options.unrelated ? [options.unrelated] : [])], {
    cwd: repository, env, stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => { if (child.exitCode === null && child.signalCode === null) child.kill(); });
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    stdout += chunk;
    pending += chunk;
    const lines = pending.split('\n');
    pending = lines.pop()!;
    for (const line of lines) {
      if (line) events.push({ ...JSON.parse(line), receivedAt: performance.now() });
    }
  });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const guard = setTimeout(() => { timedOut = true; child.kill(); }, 15_000);
  const exit = await new Promise<{ code: number | null; signal: NodeJS.Signals | null; receivedAt: number }>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({ code, signal, receivedAt: performance.now() }));
  }).finally(() => clearTimeout(guard));
  assert.equal(timedOut, false, `Transport child exceeded its watchdog:\n${stdout}\n${stderr}`);
  assert.equal(exit.signal, null, stderr);
  assert.equal(exit.code, 0, stderr);
  const settled = events.find(event => event.event === 'configuration-settled');
  assert.ok(settled, `No configuration result:\n${stdout}\n${stderr}`);
  assert.ok(events.some(event => event.event === 'before-exit'), 'The child must exit naturally');
  assert.equal(fs.existsSync(path.join(home, '.ae-cli', 'business-config.json')), false);
  assert.equal(fs.existsSync(path.join(home, '.ae-cli', 'business-skills.json')), false);
  return { events, settled, exit, stderr };
}

function timelyCleanup(result: Awaited<ReturnType<typeof configurationChild>>, closedAt: number[]) {
  assert.ok(closedAt.length > 0, 'The server must observe the client socket closing');
  const socketDelay = Math.max(...closedAt) - result.settled.receivedAt;
  const exitDelay = result.exit.receivedAt - result.settled.receivedAt;
  // This is a cleanup tolerance, not a whole-command latency guarantee.
  assert.ok(socketDelay < 2_000, `The socket stayed open ${Math.round(socketDelay)}ms after configuration settled`);
  assert.ok(exitDelay < 2_000, `Natural exit took ${Math.round(exitDelay)}ms after configuration settled`);
}

test('configuration cancellation releases a stalled TLS connection before natural exit', { timeout: 20_000 }, async t => {
  const server = net.createServer(socket => { socket.on('data', () => {}); });
  const fixture = loopback(t, server, 'https:');
  const result = await configurationChild(t, await fixture.listen());
  assert.equal(result.settled.result, null);
  assert.ok(result.settled.elapsed >= 2_500 && result.settled.elapsed < 5_000);
  t.diagnostic(`Configuration settled at ${Math.round(result.settled.elapsed)}ms; socket closed ${Math.round(Math.max(...fixture.closedAt) - result.settled.receivedAt)}ms later; natural exit ${Math.round(result.exit.receivedAt - result.settled.receivedAt)}ms later.`);
  timelyCleanup(result, fixture.closedAt);
});

test('configuration transport preserves responses and cleans unfinished responses', { concurrency: 4 }, async t => {
  await Promise.all((['http', 'https', 'headers-stall', 'body-stall', 'error-body-stall', 'malformed-json'] as const).map(scenario =>
    t.test(scenario, { timeout: 20_000 }, async scenarioTest => {
      if (scenario === 'https' && !certificateAvailable) {
        scenarioTest.skip('OpenSSL is required to generate the temporary HTTPS certificate');
        return;
      }
      const requests: Array<{ url: string; header?: string | string[] }> = [];
      const handler: http.RequestListener = (request, response) => {
        requests.push({ url: request.url!, header: request.headers['cli-token'] });
        if (scenario === 'headers-stall') return;
        response.writeHead(scenario === 'error-body-stall' ? 503 : 200, { 'Content-Type': 'application/json' });
        if (scenario === 'body-stall' || scenario === 'error-body-stall') response.write('{');
        else response.end(scenario === 'malformed-json' ? '{' : JSON.stringify(payload));
      };
      const server = scenario === 'https'
        ? https.createServer({ key: fs.readFileSync(privateKey), cert: fs.readFileSync(certificate) }, handler)
        : http.createServer(handler);
      const fixture = loopback(scenarioTest, server, scenario === 'https' ? 'https:' : 'http:');
      const result = await configurationChild(scenarioTest, await fixture.listen());
      assert.deepEqual(result.settled.result, scenario === 'http' || scenario === 'https' ? expected : null);
      assert.equal(requests.length, 1);
      const requested = new URL(requests[0].url, 'http://fixture.invalid');
      assert.equal(requested.pathname, '/v1/ta/cli/config');
      assert.equal(requested.searchParams.get('cli-token'), fixtureToken);
      assert.equal(requests[0].header, undefined);
      timelyCleanup(result, fixture.closedAt);
    })));
});

test('configuration transport handles a refused loopback connection', async t => {
  const server = net.createServer();
  const fixture = loopback(t, server);
  const host = await fixture.listen();
  await new Promise<void>(resolve => server.close(() => resolve()));
  const result = await configurationChild(t, host);
  assert.equal(result.settled.result, null);
  assert.ok(result.exit.receivedAt - result.settled.receivedAt < 2_000);
});

test('external configuration tokens stay in headers and cannot follow a redirect', async t => {
  let destinationRequests = 0;
  const destination = loopback(t, http.createServer((_request, response) => {
    destinationRequests += 1;
    response.end(JSON.stringify(payload));
  }));
  const destinationHost = await destination.listen();
  const requests: http.IncomingMessage[] = [];
  const source = loopback(t, http.createServer((request, response) => {
    requests.push(request);
    response.writeHead(302, { Location: `${destinationHost}/redirected` });
    response.end();
  }));
  const result = await configurationChild(t, await source.listen(), { external: true });
  assert.equal(result.settled.result, null);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].headers['cli-token'], fixtureToken);
  assert.equal(new URL(requests[0].url!, 'http://fixture.invalid').searchParams.has('cli-token'), false);
  assert.equal(destinationRequests, 0);
  timelyCleanup(result, source.closedAt);
});

test('configuration timeout leaves concurrent global-fetch requests usable', { timeout: 20_000 }, async t => {
  const stalled = loopback(t, net.createServer(socket => { socket.on('data', () => {}); }), 'https:');
  const unrelated = loopback(t, http.createServer((_request, response) => {
    const timer = setTimeout(() => response.end('unrelated request completed'), 4_000);
    response.on('close', () => clearTimeout(timer));
  }));
  const result = await configurationChild(t, await stalled.listen(), { unrelated: await unrelated.listen() });
  assert.equal(result.settled.result, null);
  const completed = result.events.find(event => event.event === 'unrelated-settled');
  assert.ok(completed, 'Destroying the configuration transport must not cancel unrelated requests');
  assert.equal(completed.status, 200);
  assert.equal(completed.body, 'unrelated request completed');
  assert.ok(completed.elapsed > result.settled.elapsed);
  assert.ok(stalled.closedAt.length > 0);
  assert.ok(Math.max(...stalled.closedAt) - result.settled.receivedAt < 2_000);
});
