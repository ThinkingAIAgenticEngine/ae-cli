/**
 * analysis report capability command unit tests
 *
 * Run: npx tsx tests/analysis-report-capability-command.test.ts
 */

import assert from 'node:assert/strict';
import type { RuntimeContext } from '../src/framework/types.ts';
import {
  clearCapabilityGatewayRoutesForTest,
  registerCapabilityGatewayRoute,
} from '../src/core/capability-routing.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';
import { reportCreate } from '../src/commands/te-analysis/report/create.ts';
import { reportUpdate } from '../src/commands/te-analysis/report/update.ts';
import { reportList } from '../src/commands/te-analysis/report/list.ts';
import { reportListExport } from '../src/commands/te-analysis/report/list-export.ts';
import { reportDataRun } from '../src/commands/te-analysis/report-data/run.ts';
import { reportDataExport } from '../src/commands/te-analysis/report-data/export.ts';
import { dashboardReportDataRun } from '../src/commands/te-analysis/dashboard-report-data/run.ts';
import { reportChangeLogGet } from '../src/commands/te-analysis/report-change-log/get.ts';
import { dashboardReportAdd } from '../src/commands/te-analysis/dashboard-report/add.ts';
import { biPanelCreate } from '../src/commands/te-analysis/bi-panel/create.ts';
import { biPanelUpdate } from '../src/commands/te-analysis/bi-panel/update.ts';
import { adhocRun } from '../src/commands/te-analysis/adhoc/run.ts';
import { adhocExport } from '../src/commands/te-analysis/adhoc/export.ts';
import { eventDetailRun } from '../src/commands/te-analysis/event-detail/run.ts';
import { eventDetailExport } from '../src/commands/te-analysis/event-detail/export.ts';
import { entityDetailRun } from '../src/commands/te-analysis/entity-detail/run.ts';
import { entityDetailExport } from '../src/commands/te-analysis/entity-detail/export.ts';
import { drilldownEventsRun } from '../src/commands/te-analysis/drilldown-events/run.ts';
import { drilldownEventsExport } from '../src/commands/te-analysis/drilldown-events/export.ts';
import { drilldownEntitiesRun } from '../src/commands/te-analysis/drilldown-entities/run.ts';
import { drilldownEntitiesExport } from '../src/commands/te-analysis/drilldown-entities/export.ts';
import { drilldownUserEventsRun } from '../src/commands/te-analysis/drilldown-user-events/run.ts';
import { drilldownUserEventsExport } from '../src/commands/te-analysis/drilldown-user-events/export.ts';
import { queryCreateResultCluster } from '../src/commands/te-analysis/query/create-result-cluster.ts';
import { filterValueList } from '../src/commands/te-analysis/filter-value/list.ts';
import { queryClusterList } from '../src/commands/te-analysis/query-cluster/list.ts';
import { runInspect } from '../src/commands/te-analysis/run/inspect.ts';
import { artifactDownload } from '../src/commands/te-analysis/artifact/download.ts';
import {
  AI_MODEL_TYPE_VALUES,
  REPORT_WRITE_MODEL_TYPE_VALUES,
} from '../src/commands/te-analysis/ai-models.ts';

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

function ctx(values: Record<string, unknown>): RuntimeContext {
  return {
    str(name: string): string {
      const value = values[name];
      return value === undefined || value === null ? '' : String(value);
    },
    num(name: string): number {
      return Number(values[name]);
    },
    optionalNum(name: string): number | undefined {
      return values[name] === undefined ? undefined : Number(values[name]);
    },
    bool(name: string): boolean {
      return Boolean(values[name]);
    },
    json(name: string): unknown {
      const value = values[name];
      return typeof value === 'string' ? JSON.parse(value) : value;
    },
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

async function dryBody(
  command: { dryRun?: (ctx: RuntimeContext) => unknown },
  input: Record<string, unknown>,
): Promise<{ url: string; body: any }> {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });
  const host = 'https://ta.example.com';
  setCliTokenManual('analysis-contract-test-token', host);
  let url = '';
  let body: any;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (request: any, init?: RequestInit) => {
    url = String(request);
    body = init?.body ? JSON.parse(String(init.body)) : undefined;
    return new Response(JSON.stringify({ ok: true, data: { dry_run: true } }), { status: 200 });
  }) as typeof fetch;
  try {
    await command.dryRun!(ctx(input));
    return { url, body };
  } finally {
    globalThis.fetch = originalFetch;
    clearCliToken(host);
  }
}

process.stdout.write('\nanalysis report capability command tests\n');

await test('BI panel v1 create and update expose only the supported shell contract', async () => {
  assert.equal(biPanelCreate.description, 'Create an empty BI dashboard shell without draft or release content.');
  assert.deepEqual(
    biPanelCreate.flags.map((flag) => [flag.name, flag.required]),
    [
      ['project-id', true],
      ['panel-name', true],
      ['space-id', false],
      ['folder-id', false],
    ],
  );

  const createDryRun = await dryBody(biPanelCreate, {
    'project-id': 1,
    'panel-name': 'Revenue',
    'space-id': 2,
    'folder-id': 3,
  });
  assert.deepEqual(createDryRun.body.input, {
    project_id: 1,
    panel_name: 'Revenue',
    space_id: 2,
    folder_id: 3,
  });

  assert.equal(biPanelUpdate.description, 'Rename a BI dashboard without changing draft or release content.');
  assert.deepEqual(
    biPanelUpdate.flags.map((flag) => [flag.name, flag.required]),
    [
      ['project-id', true],
      ['panel-name', true],
      ['panel-uuid', true],
    ],
  );

  const updateDryRun = await dryBody(biPanelUpdate, {
    'project-id': 1,
    'panel-uuid': 'panel-uuid',
    'panel-name': 'Renamed revenue',
  });
  assert.deepEqual(updateDryRun.body.input, {
    project_id: 1,
    panel_uuid: 'panel-uuid',
    panel_name: 'Renamed revenue',
  });
});

await test('report create maps AI QP definition to snake_case gateway input', async () => {
  const dryRun = await dryBody(reportCreate, {
    'project-id': 1,
    'report-name': 'Demo',
    'model-type': 'event',
    definition: '{"metrics":[]}',
    'report-desc': 'desc',
    'dashboard-ids': '[1001]',
  });

  assert.equal(
    dryRun.url,
    'https://ta.example.com/api/cli/analysis/v1/capabilities/analysis.report.create/dry-run',
  );
  assert.deepEqual(dryRun.body.input, {
    project_id: 1,
    report_name: 'Demo',
    model_type: 'event',
    definition: { metrics: [] },
    report_desc: 'desc',
    dashboard_ids: [1001],
  });
});

await test('report update validates definition requires model type', () => {
  assert.throws(
    () => reportUpdate.validate!(ctx({
      'project-id': 1,
      'report-id': 1001,
      'report-version': 2,
      definition: '{}',
    })),
    /--model-type is required/,
  );
});

await test('report update rejects empty update payload', () => {
  assert.throws(
    () => reportUpdate.validate!(ctx({
      'project-id': 1,
      'report-id': 1001,
      'report-version': 2,
    })),
    /At least one/,
  );
});

await test('report list exposes strict page bounds and semantic model filters', async () => {
  const limit = reportList.flags.find((flag) => flag.name === 'limit');
  assert.equal(limit?.min, 1);
  assert.equal(limit?.max, 200);
  assert.match(limit?.desc ?? '', /Default: 50, max: 200/);

  const dryRun = await dryBody(reportList, {
    'project-id': 1,
    'model-types': '["event","sql"]',
    limit: 50,
    offset: 100,
  });
  assert.deepEqual(dryRun.body.input, {
    project_id: 1,
    model_types: ['event', 'sql'],
    limit: 50,
    offset: 100,
  });
});

await test('report list export forwards semantic model filters', async () => {
  const dryRun = await dryBody(reportListExport, {
    'project-id': 1,
    'model-types': '["tag","revenue"]',
    'artifact-format': 'jsonl',
  });
  assert.deepEqual(dryRun.body.input, {
    project_id: 1,
    model_types: ['tag', 'revenue'],
    format: 'jsonl',
  });
});

await test('report-data run sends non-SQL AI-facing overrides without SQL params', async () => {
  const dryRun = await dryBody(reportDataRun, {
    'project-id': 1,
    'report-ids': '[1001]',
    filters: '{"relation":"and","items":[{"field":{"name":"country","type":"user_property"},"operator":"eq","values":["US"]}]}',
    'group-by': '[{"field":{"name":"country","type":"user_property"}}]',
    'request-id': 'cli_0123456789abcdef0123456789abcdef',
    limit: 20,
    'timeout-seconds': 60,
  });

  assert.deepEqual(dryRun.body.input, {
    project_id: 1,
    report_ids: [1001],
    request_id: 'cli_0123456789abcdef0123456789abcdef',
    filters: {
      relation: 'and',
      items: [
        { field: { name: 'country', type: 'user_property' }, operator: 'eq', values: ['US'] },
      ],
    },
    group_by: [
      { field: { name: 'country', type: 'user_property' } },
    ],
    limit: 20,
    timeout_seconds: 60,
  });
});

await test('report-data run sends SQL params separately from generic model overrides', async () => {
  const dryRun = await dryBody(reportDataRun, {
    'project-id': 1,
    'report-ids': '[1001]',
    'sql-params': '[{"name":"platform","value":"ios"},{"name":"part_date","start_time":"2026-07-01 00:00:00","end_time":"2026-07-09 23:59:59"}]',
  });

  assert.deepEqual(dryRun.body.input, {
    project_id: 1,
    report_ids: [1001],
    sql_params: [
      { name: 'platform', value: 'ios' },
      { name: 'part_date', start_time: '2026-07-01 00:00:00', end_time: '2026-07-09 23:59:59' },
    ],
  });
});

await test('analysis data consumers forward one explicit physical cluster route', async () => {
  const reportDryRun = await dryBody(reportDataRun, {
    'project-id': 1,
    'report-ids': '[1001]',
    'cluster-query-scope': 'SLAVE',
    'slave-cluster-id': 'jp',
  });
  assert.equal(reportDryRun.body.input.cluster_query_scope, 'SLAVE');
  assert.equal(reportDryRun.body.input.slave_cluster_id, 'jp');

  const dashboardDryRun = await dryBody(dashboardReportDataRun, {
    'project-id': 1,
    'dashboard-id': 2001,
    'cluster-query-scope': 'GLOBAL',
  });
  assert.equal(dashboardDryRun.body.input.cluster_query_scope, 'GLOBAL');
  assert.equal(dashboardDryRun.body.input.slave_cluster_id, undefined);

  const adhocDryRun = await dryBody(adhocRun, {
    'project-id': 1,
    'model-type': 'event',
    definition: '{"metrics":[]}',
    'cluster-query-scope': 'SLAVE',
    'slave-cluster-id': 'jp',
  });
  assert.equal(adhocDryRun.body.input.cluster_query_scope, 'SLAVE');
  assert.equal(adhocDryRun.body.input.slave_cluster_id, 'jp');
});

await test('analysis data consumers reject ambiguous physical cluster routes locally', () => {
  for (const command of [reportDataRun, dashboardReportDataRun, adhocRun]) {
    assert.throws(
      () => command.validate!(ctx({
        'cluster-query-scope': 'SLAVE',
      })),
      /--slave-cluster-id is required/,
    );
    assert.throws(
      () => command.validate!(ctx({
        'cluster-query-scope': 'GLOBAL',
        'slave-cluster-id': 'jp',
      })),
      /--slave-cluster-id is allowed only/,
    );
  }
});

await test('analysis lookup commands use gateway capabilities and snake_case input', async () => {
  const filterValues = await dryBody(filterValueList, {
    'project-id': 1,
    'property-name': 'country',
    'table-type': 'event',
    'event-name': 'payment',
    'search-prefix': 'J',
    'cluster-date-policy': 'LATEST',
  });
  assert.match(filterValues.url, /analysis\.filter_value\.list\/dry-run$/);
  assert.deepEqual(filterValues.body.input, {
    project_id: 1,
    property_name: 'country',
    table_type: 'event',
    event_name: 'payment',
    search_prefix: 'J',
    cluster_date_policy: 'LATEST',
  });

  const queryClusters = await dryBody(queryClusterList, {
    'project-id': 1,
  });
  assert.match(queryClusters.url, /analysis\.query_cluster\.list\/dry-run$/);
  assert.deepEqual(queryClusters.body.input, { project_id: 1 });
});

await test('filter-value help defines LATEST as a computed tag or cluster snapshot', () => {
  const policy = filterValueList.flags.find((flag) => flag.name === 'cluster-date-policy')?.desc ?? '';

  assert.match(policy, /user tag\/cluster/i);
  assert.match(policy, /latest available computed result snapshot/i);
  assert.match(policy, /not a tag definition or configuration release/i);
});

await test('report-data command help describes AI-facing overrides and SQL value-only params', () => {
  const flagDesc = (name: string) => reportDataRun.flags.find((flag) => flag.name === name)?.desc ?? '';

  assert.match(flagDesc('filters'), /AI-facing/);
  assert.match(flagDesc('filters'), /SQL-only requests reject/);
  assert.match(flagDesc('filters'), /mixed batches warn/);
  assert.match(flagDesc('group-by'), /--time-granularity/);
  assert.match(flagDesc('sql-params'), /SQL reports only/);
  assert.match(flagDesc('sql-params'), /analysis report get/);
  assert.match(flagDesc('sql-params'), /every definition.params/);
  assert.match(flagDesc('sql-params'), /Do not send definition fields/);
  assert.match(flagDesc('sql-params'), /paramType/);
  assert.match(reportDataRun.description, /Mixed-model batches continue/);
});

await test('report-data export maps artifact-format to format and omits inline limit', async () => {
  const dryRun = await dryBody(reportDataExport, {
    'project-id': 1,
    'report-ids': '[1001]',
    'artifact-format': 'jsonl',
    'timeout-seconds': 3600,
  });

  assert.deepEqual(dryRun.body.input, {
    project_id: 1,
    report_ids: [1001],
    timeout_seconds: 3600,
    format: 'jsonl',
  });
});

await test('management commands map exact capability ids and snake_case ids', async () => {
  assert.deepEqual(
    (await dryBody(reportChangeLogGet, {
      'project-id': 1,
      'report-id': 1001,
      'history-version': 3,
    })).body.input,
    { project_id: 1, report_id: 1001, version: 3 },
  );
  assert.deepEqual(
    (await dryBody(dashboardReportAdd, {
      'project-id': 1,
      'dashboard-id': 2001,
      'report-ids': '[1001,1002]',
    })).body.input,
    { project_id: 1, dashboard_id: 2001, report_ids: [1001, 1002] },
  );
});

await test('adhoc run maps AI-facing SQL definition and model type to gateway input', async () => {
  const sql = 'SELECT "#user_id", "$part_event" FROM hive.ta.v_event_1 WHERE "$part_date" = \'2026-07-15\' LIMIT 10';
  const dryRun = await dryBody(adhocRun, {
    'project-id': 1,
    'model-type': 'sql',
    definition: JSON.stringify({ sql }),
    'request-id': 'cli_0123456789abcdef0123456789abcdef',
    limit: 10,
    'timeout-seconds': 60,
  });

  assert.equal(
    dryRun.url,
    'https://ta.example.com/api/cli/analysis/v1/capabilities/analysis.adhoc.run/dry-run',
  );
  assert.deepEqual(dryRun.body.input, {
    project_id: 1,
    model_type: 'sql',
    definition: { sql },
    request_id: 'cli_0123456789abcdef0123456789abcdef',
    limit: 10,
    timeout_seconds: 60,
  });
});

await test('adhoc export maps artifact-format to format and omits inline limit', async () => {
  const dryRun = await dryBody(adhocExport, {
    'project-id': 1,
    'model-type': 'sql',
    definition: '{"sql":"select * from events"}',
    'artifact-format': 'csv',
    'timeout-seconds': 3600,
  });

  assert.equal(
    dryRun.url,
    'https://ta.example.com/api/cli/analysis/v1/capabilities/analysis.adhoc.export/dry-run',
  );
  assert.deepEqual(dryRun.body.input, {
    project_id: 1,
    model_type: 'sql',
    definition: { sql: 'select * from events' },
    format: 'csv',
    timeout_seconds: 3600,
  });
});

await test('event-detail run sends AI-facing definition to gateway', async () => {
  const definition = {
    event: 'login',
    time_range: {
      mode: 'absolute',
      start_time: '2026-07-01 00:00:00',
      end_time: '2026-07-01 23:59:59',
    },
    filters: {
      relation: 'and',
      items: [
        { field: { name: 'country', type: 'user_property' }, operator: 'eq', values: ['US'] },
      ],
    },
    properties: ['#event_time', { name: 'country', type: 'user_property' }],
    sort: [{ field: '#event_time', order: 'desc' }],
  };
  const dryRun = await dryBody(eventDetailRun, {
    'project-id': 1,
    definition: JSON.stringify(definition),
    'request-id': 'cli_0123456789abcdef0123456789abcdef',
    'use-cache': true,
    'zone-offset': 8,
    limit: 20,
    'timeout-seconds': 60,
  });

  assert.equal(
    dryRun.url,
    'https://ta.example.com/api/cli/analysis/v1/capabilities/analysis.event_detail.run/dry-run',
  );
  assert.deepEqual(dryRun.body.input, {
    project_id: 1,
    definition,
    request_id: 'cli_0123456789abcdef0123456789abcdef',
    use_cache: true,
    zone_offset: 8,
    limit: 20,
    timeout_seconds: 60,
  });
});

await test('event-detail export maps artifact-format to format', async () => {
  const definition = {
    event: 'login',
    time_range: { mode: 'relative', relative_date_range: '0-7' },
  };
  const dryRun = await dryBody(eventDetailExport, {
    'project-id': 1,
    definition: JSON.stringify(definition),
    'artifact-format': 'csv',
    'timeout-seconds': 3600,
  });

  assert.equal(
    dryRun.url,
    'https://ta.example.com/api/cli/analysis/v1/capabilities/analysis.event_detail.export/dry-run',
  );
  assert.deepEqual(dryRun.body.input, {
    project_id: 1,
    definition,
    format: 'csv',
    timeout_seconds: 3600,
  });
});

await test('entity-detail run sends cohort definition to gateway', async () => {
  const definition = {
    entity: 'user',
    cohort: {
      relation: 'and',
      items: [
        {
          field: { name: 'level', type: 'user_property' },
          operator: 'gte',
          values: [1],
        },
      ],
    },
    properties: ['#user_id', { name: 'country', type: 'user_property' }],
    sort: [{ field: '#user_id', order: 'asc' }],
  };
  const dryRun = await dryBody(entityDetailRun, {
    'project-id': 1,
    definition: JSON.stringify(definition),
    limit: 20,
  });

  assert.equal(
    dryRun.url,
    'https://ta.example.com/api/cli/analysis/v1/capabilities/analysis.entity_detail.run/dry-run',
  );
  assert.deepEqual(dryRun.body.input, {
    project_id: 1,
    definition,
    limit: 20,
  });
});

await test('entity-detail export maps artifact-format to format', async () => {
  const definition = {
    entity: { id: 123 },
    cohort: {
      relation: 'and',
      items: [
        {
          field: { name: 'level', type: 'user_property' },
          operator: 'gte',
          values: [1],
        },
      ],
    },
  };
  const dryRun = await dryBody(entityDetailExport, {
    'project-id': 1,
    definition: JSON.stringify(definition),
    'artifact-format': 'jsonl',
  });

  assert.equal(
    dryRun.url,
    'https://ta.example.com/api/cli/analysis/v1/capabilities/analysis.entity_detail.export/dry-run',
  );
  assert.deepEqual(dryRun.body.input, {
    project_id: 1,
    definition,
    format: 'jsonl',
  });
});

await test('run inspect and artifact download use the configured analysis gateway route', () => {
  assert.deepEqual(
    runInspect.dryRun!(ctx({
      'run-id': 'run_0123456789abcdef0123456789abcdef',
    })),
    {
      method: 'GET',
      url: 'https://ta.example.com/api/cli/analysis/v1/runs/run_0123456789abcdef0123456789abcdef',
    },
  );

  assert.deepEqual(
    artifactDownload.dryRun!(ctx({
      'run-id': 'run_0123456789abcdef0123456789abcdef',
      'artifact-id': 'artifact_0123456789abcdef0123456789abcdef',
      output: '/tmp/result.jsonl.gz',
    })),
    {
      method: 'GET',
      url: 'https://ta.example.com/api/cli/analysis/v1/runs/run_0123456789abcdef0123456789abcdef/artifacts/artifact_0123456789abcdef0123456789abcdef/download',
      output_path: '/tmp/result.jsonl.gz',
    },
  );
});

await test('adhoc exposes 12 AI models and report write exposes 12 plus tag', () => {
  const modelTypeDesc = adhocRun.flags.find((flag) => flag.name === 'model-type')?.desc ?? '';
  const definitionDesc = adhocRun.flags.find((flag) => flag.name === 'definition')?.desc ?? '';
  const reportCreateModelTypeDesc = reportCreate.flags.find((flag) => flag.name === 'model-type')?.desc ?? '';
  const reportUpdateDefinitionDesc = reportUpdate.flags.find((flag) => flag.name === 'definition')?.desc ?? '';

  assert.equal(AI_MODEL_TYPE_VALUES.length, 12);
  assert.equal(new Set(AI_MODEL_TYPE_VALUES).size, 12);
  assert.deepEqual([...AI_MODEL_TYPE_VALUES], [
    'event',
    'retention',
    'funnel',
    'distribution',
    'attribution',
    'interval',
    'path',
    'prop_analysis',
    'sql',
    'heat_map',
    'rank_list',
    'revenue',
  ]);
  assert.match(modelTypeDesc, /event/);
  assert.match(modelTypeDesc, /revenue/);
  assert.match(modelTypeDesc, /12 total/);
  assert.match(modelTypeDesc, /9 common/);
  assert.match(modelTypeDesc, /3 scenario models/);
  assert.match(modelTypeDesc, /not ad-hoc model_type values/);
  assert.doesNotMatch(modelTypeDesc, /generic schema-defined scenario/);
  assert.match(modelTypeDesc, /sql/);
  assert.match(definitionDesc, /\{"sql":"select/);
  assert.match(definitionDesc, /params/);
  assert.match(definitionDesc, /Text:name/);
  assert.match(definitionDesc, /global filters support user_property, cluster, and tag only/);
  assert.match(definitionDesc, /event_property is not supported/);
  assert.match(definitionDesc, /session_unit accepts second \(1\.\.999\), minute \(1\.\.999\), or hour \(1\.\.24\)/);
  assert.match(definitionDesc, /express one day as session_interval=24 and session_unit=hour/);
  assert.equal(REPORT_WRITE_MODEL_TYPE_VALUES.length, 13);
  assert.deepEqual([...REPORT_WRITE_MODEL_TYPE_VALUES], [
    ...AI_MODEL_TYPE_VALUES,
    'tag',
  ]);
  assert.match(reportCreateModelTypeDesc, /12 total/);
  assert.match(reportCreateModelTypeDesc, /tag for saved tag report data/);
  assert.doesNotMatch(reportCreateModelTypeDesc, /history_tag/);
  assert.doesNotMatch(reportCreateModelTypeDesc, /generic schema-defined scenario/);
  assert.match(reportUpdateDefinitionDesc, /Text:name/);
  assert.match(reportUpdateDefinitionDesc, /model_type=tag/);
  assert.match(reportUpdateDefinitionDesc, /tag_name/);
});

await test('query follow-up commands use context ids instead of raw QP', async () => {
  assert.deepEqual(
    (await dryBody(drilldownEventsRun, {
      'project-id': 1,
      'query-context-id': 'ctx_0123456789abcdef0123456789abcdef',
      source: '{"report_id":10}',
      coordinate: '{"date":"2026-07-01","group_values":["Beijing"],"metric_index":0}',
      limit: 20,
    })).body.input,
    {
      project_id: 1,
      query_context_id: 'ctx_0123456789abcdef0123456789abcdef',
      source: { report_id: 10 },
      coordinate: { date: '2026-07-01', group_values: ['Beijing'], metric_index: 0 },
      limit: 20,
    },
  );
  assert.deepEqual(
    (await dryBody(drilldownEventsExport, {
      'project-id': 1,
      'query-context-id': 'ctx_0123456789abcdef0123456789abcdef',
      source: '{"report_id":10}',
      coordinate: '{"date":"2026-07-01","group_values":["Beijing"],"metric_index":0}',
      'artifact-format': 'csv',
    })).body.input,
    {
      project_id: 1,
      query_context_id: 'ctx_0123456789abcdef0123456789abcdef',
      source: { report_id: 10 },
      coordinate: { date: '2026-07-01', group_values: ['Beijing'], metric_index: 0 },
      format: 'csv',
    },
  );
  assert.deepEqual(
    (await dryBody(drilldownEntitiesRun, {
      'project-id': 1,
      'query-context-id': 'ctx_0123456789abcdef0123456789abcdef',
      coordinate: '{"cohort_date":"2026-07-01","group_values":[],"period_index":1,"population":"retained"}',
      limit: 20,
    })).body.input,
    {
      project_id: 1,
      query_context_id: 'ctx_0123456789abcdef0123456789abcdef',
      coordinate: { cohort_date: '2026-07-01', group_values: [], period_index: 1, population: 'retained' },
      limit: 20,
    },
  );
  assert.deepEqual(
    (await dryBody(drilldownUserEventsRun, {
      'project-id': 1,
      'drilldown-context-id': 'drill_0123456789abcdef0123456789abcdef',
      'user-id': 'u1',
      limit: 50,
    })).body.input,
    {
      project_id: 1,
      drilldown_context_id: 'drill_0123456789abcdef0123456789abcdef',
      user_id: 'u1',
      limit: 50,
    },
  );
  assert.deepEqual(
    (await dryBody(drilldownEntitiesExport, {
      'project-id': 1,
      'query-context-id': 'ctx_0123456789abcdef0123456789abcdef',
      source: '{"report_id":10}',
      coordinate: '{"date":"2026-07-01","group_values":[],"step":2,"population":"completed"}',
      'artifact-format': 'csv',
    })).body.input,
    {
      project_id: 1,
      query_context_id: 'ctx_0123456789abcdef0123456789abcdef',
      source: { report_id: 10 },
      coordinate: { date: '2026-07-01', group_values: [], step: 2, population: 'completed' },
      format: 'csv',
    },
  );
  assert.deepEqual(
    (await dryBody(drilldownUserEventsExport, {
      'project-id': 1,
      'drilldown-context-id': 'drill_0123456789abcdef0123456789abcdef',
      'user-id': 'u1',
      'artifact-format': 'csv',
    })).body.input,
    {
      project_id: 1,
      drilldown_context_id: 'drill_0123456789abcdef0123456789abcdef',
      user_id: 'u1',
      format: 'csv',
    },
  );
  assert.deepEqual(
    (await dryBody(queryCreateResultCluster, {
      'project-id': 1,
      'query-context-id': 'ctx_0123456789abcdef0123456789abcdef',
      source: '{"report_id":10}',
      coordinate: '{"date":"2026-07-01","group_values":["Beijing"],"metric_index":1}',
      'cluster-name': 'ai_saved_users',
      'display-name': 'AI saved users',
    })).body.input,
    {
      project_id: 1,
      query_context_id: 'ctx_0123456789abcdef0123456789abcdef',
      source: { report_id: 10 },
      coordinate: { date: '2026-07-01', group_values: ['Beijing'], metric_index: 1 },
      cluster_name: 'ai_saved_users',
      display_name: 'AI saved users',
    },
  );
});

await test('analysis result run commands do not expose pagination offsets', () => {
  assert.equal(adhocRun.flags.some((flag) => flag.name === 'offset'), false);
  assert.equal(drilldownEventsRun.flags.some((flag) => flag.name === 'offset'), false);
  assert.equal(drilldownEventsExport.flags.some((flag) => flag.name === 'limit'), false);
  assert.equal(drilldownEventsExport.flags.some((flag) => flag.name === 'offset'), false);
  assert.equal(drilldownEntitiesRun.flags.some((flag) => flag.name === 'offset'), false);
  assert.equal(drilldownEntitiesExport.flags.some((flag) => flag.name === 'limit'), false);
  assert.equal(drilldownEntitiesExport.flags.some((flag) => flag.name === 'offset'), false);
  assert.equal(drilldownUserEventsRun.flags.some((flag) => flag.name === 'page-num'), false);
  assert.equal(drilldownUserEventsRun.flags.some((flag) => flag.name === 'page-size'), false);
  assert.equal(drilldownUserEventsExport.flags.some((flag) => flag.name === 'limit'), false);
  assert.equal(drilldownUserEventsExport.flags.some((flag) => flag.name === 'page-num'), false);
  assert.equal(drilldownUserEventsExport.flags.some((flag) => flag.name === 'page-size'), false);
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
