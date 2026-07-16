/** Dashboard/audience CLI contract regression tests. */

import assert from 'node:assert/strict';
import type { Command, RuntimeContext } from '../src/framework/types.ts';
import {
  clearCapabilityGatewayRoutesForTest,
  registerCapabilityGatewayRoute,
} from '../src/core/capability-routing.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';
import { dashboardList } from '../src/commands/te-analysis/dashboard/list.ts';
import { dashboardShare } from '../src/commands/te-analysis/dashboard/share.ts';
import { dashboardUpdate } from '../src/commands/te-analysis/dashboard/update.ts';
import { dashboardReportDataRun } from '../src/commands/te-analysis/dashboard-report-data/run.ts';
import { queryCreateResultCluster } from '../src/commands/te-analysis/query/create-result-cluster.ts';
import userCommands from '../src/commands/te-analysis/user/index.ts';

let pass = 0;
let fail = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    pass += 1;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (err) {
    fail += 1;
    process.stdout.write(`  ✗ ${name}\n`);
    process.stdout.write(`    ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

function context(values: Record<string, unknown>): RuntimeContext {
  return {
    str: (name) => values[name] === undefined ? '' : String(values[name]),
    num: (name) => Number(values[name]),
    optionalNum: (name) => values[name] === undefined ? undefined : Number(values[name]),
    bool: (name) => Boolean(values[name]),
    json: (name) => typeof values[name] === 'string' ? JSON.parse(String(values[name])) : values[name],
    api: async () => ({}),
    querySql: async () => ({}),
    queryReportData: async () => ({}),
    token: async () => 'token',
    host: () => 'https://ta.example.com',
    mcpUrl: () => undefined,
    service: () => 'analysis',
    out: () => undefined,
  };
}

async function dryBody(command: Command, values: Record<string, unknown>): Promise<{ body: any }> {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });
  const host = 'https://ta.example.com';
  setCliTokenManual('analysis-contract-test-token', host);
  let body: any;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_request: any, init?: RequestInit) => {
    body = init?.body ? JSON.parse(String(init.body)) : undefined;
    return new Response(JSON.stringify({ ok: true, data: { dry_run: true } }), { status: 200 });
  }) as typeof fetch;
  try {
    await command.dryRun!(context(values));
    return { body };
  } finally {
    globalThis.fetch = originalFetch;
    clearCliToken(host);
  }
}

function user(resource: string, action: string): Command {
  const command = userCommands.find((item) => item.resource === resource && item.command === action);
  assert.ok(command, `missing analysis ${resource} ${action}`);
  return command;
}

function flagNames(command: Command): string[] {
  return command.flags.map((flag) => flag.name);
}

process.stdout.write('\nanalysis dashboard/audience contract tests\n');

await test('result cluster has one canonical capability', () => {
  assert.equal(queryCreateResultCluster.capabilityId, 'analysis.query.create_result_cluster');
  assert.equal(userCommands.some((item) => item.capabilityId === 'analysis.user_cluster.create_from_result'), false);
  assert.equal(userCommands.some((item) => item.command === 'create-from-result'), false);
});

await test('dashboard list forwards snake_case projection fields', async () => {
  const result = await dryBody(dashboardList, {
    'project-id': 1,
    fields: '["dashboard_id","dashboard_name"]',
  });
  assert.deepEqual(result.body.input.fields, ['dashboard_id', 'dashboard_name']);
  assert.match(dashboardList.flags.find((flag) => flag.name === 'fields')!.desc, /dashboard_id/);
  assert.doesNotMatch(dashboardList.flags.find((flag) => flag.name === 'fields')!.desc, /dashboardId/);
});

await test('dashboard share sends user authority map unchanged', async () => {
  const result = await dryBody(dashboardShare, {
    'project-id': 1,
    'dashboard-id': 1001,
    'member-authorities': '{"10001":"READ","10002":"EDIT"}',
  });
  assert.deepEqual(result.body.input.member_authorities, { 10001: 'READ', 10002: 'EDIT' });
  assert.match(dashboardShare.flags.find((flag) => flag.name === 'member-authorities')!.desc, /numeric_user_id/);
});

await test('dashboard update preserves integer refresh type and string status', async () => {
  const result = await dryBody(dashboardUpdate, {
    'project-id': 1,
    operation: 'settings',
    'dashboard-id': 1001,
    'refresh-type': 1,
    'dashboard-status': 'normal',
  });
  assert.equal(result.body.input.refresh_type, 1);
  assert.equal(result.body.input.dashboard_status, 'normal');
  assert.equal(dashboardUpdate.flags.find((flag) => flag.name === 'dashboard-status')!.type, 'string');
});

await test('condition create and update expose only fields accepted by Common', () => {
  for (const resource of ['user-cluster', 'user-tag']) {
    const create = user(resource, 'create');
    const update = user(resource, 'update');
    assert.equal(flagNames(create).includes('remark'), false);
    assert.equal(flagNames(create).includes('entity-id'), true);
    assert.equal(flagNames(update).includes('remark'), true);
    assert.equal(flagNames(update).includes('entity-id'), false);
    const modelReference = resource === 'user-cluster' ? /user_cluster_models\.md/ : /user_tag_models\.md/;
    assert.match(create.flags.find((flag) => flag.name === 'definition-request')!.desc, modelReference);
  }
  assert.equal(flagNames(user('user-cluster', 'update-id')).includes('entity-id'), false);
  assert.equal(flagNames(user('user-tag', 'update-id')).includes('entity-id'), true);
});

await test('inline ID CSV help exposes the exact no-header column contract', () => {
  const clusterFile = user('user-cluster', 'create-id').flags.find((flag) => flag.name === 'file-content')!;
  const tagFile = user('user-tag', 'create-id').flags.find((flag) => flag.name === 'file-content')!;
  assert.match(clusterFile.desc, /No header row/);
  assert.match(clusterFile.desc, /association-property value/);
  assert.match(clusterFile.desc, /entity ID/);
  assert.match(tagFile.desc, /No header row/);
  assert.match(tagFile.desc, /Exactly two non-empty columns/);
  assert.match(tagFile.desc, /tag_value/);
  assert.equal(flagNames(user('user-tag', 'create-id')).includes('association-property'), true);
  assert.equal(flagNames(user('user-tag', 'create-id')).includes('main-column-name'), false);
});

await test('history tag batch refresh uses the public snake_case object', async () => {
  const result = await dryBody(user('history-tag', 'batch-refresh'), {
    'project-id': 1,
    'tag-name': 'user_level',
    'refresh-request': '{"start_time":"2026-07-01","end_time":"2026-07-07","only_abnormal":false,"use_user_table_type":"user_table"}',
  });
  assert.deepEqual(result.body.input.refresh_request, {
    start_time: '2026-07-01',
    end_time: '2026-07-07',
    only_abnormal: false,
    use_user_table_type: 'user_table',
  });
});

await test('all audience exports publish the six-hour maximum', () => {
  for (const command of userCommands.filter((item) => item.command === 'export')) {
    const timeout = command.flags.find((flag) => flag.name === 'timeout-seconds');
    assert.equal(timeout?.max, 21600, `${command.resource} export timeout max`);
  }
});

await test('dashboard and other sync queries publish distinct timeout defaults', () => {
  const dashboardTimeout = dashboardReportDataRun.flags.find((flag) => flag.name === 'timeout-seconds')!;
  assert.equal(dashboardTimeout.max, 180);
  assert.match(dashboardTimeout.desc, /Default: 180/);

  for (const command of [user('user-tag-member', 'list'), user('user-cluster-member', 'list')]) {
    const timeout = command.flags.find((flag) => flag.name === 'timeout-seconds')!;
    assert.equal(timeout.max, 180);
    assert.match(timeout.desc, /Default: 120/);
  }
});

await test('dashboard report-data help warns that SQL reports ignore shared overrides', () => {
  assert.match(dashboardReportDataRun.description, /do not apply to SQL reports/);
  assert.match(dashboardReportDataRun.description, /data\.warnings/);
  for (const name of ['filters', 'start-time', 'end-time']) {
    const flag = dashboardReportDataRun.flags.find((item) => item.name === name)!;
    assert.match(flag.desc, /SQL reports ignore/);
    assert.match(flag.desc, /warnings/);
  }
});

await test('member help publishes stable default row fields', () => {
  const tagFields = user('user-tag-member', 'list').flags.find((flag) => flag.name === 'fields')!;
  assert.match(tagFields.desc, /#user_id/);
  assert.match(tagFields.desc, /#account_id/);
  assert.match(tagFields.desc, /#distinct_id/);
  assert.match(tagFields.desc, /tag_value/);

  const clusterFields = user('user-cluster-member', 'list').flags.find((flag) => flag.name === 'fields')!;
  assert.match(clusterFields.desc, /#account_id/);
  assert.doesNotMatch(clusterFields.desc, /tag_value/);
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
