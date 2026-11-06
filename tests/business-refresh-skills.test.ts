import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after, type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import spawn from 'cross-spawn';

const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ae-business-refresh-skills-')));
const repository = fileURLToPath(new URL('..', import.meta.url));
const environment = {
  HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, '.config'),
  CODEX_HOME: path.join(home, '.codex'), CLAUDE_CONFIG_DIR: path.join(home, '.claude'),
  VIBE_HOME: path.join(home, '.vibe'), HERMES_HOME: path.join(home, '.hermes'),
  AUTOHAND_HOME: path.join(home, '.autohand'), APPDATA: path.join(home, 'appdata'),
  FLATPAK_XDG_CONFIG_HOME: path.join(home, 'flatpak'),
};
const cleared = ['AE_CLI_TOKEN', 'AE_CLI_TOKEN_HOST', 'AE_CLI_TOKEN_FILE', 'TE_AGENT_CLI_CONFIG_DIR',
  'SANDBOX_RUNTIME_ROOT', 'AE_CLI_NO_COMPAT_CHECK', 'AE_CLI_NO_UPDATE_CHECK', 'CI'];
const previous = new Map([...Object.keys(environment), ...cleared].map(key => [key, process.env[key]]));
Object.assign(process.env, environment);
for (const key of cleared) delete process.env[key];

const { runHostCompatCheck } = await import('../src/core/compat-check.js');
const { refreshEnvironmentConfig } = await import('../src/core/environment-refresh.js');
const { readBusinessConfig, readBusinessConfigForExecution, rememberBusinessConfig, BUSINESS_CONFIG_TTL_MS } = await import('../src/core/business-config.js');
const { runFeatureConfigCheck } = await import('../src/core/feature-config-check.js');
const { peekKbAutoDiscoveryFeature } = await import('../src/core/feature-config.js');
const { saveCredential } = await import('../src/core/secure-store.js');
const { clearCliTokenCache } = await import('../src/core/cli-token.js');
const { saveConfig } = await import('../src/core/config.js');
const { skillCopyHash } = await import('../src/core/skills-tool.js');
const { OPTIONAL_BUSINESSES } = await import('../src/core/businesses.js');
const { Command } = await import('commander');
const { registerCapability } = await import('../src/commands/capability/index.js');
const { registerCapabilityGatewayRoute } = await import('../src/core/capability-routing.js');
const pkg = JSON.parse(fs.readFileSync(path.join(repository, 'package.json'), 'utf8'));
const source = path.join(repository, 'skills');
const argv = ['node', 'ae-cli', 'analysis', 'report', 'list'];

after(() => {
  for (const [key, value] of previous) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  fs.rmSync(home, { recursive: true, force: true });
});

async function fixture(t: TestContext, enabled = false) {
  for (const child of fs.readdirSync(home)) fs.rmSync(path.join(home, child), { recursive: true, force: true });
  for (const key of cleared) delete process.env[key];
  for (const name of ['.codex', '.claude', '.cursor']) fs.mkdirSync(path.join(home, name));
  clearCliTokenCache();
  const host = 'https://business-refresh.example.invalid';
  const token = 'cli_business_refresh_fixture';
  const fingerprint = createHash('sha256').update(token).digest('hex');
  const directory = path.join(home, '.ae-cli');
  const roots = [path.join(home, '.agents', 'skills'), path.join(home, '.claude', 'skills')];
  const closed = Object.fromEntries(OPTIONAL_BUSINESSES.map(name => [name, false]));
  let businesses: Record<string, unknown> | undefined = { ...closed, dataops: enabled };
  let unavailable = false;
  const requests: string[] = [];
  saveCredential(host, { cliToken: token });
  saveConfig({ activeHost: host, hosts: { [host]: { label: 'fixture' } } });
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = new URL(String(input));
    assert.equal(url.origin, host);
    requests.push(url.pathname);
    if (url.pathname === '/v1/ta/cli/token/renew') return Response.json({ return_code: 0 });
    if (url.pathname.startsWith('/api/cli/dataops/v1/capabilities')) {
      const metadata = { id: 'dataops.table.list', description: 'List warehouse tables', risk: 'read' };
      return Response.json({ ok: true, data: url.pathname.endsWith('/execute') ? { items: [] }
        : url.pathname.endsWith('/capabilities') ? [metadata] : metadata });
    }
    assert.equal(url.pathname, '/v1/ta/cli/config');
    return unavailable ? new Response('Unavailable', { status: 503 }) : Response.json({ data: {
      versions: { clusterVersion: '6.0', aeCliVersion: pkg.version },
      features: { projectSemanticKbAutoDiscovery: true },
      ...(businesses === undefined ? {} : { businesses }),
    } });
  });
  const initial = await refreshEnvironmentConfig(host);
  assert.equal(initial.skills.status, 'success', JSON.stringify(initial));
  for (const root of roots) assert.equal(fs.existsSync(path.join(root, 'ae-dataops')), enabled);

  let failApply = false;
  const workerActions: string[] = [];
  const original = spawn.sync;
  t.mock.method(spawn, 'sync', (...args: Parameters<typeof spawn.sync>) => {
    const [command, commandArgs, options] = args as [string, string[], { input?: string }];
    if (commandArgs?.[0]?.endsWith('adapter.mjs')) {
      const request = JSON.parse(String(options.input));
      workerActions.push(request.action);
      if (failApply && request.action === 'apply') {
        return { status: 1, signal: null, stdout: '', stderr: 'Fixture Skill synchronization failure', pid: 0, output: [] };
      }
    }
    return original(...args);
  });

  const expireCompat = () => {
    fs.writeFileSync(path.join(directory, 'compat-check.json'), JSON.stringify({ hosts: {
      [host]: { host, localVersion: pkg.version, expectedVersion: pkg.version, clusterVersion: '6.0',
        lastFetchedAt: new Date(Date.now() - 61 * 60 * 1000).toISOString() },
    } }));
  };
  const expireBusiness = () => rememberBusinessConfig(host, token, businesses, Date.now() - BUSINESS_CONFIG_TTL_MS);
  const assertDataops = (expected: boolean) => {
    for (const root of roots) {
      const destination = path.join(root, 'ae-dataops');
      assert.equal(fs.existsSync(destination), expected, destination);
      if (expected) assert.equal(skillCopyHash(destination), skillCopyHash(path.join(source, 'ae-dataops'), true));
    }
  };
  const records = () => ['business-skills.json', 'business-skill-context.json']
    .map(name => fs.readFileSync(path.join(directory, name), 'utf8'));
  return {
    host, token, fingerprint, directory, roots, closed, requests, workerActions,
    setBusinesses(value: Record<string, unknown> | undefined) { businesses = value; },
    setUnavailable(value: boolean) { unavailable = value; },
    failApply(value: boolean) { failApply = value; },
    expireCompat, expireBusiness, assertDataops, records,
    ledger: () => fs.readFileSync(path.join(directory, 'business-skills.json'), 'utf8'),
    async compatibility(hostOverride?: string, args = argv) {
      expireCompat();
      return runHostCompatCheck(pkg, hostOverride, args);
    },
    freshStartupCaches() {
      fs.writeFileSync(path.join(directory, 'compat-check.json'), JSON.stringify({ hosts: {
        [host]: { host, localVersion: pkg.version, expectedVersion: pkg.version, clusterVersion: '6.0',
          lastFetchedAt: new Date().toISOString() },
      } }));
      fs.writeFileSync(path.join(directory, 'feature-config.json'), JSON.stringify({ entries: {
        [`${host}#${fingerprint}`]: { enabled: false, available: true, fetchedAt: Date.now() },
      } }));
    },
    async capability(args: string[], explicitHost = false) {
      registerCapabilityGatewayRoute('dataops', { gatewayDomain: 'dataops' });
      const program = new Command();
      program.option('--host <url>').option('--format <format>', '', 'json').option('--yes');
      registerCapability(program);
      let stdout = '';
      let stderr = '';
      const originalWrite = process.stdout.write.bind(process.stdout);
      const output = t.mock.method(process.stdout, 'write', chunk => {
        if (typeof chunk !== 'string') return originalWrite(chunk);
        stdout += chunk;
        return true;
      });
      const error = t.mock.method(process.stderr, 'write', chunk => { stderr += String(chunk); return true; });
      const originalExitCode = process.exitCode;
      process.exitCode = undefined;
      try {
        await program.parseAsync([...(explicitHost ? ['--host', host] : []), '--yes', 'capability', ...args], { from: 'user' });
        assert.equal(process.exitCode, undefined, stderr);
        const body = JSON.parse(stdout);
        assert.equal(body.ok, true, stdout + stderr);
        return body.data;
      } finally {
        process.exitCode = originalExitCode;
        output.mock.restore();
        error.mock.restore();
      }
    },
  };
}

test('an ordinary analysis startup restores DataOps after a config-only component change', async t => {
  const f = await fixture(t);
  f.setBusinesses({ ...f.closed, dataops: true });
  const result = await f.compatibility();
  assert.equal(result.status, 'continue', 'matching CLI versions must not reinstall or resume the CLI');
  f.assertDataops(true);
  assert.ok(f.workerActions.includes('apply'));
});

test('an execution config refresh removes managed DataOps when the component closes', async t => {
  const f = await fixture(t, true);
  f.setBusinesses(f.closed);
  f.expireBusiness();
  assert.equal((await readBusinessConfigForExecution()).dataops, false);
  f.assertDataops(false);
  assert.ok(f.workerActions.includes('apply'));
});

test('equal normalized business states skip worker discovery and application', async t => {
  const f = await fixture(t);
  f.setBusinesses({ ...Object.fromEntries(Object.entries(f.closed).reverse()), analysis: true, future: true });
  const before = f.ledger();
  await f.compatibility();
  assert.deepEqual(f.workerActions, []);
  assert.equal(f.ledger(), before, 'unchanged config must not rewrite the applied Skill ledger');
});

test('an unchanged response retries a previously failed Skill synchronization', async t => {
  const f = await fixture(t);
  f.setBusinesses({ ...f.closed, dataops: true });
  f.failApply(true);
  assert.equal((await f.compatibility()).status, 'continue', 'optional Skill failure must not fail the business command');
  f.assertDataops(false);
  assert.ok(f.workerActions.includes('apply'));
  f.failApply(false);
  f.workerActions.length = 0;
  await f.compatibility();
  f.assertDataops(true);
  assert.ok(f.workerActions.includes('apply'), 'the successful fetch cache must not hide pending Skill work');
});

test('an already refreshed business cache does not hide an unapplied component change', async t => {
  const f = await fixture(t);
  const enabled = { ...f.closed, dataops: true };
  rememberBusinessConfig(f.host, f.token, enabled);
  f.setBusinesses(enabled);
  await f.compatibility();
  f.assertDataops(true);
});

test('an explicit host query preserves global Skills even when the URL is active', async t => {
  const f = await fixture(t);
  const before = f.records();
  f.setBusinesses({ ...f.closed, dataops: true });
  await f.compatibility(f.host, ['node', 'ae-cli', '--host', f.host, 'analysis', 'report', 'list']);
  f.expireBusiness();
  await readBusinessConfigForExecution(f.host);
  f.assertDataops(false);
  assert.deepEqual(f.workerActions, []);
  assert.deepEqual(f.records(), before);
});

test('external-token config refreshes preserve the local user Skill set', async t => {
  const f = await fixture(t);
  const before = f.records();
  process.env.AE_CLI_TOKEN = f.token;
  process.env.AE_CLI_TOKEN_HOST = f.host;
  f.setBusinesses({ ...f.closed, dataops: true });
  await f.compatibility();
  f.expireBusiness();
  await readBusinessConfigForExecution();
  f.assertDataops(false);
  assert.deepEqual(f.workerActions, []);
  assert.deepEqual(f.records(), before);
});

test('a sandbox config refresh never takes ownership of the local user Skill set', async t => {
  const f = await fixture(t);
  const before = f.records();
  process.env.TE_AGENT_CLI_CONFIG_DIR = path.join(home, 'sandbox', '.ae-config');
  f.setBusinesses({ ...f.closed, dataops: true });
  await f.compatibility();
  f.expireBusiness();
  await readBusinessConfigForExecution();
  f.assertDataops(false);
  assert.deepEqual(f.workerActions, []);
  assert.deepEqual(f.records(), before);
});

test('unavailable config and old servers do not change applied Skills or synchronization state', async t => {
  const f = await fixture(t, true);
  const before = f.ledger();
  f.setUnavailable(true);
  await f.compatibility();
  f.assertDataops(true);
  assert.deepEqual(f.workerActions, []);
  assert.equal(f.ledger(), before);
  f.setUnavailable(false);
  f.setBusinesses(undefined);
  await f.compatibility();
  f.assertDataops(true);
  assert.deepEqual(f.workerActions, []);
  assert.equal(f.ledger(), before);
});

test('the daily feature config refresh also applies a changed business state', async t => {
  const f = await fixture(t);
  f.setBusinesses({ ...f.closed, dataops: true });
  const key = `${f.host}#${f.fingerprint}`;
  fs.writeFileSync(path.join(f.directory, 'feature-config.json'), JSON.stringify({ entries: {
    [key]: { enabled: false, available: true, fetchedAt: Date.now() - 25 * 60 * 60 * 1000 },
  } }));
  await runFeatureConfigCheck(undefined, argv);
  f.assertDataops(true);
});

test('a newer unchanged response prevents an older changed response from restoring closed Skills', async t => {
  const f = await fixture(t);
  let completeOlder!: (value: Response) => void;
  let requests = 0;
  const response = (businesses: Record<string, unknown>) => Response.json({ data: {
    versions: { clusterVersion: '6.0', aeCliVersion: pkg.version }, businesses,
  } });
  t.mock.method(globalThis, 'fetch', () => {
    requests += 1;
    return requests === 1 ? new Promise<Response>(resolve => { completeOlder = resolve; }) : Promise.resolve(response(f.closed));
  });
  const older = f.compatibility();
  assert.equal(typeof completeOlder, 'function');
  await f.compatibility();
  completeOlder(response({ ...f.closed, dataops: true }));
  await older;
  f.assertDataops(false);
  assert.equal(readBusinessConfig(f.host, f.token)?.dataops, false, 'the stale response must not replace the newer business snapshot');
  assert.deepEqual(f.workerActions, []);
});

test('a credential change while config is in flight prevents the old identity from applying Skills', async t => {
  const f = await fixture(t);
  let complete!: (value: Response) => void;
  t.mock.method(globalThis, 'fetch', () => new Promise<Response>(resolve => { complete = resolve; }));
  const refresh = f.compatibility();
  assert.equal(typeof complete, 'function');
  const nextToken = 'cli_business_refresh_new_identity_fixture';
  saveCredential(f.host, { cliToken: nextToken });
  clearCliTokenCache(f.host);
  complete(Response.json({ data: {
    versions: { clusterVersion: '6.0', aeCliVersion: pkg.version }, businesses: { ...f.closed, dataops: true },
  } }));
  await refresh;
  f.assertDataops(false);
  assert.equal(readBusinessConfig(f.host, nextToken), undefined);
  assert.deepEqual(f.workerActions, []);
});

test('a stale daily feature response cannot overwrite a newer successful feature cache', async t => {
  const f = await fixture(t);
  f.freshStartupCaches();
  fs.writeFileSync(path.join(f.directory, 'feature-config.json'), JSON.stringify({ entries: {
    [`${f.host}#${f.fingerprint}`]: { enabled: false, available: true, fetchedAt: Date.now() - 25 * 60 * 60 * 1000 },
  } }));
  let completeOlder!: (value: Response) => void;
  let requests = 0;
  const response = (enabled: boolean, businesses: Record<string, unknown>) => Response.json({ data: {
    versions: { clusterVersion: '6.0', aeCliVersion: pkg.version },
    features: { projectSemanticKbAutoDiscovery: enabled }, businesses,
  } });
  t.mock.method(globalThis, 'fetch', () => {
    requests += 1;
    return requests === 1 ? new Promise<Response>(resolve => { completeOlder = resolve; }) : Promise.resolve(response(true, f.closed));
  });
  const older = runFeatureConfigCheck(undefined, argv);
  assert.equal(typeof completeOlder, 'function');
  assert.deepEqual(await runFeatureConfigCheck(undefined, argv), { enabled: true, source: 'remote' });
  const latestCache = fs.readFileSync(path.join(f.directory, 'feature-config.json'), 'utf8');
  completeOlder(response(false, { ...f.closed, dataops: true }));
  assert.deepEqual(await older, { enabled: true, source: 'cache' });
  assert.equal(peekKbAutoDiscoveryFeature(f.host, f.token), true);
  assert.equal(fs.readFileSync(path.join(f.directory, 'feature-config.json'), 'utf8'), latestCache);
  assert.equal(readBusinessConfig(f.host, f.token)?.dataops, false);
  f.assertDataops(false);
  assert.deepEqual(f.workerActions, []);
});

for (const [name, args] of [
  ['list', ['list', '--domain', 'dataops']],
  ['search', ['search', 'table', '--domain', 'dataops']],
  ['inspect', ['inspect', 'dataops.table.list']],
  ['run', ['run', 'dataops.table.list']],
] as const) {
  test(`capability ${name} refreshes expired business state and restores Skills without an explicit host`, async t => {
    const f = await fixture(t);
    f.freshStartupCaches();
    f.expireBusiness();
    f.setBusinesses({ ...f.closed, dataops: true });
    f.requests.length = 0;
    const result = await f.capability([...args]);
    if (name === 'list' || name === 'search') assert.equal(result.count, 1);
    f.assertDataops(true);
    assert.equal(f.requests.filter(request => request === '/v1/ta/cli/config').length, 1,
      'only capability execution may refresh the stale business cache');
    assert.ok(f.workerActions.includes('apply'));
  });

  test(`capability ${name} with an explicit active host refreshes state without changing global Skills`, async t => {
    const f = await fixture(t);
    f.freshStartupCaches();
    f.expireBusiness();
    f.setBusinesses({ ...f.closed, dataops: true });
    const before = f.records();
    const result = await f.capability([...args], true);
    if (name === 'list' || name === 'search') assert.equal(result.count, 1);
    f.assertDataops(false);
    assert.deepEqual(f.workerActions, []);
    assert.deepEqual(f.records(), before);
  });
}
