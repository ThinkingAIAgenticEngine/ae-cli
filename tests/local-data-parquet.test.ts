import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  inspectLocalDataInput,
  resolveLocalDataInputMeta,
  selectDataSet,
  streamLocalDataRows,
} from '../src/commands/data-integration/input.js';
import { inspectParquetFiles } from '../src/commands/data-integration/inspect.js';
import { readParquetSchema } from '../src/commands/data-integration/parquet.js';
import { profileLocalData } from '../src/commands/data-integration/profile.js';
import type { LocalDataRow } from '../src/commands/data-integration/types.js';

const fixture = (name: string): string => fileURLToPath(new URL(`fixtures/local-data/${name}`, import.meta.url));

async function collectRows(path: string): Promise<LocalDataRow[]> {
  const input = await inspectLocalDataInput(path);
  const rows: LocalDataRow[] = [];
  const count = await streamLocalDataRows(input, selectDataSet(input), (row) => { rows.push(row); });
  assert.equal(count, rows.length);
  return rows;
}

function column(profile: Awaited<ReturnType<typeof profileLocalData>>, name: string) {
  const found = profile.columns.find((col) => col.name === name);
  assert.ok(found, `expected column ${name}`);
  return found;
}

try {
  // Format wiring: .parquet resolves to parquet with no encoding probe.
  const meta = resolveLocalDataInputMeta(fixture('34_parquet_events.parquet'));
  assert.equal(meta.format, 'parquet');
  assert.equal(meta.encoding, undefined);

  // Schema is the header: a single `$` file data set.
  const eventsInput = await inspectLocalDataInput(fixture('34_parquet_events.parquet'));
  assert.equal(eventsInput.format, 'parquet');
  assert.deepEqual(eventsInput.dataSets, [{ id: '$', kind: 'file', label: '34_parquet_events.parquet', selector: '$' }]);

  // Row values: int64 -> exact decimal string, naive timestamp -> wall-clock string, scalars typed.
  const events = await collectRows(fixture('34_parquet_events.parquet'));
  assert.equal(events.length, 3);
  assert.equal(events[0].account_id, '9007199254740993', 'int64 must survive 2^53 without precision loss');
  assert.equal(events[0].distinct_id, 'u_1');
  assert.equal(events[0].time_, '2026-01-01 08:30:15.123');
  assert.equal(events[0].timezone, 9);
  assert.equal(events[0].is_paying, true);
  assert.equal(events[0].amount, 12.5);
  assert.equal(events[1].time_, '2026-01-01 09:00:00');

  // Profile infers the same types: id-like int64 stays string, naive timestamps infer datetime.
  const eventsProfile = await profileLocalData(eventsInput, selectDataSet(eventsInput), 'Asia/Shanghai');
  assert.equal(eventsProfile.row_count, 3);
  assert.equal(column(eventsProfile, 'account_id').inferred_type, 'string');
  assert.equal(column(eventsProfile, 'distinct_id').inferred_type, 'string');
  assert.equal(column(eventsProfile, 'event_name').inferred_type, 'string');
  assert.equal(column(eventsProfile, 'time_').inferred_type, 'datetime');
  assert.equal(column(eventsProfile, 'timezone').inferred_type, 'number');
  assert.equal(column(eventsProfile, 'level').inferred_type, 'number');
  assert.equal(column(eventsProfile, 'is_paying').inferred_type, 'boolean');
  assert.equal(column(eventsProfile, 'amount').inferred_type, 'number');

  // INT96 (legacy Spark/Impala) reads as a naive wall-clock string.
  const int96 = await collectRows(fixture('35_parquet_int96.parquet'));
  assert.equal(int96.length, 3);
  assert.equal(int96[0].ts, '2020-06-01 12:00:00');

  // Decimal: the scale from the schema re-inserts the decimal point; trailing zeros are trimmed.
  const decimals = await collectRows(fixture('36_parquet_decimal.parquet'));
  assert.equal(decimals[0].amount, '9007199254740993.1234');
  assert.equal(decimals[1].amount, '0.0001');
  assert.equal(decimals[2].amount, '-12.5');

  // Nested columns stay nested (not flattened): list/struct degrade to plain object/array.
  const nested = await collectRows(fixture('37_parquet_nested.parquet'));
  assert.deepEqual(nested[0].tags, ['a', 'b']);
  assert.deepEqual(nested[1].tags, []);
  assert.deepEqual(nested[0].meta, { x: '1', y: 'one' });
  assert.deepEqual(nested[0].items, [{ item_id: '1', price: 9.5 }, { item_id: '2', price: 0.25 }]);
  assert.equal(nested[1].items.length, 0);

  // Timestamp semantics: UTC-adjusted -> absolute Date; naive -> wall-clock string.
  const tz = await collectRows(fixture('38_parquet_tz.parquet'));
  assert.ok(tz[0].utc_time instanceof Date);
  assert.equal((tz[0].utc_time as Date).toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(tz[0].naive_time, '2026-01-01 08:00:00');

  // DATE (date32) -> wall-clock date string; Uint64 -> exact decimal string (incl. max value); Map -> object.
  const misc = await collectRows(fixture('39_parquet_misc.parquet'));
  assert.equal(misc.length, 3);
  assert.equal(misc[0].d, '2021-01-01');
  assert.equal(misc[1].d, '2022-01-08');
  assert.equal(misc[0].u, '9007199254740993');
  assert.equal(misc[2].u, '18446744073709551615', 'uint64 max must survive without precision loss');
  assert.deepEqual(misc[0].m, { a: '1', b: '2' });
  assert.deepEqual(misc[1].m, {});

  // Footer-only schema read: row count and canonical Arrow types, no data decode.
  const schema = await readParquetSchema(fixture('34_parquet_events.parquet'));
  assert.equal(schema.numRows, 3);
  assert.equal(schema.columns.find((c) => c.name === 'account_id')?.type, 'Int64');
  assert.ok(schema.signature.includes('account_id:Int64'), 'signature encodes name:type');
  assert.ok(schema.signature.includes('time_:Timestamp<NANOSECOND>'), 'naive timestamp signature');

  // Multi-file fast path: identical schemas -> schema_checked with one representative profile.
  const checked = await inspectParquetFiles([fixture('34_parquet_events.parquet'), fixture('34_parquet_events.parquet')], 'Asia/Shanghai');
  assert.ok(checked, 'identical schemas must produce a schema_checked result');
  assert.equal(checked.schema_checked, true);
  assert.equal((checked.representative as { file: string }).file, '34_parquet_events.parquet');
  assert.equal((checked.files as unknown[]).length, 2);
  assert.equal((checked.files as Array<{ row_count: number }>)[0].row_count, 3);
  assert.equal(checked.total_row_count, 6);
  assert.equal((checked.representative as { profile: { source: { format: string } } }).profile.source.format, 'parquet');

  // Schema mismatch -> undefined, so the caller falls back to profiling every file.
  const mismatch = await inspectParquetFiles([fixture('34_parquet_events.parquet'), fixture('36_parquet_decimal.parquet')], 'Asia/Shanghai');
  assert.equal(mismatch, undefined, 'a differing schema must signal fallback');

  process.stdout.write('local data parquet tests: passed\n');
} finally {
  // Fixtures are read-only; nothing to clean up.
}
