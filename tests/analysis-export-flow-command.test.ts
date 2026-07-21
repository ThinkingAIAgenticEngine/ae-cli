/**
 * analysis export flow command tests
 *
 * Run: npx tsx tests/analysis-export-flow-command.test.ts
 */

import assert from 'node:assert/strict';
import { artifactDownload } from '../src/commands/te-analysis/artifact/download.ts';
import { dashboardCopy } from '../src/commands/te-analysis/dashboard/copy.ts';
import { dashboardDailyReportSend } from '../src/commands/te-analysis/dashboard-daily-report/send.ts';
import { dashboardDailyReportUpdate } from '../src/commands/te-analysis/dashboard-daily-report/update.ts';
import { dashboardDefinitionExport } from '../src/commands/te-analysis/dashboard-definition/export.ts';
import { runInspect } from '../src/commands/te-analysis/run/inspect.ts';
import {
  clearCapabilityGatewayRoutesForTest,
  registerCapabilityGatewayRoute,
} from '../src/core/capability-routing.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';

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

function makeCtx(values: Record<string, any>) {
  return {
    host: () => 'https://ta.example.com',
    str: (name: string) => values[name] === undefined ? '' : String(values[name]),
    num: (name: string) => Number(values[name]),
    bool: (name: string) => Boolean(values[name]),
    json: (name: string) => JSON.parse(String(values[name])),
  } as any;
}

async function dryBody(command: { dryRun?: (ctx: any) => unknown }, values: Record<string, any>) {
  const host = 'https://ta.example.com';
  setCliTokenManual('analysis-export-flow-test-token', host);
  let body: any;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_request: any, init?: RequestInit) => {
    body = init?.body ? JSON.parse(String(init.body)) : undefined;
    return new Response(JSON.stringify({ ok: true, data: { dry_run: true } }), { status: 200 });
  }) as typeof fetch;
  try {
    await command.dryRun!(makeCtx(values));
    return body;
  } finally {
    globalThis.fetch = originalFetch;
    clearCliToken(host);
  }
}

process.stdout.write('\nanalysis export flow command tests\n');

clearCapabilityGatewayRoutesForTest();
registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });

await test('run inspect targets analysis run endpoint', () => {
  const dryRun = runInspect.dryRun!(makeCtx({ 'run-id': 'run_abc' }));
  assert.equal(dryRun.method, 'GET');
  assert.equal(dryRun.url, 'https://ta.example.com/api/cli/analysis/v1/runs/run_abc');
});

await test('artifact download targets run-scoped download endpoint', () => {
  const dryRun = artifactDownload.dryRun!(makeCtx({
    'run-id': 'run_abc',
    'artifact-id': 'artifact_xyz',
    output: '/tmp/out.jsonl.gz',
  }));
  assert.equal(dryRun.method, 'GET');
  assert.equal(
    dryRun.url,
    'https://ta.example.com/api/cli/analysis/v1/runs/run_abc/artifacts/artifact_xyz/download',
  );
  assert.equal(dryRun.output_path, '/tmp/out.jsonl.gz');
});

await test('dashboard definition export sends single and batch dashboard IDs', async () => {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });

  const body = await dryBody(dashboardDefinitionExport, {
    'project-id': 1,
    'dashboard-id': 1001,
    'dashboard-ids': '[1002,1003]',
    'export-file-name': 'dashboards',
  });

  assert.deepEqual(body, {
    input: {
      project_id: 1,
      dashboard_id: 1001,
      dashboard_ids: [1002, 1003],
      export_file_name: 'dashboards',
    },
  });
});

await test('dashboard definition export accepts simple folder ID arrays', async () => {
  const body = await dryBody(dashboardDefinitionExport, {
    'project-id': 1,
    'dashboard-folder-ids': '[11]',
  });

  assert.deepEqual(body, {
    input: {
      project_id: 1,
      dashboard_folder_ids: [11],
    },
  });
});

await test('dashboard copy defaults report copy and omits target location', async () => {
  const body = await dryBody(dashboardCopy, {
    'project-id': 1,
    'dashboard-id': 1001,
    'dashboard-name': 'Copy',
  });

  assert.deepEqual(body, {
    input: {
      project_id: 1,
      dashboard_id: 1001,
      dashboard_name: 'Copy',
      report_copy: false,
    },
  });
});

await test('dashboard daily report update sends safe defaults when payload is absent', async () => {
  const body = await dryBody(dashboardDailyReportUpdate, {
    'project-id': 1,
    'dashboard-id': 1001,
  });

  assert.deepEqual(body, {
    input: {
      project_id: 1,
      dashboard_id: 1001,
      need_csv: false,
      host_url: '',
      enable_smtp: false,
      enable_email: false,
      enable_dd: false,
      enable_wx: false,
      enable_feishu: false,
      enable_kim: false,
      enable_slack: false,
      send_date: '1,2,3,4,5,6,7',
      send_time: '09:00',
      lang: 'zh-CN',
      screen_type: 'normal',
      zone_offset: 0,
      enable_send: false,
    },
  });
});

await test('dashboard daily report send keeps payload authoritative', async () => {
  const body = await dryBody(dashboardDailyReportSend, {
    'project-id': 1,
    'dashboard-id': 1001,
    payload: '{"need_csv":true,"host_url":"https://ta.example.com"}',
  });

  assert.deepEqual(body, {
    input: {
      project_id: 1,
      dashboard_id: 1001,
      payload: {
        need_csv: true,
        host_url: 'https://ta.example.com',
      },
    },
  });
});

await test('dashboard daily report help documents complete Feishu image upload credentials', () => {
  const feishuInfo = dashboardDailyReportSend.flags.find((flag) => flag.name === 'feishu-info');

  assert.ok(feishuInfo);
  assert.match(feishuInfo.desc, /app_id/);
  assert.match(feishuInfo.desc, /app_secret/);
  assert.match(feishuInfo.desc, /webhook/);
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
