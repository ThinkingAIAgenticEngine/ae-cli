import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reportUpdate } from '../src/commands/te-analysis/report/update.ts';
import { drilldownUserEventsRun } from '../src/commands/te-analysis/drilldown-user-events/run.ts';
import governanceCommands from '../src/commands/te-analysis/governance/index.ts';
import systemCommands from '../src/commands/te-analysis/system/index.ts';
import { biPanelCopy } from '../src/commands/te-analysis/bi-panel/copy.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';
import { registerCapabilityGatewayRoute } from '../src/core/capability-routing.ts';

const HOST = 'https://ta.example';
registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });

function ctx(values) {
  return {
    str(name) {
      const value = values[name];
      return value === undefined || value === null ? '' : String(value);
    },
    num(name) {
      return Number(values[name]);
    },
    optionalNum(name) {
      const value = values[name];
      return value === undefined || value === null || value === '' ? undefined : Number(value);
    },
    bool(name) {
      return Boolean(values[name]);
    },
    json(name) {
      const value = values[name];
      if (value === undefined || value === null || value === '') return undefined;
      return typeof value === 'string' ? JSON.parse(value) : value;
    },
    host() {
      return HOST;
    },
    mcpUrl() {
      return undefined;
    },
    service() {
      return 'analysis';
    },
  };
}

async function captureDryRun(command, values, { operation = 'dryRun', respond } = {}) {
  let body;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    body = JSON.parse(String(init?.body));
    if (respond) return respond(body.input);
    return new Response(JSON.stringify({ ok: true, data: { dry_run: true } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  setCliTokenManual('cli_test_token', HOST);
  try {
    await command[operation](ctx(values));
    if (body?.input?.request_id && values['request-id'] === undefined && values.payload?.request_id === undefined) {
      assert.match(body.input.request_id, /^cli_[0-9a-f]{32}$/);
      delete body.input.request_id;
    }
    return body;
  } finally {
    globalThis.fetch = originalFetch;
    clearCliToken(HOST);
  }
}

const updateReport = await captureDryRun(reportUpdate, {
  'project-id': 1,
  'report-id': 2,
  'report-version': 0,
  'report-name': 'Renamed',
});
assert.equal(updateReport.input.version, 0);

const drilldown = await captureDryRun(drilldownUserEventsRun, {
  'drilldown-context-id': 'drill_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'user-id': 'u1',
});
assert.equal('limit' in drilldown.input, false);
assert.equal('page_num' in drilldown.input, false);
assert.equal('page_size' in drilldown.input, false);

const governance = (id) => {
  const command = governanceCommands.find((item) => item.capabilityId === `governance.${id}`);
  assert.ok(command, id);
  return command;
};

const requiredGovernanceInputs = [
  ['asset.batch_dashboard_schedule_freeze', { node_ids: ['node-a'] }],
  ['asset.batch_delete', { node_ids: ['node-a'] }],
  ['asset.batch_disable_auto_backup', { node_ids: ['node-a'] }],
  ['asset.batch_disable_auto_update', { node_ids: ['node-a'] }],
  ['asset.batch_export_info', { node_ids: ['node-a'] }],
  ['asset.batch_export_sql', { node_ids: ['node-a'] }],
  ['asset.batch_handover', { node_ids: ['node-a'], to_user_id: 9 }],
  ['asset_dependency.list', { node_id: 'node-a' }],
  ['asset_impact.list', { node_id: 'node-a' }],
  ['asset_lineage.get', { node_id: 'node-a' }],
  ['asset_query_history.list', { node_id: 'node-a' }],
  ['operation_record.export', { record_id: 4 }],
  ['rule.create', { rule_name: 'Rule A', rule: {} }],
  ['rule.delete', { rule_id: 3 }],
  ['rule.update', { rule_id: 3, rule_name: 'Rule A', rule: {} }],
];

for (const [id, input] of requiredGovernanceInputs) {
  await test(`${id} sends the same top-level required fields from flags or payload`, async () => {
    const flags = Object.fromEntries(Object.entries(input).map(([key, value]) => [key.replaceAll('_', '-'), value]));
    for (const values of [flags, { payload: input }]) {
      const body = await captureDryRun(governance(id), { 'project-id': 7, ...values });
      assert.deepEqual(body.input, { project_id: 7, ...input });
    }
  });
}

const governanceTypedInputs = [
  ['asset.batch_export_info', { node_ids: ['node-a'] }, { reports_version: 1 }],
  ['asset.batch_export_sql', { node_ids: ['node-a'] }, { zone_offset: 8 }],
  ['asset.batch_dashboard_schedule_freeze', {
    node_ids: ['node-a'], schedule_ui_config: {}, dashboard_status: 'freeze', refresh_type: 0, cache_config: {},
  }, { reports_version: 1 }],
  ['asset_impact.list', { node_id: 'node-a', limit: 50, offset: 0 }, { query: 'unsupported' }],
  ['asset_query_history.list', { node_id: 'node-a', limit: 50, offset: 0 }, { searchs: [] }],
];

for (const [id, input, unknown] of governanceTypedInputs) {
  await test(`${id} exposes only release-supported typed fields and preserves unknown payload fields`, async () => {
    const command = governance(id);
    const flags = Object.fromEntries(Object.entries(input).map(([key, value]) => [key.replaceAll('_', '-'), value]));
    const lifecycle = id.includes('export') ? ['request-id', 'artifact-format', 'timeout-seconds', 'wait', 'wait-timeout-seconds', 'output', 'force'] : [];
    assert.deepEqual(command.flags.map((flag) => flag.name).sort(), ['project-id', 'payload', ...Object.keys(flags), ...lifecycle].sort());
    const body = await captureDryRun(command, { 'project-id': 7, ...flags, payload: { project_id: 999, ...unknown } });
    assert.deepEqual(body.input, { project_id: 7, ...input, ...unknown });
  });
}

await test('governance explicit flags and project identity override payload without losing omitted fields', async () => {
  const payload = { project_id: 999, node_ids: ['node-b'], refresh_type: 1 };
  const body = await captureDryRun(governance('asset.batch_disable_auto_update'), {
    'project-id': 7, 'refresh-type': 0, payload,
  });
  assert.deepEqual(body.input, { project_id: 7, node_ids: ['node-b'], refresh_type: 0 });
  assert.deepEqual(payload, { project_id: 999, node_ids: ['node-b'], refresh_type: 1 });
  assert.equal(governance('asset.batch_disable_auto_update').flags.find((flag) => flag.name === 'project-id').required, true);
});

await test('governance preserves optional payload fields and unknown fields for gateway validation', async () => {
  const body = await captureDryRun(governance('operation_record.export'), {
    'project-id': 7,
    payload: { record_id: 4, timeout_seconds: 7200, format: 'xlsx', unknown_field: true },
  });
  assert.deepEqual(body.input, { project_id: 7, record_id: 4, timeout_seconds: 7200, format: 'xlsx', unknown_field: true });
  const unknown = JSON.parse('{"record_id":4,"__proto__":{"unexpected":true}}');
  assert.deepEqual((await captureDryRun(governance('operation_record.export'), {
    'project-id': 7, payload: unknown,
  })).input, { project_id: 7, ...unknown });
});

await test('governance retains gateway validation failures for missing and unknown fields', async () => {
  for (const payload of [{}, { node_id: 'node-a', unknown_field: true }]) {
    await assert.rejects(captureDryRun(governance('asset_lineage.get'), {
      'project-id': 7, payload,
    }, {
      operation: 'validateInput',
      respond: (input) => {
        assert.deepEqual(input, { project_id: 7, ...payload });
        return new Response(JSON.stringify({ ok: false, error: {
          code: 'INVALID_CAPABILITY_INPUT',
          message: input.node_id === undefined ? 'node_id is required' : 'Unknown field: unknown_field',
        } }), { status: 400 });
      },
    }), (error) => error.code === 'INVALID_CAPABILITY_INPUT');
  }
});

await test('governance rejects invalid payload containers and array/object field shapes before dispatch', () => {
  const lineage = governance('asset_lineage.get');
  for (const payload of [[], null, 4, 'invalid']) {
    assert.throws(() => lineage.preflight(ctx({ 'project-id': 7, payload: JSON.stringify(payload) })), /payload must be a JSON object/);
  }
  assert.throws(() => governance('asset.list').preflight(ctx({
    'project-id': 7, payload: { payload: { query: 'unexpected nesting' } },
  })), /payload must not contain a nested payload field/);
  const cases = [
    ['asset.batch_delete', 'node_ids', 'node-a'],
    ['asset.list', 'searchs', {}],
    ['operation_record.list', 'status', 1],
    ['rule.create', 'rule', []],
  ];
  for (const [id, field, value] of cases) {
    for (const values of [{ payload: { [field]: value } }, { [field.replaceAll('_', '-')]: JSON.stringify(value) }]) {
      assert.throws(() => governance(id).preflight(ctx({ 'project-id': 7, ...values })), /must be a JSON (array|object)/);
    }
  }
});

await test('handover accepts a payload target and still rejects missing or invalid targets locally', () => {
  const command = governance('asset.batch_handover');
  assert.equal(command.flags.find((flag) => flag.name === 'to-user-id').required, false);
  for (const to_user_id of [undefined, null, '9', 0, -1, 1.5]) {
    assert.throws(() => command.preflight(ctx({
      'project-id': 7, payload: { node_ids: ['node-a'], to_user_id },
    })), /to_user_id must be a positive integer/);
  }
  assert.doesNotThrow(() => command.preflight(ctx({
    'project-id': 7, payload: { node_ids: ['node-a'], to_user_id: 9 },
  })));
});

await test('BI copy publishes required identity/name flags and forwards supplied values', async () => {
  for (const name of ['panel-uuid', 'panel-name']) {
    assert.equal(biPanelCopy.flags.find((flag) => flag.name === name).required, true);
  }
  const body = await captureDryRun(biPanelCopy, {
    'project-id': 7, 'panel-uuid': 'panel-a', 'panel-name': 'Copy A', 'folder-id': 0,
  });
  assert.deepEqual(body.input, { project_id: 7, panel_uuid: 'panel-a', panel_name: 'Copy A', folder_id: 0 });
});

await test('system commands publish release limits and receiver detection write risk', async () => {
  const byId = (id) => systemCommands.find((item) => item.capabilityId === id);
  assert.equal(byId('system.ops_alert_contact.list').flags.find((flag) => flag.name === 'limit').max, 100);
  assert.equal(byId('system.query_task.get').flags.find((flag) => flag.name === 'sql-max-chars').max, 20000);
  assert.equal(byId('system.receiver_detection.get').risk, 'write');
  for (const limit of [1, 100]) {
    const body = await captureDryRun(byId('system.ops_alert_contact.list'), { 'company-id': 7, limit });
    assert.deepEqual(body.input, { company_id: 7, limit });
  }
  for (const sqlMaxChars of [0, 20000]) {
    const body = await captureDryRun(byId('system.query_task.get'), {
      'company-id': 7, 'task-id': 'task-a', 'sql-max-chars': sqlMaxChars,
    });
    assert.deepEqual(body.input, { company_id: 7, task_id: 'task-a', sql_max_chars: sqlMaxChars });
  }
});

await test('CLI rejects missing BI identity/project and out-of-range system flags before network access', () => {
  const home = mkdtempSync(join(tmpdir(), 'ae-command-contract-'));
  try {
    const cases = [
      [['analysis', 'bi-panel', 'copy', '--project-id', '7'], /panel-uuid.*panel-name|panel-name.*panel-uuid/],
      [['analysis-governance', 'asset-lineage', 'get', '--payload', '{"project_id":999,"node_id":"node-a"}'], /Missing required flag: --project-id/],
      [['system', 'ops-alert-contact', 'list', '--company-id', '7', '--limit', '101'], /between 1 and 100/],
      [['system', 'ops-alert-contact', 'list', '--company-id', '7', '--limit', '0'], /between 1 and 100/],
      [['system', 'query-task', 'get', '--company-id', '7', '--task-id', 'task-a', '--sql-max-chars', '20001'], /between 0 and 20000/],
      [['system', 'query-task', 'get', '--company-id', '7', '--task-id', 'task-a', '--sql-max-chars', '-1'], /between 0 and 20000/],
    ];
    for (const [args, message] of cases) {
      const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/index.ts', '--host', 'http://127.0.0.1:1', '--dry-run', ...args], {
        encoding: 'utf8', env: { ...process.env, HOME: home, AE_CLI_NO_COMPAT_CHECK: '1' },
      });
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, message);
    }
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

for (const id of ['asset.export', 'asset.batch_export_info', 'asset.batch_export_sql', 'operation_record.export']) {
  await test(`governance ${id} exposes asynchronous export lifecycle and preserves payload defaults`, async () => {
    const command = governance(id);
    for (const name of ['wait', 'output', 'force', 'request-id', 'artifact-format', 'timeout-seconds']) {
      assert.ok(command.flags.some((flag) => flag.name === name), `${id}: ${name}`);
    }
    assert.equal(command.flags.find((flag) => flag.name === 'timeout-seconds').max, 7200);
    const input = (await captureDryRun(command, {
      'project-id': 7,
      payload: { node_ids: ['node-a'], record_id: 4, format: 'csv', timeout_seconds: 500 },
      'request-id': 'cli_' + 'a'.repeat(32),
      'artifact-format': id === 'asset.export' ? 'jsonl' : 'xlsx',
    })).input;
    assert.equal(input.format, id === 'asset.export' ? 'jsonl' : 'xlsx');
    assert.equal(input.timeout_seconds, 500);
    assert.equal(input.request_id, 'cli_' + 'a'.repeat(32));
    assert.equal(input.project_id, 7);
  });
}

await test('governance list and export retain the selected node filter', async () => {
  for (const id of ['asset.list', 'asset.export']) {
    const body = await captureDryRun(governance(id), { 'project-id': 7, 'node-id': 'node-a' });
    assert.equal(body.input.node_id, 'node-a');
  }
});
