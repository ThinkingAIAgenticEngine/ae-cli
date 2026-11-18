import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { trafficDomainCreate, trafficDomainDelete, trafficDomainList, trafficDomainUpdate } from '../../src/commands/te-experiment/index.ts';

const host = 'http://localhost';
const configDir = mkdtempSync(join(tmpdir(), 'ae-traffic-domain-test-'));
const previousConfigDir = process.env.TE_AGENT_CLI_CONFIG_DIR;
writeFileSync(join(configDir, 'cli-token.json'), JSON.stringify({ url: host, token: 'cli_traffic_test_token' }));
process.env.TE_AGENT_CLI_CONFIG_DIR = configDir;
process.once('exit', () => {
  rmSync(configDir, { recursive: true, force: true });
  if (previousConfigDir === undefined) delete process.env.TE_AGENT_CLI_CONFIG_DIR;
  else process.env.TE_AGENT_CLI_CONFIG_DIR = previousConfigDir;
});
function ctx(values) {
  return {
    has: (name) => Object.hasOwn(values, name),
    str: (name) => String(values[name] ?? ''),
    num: (name) => Number(values[name]),
    json: (name) => values[name],
    host: () => host,
  };
}
const create = { 'project-id': 1, 'bucket-id': '#account_id', name: 'Checkout', 'allocation-bps': 3000, 'expected-version': 0 };
const update = { 'project-id': 1, 'domain-id': 'd1', name: 'Checkout' };
const remove = { 'project-id': 1, 'domain-id': 'd1', 'expected-version': 3 };
const requests = [];
const previousFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  // Agent context is framework metadata and depends on the invoking environment.
  const { client_context: _clientContext, ...body } = JSON.parse(init.body);
  requests.push({ url: String(url), body, headers: init.headers });
  return new Response(JSON.stringify({ ok: true, data: { items: [], total: 0 } }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};
try {
  await trafficDomainList.execute(ctx({ 'project-id': 1 }));
  assert.equal(requests.at(-1).url, `${host}/api/cli/engage/v1/capabilities/experiment.traffic_domain.list/execute`);
  assert.deepEqual(requests.at(-1).body, { input: { project_id: 1 } });
  await trafficDomainList.execute(ctx({ 'project-id': 1, 'bucket-id': '#account_id' }));
  assert.equal(requests.at(-1).body.input.bucket_id, '#account_id');

  await trafficDomainCreate.dryRun(ctx(create));
  assert.equal(requests.at(-1).url, `${host}/api/cli/engage/v1/capabilities/experiment.traffic_domain.create/dry-run`);
  assert.deepEqual(requests.at(-1).body.input, {
    project_id: 1, bucket_id: '#account_id', domain_name: 'Checkout', domain_desc: '',
    allocation_bps: 3000, expected_version: 0, allocations: [],
  });
  await trafficDomainCreate.validateInput(ctx({ ...create, 'expected-version': 2,
    allocations: [{ domain_id: 'd1', allocation_bps: 6000 }] }));
  assert.match(requests.at(-1).url, /\/validate$/);
  assert.deepEqual(requests.at(-1).body.input.allocations, [{ domain_id: 'd1', allocation_bps: 6000 }]);

  await trafficDomainUpdate.execute(ctx(update));
  assert.deepEqual(requests.at(-1).body.input, {
    project_id: 1, domain_id: 'd1', domain_name: 'Checkout', domain_desc: '',
  });
  await trafficDomainUpdate.dryRun(ctx({ ...update, 'expected-version': 3, 'allocation-bps': 4000,
    allocations: [{ domain_id: 'd2', allocation_bps: 5000 }] }));
  assert.deepEqual(requests.at(-1).body.input.allocations, [{ domain_id: 'd2', allocation_bps: 5000 }]);

  await trafficDomainDelete.dryRun(ctx(remove));
  assert.deepEqual(requests.at(-1).body.input, { project_id: 1, domain_id: 'd1', expected_version: 3 });
  assert.equal(trafficDomainDelete.risk, 'high-risk-write');
  for (const request of requests) {
    const headers = new Headers(request.headers);
    assert.equal(headers.get('cli-token'), 'cli_traffic_test_token');
    assert.equal(headers.get('authorization'), null);
  }

  const before = requests.length;
  const invalid = [
    [trafficDomainCreate, { ...create, 'allocation-bps': 0 }],
    [trafficDomainCreate, { ...create, 'allocation-bps': 10001 }],
    [trafficDomainCreate, { ...create, 'allocation-bps': 1.5 }],
    [trafficDomainCreate, { ...create, 'expected-version': -1 }],
    [trafficDomainCreate, { ...create, 'expected-version': undefined }],
    [trafficDomainCreate, { ...create, name: ' ' }],
    [trafficDomainCreate, { ...create, description: 'x'.repeat(201) }],
    [trafficDomainCreate, { ...create, 'bucket-id': 'invented' }],
    [trafficDomainCreate, { ...create, allocations: [{ domain_id: 'd1', allocation_bps: 8000 }] }],
    [trafficDomainCreate, { ...create, allocations: [{ domainId: 'd1', allocationBps: 3000 }] }],
    [trafficDomainCreate, { ...create, allocations: [{ domain_id: 'd1', allocation_bps: 1000 }, { domain_id: 'd1', allocation_bps: 1000 }] }],
    [trafficDomainUpdate, { ...update, 'expected-version': 3 }],
    [trafficDomainUpdate, { ...update, 'expected-version': 3, 'allocation-bps': 3000 }],
    [trafficDomainUpdate, { ...update, 'expected-version': 3, 'allocation-bps': 3000, allocations: [{ domain_id: 'd1', allocation_bps: 1000 }] }],
    [trafficDomainDelete, { ...remove, 'expected-version': Number.MAX_SAFE_INTEGER + 1 }],
    [trafficDomainList, { 'project-id': 1.5 }],
  ];
  for (const [command, values] of invalid) {
    assert.throws(() => command.preflight(ctx(values)), Error);
  }
  assert.equal(requests.length, before);
} finally {
  globalThis.fetch = previousFetch;
}

const invalidDelete = spawnSync(process.execPath, ['--import', 'tsx', 'src/index.ts',
  'experiment', 'traffic-domain', 'delete', '--project-id', '1', '--domain-id', 'd1', '--expected-version', '-1'],
{ encoding: 'utf8' });
assert.notEqual(invalidDelete.status, 0);
assert.match(invalidDelete.stdout + invalidDelete.stderr, /expected-version.*integer/);
assert.doesNotMatch(invalidDelete.stdout + invalidDelete.stderr, /CONFIRMATION_REQUIRED/);
process.stdout.write('OK: traffic domain commands preserve quotas, versions, authentication and deletion safety.\n');
