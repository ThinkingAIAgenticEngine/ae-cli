import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const host = 'https://generic-contract.example.invalid';

function invoke(args: string[], input = '', failure = false) {
  const folder = mkdtempSync(join(tmpdir(), 'ae-generic-contract-'));
  const env = { ...process.env, AE_CLI_TOKEN: 'cli_synthetic_contract_token', AE_CLI_TOKEN_HOST: host,
    TE_AGENT_CLI_CONFIG_DIR: folder, TA_CLI_CONTEXT_FILE: join(folder, 'absent-context.json'), AE_CLI_NO_COMPAT_CHECK: '1' };
  delete env.AE_CLI_TOKEN_FILE;
  const code = `
    const { Command } = await import('commander');
    const { registerCapability } = await import('./src/commands/capability/index.ts');
    const { registerCapabilityGatewayRoute } = await import('./src/core/capability-routing.ts');
    registerCapabilityGatewayRoute('analysis', { gatewayDomain: 'analysis' });
    globalThis.fetch = async (url, init = {}) => {
      const address = String(url);
      if (address.includes('/config')) return new Response(JSON.stringify({ versions: { aeCliVersion: '6.0.57' }, businesses: { analysis: true } }), { status: 200 });
      if (address.endsWith('/execute')) {
        process.stderr.write('EXECUTE_BOUNDARY\\n');
        if (${failure}) return new Response(JSON.stringify({ ok: false, error: { code: 'CAPABILITY_PERMISSION_DENIED', message: 'Synthetic denial', details: { reason: 'synthetic' } }, meta: { capability_id: 'analysis.dashboard.delete', request_id: 'request_probe', invocation_id: 'invocation_probe' } }), { status: 403 });
        return new Response(JSON.stringify({ ok: true, data: { executed: true } }), { status: 200 });
      }
      if (address.endsWith('/validate') || address.endsWith('/dry-run')) return new Response(JSON.stringify({ ok: true, data: { preflight: true } }), { status: 200 });
      return new Response(JSON.stringify({ ok: true, data: { id: 'analysis.dashboard.delete', risk: 'high-risk-write' } }), { status: 200 });
    };
    const program = new Command();
    program.option('--host <host>').option('--format <format>').option('--yes').option('--validate').option('--dry-run');
    registerCapability(program);
    await program.parseAsync(['node', 'probe', '--host', ${JSON.stringify(host)}, ...${JSON.stringify(args)}, 'capability', 'run', 'analysis.dashboard.delete', '--input', '{"project_id":1,"dashboard_ids":[77]}']);
  `;
  try {
    return spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', code],
      { env, input, encoding: 'utf8', timeout: 10_000 });
  } finally { rmSync(folder, { recursive: true, force: true }); }
}

function errorFrom(stderr: string) {
  try { return JSON.parse(stderr.slice(stderr.indexOf('{'))).error; }
  catch { return undefined; }
}

for (const [name, input] of [['closed stdin', ''], ['piped yes', 'y\n']]) {
  test(`generic high-risk execution requires global yes with ${name}`, () => {
    const child = invoke([], input);
    assert.equal(child.status, 1, child.stderr);
    assert.equal(errorFrom(child.stderr)?.code, 'CONFIRMATION_REQUIRED', child.stderr);
    assert.match(errorFrom(child.stderr)?.hint ?? '', /--yes/);
    assert.doesNotMatch(child.stderr, /EXECUTE_BOUNDARY|unsettled top-level await/i);
  });
}

test('generic explicit global yes preserves high-risk execution', () => {
  const child = invoke(['--yes']);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(JSON.parse(child.stdout).data.executed, true);
  assert.match(child.stderr, /EXECUTE_BOUNDARY/);
});

for (const flag of ['--validate', '--dry-run']) {
  test(`generic ${flag} stays non-mutating without confirmation`, () => {
    const child = invoke([flag]);
    assert.equal(child.status, 0, child.stderr);
    assert.equal(JSON.parse(child.stdout).data.preflight, true);
    assert.doesNotMatch(child.stderr, /EXECUTE_BOUNDARY|Continue\?/);
  });
}

test('generic permission failures preserve gateway trace metadata', () => {
  const child = invoke(['--yes'], '', true);
  assert.equal(child.status, 1, child.stderr);
  const error = errorFrom(child.stderr);
  assert.equal(error.code, 'CAPABILITY_PERMISSION_DENIED');
  const envelope = JSON.parse(child.stderr.slice(child.stderr.indexOf('{')));
  assert.deepEqual(envelope.meta, { capability_id: 'analysis.dashboard.delete', request_id: 'request_probe', invocation_id: 'invocation_probe' });
});
