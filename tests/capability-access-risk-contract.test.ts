import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const commands = [
  ['dashboard/share', 'dashboardShare'], ['dashboard/handover', 'dashboardHandover'],
  ['bi-panel/share', 'biPanelShare'], ['project/member/add', 'projectMemberAdd'],
  ['project/member/update', 'projectMemberUpdate'], ['project/member/batch-update', 'projectMemberBatchUpdate'],
  ['project/owner/update', 'projectOwnerUpdate'], ['project/data-power/upsert', 'projectDataPowerUpsert'],
  ['project/role/upsert', 'projectRoleUpsert'], ['project/member-handover/run', 'projectMemberHandoverRun'],
  ['system/configuration', 'system.oauth2.update'], ['system/configuration', 'system.third_party_login.upsert'],
];

for (const [file, name] of commands) {
  test(`${name} requires explicit authorization before dispatch`, () => {
    const folder = mkdtempSync(join(tmpdir(), 'ae-access-risk-'));
    const secret = join(folder, 'synthetic-secret.txt');
    writeFileSync(secret, 'synthetic_secret', { mode: 0o600 });
    const host = 'https://access-risk.example.invalid';
    const env = { ...process.env, AE_CLI_TOKEN: 'cli_synthetic_contract_token', AE_CLI_TOKEN_HOST: host,
      TE_AGENT_CLI_CONFIG_DIR: folder, TA_CLI_CONTEXT_FILE: join(folder, 'absent.json'), AE_CLI_NO_COMPAT_CHECK: '1' };
    delete env.AE_CLI_TOKEN_FILE;
    const code = `
      const { runCommand } = await import('./src/framework/runner.ts');
      const { logger } = await import('./src/core/logger.ts');
      logger.command = () => {}; logger.info = () => {}; logger.error = () => {}; logger.warn = () => {};
      const mod = await import('./src/commands/te-analysis/${file}.ts');
      const cmd = ${file === 'system/configuration' ? `mod.systemConfigurationCommands.find(c => c.capabilityId === ${JSON.stringify(name)})` : `mod.${name}`};
      globalThis.fetch = async () => { process.stderr.write('DISPATCH_BOUNDARY\\n'); return new Response(JSON.stringify({ ok: true, data: {} }), { status: 200 }); };
      await runCommand(cmd, { projectId: 1, dashboardId: 77, dashboardIds: '[77]', panelId: 78, memberAuthorities: '{}',
        payload: '{"role_name":"analyst","role_func_list":[{"function_name":"viewReport","has_power":1}],"role_list":["analyst"],"data_power_id":1,"user_roles":[],"asset_list":[]}',
        companyId: 1, enableOauth2: false, targetUserId: 7, ownerUserId: 7, toUserId: 7, type: '1', loginType: 'feishu', appId: 'synthetic_app', appSecretFile: ${JSON.stringify(secret)} },
        { host: ${JSON.stringify(host)}, format: 'json' });
    `;
    try {
      const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', code],
        { env, input: '', encoding: 'utf8', timeout: 10_000 });
      assert.equal(child.status, 1, child.stderr);
      assert.doesNotMatch(child.stderr, /DISPATCH_BOUNDARY/);
      const error = JSON.parse(child.stderr.slice(child.stderr.indexOf('{'))).error;
      assert.equal(error.code, 'CONFIRMATION_REQUIRED');
    } finally { rmSync(folder, { recursive: true, force: true }); }
  });
}
