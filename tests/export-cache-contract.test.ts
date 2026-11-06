import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { adhocExportFlags, adhocRunFlags } from '../src/commands/te-analysis/adhoc/shared.ts';

for (const value of ['true', 'false']) {
  test(`legacy dashboard export use-cache ${value} parses and reaches preflight unchanged`, () => {
    const folder = mkdtempSync(join(tmpdir(), 'ae-export-cache-contract-'));
    const host = 'https://export-cache.example.invalid';
    const env = { ...process.env, AE_CLI_TOKEN: 'cli_synthetic_contract_token', AE_CLI_TOKEN_HOST: host,
      TE_AGENT_CLI_CONFIG_DIR: folder, TA_CLI_CONTEXT_FILE: join(folder, 'absent.json'), AE_CLI_NO_COMPAT_CHECK: '1' };
    delete env.AE_CLI_TOKEN_FILE;
    const code = `
      const { Command } = await import('commander');
      const { registerCommands } = await import('./src/framework/register.ts');
      const { dashboardReportDataExport } = await import('./src/commands/te-analysis/dashboard-report-data/export.ts');
      const { registerCapabilityGatewayRoute } = await import('./src/core/capability-routing.ts');
      const { logger } = await import('./src/core/logger.ts'); logger.command = () => {}; logger.info = () => {}; logger.error = () => {};
      registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });
      const calls = [];
      globalThis.fetch = async (url, init = {}) => {
        if (String(url).endsWith('/validate')) calls.push(JSON.parse(String(init.body)).input);
        return new Response(JSON.stringify({ ok: true, data: { valid: true } }), { status: 200 });
      };
      const p = new Command();p.option('--host <host>').option('--format <format>').option('--validate');
      registerCommands(p, [dashboardReportDataExport]);
      await p.parseAsync(['node','probe','--host',${JSON.stringify(host)},'--validate','analysis','dashboard-report-data','export','--project-id','1','--dashboard-id','77','--use-cache',${JSON.stringify(value)}]);
      process.stderr.write('INPUTS=' + JSON.stringify(calls) + '\\n');
    `;
    try {
      const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', code],
        { env, input: '', encoding: 'utf8', timeout: 10_000 });
      assert.equal(child.status, 0, child.stderr);
      const line = child.stderr.split('\n').find(line => line.startsWith('INPUTS='));
      assert.ok(line, child.stderr);
      const inputs = JSON.parse(line.slice('INPUTS='.length));
      assert.equal(inputs.length, 1);
      assert.equal(inputs[0].use_cache, value === 'true');
    } finally { rmSync(folder, { recursive: true, force: true }); }
  });
}

test('ad-hoc export documents the legacy cache no-op without changing query help', () => {
  assert.match(adhocExportFlags.find(flag => flag.name === 'use-cache')!.desc, /deprecated.*no.op/i);
  assert.match(adhocRunFlags.find(flag => flag.name === 'use-cache')!.desc, /Default: true/);
  assert.doesNotMatch(adhocRunFlags.find(flag => flag.name === 'use-cache')!.desc, /deprecated/i);
});
