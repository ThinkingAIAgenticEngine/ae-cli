import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { queryCancel } from '../src/commands/te-analysis/query/cancel.ts';
import { requiresConfirmation } from '../src/core/capability-risk.ts';

test('query cancellation uses the high-impact write confirmation policy', () => {
  assert.equal(queryCancel.risk, 'high-risk-write');
  assert.equal(requiresConfirmation(queryCancel.risk), true);
});

test('non-interactive cancellation requires authorization before contacting the gateway', () => {
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    const { runCommand } = await import('./src/framework/runner.ts');
    const { queryCancel } = await import('./src/commands/te-analysis/query/cancel.ts');
    globalThis.fetch = () => { throw new Error('Gateway must not be contacted without confirmation'); };
    await runCommand(queryCancel, { runId: 'run_0123456789abcdef0123456789abcdef' },
      { host: 'https://cancel.example.invalid', format: 'json' });
  `], { encoding: 'utf8', timeout: 10_000 });
  assert.equal(child.status, 1, child.stderr);
  const output = JSON.parse(child.stderr);
  assert.equal(output.error.code, 'CONFIRMATION_REQUIRED');
  assert.match(output.error.hint, /--yes/);
});
