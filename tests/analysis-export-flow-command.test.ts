/**
 * analysis export flow command tests
 *
 * Run: npx tsx tests/analysis-export-flow-command.test.ts
 */

import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { adhocExport } from '../src/commands/te-analysis/adhoc/export.ts';
import { artifactDownload } from '../src/commands/te-analysis/artifact/download.ts';
import {
  downloadAnalysisArtifact,
  waitForAnalysisRun,
} from '../src/core/analysis-async-artifact.ts';
import { dashboardCopy } from '../src/commands/te-analysis/dashboard/copy.ts';
import { dashboardDailyReportGet } from '../src/commands/te-analysis/dashboard-daily-report/get.ts';
import { dashboardDailyReportSend } from '../src/commands/te-analysis/dashboard-daily-report/send.ts';
import { dashboardDailyReportSendStatus } from '../src/commands/te-analysis/dashboard-daily-report/send-status.ts';
import { dashboardDailyReportUpdate } from '../src/commands/te-analysis/dashboard-daily-report/update.ts';
import { dashboardDefinitionExport } from '../src/commands/te-analysis/dashboard-definition/export.ts';
import { runInspect } from '../src/commands/te-analysis/run/inspect.ts';
import { runWait } from '../src/commands/te-analysis/run/wait.ts';
import { baseCommands } from '../src/commands/te-analysis/index.ts';
import { dataTableDownload } from '../src/commands/metadata/data-table/download.ts';
import { CapabilityGatewayError } from '../src/core/capability-api.ts';
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
    optionalNum: (name: string) => values[name] === undefined ? undefined : Number(values[name]),
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

await test('run wait targets the same short-inspect endpoint with a bounded client wait', () => {
  const dryRun = runWait.dryRun!(makeCtx({ 'run-id': 'run_abc' }));
  assert.equal(dryRun.method, 'GET');
  assert.equal(dryRun.url, 'https://ta.example.com/api/cli/analysis/v1/runs/run_abc');
  assert.equal(dryRun.wait_until_terminal, true);
  assert.equal(dryRun.wait_timeout_seconds, 600);
  assert.equal(runWait.flags.some((flag) => flag.name === 'wait-timeout-seconds'), true);
});

await test('only explicitly async artifact exports expose wait/output/force', () => {
  const asyncFlags = new Set(adhocExport.flags.map((flag) => flag.name));
  assert.equal(asyncFlags.has('wait'), true);
  assert.equal(asyncFlags.has('wait-timeout-seconds'), true);
  assert.equal(asyncFlags.has('output'), true);
  assert.equal(asyncFlags.has('force'), true);

  const synchronousDefinitionFlags = new Set(dashboardDefinitionExport.flags.map((flag) => flag.name));
  assert.equal(synchronousDefinitionFlags.has('wait'), false);
  assert.equal(synchronousDefinitionFlags.has('output'), false);
  assert.equal(synchronousDefinitionFlags.has('force'), false);
});

await test('wait timeout is local-only and requires an attached wait', () => {
  const waitTimeout = adhocExport.flags.find((flag) => flag.name === 'wait-timeout-seconds');
  assert.equal(waitTimeout?.min, 1);
  assert.equal(waitTimeout?.max, 21600);
  assert.throws(
    () => adhocExport.validate!(makeCtx({ 'wait-timeout-seconds': 30 })),
    /requires --wait or --output/,
  );
  assert.doesNotThrow(
    () => adhocExport.validate!(makeCtx({ wait: true, 'wait-timeout-seconds': 30 })),
  );
});

await test('every known run-scoped artifact capability uses the same lifecycle contract', () => {
  const capabilityIds = [
    'analysis.adhoc.export',
    'analysis.bi_panel_page_data.export',
    'analysis.dashboard_report_data.export',
    'analysis.entity_detail.export',
    'analysis.event_detail.export',
    'analysis.history_tag_data.export',
    'analysis.history_tag_data_drilldown.export',
    'analysis.query.drilldown_entities_export',
    'analysis.query.drilldown_events_export',
    'analysis.query.drilldown_user_events_export',
    'analysis.report.list_export',
    'analysis.report_data.export',
    'analysis.user_cluster_member.export',
    'analysis.user_tag_member.export',
    'metadata.event_property_bundle.export',
    'metadata.catalog.export',
    'project.member_handover.export',
    'system.query_task.export',
    'system.usage_trend.export',
    'tracking.check.export',
    'tracking.live_data.export',
    'tracking.plan.export',
    'tracking.plan_change_log.export',
  ];
  for (const capabilityId of capabilityIds) {
    const command = baseCommands.find((candidate) => candidate.capabilityId === capabilityId);
    assert.ok(command, `missing ${capabilityId}`);
    const flags = new Set(command.flags.map((flag) => flag.name));
    assert.equal(flags.has('wait'), true, `${capabilityId} --wait`);
    assert.equal(flags.has('wait-timeout-seconds'), true, `${capabilityId} --wait-timeout-seconds`);
    assert.equal(flags.has('output'), true, `${capabilityId} --output`);
    assert.equal(flags.has('force'), true, `${capabilityId} --force`);
  }
  const metadataFlags = new Set(dataTableDownload.flags.map((flag) => flag.name));
  assert.equal(metadataFlags.has('wait'), true, 'metadata.data_table.download --wait');
  assert.equal(metadataFlags.has('output'), true, 'metadata.data_table.download --output');
  assert.equal(metadataFlags.has('force'), true, 'metadata.data_table.download --force');
});

await test('wait follows RUNNING to SUCCEEDED/COMPLETED with short inspect calls', async () => {
  const states = [
    { run_id: 'run_abc', artifact_id: 'artifact_xyz', status: 'RUNNING', artifact_status: 'RUNNING' },
    { run_id: 'run_abc', artifact_id: 'artifact_xyz', status: 'SUCCEEDED', artifact_status: 'COMPLETED' },
  ];
  let inspections = 0;
  const result = await waitForAnalysisRun('https://ta.example.com', 'run_abc', {
    expectedArtifactId: 'artifact_xyz',
    inspect: async () => states[inspections++]!,
    sleep: async () => undefined,
  });

  assert.equal(inspections, 2);
  assert.equal(result.status, 'SUCCEEDED');
  assert.equal(result.artifact_status, 'COMPLETED');
});

await test('client wait timeout stops locally with resumable lifecycle metadata', async () => {
  let now = 0;
  await assert.rejects(
    () => waitForAnalysisRun('https://ta.example.com', 'run_slow', {
      waitTimeoutSeconds: 2,
      now: () => now,
      inspect: async () => ({
        run_id: 'run_slow',
        artifact_id: 'artifact_slow',
        status: 'RUNNING',
        artifact_status: 'RUNNING',
        deadline_at: 60_000,
      }),
      sleep: async (milliseconds) => { now += milliseconds; },
    }),
    (error: unknown) => {
      assert.ok(error instanceof CapabilityGatewayError);
      assert.equal(error.code, 'ASYNC_WAIT_TIMEOUT');
      assert.equal(error.meta?.run_id, 'run_slow');
      assert.equal(error.meta?.artifact_id, 'artifact_slow');
      assert.equal(error.meta?.run_status, 'RUNNING');
      assert.equal(error.meta?.artifact_status, 'RUNNING');
      assert.equal(error.meta?.remote_run_canceled, false);
      assert.equal(error.meta?.wait_timeout_seconds, 2);
      assert.match(String(error.meta?.resume_command), /analysis run wait --run-id run_slow/);
      return true;
    },
  );
});

await test('wait fails nonzero semantics on a terminal run without suggesting a retry', async () => {
  await assert.rejects(
    () => waitForAnalysisRun('https://ta.example.com', 'run_failed', {
      inspect: async () => ({
        run_id: 'run_failed',
        artifact_id: 'artifact_failed',
        status: 'FAILED',
        artifact_status: 'FAILED',
        error_message: 'Trino failed',
      }),
    }),
    (error: unknown) => {
      assert.ok(error instanceof CapabilityGatewayError);
      assert.equal(error.code, 'ASYNC_RUN_TERMINAL_FAILURE');
      assert.match(error.hint ?? '', /remote lifecycle is terminal/);
      assert.doesNotMatch(error.hint ?? '', /analysis run wait/);
      return true;
    },
  );
});

await test('SUCCEEDED/RUNNING artifact materialization has a bounded grace period', async () => {
  let now = 0;
  let inspections = 0;
  await assert.rejects(
    () => waitForAnalysisRun('https://ta.example.com', 'run_materializing', {
      now: () => now,
      inspect: async () => {
        inspections += 1;
        return {
          run_id: 'run_materializing',
          artifact_id: 'artifact_xyz',
          status: 'SUCCEEDED',
          artifact_status: 'RUNNING',
        };
      },
      sleep: async (milliseconds) => { now += milliseconds; },
    }),
    (error: unknown) => error instanceof CapabilityGatewayError
      && error.code === 'ASYNC_WAIT_DEADLINE_REACHED',
  );
  assert.ok(inspections < 20, `materialization polling must be bounded, got ${inspections}`);
});

await test('404 inspection fails immediately instead of entering a retry loop', async () => {
  let inspections = 0;
  await assert.rejects(
    () => waitForAnalysisRun('https://ta.example.com', 'run_missing', {
      inspect: async () => {
        inspections += 1;
        throw new CapabilityGatewayError('not found', undefined, 404);
      },
      sleep: async () => undefined,
    }),
    (error: unknown) => error instanceof CapabilityGatewayError
      && error.code === 'ASYNC_RUN_NOT_FOUND',
  );
  assert.equal(inspections, 1);
});

await test('--output implies wait and streams a completed artifact to an atomic local file', async () => {
  const host = 'https://ta.example.com';
  const dir = await mkdtemp(join(tmpdir(), 'ae-cli-artifact-'));
  const output = join(dir, 'result.jsonl.gz');
  const originalFetch = globalThis.fetch;
  setCliTokenManual('analysis-export-output-test-token', host);
  globalThis.fetch = (async (request: any) => {
    const url = String(request);
    if (url.endsWith('/capabilities/analysis.adhoc.export/execute')) {
      return new Response(JSON.stringify({
        ok: true,
        data: {
          run_id: 'run_abc',
          artifact_id: 'artifact_xyz',
          status: 'SUCCEEDED',
          artifact_status: 'COMPLETED',
          deadline_at: Date.now() + 60_000,
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/runs/run_abc/artifacts/artifact_xyz/download')) {
      return new Response(new TextEncoder().encode('artifact-body'), {
        status: 200,
        headers: { 'content-type': 'application/gzip' },
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  }) as typeof fetch;

  try {
    const result = await adhocExport.execute(makeCtx({
      'project-id': 1,
      'model-type': 'sql',
      definition: '{"sql":"select 1"}',
      output,
    }));
    assert.equal(result.output_path, output);
    assert.equal(result.bytes, 13);
    assert.equal(await readFile(output, 'utf8'), 'artifact-body');
  } finally {
    globalThis.fetch = originalFetch;
    clearCliToken(host);
    await rm(dir, { recursive: true, force: true });
  }
});

await test('artifact download refuses an existing file unless force is explicit', async () => {
  const host = 'https://ta.example.com';
  const dir = await mkdtemp(join(tmpdir(), 'ae-cli-artifact-existing-'));
  const output = join(dir, 'result.jsonl.gz');
  await writeFile(output, 'keep-me');
  const originalFetch = globalThis.fetch;
  setCliTokenManual('analysis-export-existing-test-token', host);
  globalThis.fetch = (async (request: any) => {
    const url = String(request);
    if (url.endsWith('/runs/run_abc')) {
      return new Response(JSON.stringify({
        ok: true,
        data: { run_id: 'run_abc', artifact_id: 'artifact_xyz', status: 'SUCCEEDED', artifact_status: 'COMPLETED' },
      }), { status: 200 });
    }
    throw new Error(`Download must not start for an existing output: ${url}`);
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => artifactDownload.execute(makeCtx({
        'run-id': 'run_abc',
        'artifact-id': 'artifact_xyz',
        output,
      })),
      (error: unknown) => error instanceof CapabilityGatewayError && error.code === 'OUTPUT_ALREADY_EXISTS',
    );
    assert.equal(await readFile(output, 'utf8'), 'keep-me');
  } finally {
    globalThis.fetch = originalFetch;
    clearCliToken(host);
    await rm(dir, { recursive: true, force: true });
  }
});

await test('export refuses an existing output before submitting a remote run', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ae-cli-artifact-preflight-'));
  const output = join(dir, 'result.jsonl.gz');
  await writeFile(output, 'keep-me');
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = (async () => {
    requests += 1;
    throw new Error('must not submit');
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => adhocExport.execute(makeCtx({
        'project-id': 1,
        'model-type': 'sql',
        definition: '{"sql":"select 1"}',
        output,
      })),
      (error: unknown) => error instanceof CapabilityGatewayError && error.code === 'OUTPUT_ALREADY_EXISTS',
    );
    assert.equal(requests, 0);
    assert.equal(await readFile(output, 'utf8'), 'keep-me');
  } finally {
    globalThis.fetch = originalFetch;
    await rm(dir, { recursive: true, force: true });
  }
});

await test('failed streamed downloads remove the temporary file and never publish a partial target', async () => {
  const host = 'https://ta.example.com';
  const dir = await mkdtemp(join(tmpdir(), 'ae-cli-artifact-failed-'));
  const output = join(dir, 'result.jsonl.gz');
  const originalFetch = globalThis.fetch;
  setCliTokenManual('analysis-export-failed-stream-test-token', host);
  globalThis.fetch = (async () => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('partial'));
      controller.error(new Error('connection dropped'));
    },
  }), { status: 200 })) as typeof fetch;

  try {
    await assert.rejects(
      () => downloadAnalysisArtifact(host, 'run_abc', 'artifact_xyz', output, { ensureReady: false }),
      /connection dropped/,
    );
    assert.deepEqual(await readdir(dir), []);
  } finally {
    globalThis.fetch = originalFetch;
    clearCliToken(host);
    await rm(dir, { recursive: true, force: true });
  }
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

await test('dashboard daily report update sends only explicitly provided patch fields', async () => {
  const body = await dryBody(dashboardDailyReportUpdate, {
    'project-id': 1,
    'dashboard-id': 1001,
    'send-time': '09:00',
  });

  assert.deepEqual(body, {
    input: {
      project_id: 1,
      dashboard_id: 1001,
      send_time: '09:00',
    },
  });
});

await test('dashboard daily report send infers channels from destination fields', async () => {
  const body = await dryBody(dashboardDailyReportSend, {
    'project-id': 1,
    'dashboard-id': 1001,
    'email-new': 'external@example.com',
    'dd-url': '["https://dd.example/hook"]',
  });

  assert.deepEqual(body, {
    input: {
      project_id: 1,
      dashboard_id: 1001,
      email_new: 'external@example.com',
      dd_url: ['https://dd.example/hook'],
    },
  });
});

await test('dashboard daily report help documents complete Feishu image upload credentials', () => {
  const feishuInfo = dashboardDailyReportSend.flags.find((flag) => flag.name === 'feishu-info');

  assert.ok(feishuInfo);
  assert.match(feishuInfo.desc, /app_id/);
  assert.match(feishuInfo.desc, /app_secret/);
  assert.match(feishuInfo.desc, /webhook/);
  assert.equal(feishuInfo.sensitive, true);
});

await test('dashboard daily report send does not expose channel or SMTP switches', () => {
  const names = new Set(dashboardDailyReportSend.flags.map((flag) => flag.name));

  assert.equal(names.has('enable-smtp'), false);
  assert.equal(names.has('enable-email'), false);
  assert.equal(names.has('enable-dd'), false);
  assert.equal(names.has('send-date'), false);
  assert.equal(names.has('send-time'), false);
});

await test('dashboard daily report get and send-status map stable identifiers', async () => {
  const getBody = await dryBody(dashboardDailyReportGet, {
    'project-id': 1,
    'dashboard-id': 1001,
  });
  const statusBody = await dryBody(dashboardDailyReportSendStatus, {
    'project-id': 1,
    'task-id': 44,
  });

  assert.deepEqual(getBody, {
    input: {
      project_id: 1,
      dashboard_id: 1001,
    },
  });
  assert.deepEqual(statusBody, {
    input: {
      project_id: 1,
      task_id: 44,
    },
  });
});

process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
