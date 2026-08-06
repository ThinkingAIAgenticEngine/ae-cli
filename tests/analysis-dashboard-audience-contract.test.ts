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
import { dashboardReportDataExport } from '../src/commands/te-analysis/dashboard-report-data/export.ts';
import { queryCreateResultCluster } from '../src/commands/te-analysis/query/create-result-cluster.ts';
import { biPanelPageDataRun } from '../src/commands/te-analysis/bi-panel-page-data/run.ts';
import userCommands from '../src/commands/te-analysis/user/index.ts';
import { stringFlagValidationError } from '../src/framework/runner.ts';

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
  const machineName = queryCreateResultCluster.flags.find((item) => item.name === 'cluster-name')!;
  assert.equal(machineName.maxLength, 24);
  assert.equal(machineName.pattern, '^[a-z][a-z0-9_]*$');
  assert.equal(queryCreateResultCluster.flags.find((item) => item.name === 'display-name')!.maxLength, 80);
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

await test('audience writes publish the UI-compatible string limits', () => {
  for (const resource of ['user-cluster', 'user-tag']) {
    const create = user(resource, 'create');
    const createId = user(resource, 'create-id');
    const update = user(resource, 'update');
    const updateId = user(resource, 'update-id');
    const machineName = resource === 'user-cluster' ? 'cluster-name' : 'tag-name';
    for (const command of [create, createId]) {
      const flag = command.flags.find((item) => item.name === machineName)!;
      assert.equal(flag.minLength, 1);
      assert.equal(flag.maxLength, 80);
      assert.equal(flag.pattern, '^[a-zA-Z][a-zA-Z0-9_]*$');
    }
    for (const command of [create, createId, update, updateId]) {
      assert.equal(command.flags.find((item) => item.name === 'display-name')!.maxLength, 80);
    }
    assert.equal(update.flags.find((item) => item.name === 'remark')!.maxLength, 400);
    assert.equal(createId.flags.find((item) => item.name === 'remarks')!.maxLength, 400);
    assert.equal(updateId.flags.find((item) => item.name === 'remarks')!.maxLength, 400);
  }
});

await test('audience string limits fail locally before dispatch', () => {
  const clusterName = user('user-cluster', 'create').flags.find((item) => item.name === 'cluster-name')!;
  const resultClusterName = queryCreateResultCluster.flags.find((item) => item.name === 'cluster-name')!;
  const displayName = user('user-tag', 'create').flags.find((item) => item.name === 'display-name')!;
  const remark = user('user-cluster', 'update').flags.find((item) => item.name === 'remark')!;
  assert.match(stringFlagValidationError(clusterName, `a${'b'.repeat(80)}`)!.message, /must not exceed 80/);
  assert.match(stringFlagValidationError(clusterName, '1_invalid')!.message, /invalid format/);
  assert.match(stringFlagValidationError(resultClusterName, `a${'b'.repeat(24)}`)!.message, /must not exceed 24/);
  assert.match(stringFlagValidationError(resultClusterName, 'A_result')!.message, /invalid format/);
  assert.match(stringFlagValidationError(displayName, '显'.repeat(81))!.message, /must not exceed 80/);
  assert.match(stringFlagValidationError(remark, 'r'.repeat(401))!.message, /must not exceed 400/);
  assert.equal(stringFlagValidationError(clusterName, `a${'b'.repeat(79)}`), undefined);
  assert.equal(stringFlagValidationError(resultClusterName, `a${'b'.repeat(23)}`), undefined);
  assert.equal(stringFlagValidationError(displayName, '显'.repeat(80)), undefined);
  assert.equal(stringFlagValidationError(remark, 'r'.repeat(400)), undefined);
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

await test('audience exports publish the lifecycle that matches their output contract', () => {
  const synchronousCatalogExports = [
    user('user-cluster', 'export'),
    user('user-tag', 'export'),
  ];
  const asynchronousDataExports = [
    user('user-cluster-member', 'export'),
    user('user-tag-member', 'export'),
    user('history-tag-data', 'export'),
    user('history-tag-data-drilldown', 'export'),
  ];
  const allExports = userCommands.filter((item) => item.command === 'export');
  assert.deepEqual(
    new Set([...synchronousCatalogExports, ...asynchronousDataExports]),
    new Set(allExports),
    'Every audience export must be classified as a synchronous catalog or asynchronous data export',
  );

  for (const command of synchronousCatalogExports) {
    const names = flagNames(command);
    assert.equal(command.flags.find((flag) => flag.name === 'output')?.required, true);
    assert.equal(names.includes('timeout-seconds'), false, `${command.resource} catalog export timeout`);
    assert.equal(names.includes('wait'), false, `${command.resource} catalog export wait lifecycle`);
    assert.equal(names.includes('force'), false, `${command.resource} catalog export force lifecycle`);
  }

  for (const command of asynchronousDataExports) {
    const timeout = command.flags.find((flag) => flag.name === 'timeout-seconds');
    assert.equal(timeout?.max, 21600, `${command.resource} export timeout max`);
    const names = flagNames(command);
    assert.equal(names.includes('wait'), true, `${command.resource} export wait lifecycle`);
    assert.equal(names.includes('output'), true, `${command.resource} export output lifecycle`);
    assert.equal(names.includes('force'), true, `${command.resource} export force lifecycle`);
  }
});

await test('native member exports expose the common jsonl and csv format contract', async () => {
  for (const command of [
    user('user-tag-member', 'export'),
    user('user-cluster-member', 'export'),
    user('history-tag-data-drilldown', 'export'),
  ]) {
    const names = flagNames(command);
    assert.equal(names.includes('fields'), false);
    assert.equal(names.includes('query'), false);
    assert.equal(names.includes('use-cache'), false);
    assert.match(command.flags.find((flag) => flag.name === 'artifact-format')!.desc, /jsonl or csv/);
    assert.match(command.flags.find((flag) => flag.name === 'artifact-format')!.desc, /Default: jsonl/);
  }

  const { body } = await dryBody(user('user-cluster-member', 'export'), {
    'project-id': 5,
    'cluster-name': 'retained_users',
    'artifact-format': 'csv',
  });
  assert.equal(body.input.format, 'csv');
  assert.equal(body.input.fields, undefined);
  assert.equal(body.input.query, undefined);
  assert.equal(body.input.use_cache, undefined);

  const defaultFormat = await dryBody(user('user-tag-member', 'export'), {
    'project-id': 5,
    'tag-name': 'vip',
  });
  assert.equal(defaultFormat.body.input.format, undefined);

  const jsonlFormat = await dryBody(user('history-tag-data-drilldown', 'export'), {
    'project-id': 5,
    'tag-name': 'vip',
    'snapshot-date': '2026-07-01',
    'group-col': 'high',
    view: '{}',
    'artifact-format': 'jsonl',
  });
  assert.equal(jsonlFormat.body.input.format, 'jsonl');
});

await test('BI page data run has no invented row or block pagination flags', () => {
  const names = flagNames(biPanelPageDataRun);
  for (const name of ['row-limit', 'row-offset', 'block-limit', 'block-offset']) {
    assert.equal(names.includes(name), false, `must not expose --${name}`);
  }
  assert.match(biPanelPageDataRun.description, /same chart result cap as the UI/);
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

await test('all audience sync data queries expose and forward preview rows', async () => {
  const cases = [
    [user('user-cluster-member', 'list'), { 'project-id': 5, 'cluster-name': 'vip' }],
    [user('user-tag-member', 'list'), { 'project-id': 5, 'tag-name': 'vip' }],
    [user('history-tag-data', 'run'), { 'project-id': 5, 'tag-name': 'vip', view: '{}' }],
    [user('history-tag-data-drilldown', 'run'), {
      'project-id': 5,
      'tag-name': 'vip',
      'snapshot-date': '2026-07-01',
      'group-col': 'high',
      view: '{}',
    }],
  ] as const;

  for (const [command, args] of cases) {
    assert.equal(flagNames(command).includes('preview-rows'), true, `${command.resource} preview flag`);
    const { body } = await dryBody(command, { ...args, 'preview-rows': 37 });
    assert.equal(body.input.preview_rows, 37, `${command.resource} preview input`);
  }
});

await test('member query help publishes the UI-compatible 1000 row default', () => {
  for (const command of [user('user-tag-member', 'list'), user('user-cluster-member', 'list')]) {
    const previewRows = command.flags.find((flag) => flag.name === 'preview-rows')!;
    assert.match(previewRows.desc, /Default: 1000/);
    assert.equal(previewRows.max, 100000);
    assert.match(command.description, /defaults to 1000 rows/);
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

await test('dashboard report-data run and export expose and forward the unified timezone override', async () => {
  for (const command of [dashboardReportDataRun, dashboardReportDataExport]) {
    const flag = command.flags.find((item) => item.name === 'zone-offset');
    assert.ok(flag, `${command.command} must expose --zone-offset`);
    assert.match(flag.desc, /current user/);
    assert.match(flag.desc, /project default/);
    assert.match(flag.desc, /99/);

    const { body } = await dryBody(command, {
      'project-id': 5,
      'dashboard-id': 903,
      'report-ids': [1616],
      'zone-offset': 0,
    });
    assert.equal(body.input.zone_offset, 0, `${command.command} must forward zone_offset=0`);
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
