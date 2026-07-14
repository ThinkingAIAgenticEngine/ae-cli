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

process.stdout.write('\nanalysis export flow command tests\n');

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
  assert.deepEqual(dryRun.body, { output_path: '/tmp/out.jsonl.gz' });
});

await test('dashboard definition export sends single and batch dashboard IDs', () => {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });

  const dryRun = dashboardDefinitionExport.dryRun!(makeCtx({
    'project-id': 1,
    'dashboard-id': 1001,
    'dashboard-ids': '[1002,1003]',
    'export-file-name': 'dashboards',
  }));

  assert.deepEqual(dryRun.body, {
    input: {
      project_id: 1,
      dashboard_id: 1001,
      dashboard_ids: [1002, 1003],
      export_file_name: 'dashboards',
    },
  });
});

await test('dashboard definition export accepts simple folder ID arrays', () => {
  const dryRun = dashboardDefinitionExport.dryRun!(makeCtx({
    'project-id': 1,
    'dashboard-folder-ids': '[11]',
  }));

  assert.deepEqual(dryRun.body, {
    input: {
      project_id: 1,
      dashboard_folder_ids: [11],
    },
  });
});

await test('dashboard copy defaults report copy and omits target location', () => {
  const dryRun = dashboardCopy.dryRun!(makeCtx({
    'project-id': 1,
    'dashboard-id': 1001,
    'dashboard-name': 'Copy',
  }));

  assert.deepEqual(dryRun.body, {
    input: {
      project_id: 1,
      dashboard_id: 1001,
      dashboard_name: 'Copy',
      report_copy: false,
    },
  });
});

await test('dashboard daily report update sends safe defaults when payload is absent', () => {
  const dryRun = dashboardDailyReportUpdate.dryRun!(makeCtx({
    'project-id': 1,
    'dashboard-id': 1001,
  }));

  assert.deepEqual(dryRun.body, {
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
      send_date: '1,2,3,4,5,6,7',
      send_time: '09:00',
      lang: 'zh-CN',
      screen_type: 'normal',
      zone_offset: 0,
      enable_send: false,
    },
  });
});

await test('dashboard daily report send keeps payload authoritative', () => {
  const dryRun = dashboardDailyReportSend.dryRun!(makeCtx({
    'project-id': 1,
    'dashboard-id': 1001,
    payload: '{"need_csv":true,"host_url":"https://ta.example.com"}',
  }));

  assert.deepEqual(dryRun.body, {
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

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
