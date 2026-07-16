import assert from 'node:assert/strict';
import { formatError, formatOutput, withOutputMetadata } from '../src/framework/output.ts';

async function json(data: unknown, expr: string): Promise<any> {
  return JSON.parse(await formatOutput(data, 'json', expr));
}

assert.deepEqual(
  await json({ items: [{ id: 1 }] }, '.items'),
  { ok: true, data: [{ id: 1 }] },
);

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

process.stdout.write('output contract tests passed\n');
