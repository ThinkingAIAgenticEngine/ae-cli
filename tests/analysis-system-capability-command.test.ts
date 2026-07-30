/**
 * System-management capability command contract tests.
 *
 * Run: npx tsx tests/analysis-system-capability-command.test.ts
 */

import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Command, RuntimeContext } from '../src/framework/types.ts';
import {
  clearCapabilityGatewayRoutesForTest,
  registerCapabilityGatewayRoute,
} from '../src/core/capability-routing.ts';
import { clearCliToken, setCliTokenManual } from '../src/core/cli-token.ts';
import systemCommands from '../src/commands/te-analysis/system/index.ts';
import { projectInfoCreate } from '../src/commands/te-analysis/project/info/create.ts';
import { projectInfoDelete } from '../src/commands/te-analysis/project/info/delete.ts';

const expectedSystemIds = [
  'system.admin.list',
  'system.admin.remove',
  'system.admin.upsert',
  'system.admin_function.list',
  'system.admin_function.update',
  'system.function.list',
  'system.member.list',
  'system.member.add',
  'system.member.delete',
  'system.member_password.reset',
  'system.member.update',
  'system.member_candidate.list',
  'system.member_mfa.unbind',
  'system.member_project.batch_update',
  'system.member_status.update',
  'system.mfa.get',
  'system.mfa.update',
  'system.node_monitor.list',
  'system.oauth2.update',
  'system.ops_alert_contact.delete',
  'system.ops_alert_contact.list',
  'system.ops_alert_contact.test',
  'system.ops_alert_contact.upsert',
  'system.preference.get',
  'system.preference.update',
  'system.project_usage.list',
  'system.query_alert_rule.list',
  'system.query_alert_rule.update',
  'system.query_monitor.overview',
  'system.query_task.cancel',
  'system.query_task.export',
  'system.query_task.get',
  'system.query_task.list',
  'system.query_task.options',
  'system.receiver_address.delete',
  'system.receiver_address.overview',
  'system.receiver_address.project_list',
  'system.receiver_address.promote',
  'system.receiver_address.upsert',
  'system.receiver_detection.get',
  'system.receiver_detection.run',
  'system.receiver_detection.update',
  'system.role.delete',
  'system.role.get',
  'system.role.list',
  'system.role.upsert',
  'system.role_function.list',
  'system.role_user.list',
  'system.seat.list',
  'system.seat.update',
  'system.smtp.delete',
  'system.smtp.get',
  'system.smtp.test',
  'system.smtp.upsert',
  'system.third_party_login.disable',
  'system.third_party_login.list',
  'system.third_party_login.upsert',
  'system.usage.overview',
  'system.usage_trend.export',
  'system.usage_trend.query',
].sort();

let pass = 0;
let fail = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    pass += 1;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (error) {
    fail += 1;
    process.stdout.write(`  ✗ ${name}\n`);
    process.stdout.write(`    ${error instanceof Error ? error.message : String(error)}\n`);
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
      const value = values[name];
      return value === undefined || value === null || value === '' ? undefined : Number(value);
    },
    bool(name: string): boolean {
      const value = values[name];
      if (typeof value === 'string') return ['true', '1', 'yes', 'y', 'on'].includes(value.toLowerCase());
      return Boolean(value);
    },
    json(name: string): unknown {
      const value = values[name];
      return typeof value === 'string' ? JSON.parse(value) : value;
    },
    api: async () => ({}),
    communityReport: async () => ({}),
    querySql: async () => ({}),
    queryReportData: async () => ({}),
    token: async () => 'token',
    host: () => 'https://ta.example.com',
    mcpUrl: () => undefined,
    service: () => 'analysis',
    out: async () => undefined,
  };
}

function byId(capabilityId: string): Command {
  const command = [...systemCommands, projectInfoCreate, projectInfoDelete]
    .find((item) => item.capabilityId === capabilityId);
  assert.ok(command, `missing command ${capabilityId}`);
  return command;
}

async function dryInput(
  command: Command,
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  clearCapabilityGatewayRoutesForTest();
  registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });
  const host = 'https://ta.example.com';
  setCliTokenManual('analysis-system-contract-test-token', host);
  let body: any;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (request: any, init?: RequestInit) => {
    const url = typeof request === 'string' ? request : request.url;
    assert.match(url, /\/api\/cli\/analysis\/v1\/capabilities\//);
    body = init?.body ? JSON.parse(String(init.body)) : undefined;
    return new Response(JSON.stringify({ ok: true, data: { dry_run: true } }), { status: 200 });
  }) as typeof fetch;
  try {
    await command.dryRun!(ctx(values));
    return body.input;
  } finally {
    globalThis.fetch = originalFetch;
    clearCliToken(host);
  }
}

function protectedSecretFile(value: string): { dir: string; file: string } {
  const dir = mkdtempSync(join(tmpdir(), 'ae-cli-system-secret-'));
  const file = join(dir, 'secret');
  writeFileSync(file, `${value}\n`, { mode: 0o600 });
  chmodSync(file, 0o600);
  return { dir, file };
}

process.stdout.write('\nanalysis system capability command tests\n');

await test('registers exactly the admitted 60 system commands and 2 project commands', () => {
  assert.equal(systemCommands.length, 60);
  assert.equal(new Set(systemCommands.map((item) => item.capabilityId)).size, 60);
  assert.deepEqual(systemCommands.map((item) => item.capabilityId).sort(), expectedSystemIds);
  assert.equal(projectInfoCreate.capabilityId, 'project.info.create');
  assert.equal(projectInfoDelete.capabilityId, 'project.info.delete');
});

await test('all system commands map their three-part capability ID directly to the CLI path', () => {
  for (const command of systemCommands) {
    const [, resource, action] = command.capabilityId!.split('.');
    assert.equal(command.service, 'system');
    assert.equal(command.resource, resource.replaceAll('_', '-'));
    assert.equal(command.command, action.replaceAll('_', '-'));
    assert.ok(command.flags.some((flag) => flag.name === 'company-id' && flag.required));
    assert.equal(command.flags.some((flag) => flag.name === 'payload'), false);
  }
});

await test('high-risk system commands rely on the global confirmation gate', () => {
  const expected = new Set([
    'system.member_status.update',
    'system.member_project.batch_update',
    'system.member_password.reset',
    'system.member.delete',
    'system.admin.remove',
    'system.admin.upsert',
    'system.admin_function.update',
    'system.role.upsert',
    'system.role.delete',
    'system.mfa.update',
    'system.member_mfa.unbind',
    'system.query_task.cancel',
    'system.query_alert_rule.update',
    'system.ops_alert_contact.delete',
    'system.smtp.delete',
    'system.receiver_address.delete',
    'system.third_party_login.disable',
    'system.seat.update',
  ]);
  assert.deepEqual(
    new Set(systemCommands.filter((item) => item.risk === 'high-risk-write').map((item) => item.capabilityId)),
    expected,
  );
  for (const command of systemCommands.filter((item) => item.risk === 'high-risk-write')) {
    assert.equal(command.flags.some((flag) => flag.name === 'yes'), false);
  }
});

await test('usage trend query forwards typed snake_case input', async () => {
  assert.deepEqual(await dryInput(byId('system.usage_trend.query'), {
    'company-id': 7,
    metric: 'total_event_volume',
    'start-time': '2026-07-01',
    'end-time': '2026-07-24',
    'time-granularity': 'day',
    scope: 'project',
    'project-ids': '[11,12]',
    'data-type': 'event',
  }), {
    company_id: 7,
    start_time: '2026-07-01',
    end_time: '2026-07-24',
    metric: 'total_event_volume',
    time_granularity: 'day',
    scope: 'project',
    project_ids: [11, 12],
    data_type: 'event',
  });
});

await test('usage trend export forwards the cancellable run lifecycle input', async () => {
  const command = byId('system.usage_trend.export');
  assert.equal(command.risk, 'read');
  assert.ok(command.flags.some((flag) => flag.name === 'request-id'));
  assert.ok(command.flags.some((flag) => flag.name === 'timeout-seconds' && flag.max === 21600));
  assert.equal(command.flags.some((flag) => flag.name === 'artifact-format'), false);
  assert.deepEqual(await dryInput(command, {
    'company-id': 7,
    metric: 'cu',
    'start-time': '2026-07-01',
    'end-time': '2026-07-24',
    'time-granularity': 'day',
    'request-id': 'cli_0123456789abcdef0123456789abcdef',
    'timeout-seconds': 3600,
  }), {
    company_id: 7,
    start_time: '2026-07-01',
    end_time: '2026-07-24',
    metric: 'cu',
    time_granularity: 'day',
    request_id: 'cli_0123456789abcdef0123456789abcdef',
    timeout_seconds: 3600,
  });
  const reference = readFileSync(
    new URL('../skills/ae-analysis/references/system_usage_trend_export.md', import.meta.url),
    'utf8',
  );
  assert.match(reference, /analysis run inspect --run-id/);
  assert.match(reference, /analysis artifact download --run-id/);
  assert.match(reference, /jsonl\.gz/);
  assert.match(reference, /analysis query cancel --run-id/);
});

await test('member project batch update forwards arrays and confirmation', async () => {
  assert.deepEqual(await dryInput(byId('system.member_project.batch_update'), {
    'company-id': 7,
    'target-open-id': 'ou_target',
    'project-updates': '[{"project_id":11,"role_names":["viewer"]}]',
    'project-removals': '[{"project_id":12,"handover_type":"FORCE"}]',
  }), {
    company_id: 7,
    target_open_id: 'ou_target',
    project_updates: [{ project_id: 11, role_names: ['viewer'] }],
    project_removals: [{ project_id: 12, handover_type: 'FORCE' }],
    yes: true,
  });
});

await test('member add forwards a non-empty validated member batch', async () => {
  assert.deepEqual(await dryInput(byId('system.member.add'), {
    'company-id': 7,
    members: '[{"login_name":"first@example.com","user_name":"First"},{"login_name":"second@example.com","user_name":"Second"}]',
  }), {
    company_id: 7,
    members: [
      { login_name: 'first@example.com', user_name: 'First' },
      { login_name: 'second@example.com', user_name: 'Second' },
    ],
  });
});

await test('member add rejects empty or incomplete member batches locally', () => {
  assert.throws(
    () => byId('system.member.add').preflight!(ctx({
      'company-id': 7,
      members: '[]',
    })),
    /non-empty --members/,
  );
  assert.throws(
    () => byId('system.member.add').preflight!(ctx({
      'company-id': 7,
      members: '[{"login_name":"first@example.com"}]',
    })),
    /missing user_name/,
  );
});

await test('identity protection commands forward typed targets and confirmation', async () => {
  assert.deepEqual(await dryInput(byId('system.member.delete'), {
    'company-id': 7,
    'target-user-id': 101,
  }), {
    company_id: 7,
    target_user_id: 101,
    yes: true,
  });
  assert.deepEqual(await dryInput(byId('system.admin.remove'), {
    'company-id': 7,
    'target-open-id': 'ou_admin',
  }), {
    company_id: 7,
    target_open_id: 'ou_admin',
    yes: true,
  });
  assert.deepEqual(await dryInput(byId('system.seat.update'), {
    'company-id': 7,
    'seat-type': 'empty',
    'open-ids': '["ou_a","ou_b"]',
  }), {
    company_id: 7,
    seat_type: 'empty',
    open_ids: ['ou_a', 'ou_b'],
    yes: true,
  });
});

await test('member password reset encrypts a protected local secret and never accepts plaintext on argv', async () => {
  const password = protectedSecretFile('Cli-reset-password-2026');
  try {
    const command = byId('system.member_password.reset');
    assert.equal(command.risk, 'high-risk-write');
    assert.equal(command.flags.some((flag) => flag.name === 'password'), false);
    assert.ok(command.flags.some((flag) => flag.name === 'password-stdin' && flag.sensitive));
    assert.ok(command.flags.some((flag) => flag.name === 'password-file'));

    const input = await dryInput(command, {
      'company-id': 7,
      'target-user-id': 101,
      'password-file': password.file,
    });

    assert.deepEqual(
      {
        company_id: input.company_id,
        target_user_id: input.target_user_id,
        yes: input.yes,
      },
      {
        company_id: 7,
        target_user_id: 101,
        yes: true,
      },
    );
    assert.equal(typeof input.encrypted_password, 'string');
    assert.equal(Buffer.from(String(input.encrypted_password), 'base64').length, 128);
    assert.notEqual(input.encrypted_password, 'Cli-reset-password-2026');
  } finally {
    rmSync(password.dir, { recursive: true, force: true });
  }
});

await test('query alert update validates typed rule arrays and forwards confirmation', async () => {
  assert.deepEqual(await dryInput(byId('system.query_alert_rule.update'), {
    'company-id': 7,
    upserts: '[{"metric_content":1,"wheel_minutes":5,"wheel_interval":2,"threshold":80}]',
    'delete-ids': '[9]',
  }), {
    company_id: 7,
    upserts: [{ metric_content: 1, wheel_minutes: 5, wheel_interval: 2, threshold: 80 }],
    delete_ids: [9],
    yes: true,
  });
});

await test('query-task export forwards standard run/artifact filters', async () => {
  const command = byId('system.query_task.export');
  assert.equal(command.risk, 'read');
  assert.equal(command.flags.some((flag) => flag.name === 'artifact-format'), false);
  assert.deepEqual(await dryInput(command, {
    'company-id': 7,
    'start-time': '2026-07-24 00:00:00',
    'end-time': '2026-07-24 23:59:59',
    'status-codes': '[1,3]',
    'project-ids': '[11]',
    'content-codes': '[1]',
    'task-type-codes': '[2]',
    'download-columns': '["query_id","query_status"]',
    'request-id': 'cli_0123456789abcdef0123456789abcdef',
    'timeout-seconds': 3600,
  }), {
    company_id: 7,
    start_time: '2026-07-24 00:00:00',
    end_time: '2026-07-24 23:59:59',
    project_ids: [11],
    status_codes: [1, 3],
    content_codes: [1],
    task_type_codes: [2],
    download_columns: ['query_id', 'query_status'],
    request_id: 'cli_0123456789abcdef0123456789abcdef',
    timeout_seconds: 3600,
  });
  const reference = readFileSync(
    new URL('../skills/ae-analysis/references/system_query_task_export.md', import.meta.url),
    'utf8',
  );
  assert.match(reference, /analysis run inspect --run-id/);
  assert.match(reference, /analysis artifact download --run-id/);
  assert.match(reference, /analysis query cancel --run-id/);
});

await test('query-task options is the discoverable source for list and export filters', async () => {
  const command = byId('system.query_task.options');
  assert.equal(command.risk, 'read');
  assert.deepEqual(await dryInput(command, { 'company-id': 7 }), { company_id: 7 });
  const reference = readFileSync(
    new URL('../skills/ae-analysis/references/system_query_task_options.md', import.meta.url),
    'utf8',
  );
  assert.match(reference, /status.*code/i);
  assert.match(reference, /content.*code/i);
  assert.match(reference, /task.*type.*code/i);
  assert.match(reference, /cluster/i);
});

await test('role and admin function replacement reject empty function arrays locally', async () => {
  for (const capabilityId of ['system.role.upsert', 'system.admin_function.update']) {
    const command = byId(capabilityId);
    const values = capabilityId === 'system.role.upsert'
      ? { 'company-id': 7, 'role-desc': 'Analyst', 'function-names': '[]' }
      : { 'company-id': 7, 'target-open-id': 'TG-user', 'function-names': '[]' };
    await assert.rejects(
      () => dryInput(command, values),
      /--function-names must contain at least one function/,
    );
  }
});

await test('contact test reads its target from a protected source as an ordinary write', async () => {
  const target = protectedSecretFile('https://open.feishu.cn/open-apis/bot/v2/hook/example');
  try {
    const command = byId('system.ops_alert_contact.test');
    assert.equal(command.risk, 'write');
    assert.equal(command.flags.some((flag) => flag.name === 'target'), false);
    assert.deepEqual(await dryInput(command, {
      'company-id': 7,
      channel: 'feishu',
      'target-file': target.file,
    }), {
      company_id: 7,
      channel: 'feishu',
      target: 'https://open.feishu.cn/open-apis/bot/v2/hook/example',
    });
  } finally {
    rmSync(target.dir, { recursive: true, force: true });
  }
});

await test('SMTP password is read from a protected file and never accepted directly', async () => {
  const { dir, file } = protectedSecretFile('smtp-secret');
  try {
    const command = byId('system.smtp.upsert');
    assert.equal(command.flags.some((flag) => flag.name === 'password'), false);
    assert.ok(command.flags.some((flag) => flag.name === 'password-file'));
    assert.deepEqual(await dryInput(command, {
      'company-id': 7,
      'server-host': 'smtp.example.com',
      'server-port': 465,
      'sender-address': 'ops@example.com',
      'sender-name': 'Ops',
      'password-file': file,
    }), {
      company_id: 7,
      server_host: 'smtp.example.com',
      server_port: 465,
      sender_address: 'ops@example.com',
      sender_name: 'Ops',
      password: 'smtp-secret',
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

await test('secret files with group or other access are rejected locally', () => {
  const { dir, file } = protectedSecretFile('unsafe-secret');
  try {
    chmodSync(file, 0o644);
    assert.throws(
      () => byId('system.smtp.upsert').preflight!(ctx({
        'company-id': 7,
        'server-host': 'smtp.example.com',
        'server-port': 465,
        'sender-address': 'ops@example.com',
        'sender-name': 'Ops',
        'password-file': file,
      })),
      /must not be readable or writable by group\/others/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

await test('third-party login secrets are read only from protected sources', async () => {
  const app = protectedSecretFile('app-secret-value');
  const scan = protectedSecretFile('scan-secret-value');
  try {
    const command = byId('system.third_party_login.upsert');
    assert.equal(command.flags.some((flag) => flag.name === 'app-secret'), false);
    assert.equal(command.flags.some((flag) => flag.name === 'dd-scan-app-secret'), false);
    assert.deepEqual(await dryInput(command, {
      'company-id': 7,
      'login-type': 'dingtalk',
      'app-id': 'app-id',
      'corp-id': 'corp-id',
      'agent-id': 'agent-id',
      'dd-scan-app-id': 'scan-app-id',
      'app-secret-file': app.file,
      'dd-scan-app-secret-file': scan.file,
    }), {
      company_id: 7,
      login_type: 'dingtalk',
      app_id: 'app-id',
      corp_id: 'corp-id',
      agent_id: 'agent-id',
      dd_scan_app_id: 'scan-app-id',
      app_secret: 'app-secret-value',
      dd_scan_app_secret: 'scan-secret-value',
    });
  } finally {
    rmSync(app.dir, { recursive: true, force: true });
    rmSync(scan.dir, { recursive: true, force: true });
  }
});

await test('project create and delete preserve their distinct safety contracts', async () => {
  assert.deepEqual(await dryInput(projectInfoCreate, {
    'company-id': 7,
    'project-name': 'New project',
  }), {
    company_id: 7,
    project_name: 'New project',
    load_history: false,
  });
  assert.deepEqual(await dryInput(projectInfoDelete, {
    'project-id': 11,
  }), {
    project_id: 11,
    yes: true,
  });
});

await test('conditional validators reject unsafe or ambiguous input', () => {
  assert.throws(
    () => byId('system.usage_trend.query').validate!(ctx({
      'company-id': 7,
      metric: 'apollo_token',
      'start-time': '2026-07-01',
      'end-time': '2026-07-24',
      'time-granularity': 'day',
    })),
    /apollo_token is not implemented/,
  );
  assert.throws(
    () => byId('system.query_monitor.overview').validate!(ctx({
      'company-id': 7,
      'cluster-names': '["cluster-a"]',
    })),
    /project-ids or --space-codes/,
  );
  assert.doesNotThrow(
    () => byId('system.query_monitor.overview').validate!(ctx({
      'company-id': 7,
      'project-ids': '[11]',
      'cluster-names': '["cluster-a"]',
    })),
  );
  for (const capabilityId of ['system.query_task.list', 'system.query_task.export']) {
    assert.throws(
      () => byId(capabilityId).validate!(ctx({
        'company-id': 7,
        'start-time': '2026-07-24 00:00:00',
        'end-time': '2026-07-24 23:59:59',
        'project-ids': '[11]',
        'status-codes': '[]',
        'content-codes': '[1]',
        'task-type-codes': '[2]',
      })),
      /--status-codes must be a non-empty JSON array/,
    );
  }
  assert.throws(
    () => byId('system.third_party_login.upsert').validate!(ctx({
      'company-id': 7,
      'login-type': 'wecom',
      'app-id': 'app-id',
      'app-secret-file': '/tmp/not-read-during-validation',
    })),
    /corp-id is required/,
  );
});

if (fail > 0) process.exitCode = 1;
