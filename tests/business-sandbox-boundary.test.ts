import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { skillCopyHash } from '../src/core/skills-tool.js';
import { OPTIONAL_BUSINESSES } from '../src/core/businesses.js';

const execute = promisify(execFile);
const repository = fileURLToPath(new URL('..', import.meta.url));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-business-sandbox-boundary-'));
const token = 'cli_sandbox_boundary_fixture';
const fingerprint = crypto.createHash('sha256').update(token).digest('hex');
const closed = Object.fromEntries(OPTIONAL_BUSINESSES.map(business => [business, false]));
const requests: string[] = [];
const requestTokens: Array<string | undefined> = [];
let host = '';
let denyAgent = false;
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url!, 'http://localhost').pathname;
  requests.push(pathname);
  requestTokens.push(typeof request.headers['cli-token'] === 'string' ? request.headers['cli-token'] : undefined);
  response.setHeader('content-type', 'application/json');
  if (pathname.endsWith('/auth/device/authorize')) {
    response.end(JSON.stringify({ device_code: 'uba_boundary_fixture', user_code: 'FIXTURE', interval: 1, expires_in: 300 }));
  } else if (pathname.endsWith('/auth/device/token')) {
    response.end(JSON.stringify({ access_token: 'boundary-one-time-access', token_type: 'bearer', expires_in: 72000 }));
  } else if (pathname.endsWith('/cli/token/generate')) {
    response.end(JSON.stringify({ return_code: 0, data: { userSecret: token } }));
  } else if (pathname.endsWith('/cli/token/validate')) {
    response.end(JSON.stringify({ return_code: 0, data: { openId: 'boundary-user', loginName: 'fixture', userName: 'Fixture' } }));
  } else if (pathname === '/v1/ta/cli/config') {
    response.end(JSON.stringify({ data: { versions: { clusterVersion: '6.1', aeCliVersion: '6.1.28' }, businesses: closed } }));
  } else if (pathname.endsWith('/cli/token/renew')) {
    response.end(JSON.stringify({ return_code: 0 }));
  } else if (pathname.endsWith('/v1/capabilities')) {
    response.end(JSON.stringify({ ok: true, data: [{ id: 'engage-flow.flow.list', description: 'List engagement flows' }] }));
  } else if (pathname === '/agent/api/sandbox/agent/agents') {
    response.statusCode = denyAgent ? 403 : 200;
    response.end(JSON.stringify(denyAgent
      ? { error: { type: 'permission', code: 'FIXTURE_PERMISSION_DENIED', message: 'Fixture denied access' } }
      : { agents: [{ id: 'boundary-agent', name: 'Fixture Agent' }] }));
  } else {
    response.end(JSON.stringify({ ok: true, data: { reachedBackend: true } }));
  }
});

before(async () => {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  host = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  fs.rmSync(temporary, { recursive: true, force: true });
});

type Context = 'sandbox-root' | 'session-config' | 'home-fallback' | 'external-token';

function fixture(context: Context) {
  const home = fs.mkdtempSync(path.join(temporary, `${context}-`));
  const env: NodeJS.ProcessEnv = {
    ...process.env, HOME: home, USERPROFILE: home, AE_CLI_NO_COMPAT_CHECK: '1',
    XDG_CONFIG_HOME: path.join(home, '.config'), CODEX_HOME: path.join(home, '.codex'),
    CLAUDE_CONFIG_DIR: path.join(home, '.claude'), VIBE_HOME: path.join(home, '.vibe'),
    HERMES_HOME: path.join(home, '.hermes'), AUTOHAND_HOME: path.join(home, '.autohand'),
    APPDATA: path.join(home, 'appdata'), FLATPAK_XDG_CONFIG_HOME: path.join(home, 'flatpak'),
  };
  for (const key of ['AE_CLI_TOKEN', 'AE_CLI_TOKEN_HOST', 'AE_CLI_TOKEN_FILE', 'SANDBOX_RUNTIME_ROOT',
    'TE_AGENT_CLI_CONFIG_DIR', 'TE_CLAUDE_BASE_URL', 'TE_CLAUDE_BASE_PATH', 'AE_API_PREFIX',
    'SANDBOX_ID', 'SECRET_KEY', 'SANDBOX_SECRET_KEY']) {
    delete env[key];
  }
  for (const key of Object.keys(env)) if (key.startsWith('AE_CLI_CAPABILITY_GATEWAY_DOMAIN')) delete env[key];
  const directory = path.join(home, '.ae-cli');
  fs.mkdirSync(directory, { recursive: true });
  const cacheKey = `${host}#${fingerprint}`;
  fs.writeFileSync(path.join(directory, 'business-config.json'), JSON.stringify({ entries: {
    [cacheKey]: { businesses: closed, fetchedAt: Date.now() - 11 * 60 * 1000 },
  } }));
  fs.writeFileSync(path.join(directory, 'feature-config.json'), JSON.stringify({ entries: {
    [cacheKey]: { enabled: false, available: true, fetchedAt: Date.now() },
  } }));
  if (context === 'external-token') {
    env.AE_CLI_TOKEN = token;
    env.AE_CLI_TOKEN_HOST = host;
    // Keep the negative control fresh so no optional config request is expected.
    fs.writeFileSync(path.join(directory, 'business-config.json'), JSON.stringify({ entries: {
      [cacheKey]: { businesses: closed, fetchedAt: Date.now() },
    } }));
  } else {
    const credentialDirectory = context === 'home-fallback' ? path.join(home, '.ae-config')
      : path.join(home, context, '.ae-config');
    fs.mkdirSync(credentialDirectory, { recursive: true });
    fs.writeFileSync(path.join(credentialDirectory, 'cli-token.json'), JSON.stringify({ url: host, token }));
    if (context === 'sandbox-root') env.SANDBOX_RUNTIME_ROOT = path.dirname(credentialDirectory);
    if (context === 'session-config') env.TE_AGENT_CLI_CONFIG_DIR = credentialDirectory;
  }
  requests.length = 0;
  requestTokens.length = 0;
  denyAgent = false;
  const cli = async (args: string[]) => {
    try {
      const result = await execute(process.execPath, ['--import', 'tsx', 'src/index.ts', ...args], {
        cwd: repository, env, timeout: 20_000, maxBuffer: 1024 * 1024,
      });
      return { ...result, code: 0 };
    } catch (error: any) {
      if (typeof error.code !== 'number') throw error;
      return { stdout: String(error.stdout), stderr: String(error.stderr), code: error.code };
    }
  };
  return { home, cli };
}

for (const context of ['sandbox-root', 'session-config', 'home-fallback'] as const) {
  test(`${context} keeps root help and direct Agent calls available despite closed business config`, async () => {
    const { cli } = fixture(context);
    const help = await cli(['--help']);
    assert.equal(help.code, 0, help.stderr);
    for (const name of ['analysis', 'agent', 'kb', 'team', 'memory', 'automation', 'things', 'workspace',
      'evaluation', 'sync', 'model', 'context', 'dataops_flow', 'engage-flow', 'community']) {
      assert.match(help.stdout, new RegExp(`^  ${name}(?:\\s|\\[)`, 'm'), `${context}: ${name}`);
    }
    for (const args of [['system', '--help'], ['help', 'system']]) {
      const systemHelp = await cli(args);
      assert.equal(systemHelp.code, 0, systemHelp.stderr);
      assert.match(systemHelp.stdout, /^  \+list-members\s/m);
    }
    for (const args of [['agent', '--help'], ['help', 'agent']]) {
      const agentHelp = await cli(args);
      assert.equal(agentHelp.code, 0, agentHelp.stderr);
      assert.match(agentHelp.stdout, /^  \+list-agents\s/m);
      assert.doesNotMatch(agentHelp.stdout, /business is not enabled/);
    }
    assert.deepEqual(requests, [], 'all help entry points must stay read-only');
    const result = await cli(['agent', '+list-agents']);
    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).data.agents, [{ id: 'boundary-agent', name: 'Fixture Agent' }]);
    assert.ok(requests.includes('/agent/api/sandbox/agent/agents'));
    assert.equal(requestTokens[requests.indexOf('/agent/api/sandbox/agent/agents')], token);
    denyAgent = true;
    try {
      const rejected = await cli(['agent', '+list-agents']);
      assert.equal(rejected.code, 1);
      assert.equal(JSON.parse(rejected.stderr).error.code, 'FIXTURE_PERMISSION_DENIED');
      assert.equal(requests.filter(entry => entry === '/agent/api/sandbox/agent/agents').length, 2,
        'the server permission denial must not trigger a retry');
    } finally { denyAgent = false; }
    assert.equal(requests.filter(entry => entry === '/v1/ta/cli/config').length, 0);
  });

  test(`${context} retains capability discovery and execution without business preflight`, async () => {
    const { cli } = fixture(context);
    for (const args of [['list', '--domain', 'engage-flow'], ['search', 'flow', '--domain', 'engage-flow']]) {
      const result = await cli(['capability', ...args]);
      assert.equal(result.code, 0, result.stderr);
      assert.deepEqual(JSON.parse(result.stdout).data.capabilities.map((entry: { id: string }) => entry.id), ['engage-flow.flow.list']);
    }
    for (const args of [['inspect', 'engage-flow.flow.list'], ['run', 'engage-flow.flow.list', '--yes']]) {
      const result = await cli(['--host', host, 'capability', ...args]);
      assert.equal(result.code, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).data.reachedBackend, true);
    }
    assert.equal(requests.filter(entry => entry === '/api/cli/engage/v1/capabilities').length, 2);
    assert.ok(requests.includes('/api/cli/engage/v1/capabilities/engage-flow.flow.list'));
    assert.ok(requests.includes('/api/cli/engage/v1/capabilities/engage-flow.flow.list/execute'));
    assert.equal(requests.filter(entry => entry === '/v1/ta/cli/config').length, 0);
    requests.forEach((entry, index) => {
      if (entry.startsWith('/api/cli/')) assert.equal(requestTokens[index], token, entry);
    });
  });

  test(`${context} refresh and login preserve every bundled Skill, discovery copy and synchronization record`, async () => {
    const { home, cli } = fixture(context);
    const roots = [path.join(home, 'sandbox-skill-source'), path.join(home, '.agents', 'skills'),
      path.join(home, '.claude', 'skills')];
    const source = path.join(repository, 'skills');
    const sourceBefore = skillCopyHash(source);
    for (const root of roots) fs.cpSync(source, root, { recursive: true });
    const before = roots.map(root => skillCopyHash(root));
    const directory = path.join(home, '.ae-cli');
    const records = ['business-skill-context.json', 'business-skills.json'];
    fs.writeFileSync(path.join(directory, records[0]), JSON.stringify({ host, token_fingerprint: fingerprint, generation: 'sandbox-owned' }));
    const copies = Object.fromEntries(roots.slice(1).flatMap((root, index) =>
      fs.readdirSync(source).filter(name => fs.existsSync(path.join(source, name, 'SKILL.md'))).map(skill => {
        const target = path.join(root, skill);
        return [target, { skill, agent: index === 0 ? 'universal' : 'claude-code', hash: skillCopyHash(target), package_version: 'fixture' }];
      })));
    fs.writeFileSync(path.join(directory, records[1]), JSON.stringify({ schema_version: 1, copies }));
    const recordBefore = records.map(name => fs.readFileSync(path.join(directory, name), 'utf8'));
    const assertUnchanged = () => {
      assert.equal(skillCopyHash(source), sourceBefore, 'the complete package Skill source must not change');
      assert.deepEqual(roots.map(root => skillCopyHash(root)), before, 'all Skill files must remain byte-identical');
      assert.deepEqual(records.map(name => fs.readFileSync(path.join(directory, name), 'utf8')), recordBefore);
      assert.equal(fs.existsSync(path.join(directory, 'business-skills.lock')), false);
    };
    const refresh = await cli(['config', 'refresh']);
    assert.equal(refresh.code, 0, refresh.stderr);
    const refreshed = JSON.parse(refresh.stdout).data;
    assert.equal(refreshed.source, 'remote');
    assert.equal(refreshed.skills.status, 'skipped');
    assert.deepEqual(refreshed.businesses, closed);
    assert.deepEqual(requests, ['/v1/ta/cli/config']);
    assertUnchanged();
    requests.length = 0;
    const login = await cli(['auth', 'login', '--host', host, '--no-browser']);
    assert.equal(login.code, 0, login.stderr);
    const authenticated = JSON.parse(login.stdout).data;
    assert.equal(authenticated.authenticated, true);
    assert.equal(authenticated.environment.source, 'remote');
    assert.equal(authenticated.environment.skills.status, 'skipped');
    assert.ok(requests.some(entry => entry.endsWith('/auth/device/token')));
    assert.ok(requests.includes('/v1/ta/cli/config'));
    assert.doesNotMatch(login.stdout + login.stderr, /boundary-one-time-access|cli_sandbox_boundary_fixture/);
    assertUnchanged();
  });
}

test('ordinary external token callers retain business help filtering and invocation rejection', async () => {
  const { cli } = fixture('external-token');
  const help = await cli(['--help']);
  assert.equal(help.code, 0, help.stderr);
  assert.match(help.stdout, /^  analysis\s/m);
  assert.doesNotMatch(help.stdout, /^  agent\s/m);
  const result = await cli(['agent', '+list-agents']);
  assert.equal(result.code, 1);
  assert.equal(JSON.parse(result.stderr).error.code, 'BUSINESS_NOT_ENABLED');
  const discovery = await cli(['capability', 'list', '--domain', 'engage-flow']);
  assert.equal(discovery.code, 0, discovery.stderr);
  assert.deepEqual(JSON.parse(discovery.stdout).data.capabilities, []);
  const execution = await cli(['capability', 'run', 'engage-flow.flow.list', '--yes']);
  assert.equal(execution.code, 1);
  assert.equal(JSON.parse(execution.stderr).error.code, 'BUSINESS_NOT_ENABLED');
  assert.deepEqual(requests, []);
});
