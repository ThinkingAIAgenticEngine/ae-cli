import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';

const execute = promisify(execFile);
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-business-cli-'));
const repository = fileURLToPath(new URL('..', import.meta.url));
const token = 'cli_business_integration_fixture';
const fingerprint = crypto.createHash('sha256').update(token).digest('hex');
const requests: string[] = [];
let host = '';
let configStatus = 200;
let remoteBusinesses = { dataops: true, engage: false, agent: false, community: false, experiment: false };
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url!, 'http://localhost').pathname;
  requests.push(pathname);
  response.setHeader('content-type', 'application/json');
  if (pathname === '/v1/ta/cli/config') {
    response.statusCode = configStatus;
    response.end(JSON.stringify({ data: { versions: { clusterVersion: '6.0', aeCliVersion: '6.0.56' }, businesses: remoteBusinesses } }));
  } else if (pathname.includes('/cli/token/renew')) {
    response.end(JSON.stringify({ return_code: 0 }));
  } else if (pathname.endsWith('/v1/capabilities')) {
    response.end(JSON.stringify({ ok: true, data: [
      { id: 'experiment.experiment.list', description: 'List experiments' },
      { id: 'engage.flow.list', description: 'List engagement flows' },
    ] }));
  } else {
    response.end(JSON.stringify({ ok: true, data: { reachedGateway: true } }));
  }
});

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  host = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  fs.rmSync(home, { recursive: true, force: true });
});

function seed(businesses: Record<string, boolean>, age = 0) {
  const directory = path.join(home, '.ae-cli');
  fs.mkdirSync(directory, { recursive: true });
  const key = `${host}#${fingerprint}`;
  fs.writeFileSync(path.join(directory, 'business-config.json'), JSON.stringify({ entries: {
    [key]: { businesses, fetchedAt: Date.now() - age },
  } }));
  fs.writeFileSync(path.join(directory, 'feature-config.json'), JSON.stringify({ entries: {
    [key]: { enabled: false, available: true, fetchedAt: Date.now() },
  } }));
  requests.length = 0;
}

async function cli(args: string[]) {
  try {
    const result = await execute(process.execPath, ['--import', 'tsx', 'src/index.ts', ...args], {
      cwd: repository,
      env: { ...process.env, HOME: home, AE_CLI_TOKEN: token, AE_CLI_TOKEN_HOST: host, AE_CLI_NO_COMPAT_CHECK: '1' },
      timeout: 20_000,
      maxBuffer: 1024 * 1024,
    });
    return { ...result, code: 0 };
  } catch (error: any) {
    if (typeof error.code !== 'number') throw error;
    return { stdout: String(error.stdout), stderr: String(error.stderr), code: error.code };
  }
}

const closed = { dataops: false, engage: false, agent: false, community: false, experiment: false };

test('real root help contains analysis and recovery domains only without network or sync', async () => {
  seed(closed, 11 * 60 * 1000);
  const before = fs.readFileSync(path.join(home, '.ae-cli', 'business-config.json'), 'utf8');
  const result = await cli(['--help']);
  assert.equal(result.code, 0, result.stderr);
  for (const name of ['analysis', 'system', 'project', 'metadata', 'data-integration', 'auth', 'config', 'capability', 'install', 'update']) {
    assert.match(result.stdout, new RegExp(`^  ${name}(?:\\s|\\[)`, 'm'));
  }
  for (const name of ['engage-flow', 'dataops_flow', 'agent', 'kb', 'team', 'community', 'evaluation', 'sync', 'model', 'context', 'experiment']) {
    assert.doesNotMatch(result.stdout, new RegExp(`^  ${name}(?:\\s|\\[)`, 'm'));
  }
  assert.equal(fs.readFileSync(path.join(home, '.ae-cli', 'business-config.json'), 'utf8'), before);
  assert.deepEqual(requests, []);
  assert.equal(fs.existsSync(path.join(home, '.agents', 'skills')), false);
});

test('real subcommand and help-command entry points filter mixed system commands locally', async () => {
  seed(closed);
  for (const args of [['system', '--help'], ['system', '-h'], ['help', 'system']]) {
    const result = await cli(args);
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /^  member\s/m);
    assert.doesNotMatch(result.stdout, /^  \+list-members\s/m);
    assert.doesNotMatch(result.stdout, /^  channel\s/m);
  }
  const nested = await cli(['system', 'help', 'member']);
  assert.equal(nested.code, 0, nested.stderr);
  assert.match(nested.stdout, /Usage: ae-cli system member/);
  assert.deepEqual(requests, []);
});

test('real direct Commander action is blocked before any Agent request or Skill changes', async () => {
  seed(closed);
  const result = await cli(['sync']);
  assert.equal(result.code, 1);
  assert.equal(JSON.parse(result.stderr).error.code, 'BUSINESS_NOT_ENABLED');
  assert.equal(result.stdout, '');
  assert.deepEqual(requests, []);
  assert.equal(fs.existsSync(path.join(home, '.agents', 'skills')), false);
});

test('disabled capability list/search return empty and invocation fails without component requests', async () => {
  seed(closed);
  for (const args of [['list', '--domain', 'engage-flow'], ['search', 'flow', '--domain', 'engage-flow'],
    ['list', '--domain', 'experiment'], ['search', 'experiment', '--domain', 'experiment']]) {
    const result = await cli(['capability', ...args]);
    assert.equal(result.code, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).data.capabilities, []);
  }
  for (const args of [['inspect', 'engage.flow.list'], ['run', 'engage.flow.list', '--yes'],
    ['inspect', 'experiment.experiment.list'], ['run', 'experiment.experiment.list', '--yes']]) {
    const result = await cli(['capability', ...args]);
    assert.equal(result.code, 1);
    assert.equal(JSON.parse(result.stderr).error.code, 'BUSINESS_NOT_ENABLED');
    assert.equal(result.stdout, '');
  }
  assert.deepEqual(requests, []);
});

test('an enabled experiment business is independent of the Engage license and shares its gateway route', async () => {
  seed({ ...closed, experiment: true });
  const help = await cli(['--help']);
  assert.match(help.stdout, /^  experiment\s/m);
  assert.doesNotMatch(help.stdout, /^  engage-flow\s/m);
  const list = await cli(['capability', 'list', '--domain', 'experiment']);
  assert.equal(list.code, 0, list.stderr);
  assert.deepEqual(JSON.parse(list.stdout).data.capabilities.map((item: any) => item.id), ['experiment.experiment.list']);
  for (const args of [['capability', 'run', 'experiment.experiment.list', '--domain', 'engage', '--yes'],
    ['experiment', 'experiment', 'list', '--project-id', '1']]) {
    const result = await cli(args);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).data.reachedGateway, true);
  }
  assert.ok(requests.includes('/api/cli/engage/v1/capabilities'));
  assert.equal(requests.filter(entry => entry === '/api/cli/engage/v1/capabilities/experiment.experiment.list/execute').length, 2);
});

test('a routing override does not change a capability business owner', async () => {
  seed(closed);
  for (const id of ['analysis.dashboard.list', 'metadata.event.get']) {
    const result = await cli(['capability', 'run', id, '--domain', 'engage', '--yes']);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).data.reachedGateway, true);
    assert.ok(requests.includes(`/api/cli/engage/v1/capabilities/${id}/execute`));
  }
  const before = requests.length;
  const disabled = await cli(['capability', 'run', 'dataops.table.list', '--domain', 'analysis', '--yes']);
  assert.equal(disabled.code, 1);
  assert.equal(JSON.parse(disabled.stderr).error.code, 'BUSINESS_NOT_ENABLED');
  assert.equal(requests.length, before, 'a closed business cannot bypass its gate by choosing a different route');
});

test('expired false refreshes config and newly enabled capability reaches its component', async () => {
  seed(closed, 11 * 60 * 1000);
  configStatus = 200;
  const result = await cli(['capability', 'run', 'dataops.table.list', '--yes']);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).data.reachedGateway, true);
  assert.equal(requests.filter((entry) => entry === '/v1/ta/cli/config').length, 1);
  assert.ok(requests.includes('/api/cli/dataops/v1/capabilities/dataops.table.list/execute'));
});

test('unavailable config does not keep expired false blocking the backend-authorized invocation', async () => {
  seed(closed, 11 * 60 * 1000);
  configStatus = 503;
  const result = await cli(['capability', 'run', 'dataops.table.list', '--yes']);
  configStatus = 200;
  assert.equal(result.code, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).data.reachedGateway, true);
  assert.ok(requests.includes('/api/cli/dataops/v1/capabilities/dataops.table.list/execute'));
  const help = await cli(['--help']);
  assert.doesNotMatch(help.stdout, /^  dataops_flow\s/m);
});
