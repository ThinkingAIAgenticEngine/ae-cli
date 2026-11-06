import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import spawn from 'cross-spawn';

const execute = promisify(execFile);
const fixtureHome = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ae-environment-refresh-')));
const repository = fileURLToPath(new URL('..', import.meta.url));
const environmentKeys = ['HOME', 'AE_CLI_TOKEN', 'AE_CLI_TOKEN_HOST', 'AE_CLI_TOKEN_FILE', 'TE_AGENT_CLI_CONFIG_DIR', 'SANDBOX_RUNTIME_ROOT'] as const;
const savedEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
for (const key of environmentKeys) delete process.env[key];
process.env.HOME = fixtureHome;

const { fetchCliConfig } = await import('../src/core/compat-check.js');
const { refreshEnvironmentConfig } = await import('../src/core/environment-refresh.js');
const { saveCredential } = await import('../src/core/secure-store.js');
const { clearCliTokenCache } = await import('../src/core/cli-token.js');
const { saveConfig } = await import('../src/core/config.js');
const { readBusinessConfig } = await import('../src/core/business-config.js');
const { businessForSkill } = await import('../src/core/businesses.js');

after(() => {
  for (const key of environmentKeys) {
    if (savedEnvironment[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnvironment[key];
  }
  fs.rmSync(fixtureHome, { recursive: true, force: true });
});

function credentials(host: string, token: string, active = true): void {
  saveCredential(host, { cliToken: token });
  clearCliTokenCache(host);
  if (active) saveConfig({ activeHost: host, hosts: { [host]: { label: 'fixture' } } });
}

test('config parses component booleans while preserving old version fields and default analysis', async (t) => {
  const payloads = [
    { data: { versions: { clusterVersion: '6.0', aeCliVersion: '6.0.56' }, businesses: { analysis: false, dataops: true, agent: false, engage: 'false' } } },
    { versions: { cluster_version: '6.0', ae_cli_version: '6.0.55' } },
    { versions: { clusterVersion: '6.0' }, businesses: [] },
  ];
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(payloads.shift()), { status: 200 }));
  assert.deepEqual(await fetchCliConfig('https://parser.example', 'cli_parser_fixture'), {
    clusterVersion: '6.0', aeCliVersion: '6.0.56', businesses: { dataops: true, agent: false },
  });
  assert.deepEqual(await fetchCliConfig('https://parser.example', 'cli_parser_fixture'), {
    clusterVersion: '6.0', aeCliVersion: '6.0.55',
  });
  assert.deepEqual(await fetchCliConfig('https://parser.example', 'cli_parser_fixture'), {
    clusterVersion: '6.0', aeCliVersion: null,
  });
});

test('refreshing a nonactive host fetches its state without touching the shared Skill context', async () => {
  const activeHost = 'https://active-refresh.example';
  const selectedHost = 'https://one-off-refresh.example';
  credentials(activeHost, 'cli_active_refresh_fixture');
  credentials(selectedHost, 'cli_one_off_refresh_fixture', false);
  const context = path.join(fixtureHome, '.ae-cli', 'business-skill-context.json');
  const before = fs.existsSync(context) ? fs.readFileSync(context, 'utf8') : null;
  const result = await refreshEnvironmentConfig(selectedHost, { fetchConfig: async () => ({
    clusterVersion: '6.0', aeCliVersion: '6.0.56', businesses: { agent: false },
  }) });
  assert.equal(result.source, 'remote');
  assert.equal(result.skills.status, 'skipped');
  assert.equal(fs.existsSync(context) ? fs.readFileSync(context, 'utf8') : null, before);
  assert.deepEqual(readBusinessConfig(selectedHost, 'cli_one_off_refresh_fixture'), { agent: false });
});

test('a changed active identity prevents a slow refresh from synchronizing global Skills', async () => {
  const host = 'https://identity-refresh.example';
  credentials(host, 'cli_identity_old_fixture');
  let finish!: (value: any) => void;
  const resultPromise = refreshEnvironmentConfig(host, { onlyIfChanged: true, fetchConfig: () => new Promise((resolve) => { finish = resolve; }) });
  credentials(host, 'cli_identity_new_fixture');
  finish({ clusterVersion: '6.0', aeCliVersion: '6.0.56', businesses: { agent: false } });
  const result = await resultPromise;
  assert.equal(result.skills.status, 'skipped');
  assert.equal(readBusinessConfig(host, 'cli_identity_new_fixture'), undefined);
  assert.equal(fs.existsSync(path.join(fixtureHome, '.agents', 'skills')), false);
});

test('an explicit read-only refresh does not change global Skills even for the active host', async () => {
  const host = 'https://read-only-refresh.example';
  credentials(host, 'cli_read_only_refresh_fixture');
  const context = path.join(fixtureHome, '.ae-cli', 'business-skill-context.json');
  const before = fs.existsSync(context) ? fs.readFileSync(context, 'utf8') : null;
  const result = await refreshEnvironmentConfig(host, { synchronizeSkills: false, fetchConfig: async () => ({
    clusterVersion: '6.0', aeCliVersion: '6.0.56', businesses: { agent: false },
  }) });
  assert.equal(result.source, 'remote');
  assert.equal(result.skills.status, 'skipped');
  assert.equal(fs.existsSync(context) ? fs.readFileSync(context, 'utf8') : null, before);
  assert.equal(fs.existsSync(path.join(fixtureHome, '.agents', 'skills')), false);
});

test('a newer refresh supersedes an older response for the same host and identity', async (t) => {
  const host = 'https://concurrent-refresh.example';
  const token = 'cli_concurrent_refresh_fixture';
  credentials(host, token);
  t.mock.method(spawn, 'sync', (_command: string, _args: string[], options: any) => {
    assert.equal(JSON.parse(options.input).action, 'targets');
    return { status: 0, signal: null, stdout: JSON.stringify({ ok: true, data: [] }), stderr: '' };
  });
  let finish!: (value: any) => void;
  const older = refreshEnvironmentConfig(host, { fetchConfig: () => new Promise((resolve) => { finish = resolve; }) });
  const newer = await refreshEnvironmentConfig(host, { fetchConfig: async () => ({
    clusterVersion: '6.0', aeCliVersion: '6.0.56', businesses: { dataops: true },
  }) });
  assert.equal(newer.skills.status, 'success');
  finish({ clusterVersion: '6.0', aeCliVersion: '6.0.56', businesses: { dataops: false } });
  await older;
  assert.deepEqual(readBusinessConfig(host, token), { dataops: true });
});

function childEnvironment(home: string): NodeJS.ProcessEnv {
  const environment = { ...process.env, HOME: home, AE_CLI_NO_COMPAT_CHECK: '1', NO_COLOR: '1' };
  for (const key of ['AE_CLI_TOKEN', 'AE_CLI_TOKEN_HOST', 'AE_CLI_TOKEN_FILE', 'TE_AGENT_CLI_CONFIG_DIR', 'SANDBOX_RUNTIME_ROOT']) delete environment[key];
  return environment;
}

async function withLoginServer(
  body: (host: string, requests: string[]) => Promise<void>,
  configAvailable = false,
  businesses: () => Record<string, boolean> = () => ({ dataops: false, engage: false, agent: false, community: false, experiment: false }),
): Promise<void> {
  const requests: string[] = [];
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url!, 'http://localhost').pathname;
    requests.push(pathname);
    response.setHeader('content-type', 'application/json');
    if (pathname === '/v1/ta/cli/auth/device/authorize') {
      response.end(JSON.stringify({ device_code: 'uba_fixture_device', user_code: 'FIXTURE', interval: 1, expires_in: 300 }));
    } else if (pathname === '/v1/ta/cli/auth/device/token') {
      response.end(JSON.stringify({ access_token: 'fixture-one-time-access', token_type: 'bearer', expires_in: 72000 }));
    } else if (pathname === '/v1/ta/cli/token/generate') {
      response.end(JSON.stringify({ return_code: 0, data: { userSecret: 'cli_login_refresh_fixture' } }));
    } else if (pathname === '/v1/ta/cli/token/validate') {
      response.end(JSON.stringify({ return_code: 0, data: { openId: 'fixture-user', loginName: 'fixture', userName: 'Fixture' } }));
    } else if (pathname === '/v1/ta/cli/config') {
      response.statusCode = configAvailable ? 200 : 503;
      response.end(JSON.stringify(configAvailable
        ? { data: { versions: { clusterVersion: '6.0', aeCliVersion: '6.0.56' }, businesses: businesses() } }
        : { message: 'Optional config unavailable' }));
    } else {
      response.statusCode = 500;
      response.end(JSON.stringify({ message: 'Unexpected request' }));
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  try { await body(`http://127.0.0.1:${address.port}`, requests); }
  finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
}

test('requesting only a device code neither fetches config nor synchronizes Skills', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-device-only-refresh-'));
  try {
    await withLoginServer(async (host, requests) => {
      const result = await execute(process.execPath, ['--import', 'tsx', 'src/index.ts', 'auth', 'login', '--host', host, '--no-browser', '--no-wait'], {
        cwd: repository, env: childEnvironment(home), timeout: 20_000,
      });
      assert.equal(JSON.parse(result.stdout).data.device_code, 'uba_fixture_device');
      assert.deepEqual(requests, ['/v1/ta/cli/auth/device/authorize']);
      assert.equal(fs.existsSync(path.join(home, '.ae-cli', 'business-skill-context.json')), false);
      assert.equal(fs.existsSync(path.join(home, '.agents', 'skills')), false);
    });
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});

test('successful device login stays successful and retains credentials when config refresh fails', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-login-refresh-failure-'));
  try {
    await withLoginServer(async (host, requests) => {
      const result = await execute(process.execPath, ['--import', 'tsx', 'src/index.ts', 'auth', 'login', '--host', host, '--no-browser'], {
        cwd: repository, env: childEnvironment(home), timeout: 20_000,
      });
      const output = JSON.parse(result.stdout).data;
      assert.equal(output.authenticated, true);
      assert.equal(output.environment.source, 'unavailable');
      assert.equal(output.environment.skills.status, 'skipped');
      assert.match(result.stderr, /Login successful/);
      assert.match(result.stderr, /Business configuration could not be refreshed/);
      assert.ok(requests.includes('/v1/ta/cli/config'));
      assert.equal(fs.existsSync(path.join(home, '.agents', 'skills')), false);
      const status = await execute(process.execPath, ['--import', 'tsx', 'src/index.ts', 'auth', 'status'], {
        cwd: repository, env: childEnvironment(home), timeout: 20_000,
      });
      assert.equal(JSON.parse(status.stdout).data.authenticated, true);
      assert.doesNotMatch(result.stdout + result.stderr + status.stdout + status.stderr, /fixture-one-time-access|cli_login_refresh_fixture/);
    });
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});

test('config refresh with an explicit host does not synchronize even when that host is active', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-config-host-refresh-'));
  try {
    await withLoginServer(async (host, requests) => {
      const seed = [
        "import { saveCredential } from './src/core/secure-store.ts';",
        "import { saveConfig } from './src/core/config.ts';",
        'const host = process.argv[1];',
        "saveCredential(host, { cliToken: 'cli_explicit_refresh_fixture' });",
        "saveConfig({ activeHost: host, hosts: { [host]: { label: 'fixture' } } });",
      ].join('\n');
      await execute(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', seed, host], {
        cwd: repository, env: childEnvironment(home), timeout: 20_000,
      });
      const result = await execute(process.execPath, ['--import', 'tsx', 'src/index.ts', '--host', host, 'config', 'refresh'], {
        cwd: repository, env: childEnvironment(home), timeout: 20_000,
      });
      const output = JSON.parse(result.stdout).data;
      assert.equal(output.source, 'remote');
      assert.equal(output.skills.status, 'skipped');
      assert.deepEqual(requests, ['/v1/ta/cli/config']);
      assert.equal(fs.existsSync(path.join(home, '.ae-cli', 'business-skill-context.json')), false);
      assert.equal(fs.existsSync(path.join(home, '.ae-cli', 'business-skills.json')), false);
      assert.equal(fs.existsSync(path.join(home, '.agents', 'skills')), false);
    }, true);
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});

test('Skill synchronization failure is reported separately from successful device authentication', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-login-sync-failure-'));
  const ledger = path.join(home, '.ae-cli', 'business-skills.json');
  fs.mkdirSync(path.dirname(ledger), { recursive: true });
  fs.writeFileSync(ledger, '{');
  try {
    await withLoginServer(async (host) => {
      const result = await execute(process.execPath, ['--import', 'tsx', 'src/index.ts', 'auth', 'login', '--host', host, '--no-browser'], {
        cwd: repository, env: childEnvironment(home), timeout: 20_000,
      });
      const output = JSON.parse(result.stdout).data;
      assert.equal(output.authenticated, true);
      assert.equal(output.environment.source, 'remote');
      assert.equal(output.environment.skills.status, 'failed');
      assert.match(result.stderr, /Some Skills could not be synchronized/);
      assert.match(result.stderr, /Login successful/);
      assert.equal(fs.readFileSync(ledger, 'utf8'), '{');
      assert.equal(fs.existsSync(path.join(home, '.agents', 'skills')), false);
    }, true);
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});

test('credential persistence invalidates an old worker before waiting for compatibility config', async (t) => {
  const host = 'https://persist-generation.example';
  credentials(host, 'cli_previous_generation_fixture');
  const { reserveBusinessSkillContext, isBusinessSkillContextCurrent } = await import('../src/core/business-skill-sync.js');
  const { cliTokenFingerprint } = await import('../src/core/environment-refresh.js');
  const { persistDeviceTokens } = await import('../src/commands/auth.js');
  const context = { host, tokenFingerprint: cliTokenFingerprint('cli_previous_generation_fixture') };
  const generation = reserveBusinessSkillContext(context);
  let compatibilityChecked = false;
  t.mock.method(globalThis, 'fetch', async (input: string) => {
    const pathname = new URL(String(input)).pathname;
    if (pathname.endsWith('/generate')) return Response.json({ return_code: 0, data: { userSecret: 'cli_new_generation_fixture' } });
    if (pathname.endsWith('/validate')) return Response.json({ return_code: 0, data: {} });
    assert.equal(pathname, '/v1/ta/cli/config');
    compatibilityChecked = true;
    assert.equal(isBusinessSkillContextCurrent({ ...context, generation }), false);
    return Response.json({ data: { versions: { clusterVersion: '6.0', aeCliVersion: '6.0.56' } } });
  });
  await persistDeviceTokens(host, { access_token: 'one-time-generation-fixture', token_type: 'bearer', expires_in: 60 });
  assert.equal(compatibilityChecked, true);
});

test('terminal summaries hide Skill paths while explicit JSON and captured output retain complete reports', async () => {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ae-login-real-skills-')));
  const env = { ...childEnvironment(home), USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, '.config'),
    CODEX_HOME: path.join(home, '.codex'), CLAUDE_CONFIG_DIR: path.join(home, '.claude'),
    VIBE_HOME: path.join(home, '.vibe'), HERMES_HOME: path.join(home, '.hermes'),
    AUTOHAND_HOME: path.join(home, '.autohand'), APPDATA: path.join(home, 'appdata'),
    FLATPAK_XDG_CONFIG_HOME: path.join(home, 'flatpak') };
  for (const client of ['.codex', '.claude', '.cursor']) fs.mkdirSync(path.join(home, client));
  const roots = ['.agents/skills', '.codex/skills', '.claude/skills', '.cursor/skills'].map(p => path.join(home, p));
  const installRoots = [roots[0], roots[2]];
  const agentSkills = fs.readdirSync(path.join(repository, 'skills'))
    .filter(name => businessForSkill(name) === 'agent').sort();
  assert.ok(agentSkills.includes('ae-agent') && agentSkills.includes('ae-page-context') && agentSkills.includes('ae-kb'));
  const optionalSkills = ['ae-dataops', 'ae-engage', 'ae-community', 'ae-experiment', 'ae-experiment-design', 'ae-experiment-insight', ...agentSkills];
  const agentDomains = ['agent', 'kb', 'team', 'memory', 'automation', 'things', 'workspace', 'evaluation', 'sync', 'model', 'context'];
  const files = (directory: string): [string, string][] => {
    const entries: [string, string][] = [];
    const visit = (relative: string): void => {
      for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true })) {
        const name = path.join(relative, entry.name);
        if (entry.isDirectory()) visit(name);
        else {
          assert.ok(entry.isFile(), `Unexpected linked or special Skill resource: ${name}`);
          entries.push([name, fs.readFileSync(path.join(directory, name)).toString('base64')]);
        }
      }
    };
    visit('');
    return entries.sort(([a], [b]) => a.localeCompare(b));
  };
  let states: Record<string, boolean> = { dataops: false, engage: false, agent: false, community: false, experiment: false };
  try {
    // Seed optional groups in canonical and legacy locations without a ledger.
    for (const root of roots) {
      fs.mkdirSync(root, { recursive: true });
      for (const name of optionalSkills) fs.cpSync(path.join(repository, 'skills', name), path.join(root, name), { recursive: true });
    }
    await withLoginServer(async (host) => {
      const terminalOutput = `Object.defineProperty(process.stdout, 'isTTY', { value: true });
Object.defineProperty(process.stderr, 'isTTY', { value: true });`;
      const cli = (args: string[], terminal = false) => execute(process.execPath, ['--import', 'tsx',
        ...(terminal ? ['--import', `data:text/javascript,${encodeURIComponent(terminalOutput)}`] : []), 'src/index.ts', ...args], {
        cwd: repository, env, timeout: 40_000, maxBuffer: 4 * 1024 * 1024,
      });
      const assertSummary = (skills: Record<string, unknown>, stdout: string): void => {
        assert.deepEqual(Object.keys(skills).sort(), ['installed_count', 'removed_count', 'status']);
        assert.equal(skills.status, 'success');
        assert.equal(typeof skills.installed_count, 'number');
        assert.equal(typeof skills.removed_count, 'number');
        assert.doesNotMatch(stdout, /"(?:installed|removed|adopted|skipped|failed)"\s*:\s*\[|"path"\s*:/);
        assert.ok(!stdout.includes(home), 'Terminal summaries must not contain any client discovery directory');
      };
      const login = await cli(['auth', 'login', '--host', host, '--no-browser'], true);
      const authenticated = JSON.parse(login.stdout).data;
      assert.equal(authenticated.authenticated, true);
      assert.equal(authenticated.environment.skills.status, 'success', JSON.stringify(authenticated.environment.skills) + login.stderr);
      assertSummary(authenticated.environment.skills, login.stdout);
      assert.ok(authenticated.environment.skills.installed_count > 0);
      assert.ok(authenticated.environment.skills.removed_count > 0);
      assert.doesNotMatch(login.stderr, /Reading environment configuration|Synchronizing managed Skills/);
      for (const root of roots) {
        for (const name of optionalSkills) assert.equal(fs.existsSync(path.join(root, name)), false, `${root}/${name}`);
        assert.equal(fs.existsSync(path.join(root, 'ae-analysis', 'SKILL.md')), installRoots.includes(root));
      }
      const closedHelp = await cli(['--help']);
      assert.doesNotMatch(closedHelp.stdout, /^  (?:dataops_flow|agent|kb|engage-flow|community|experiment)\s/m);
      for (const name of agentDomains) assert.doesNotMatch(closedHelp.stdout, new RegExp(`^  ${name}(?:\\s|\\[)`, 'm'));
      states = { ...states, dataops: true };
      const refreshed = await cli(['config', 'refresh'], true);
      const refresh = JSON.parse(refreshed.stdout).data;
      assert.equal(refresh.skills.status, 'success', JSON.stringify(refresh.skills));
      assertSummary(refresh.skills, refreshed.stdout);
      assert.equal(refresh.skills.installed_count, installRoots.length);
      assert.equal(refresh.skills.removed_count, 0);
      assert.equal(refreshed.stderr, '', 'Refresh reports its terminal result once in stdout');
      for (const root of roots) assert.equal(fs.existsSync(path.join(root, 'ae-dataops', 'SKILL.md')), installRoots.includes(root));
      assert.match((await cli(['--help'])).stdout, /^  dataops_flow\s/m);
      states = { ...states, agent: true };
      const restored = JSON.parse((await cli(['config', 'refresh', '--format', 'json'], true)).stdout).data;
      assert.equal(restored.skills.status, 'success', JSON.stringify(restored.skills));
      assert.equal(restored.skills.installed.length, agentSkills.length * installRoots.length);
      for (const name of agentSkills) {
        const sourceFiles = files(path.join(repository, 'skills', name));
        assert.ok(sourceFiles.some(([file]) => file === 'SKILL.md'));
        for (const root of roots) {
          const directory = path.join(root, name);
          if (installRoots.includes(root)) assert.deepEqual(files(directory), sourceFiles, `${directory} must contain the complete bundled Skill`);
          else assert.equal(fs.existsSync(directory), false, `${directory} must not recreate a legacy discovery copy`);
        }
      }
      const reopenedHelp = await cli(['--help']);
      for (const name of agentDomains) assert.match(reopenedHelp.stdout, new RegExp(`^  ${name}(?:\\s|\\[)`, 'm'));
      assert.match((await cli(['system', '--help'])).stdout, /^  \+list-members\s/m);
      for (const args of [
        ['auth', 'login', '--host', host, '--no-browser', '--format', 'json'],
        ['auth', 'login', '--host', host, '--no-browser'],
      ]) {
        const detailed = JSON.parse((await cli(args, args.includes('--format'))).stdout).data.environment.skills;
        assert.equal(detailed.status, 'success');
        for (const field of ['installed', 'removed', 'adopted', 'skipped', 'failed']) assert.ok(Array.isArray(detailed[field]), field);
        assert.equal(typeof detailed.managed_count, 'number');
      }
      const projected = JSON.parse((await cli(['config', 'refresh', '--jq', '.skills'], true)).stdout).data;
      assert.equal(projected.status, 'success');
      for (const field of ['installed', 'removed', 'adopted', 'skipped', 'failed']) assert.ok(Array.isArray(projected[field]), field);
      assert.equal(typeof projected.managed_count, 'number');
      states = {};
      const unknown = JSON.parse((await cli(['config', 'refresh'])).stdout).data;
      assert.equal(unknown.skills.removed.length, 0);
      for (const root of roots) assert.equal(fs.existsSync(path.join(root, 'ae-dataops', 'SKILL.md')), installRoots.includes(root));
      assert.doesNotMatch(login.stdout + login.stderr, /fixture-one-time-access|cli_login_refresh_fixture/);
    }, true, () => states);
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});

test('session-only and fallback-token identities refresh config without global Skill state writes', async () => {
  const host = 'https://session-refresh.example';
  credentials(host, 'cli_session_refresh_fixture');
  const directory = path.join(fixtureHome, '.ae-cli');
  const files = ['business-skill-context.json', 'business-skills.json'];
  const snapshot = () => files.map(name => fs.existsSync(path.join(directory, name)) ? fs.readFileSync(path.join(directory, name), 'utf8') : null);
  const before = snapshot();
  const session = path.join(fixtureHome, 'session-token');
  fs.mkdirSync(session);
  fs.writeFileSync(path.join(session, 'cli-token.json'), JSON.stringify({ url: host, token: 'cli_session_refresh_fixture' }));
  process.env.TE_AGENT_CLI_CONFIG_DIR = session;
  try {
    const result = await refreshEnvironmentConfig(host, { fetchConfig: async () => ({ clusterVersion: '6.0', aeCliVersion: '6.0.56', businesses: { agent: false } }) });
    assert.equal(result.skills.status, 'skipped');
    assert.deepEqual(snapshot(), before);
  } finally { delete process.env.TE_AGENT_CLI_CONFIG_DIR; }
  const fallback = path.join(fixtureHome, '.ae-config');
  fs.mkdirSync(fallback);
  fs.copyFileSync(path.join(session, 'cli-token.json'), path.join(fallback, 'cli-token.json'));
  try {
    const result = await refreshEnvironmentConfig(host, { fetchConfig: async () => ({ clusterVersion: '6.0', aeCliVersion: '6.0.56', businesses: { agent: false } }) });
    assert.equal(result.skills.status, 'skipped');
    assert.deepEqual(snapshot(), before);
  } finally { fs.rmSync(fallback, { recursive: true, force: true }); }
});

test('config use reuses an installed policy across hosts while manual refresh keeps full verification', async t => {
  const first = 'https://switch-policy-first.example';
  const second = 'https://switch-policy-second.example';
  credentials(first, 'cli_switch_policy_first_fixture');
  credentials(second, 'cli_switch_policy_second_fixture', false);
  saveConfig({ activeHost: first, hosts: { [first]: { label: 'first' }, [second]: { label: 'second' } } });
  const businesses = { dataops: false, engage: false, agent: false, community: false };
  let scans = 0;
  t.mock.method(spawn, 'sync', (_command: string, _args: string[], options: any) => {
    assert.equal(JSON.parse(options.input).action, 'targets');
    scans++;
    return { status: 0, signal: null, stdout: JSON.stringify({ ok: true, data: [] }), stderr: '' };
  });
  const configuration = { clusterVersion: '6.0', aeCliVersion: '6.0.56', businesses };
  assert.equal((await refreshEnvironmentConfig(first, { fetchConfig: async () => configuration })).skills.status, 'success');
  const initialScans = scans;
  assert.ok(initialScans > 0);
  t.mock.method(globalThis, 'fetch', async input => {
    assert.equal(new URL(String(input)).pathname, '/v1/ta/cli/config');
    return Response.json({ data: { versions: { clusterVersion: '6.0', aeCliVersion: '6.0.56' }, businesses } });
  });
  const { Command } = await import('commander');
  const { registerConfig } = await import('../src/commands/config.js');
  const command = () => {
    const program = new Command();
    program.option('--format <format>', '', 'json');
    registerConfig(program);
    return program;
  };
  let stdout = '';
  let stderr = '';
  const previousExitCode = process.exitCode;
  const previousTTY = Object.getOwnPropertyDescriptor(process.stderr, 'isTTY');
  const originalWrite = process.stdout.write.bind(process.stdout);
  const output = t.mock.method(process.stdout, 'write', chunk => {
    if (typeof chunk !== 'string') return originalWrite(chunk);
    stdout += chunk;
    return true;
  });
  const error = t.mock.method(process.stderr, 'write', chunk => { stderr += String(chunk); return true; });
  try {
    process.exitCode = undefined;
    Object.defineProperty(process.stderr, 'isTTY', { configurable: true, value: true });
    await command().parseAsync(['config', 'use', 'second'], { from: 'user' });
    assert.equal(process.exitCode, undefined, stderr);
    assert.equal(JSON.parse(stdout).data.activeHost, second);
    assert.equal(scans, initialScans, 'An environment switch with the same installed policy must not rescan clients');
    assert.equal(stderr, '[ae-cli] Skills synchronized: 0 installed or updated, 0 removed.\n');
    assert.doesNotMatch(stdout, /Reading environment configuration|Synchronizing managed Skills|Skills synchronized/);
    stdout = '';
    stderr = '';
    Object.defineProperty(process.stderr, 'isTTY', { configurable: true, value: false });
    await command().parseAsync(['config', 'refresh'], { from: 'user' });
    assert.equal(process.exitCode, undefined, stderr);
    assert.equal(JSON.parse(stdout).data.skills.status, 'success');
    assert.equal(scans, initialScans + 1, 'Manual refresh must keep its full verification and repair behavior');
    assert.equal(stderr, '', 'Noninteractive JSON callers must not receive terminal progress messages');
  } finally {
    process.exitCode = previousExitCode;
    if (previousTTY) Object.defineProperty(process.stderr, 'isTTY', previousTTY);
    else delete process.stderr.isTTY;
    output.mock.restore();
    error.mock.restore();
  }
});

test('refresh progress reports only the terminal result when config is unavailable', async () => {
  const host = 'https://progress-unavailable.example';
  credentials(host, 'cli_progress_unavailable_fixture');
  const progress: string[] = [];
  const result = await refreshEnvironmentConfig(host, { onlyIfChanged: true,
    fetchConfig: async () => null, progress: message => progress.push(message) });
  assert.equal(result.source, 'unavailable');
  assert.equal(result.skills.status, 'skipped');
  assert.equal(progress.length, 1);
  assert.match(progress.at(-1)!, /skipped.*unavailable/i);
  assert.ok(!progress.some(message => /Reading environment configuration|Synchronizing managed Skills/.test(message)));
});
