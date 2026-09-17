import assert from 'node:assert/strict';
import { formatError, formatOutput, withOutputMetadata } from '../src/framework/output.ts';

async function json(data: unknown, expr: string): Promise<any> {
  return JSON.parse(await formatOutput(data, 'json', expr));
}

assert.deepEqual(
  await json({ items: [{ id: 1 }] }, '.items'),
  { ok: true, data: [{ id: 1 }] },
);

const sqlTable = await formatOutput({
  title: ['n', 'label'],
  rows: [[1, 'one'], [2, 'two']],
  returned_rows: 2,
}, 'table');
assert.match(sqlTable, /n/);
assert.match(sqlTable, /label/);
assert.match(sqlTable, /one/);
assert.match(sqlTable, /two/);
assert.doesNotMatch(sqlTable, /^\[\s*"n"/);

assert.deepEqual(
  await json({ data: { items: [{ id: 2 }] } }, '.data.items'),
  { ok: true, data: [{ id: 2 }] },
);

assert.deepEqual(
  await json({ items: [{ id: 3 }] }, '.items[0]'),
  { ok: true, data: { id: 3 } },
);

assert.deepEqual(
  await json({ items: [] }, '.missing'),
  { ok: true, data: null },
);

const traced = withOutputMetadata(
  { items: [{ id: 4 }] },
  { request_id: 'cli_0123456789abcdef0123456789abcdef', invocation_id: 'inv_4' },
);

assert.deepEqual(
  JSON.parse(await formatOutput(traced, 'json')),
  {
    ok: true,
    data: { items: [{ id: 4 }] },
    meta: { request_id: 'cli_0123456789abcdef0123456789abcdef', invocation_id: 'inv_4' },
  },
);

assert.deepEqual(
  JSON.parse(await formatOutput(traced, 'json', '.items')),
  {
    ok: true,
    data: [{ id: 4 }],
    meta: { request_id: 'cli_0123456789abcdef0123456789abcdef', invocation_id: 'inv_4' },
  },
);

assert.deepEqual(
  JSON.parse(formatError(
    'api',
    'Query failed.',
    undefined,
    'QUERY_FAILED',
    { request_id: 'cli_fedcba9876543210fedcba9876543210', invocation_id: 'inv_5' },
  )),
  {
    ok: false,
    error: { type: 'api', code: 'QUERY_FAILED', message: 'Query failed.' },
    meta: { request_id: 'cli_fedcba9876543210fedcba9876543210', invocation_id: 'inv_5' },
  },
);


assert.deepEqual(JSON.parse(await formatOutput(withOutputMetadata(traced, {
  intent_consistency: { checked: true, matched: true },
}), 'json')), {
  ok: true,
  data: { items: [{ id: 4 }] },
  meta: {
    request_id: 'cli_0123456789abcdef0123456789abcdef', invocation_id: 'inv_4',
    intent_consistency: { checked: true, matched: true },
  },
});

// Projection errors must preserve a completed command's result for local recovery.
const { spawnSync } = await import('node:child_process');
for (const format of ['json', 'table']) {
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import { runCommand } from './src/framework/runner.ts';
    import { withOutputMetadata } from './src/framework/output.ts';
    await runCommand({
      service: 'fixture', command: 'read', flags: [], risk: 'read',
      execute: async () => withOutputMetadata({ title: ['count'], rows: [[7]], raw: 'x'.repeat(2 * 1024 * 1024) }, { request_id: 'fixture-one' }),
    }, {}, { format: '${format}', jq: '.rows | invalid_function' });
  `], { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, env: { ...process.env, AE_CLI_NO_COMPAT_CHECK: '1' } });
  assert.equal(child.status, 1);
  const recovered = JSON.parse(child.stdout);
  assert.equal(recovered.ok, false);
  assert.equal(recovered.error.code, 'OUTPUT_PROJECTION_FAILED');
  assert.deepEqual(recovered.data, { title: ['count'], rows: [[7]], raw: 'x'.repeat(2 * 1024 * 1024) });
  assert.equal(recovered.meta.request_id, 'fixture-one');
  assert.equal(JSON.parse(child.stderr).error.code, 'OUTPUT_PROJECTION_FAILED');
  assert.match(recovered.error.hint, /without executing the command again/);
}

process.stdout.write('output contract tests passed\n');
