/**
 * engage query/export command unit tests
 *
 * Run: npx tsx tests/engage-query-export-command.test.ts
 */

import assert from 'node:assert/strict';
import { unlink } from 'node:fs/promises';
import type { Command, RuntimeContext } from '../src/framework/types.ts';
import {
  clearCapabilityGatewayRoutesForTest,
  registerCapabilityGatewayRoute,
} from '../src/core/capability-routing.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';
import { flowReportMetricDetailExport } from '../src/commands/te-engage/engage-flow/report/metric-detail-export.ts';
import { flowMetricUpdate } from '../src/commands/te-engage/engage-flow/metric/update.ts';
import { metricUserRun } from '../src/commands/te-engage/engage-flow/metric-user/run.ts';
import { nodeUserExport } from '../src/commands/te-engage/engage-flow/node-user/export.ts';
import { taskEffectQuery } from '../src/commands/te-engage/engage-task/effect/query.ts';
import { dataDetailQuery } from '../src/commands/te-engage/engage-task/data-detail/query.ts';
import { artifactDownload } from '../src/commands/te-engage/engage-query/artifact/download.ts';
import { queryCancel } from '../src/commands/te-engage/engage-query/query/cancel.ts';
import { runInspect } from '../src/commands/te-engage/engage-query/run/inspect.ts';
import engageFlowCommands from '../src/commands/te-engage/engage-flow/index.ts';
import engageQueryCommands from '../src/commands/te-engage/engage-query/index.ts';
import engageTaskCommands from '../src/commands/te-engage/engage-task/index.ts';

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

function ctx(values: Record<string, unknown>, service = 'engage-flow'): RuntimeContext {
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
    service: () => service,
    out: () => undefined,
  };
}

async function dryBody(
  command: Command,
  input: Record<string, unknown>,
  service: 'engage-flow' | 'engage-task',
): Promise<{ url: string; body: any }> {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute(service, { gatewayDomain: 'engage' });
  const host = 'https://ta.example.com';
  setCliTokenManual('engage-contract-test-token', host);
  let url = '';
  let body: any;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (request: any, init?: RequestInit) => {
    url = String(request);
    body = init?.body ? JSON.parse(String(init.body)) : undefined;
    return new Response(JSON.stringify({ ok: true, data: { dry_run: true } }), { status: 200 });
  }) as typeof fetch;
  try {
    await command.dryRun!(ctx(input, service));
    return { url, body };
  } finally {
    globalThis.fetch = originalFetch;
    clearCliToken(host);
  }
}

process.stdout.write('\nengage query/export command tests\n');

await test('all query, export, and lifecycle capability commands are registered', () => {
  const registered = new Set([
    ...engageFlowCommands,
    ...engageTaskCommands,
    ...engageQueryCommands,
  ].map(command => command.capabilityId));
  for (const capabilityId of [
    'engage-flow.report.metric-detail.run',
    'engage-flow.report.metric-detail.export',
    'engage-flow.metric-user.run',
    'engage-flow.metric-user.export',
    'engage-flow.node-user.run',
    'engage-flow.node-user.export',
    'engage-flow.node-metric-user.run',
    'engage-flow.node-metric-user.export',
    'engage-flow.metric.update',
    'engage-task.task-data.metric-detail',
    'engage-task.task-data.detail',
    'engage-query.query.cancel',
  ]) {
    assert.equal(registered.has(capabilityId), true, `${capabilityId} is not registered`);
  }
  assert.equal(engageQueryCommands.some(command => command.service === 'engage-query'
    && command.resource === 'run' && command.command === 'inspect'), true);
  assert.equal(engageQueryCommands.some(command => command.service === 'engage-query'
    && command.resource === 'artifact' && command.command === 'download'), true);
});

await test('flow metric-detail export maps artifact-format and timeout', async () => {
  const dryRun = await dryBody(flowReportMetricDetailExport, {
    'project-id': 1,
    'flow-id': 'flow_1',
    'node-uuid': 'node_1',
    'start-time': '2026-04-01',
    'end-time': '2026-04-07',
    'artifact-format': 'csv',
    'timeout-seconds': 21600,
  }, 'engage-flow');

  assert.match(dryRun.url, /engage-flow\.report\.metric-detail\.export\/dry-run$/);
  assert.equal(dryRun.body.input.format, 'csv');
  assert.equal(dryRun.body.input.timeout_seconds, 21600);
});

await test('flow metric-user run maps limit and timeout', async () => {
  const dryRun = await dryBody(metricUserRun, {
    'project-id': 1,
    'flow-id': 'flow_1',
    'push-language-code': 'zh-CN',
    'user-time-zone': 'Asia/Shanghai',
    'show-time-zone': '8.0',
    'indicator-name': 'entry',
    'data-view-type': '2',
    'is-summary': true,
    'start-time': '2026-04-01',
    'end-time': '2026-04-07',
    limit: 10,
    'timeout-seconds': 120,
  }, 'engage-flow');

  assert.match(dryRun.url, /engage-flow\.metric-user\.run\/dry-run$/);
  assert.equal(dryRun.body.input.limit, 10);
  assert.equal(dryRun.body.input.timeout_seconds, 120);
  assert.equal(dryRun.body.input.push_language_code, 'zh-CN');
  assert.equal(dryRun.body.input.user_time_zone, 'Asia/Shanghai');
  assert.equal(dryRun.body.input.show_time_zone, '8.0');
  assert.equal(dryRun.body.input.indicator_name, 'entry');
  assert.equal(dryRun.body.input.data_view_type, '2');
  assert.equal(dryRun.body.input.is_summary, true);
  assert.equal(dryRun.body.input.start_time, '2026-04-01');
  assert.equal(dryRun.body.input.end_time, '2026-04-07');
  for (const supportedFlag of [
    'push-language-code',
    'user-time-zone',
    'show-time-zone',
    'indicator-name',
    'data-view-type',
    'is-summary',
    'start-time',
    'end-time',
  ]) {
    assert.equal(metricUserRun.flags.some(flag => flag.name === supportedFlag), true);
  }
});

await test('flow node-user export maps csv format', async () => {
  const dryRun = await dryBody(nodeUserExport, {
    'project-id': 1,
    'flow-id': 'flow_1',
    'node-uuid': 'node_1',
    'cluster-def': '{}',
    'artifact-format': 'csv',
    'timeout-seconds': 21600,
  }, 'engage-flow');

  assert.match(dryRun.url, /engage-flow\.node-user\.export\/dry-run$/);
  assert.equal(dryRun.body.input.format, 'csv');
  assert.equal(dryRun.body.input.timeout_seconds, 21600);
});

await test('task effect query maps Hermes metric-detail fields', async () => {
  const dryRun = await dryBody(taskEffectQuery, {
    'project-id': 1,
    'task-id': 'task_1',
    'start-time': '2026-04-01',
    'end-time': '2026-04-07',
    'metric-id-list': ['metric_1'],
    'group-type': 4,
    'request-id': 'req_1',
  }, 'engage-task');

  assert.match(dryRun.url, /engage-task\.task-data\.metric-detail\/dry-run$/);
  assert.deepEqual(dryRun.body.input.metric_id_list, ['metric_1']);
  assert.equal(dryRun.body.input.group_type, 4);
  assert.equal(dryRun.body.input.request_id, 'req_1');
  assert.equal('format' in dryRun.body.input, false);
  assert.equal('timeout_seconds' in dryRun.body.input, false);
});

await test('task data-detail query maps Hermes detail fields', async () => {
  const dryRun = await dryBody(dataDetailQuery, {
    'project-id': 1,
    'task-id': 'task_1',
    'detail-type': 'instance_daily',
    'task-instance-id': 'inst_1',
    'start-time': '2026-04-01',
    'end-time': '2026-04-07',
    'data-view-type': 2,
    'request-id': 'req_1',
  }, 'engage-task');

  assert.match(dryRun.url, /engage-task\.task-data\.detail\/dry-run$/);
  assert.equal(dryRun.body.input.detail_type, 'instance_daily');
  assert.equal(dryRun.body.input.task_instance_id, 'inst_1');
  assert.equal(dryRun.body.input.data_view_type, 2);
  assert.equal(dryRun.body.input.request_id, 'req_1');
  assert.equal('format' in dryRun.body.input, false);
  assert.equal('timeout_seconds' in dryRun.body.input, false);
});

await test('flow metric update maps metric settings', async () => {
  const dryRun = await dryBody(flowMetricUpdate, {
    'project-id': 1,
    'flow-id': 'flow_1',
    'metric-map': {
      ACTION: [{ metric_setting_id: '1', display_name: 'Pay users', order_id: 1 }],
    },
  }, 'engage-flow');

  assert.match(dryRun.url, /engage-flow\.metric\.update\/dry-run$/);
  assert.equal(dryRun.body.input.project_id, 1);
  assert.equal(dryRun.body.input.flow_id, 'flow_1');
  assert.deepEqual(dryRun.body.input.metric_map, {
    ACTION: [{ metric_setting_id: '1', display_name: 'Pay users', order_id: 1 }],
  });
});

await test('artifact download accepts camelCase inspect fields and uses cli-token', async () => {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('engage-query', { gatewayDomain: 'engage' });
  registerCapabilityGatewayRoute('engage-setting', { gatewayDomain: 'engage' });
  const host = 'https://ta.example.com';
  setCliTokenManual('engage-contract-test-token', host);
  const originalFetch = globalThis.fetch;
  const outputPath = '/private/tmp/te-cli-engage-artifact-download-test.csv';
  const calls: Array<{ url: string; headers: Headers }> = [];
  globalThis.fetch = (async (request: any, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    calls.push({ url: String(request), headers });
    if (calls.length === 1) {
      return new Response(JSON.stringify({
        ok: true,
        data: {
          runId: 'run_123',
          artifactId: 'artifact_123',
          status: 'SUCCEEDED',
          artifactStatus: 'COMPLETED',
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { 'content-type': 'text/csv' },
    });
  }) as typeof fetch;
  try {
    const result = await artifactDownload.execute!(ctx({
      'run-id': 'run_123',
      'artifact-id': 'artifact_123',
      output: outputPath,
    }, 'engage-query'));
    assert.equal(calls.length, 2);
    assert.match(calls[1]!.url, /\/api\/cli\/engage\/v1\/runs\/run_123\/artifacts\/artifact_123\/download$/);
    assert.equal(calls[1]!.headers.get('cli-token'), 'engage-contract-test-token');
    assert.equal(calls[1]!.headers.has('authorization'), false);
    assert.equal((result as Record<string, unknown>).bytes, 3);
  } finally {
    globalThis.fetch = originalFetch;
    clearCliToken(host);
    await unlink(outputPath).catch(() => undefined);
  }
});

await test('lifecycle inspect and cancel send only owner-bound run_id', async () => {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('engage-query', { gatewayDomain: 'engage' });
  const host = 'https://ta.example.com';
  setCliTokenManual('engage-contract-test-token', host);
  let inspectUrl = '';
  let cancelBody: any;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (request: any, init?: RequestInit) => {
    inspectUrl = String(request);
    cancelBody = init?.body ? JSON.parse(String(init.body)) : undefined;
    return new Response(JSON.stringify({ ok: true, data: {} }), { status: 200 });
  }) as typeof fetch;
  try {
    const inspectDryRun = await runInspect.dryRun!(ctx({ 'run-id': 'run_123' }, 'engage-query'));
    assert.match((inspectDryRun as Record<string, string>).url, /\/api\/cli\/engage\/v1\/runs\/run_123$/);
    await runInspect.execute!(ctx({ 'run-id': 'run_123' }, 'engage-query'));
    assert.match(inspectUrl, /\/api\/cli\/engage\/v1\/runs\/run_123$/);

    await queryCancel.dryRun!(ctx({ 'run-id': 'run_123' }, 'engage-query'));
    assert.deepEqual(cancelBody.input, { run_id: 'run_123' });
    assert.match(inspectUrl, /engage-query\.query\.cancel\/dry-run$/);
  } finally {
    globalThis.fetch = originalFetch;
    clearCliToken(host);
  }
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) {
  process.exit(1);
}
