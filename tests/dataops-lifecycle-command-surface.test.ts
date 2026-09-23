import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function cli(args: string[]) {
  return spawnSync(process.execPath, ['--import', 'tsx', 'src/index.ts', '--no-update-check', ...args], {
    encoding: 'utf8', timeout: 30_000,
  });
}

test('datatable help lists the lifecycle commands beside creation and publication', () => {
  const result = cli(['dataops_datatable', '--help']);
  assert.equal(result.status, 0, result.stderr);
  for (const name of ['+entity_recycle', '+recycle_bin_list', '+recycle_bin_delete', '+create_table', '+create_view', '+publish_entity']) {
    assert.ok(result.stdout.includes(name), name);
  }
});

test('removed lifecycle command paths are not aliases', () => {
  for (const args of [['entity', 'recycle'], ['recycle-bin', 'list'], ['recycle-bin', 'delete']]) {
    const result = cli(['dataops', ...args, '--help']);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /unknown command/);
  }
});

test('removed kebab-case flags are rejected by the command parser', () => {
  for (const [command, flags] of [
    ['+entity_recycle', ['--space-code', '--entity-id']],
    ['+recycle_bin_delete', ['--space-code', '--entity-id']],
    ['+recycle_bin_list', ['--space-code', '--max-results']],
  ] as const) {
    for (const flag of flags) {
      // Help exits before option validation; keep required input empty if a removed flag is accidentally accepted.
      const result = cli(['dataops_datatable', command, flag, 'value', '--spaceCode', '']);
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /unknown option/);
      assert.ok(result.stderr.includes(flag));
    }
  }
});

test('the recycle command is discoverable with the existing datatable commands', () => {
  const result = cli(['dataops_datatable', '+entity_recycle', '--help']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /--spaceCode/);
  assert.match(result.stdout, /--entityId/);
  assert.doesNotMatch(result.stdout, /--space-code|--entity-id/);
});

for (const command of ['+recycle_bin_list', '+recycle_bin_delete']) {
  test(`${command} is available in datatable with camelCase flags`, () => {
    const result = cli(['dataops_datatable', command, '--help']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /--spaceCode/);
    assert.match(result.stdout, command === '+recycle_bin_list' ? /--maxResults/ : /--entityId/);
    assert.doesNotMatch(result.stdout, /--space-code|--entity-id|--max-results/);
  });
}
