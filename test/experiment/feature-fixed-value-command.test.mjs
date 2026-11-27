import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { featureSave, featureUpdateFixedValue, featureResetFixedValue, featureGet, featureList } from '../../src/commands/te-experiment/index.ts';

const host = 'https://feature-fixed-cli.test';
const token = 'cli_fixed_value_test_token';
const configDir = mkdtempSync(join(tmpdir(), 'ae-feature-fixed-value-test-'));
const previousConfigDir = process.env.TE_AGENT_CLI_CONFIG_DIR;
writeFileSync(join(configDir, 'cli-token.json'), JSON.stringify({ url: host, token }));
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
    bool: (name) => Boolean(values[name]),
    json: (name) => values[name],
    host: () => host,
  };
}
const identity = { 'project-id': 1, 'feature-key': 'color' };
const requests = [];
let response = { ok: true, data: { result: true } };
let status = 200;
const previousFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  requests.push({ url: String(url), body: JSON.parse(init.body), headers: new Headers(init.headers) });
  return new Response(JSON.stringify(response), { status, headers: { 'Content-Type': 'application/json' } });
};
try {
  const createReq = { featureKey: 'color', type: 'string', defaultValue: 'red', targetPlatform: ['server'] };
  for (const req of [createReq, { ...createReq, fixedValueEnabled: true }, { ...createReq, fixedValueEnabled: false }]) {
    const count = requests.length;
    assert.equal((await featureSave.execute(ctx({ 'project-id': 1, req }))).result, true);
    assert.equal(requests.length, count + 1, 'creation should use a single save request');
    assert.equal(requests.at(-1).url, `${host}/api/cli/engage/v1/capabilities/experiment.feature.save/execute`);
    assert.deepEqual(requests.at(-1).body.input, { project_id: 1, req });
  }
  for (const enabled of [true, false]) {
    await featureUpdateFixedValue.execute(ctx({ ...identity, enabled }));
    assert.equal(requests.at(-1).url, `${host}/api/cli/engage/v1/capabilities/experiment.feature.update_fixed_value/execute`);
    assert.deepEqual(requests.at(-1).body.input, { project_id: 1, feature_key: 'color', fixed_value_enabled: enabled });
  }
  await featureUpdateFixedValue.dryRun(ctx({ ...identity, enabled: false }));
  assert.match(requests.at(-1).url, /update_fixed_value\/dry-run$/);
  assert.equal(requests.at(-1).body.input.fixed_value_enabled, false);
  await featureUpdateFixedValue.validateInput(ctx({ ...identity, enabled: true }));
  assert.match(requests.at(-1).url, /update_fixed_value\/validate$/);
  const reset = { ...identity, 'request-id': 'reset-1', reason: 'Restart rollout' };
  await featureResetFixedValue.dryRun(ctx(reset));
  assert.match(requests.at(-1).url, /reset_fixed_value\/dry-run$/);
  assert.deepEqual(requests.at(-1).body.input,
    { project_id: 1, feature_key: 'color', request_id: 'reset-1', reason: 'Restart rollout' });
  await featureResetFixedValue.execute(ctx(reset));
  assert.match(requests.at(-1).url, /reset_fixed_value\/execute$/);
  assert.equal(requests.at(-1).body.input.reason, 'Restart rollout');
  await featureResetFixedValue.execute(ctx(identity));
  assert.match(requests.at(-1).body.input.request_id, /^cli_[a-f0-9]{32}$/);
  assert.equal(Object.hasOwn(requests.at(-1).body.input, 'reason'), false);
  assert.equal(featureUpdateFixedValue.risk, 'high-risk-write');
  assert.equal(featureResetFixedValue.risk, 'high-risk-write');
  for (const request of requests) {
    assert.equal(request.headers.get('cli-token'), token);
    assert.equal(request.headers.get('authorization'), null);
  }
  for (const enabled of [true, false]) {
    response = { ok: true, data: { item: { feature_key: 'color', fixed_value_enabled: enabled } } };
    const detail = await featureGet.execute(ctx(identity));
    assert.equal(detail.item.fixed_value_enabled, enabled);
    response = { ok: true, data: { items: [response.data.item], total: 1 } };
    const list = await featureList.execute(ctx({ 'project-id': 1 }));
    assert.equal(list.items[0].fixed_value_enabled, enabled);
  }
  const before = requests.length;
  const invalid = [
    [featureUpdateFixedValue, identity],
    [featureUpdateFixedValue, { ...identity, enabled: false, 'project-id': 0 }],
    [featureResetFixedValue, { ...identity, 'project-id': 1.5 }],
    [featureResetFixedValue, { ...identity, 'project-id': 2147483648 }],
    [featureResetFixedValue, { ...identity, 'feature-key': ' ' }],
    [featureResetFixedValue, { ...identity, 'feature-key': 'x'.repeat(81) }],
    [featureResetFixedValue, { ...identity, 'request-id': ' ' }],
    [featureResetFixedValue, { ...identity, 'request-id': 'x'.repeat(65) }],
    [featureResetFixedValue, { ...identity, reason: 'x'.repeat(501) }],
  ];
  for (const [command, values] of invalid) assert.throws(() => command.preflight(ctx(values)));
  assert.equal(requests.length, before);
  for (const code of [403, 500]) {
    status = code;
    response = { ok: false, error: { type: code === 403 ? 'permission' : 'api',
      code: code === 403 ? 'ATLAS_PERMISSION_DENIED' : 'FEATURE_FIXED_VALUE_OPERATION_FAILED',
      message: 'Operation rejected' } };
    const count = requests.length;
    await assert.rejects(() => featureResetFixedValue.execute(ctx(reset)));
    assert.equal(requests.length, count + 1, 'reset failures must not be automatically retried');
  }
} finally {
  globalThis.fetch = previousFetch;
}
for (const [action, extra] of [['update-fixed-value', ['--enabled', 'false']], ['reset-fixed-value', []]]) {
  const args = ['--import', 'tsx', 'src/index.ts', 'experiment', 'feature', action];
  const help = spawnSync(process.execPath, [...args, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /--feature-key/);
  const blocked = spawnSync(process.execPath,
    [...args, '--project-id', '1', '--feature-key', 'color', ...extra], { encoding: 'utf8' });
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stdout + blocked.stderr, /CONFIRMATION_REQUIRED/);
}
process.stdout.write('OK: fixed-value commands preserve false, reset tracing, reason, dry-run, auth and confirmation.\n');
