import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  inspectLocalDataInput,
  selectDataSet,
  streamLocalDataRows,
} from '../src/commands/data-integration/input.js';
import { profileLocalData } from '../src/commands/data-integration/profile.js';
import { convertLocalData } from '../src/commands/data-integration/conversion.js';
import type { LocalDataMapping, LocalDataRow } from '../src/commands/data-integration/types.js';

const fixture = (name: string): string => fileURLToPath(new URL(`fixtures/local-data/${name}`, import.meta.url));

const path = fixture('30_xlsx_formula_cells.xlsx');
const input = await inspectLocalDataInput(path);
const dataSet = selectDataSet(input);

// A spreadsheet stores a formula and, next to it, the result Excel last computed. Only that
// cached result can be uploaded: this tool never evaluates a formula and never guesses a result.
// Reading it wrong fails in two opposite directions, and both are in this fixture.
const rows: LocalDataRow[] = [];
await streamLocalDataRows(input, dataSet, (row) => { rows.push(row); });
assert.equal(rows.length, 2);

// Direction 1 — a value that exists but was being thrown away. ExcelJS' `cell.value` getter
// copies each field only `if (value)`, so a cached `0` or `""` never reaches the caller and the
// cell arrives as a bare `{ formula }`. `discount` is a real zero: a discount of 0 is not a
// missing discount, and uploading it as missing would understate every order.
assert.equal(rows[0].discount, 0);
assert.equal(rows[1].discount, 6);
assert.equal(rows[0].amount, 21, 'a non-zero cached result must keep working');
assert.equal(rows[1].amount, 12);
assert.equal(rows[1].remark, '已核对', 'a cached string result must survive');

// Direction 2 — a cell with genuinely nothing to upload reads as missing. Before this, the raw
// `{ formula: 'E2-F2' }` object went into the row, and an object reaching AE as a property value
// locks that property to an object type for good.
assert.equal(rows[0].total, null, 'an uncomputed formula has no value');
assert.equal(rows[1].total, null);
assert.equal(rows[0].rate, null, 'a cached #DIV/0! is an error state, not a value');
assert.equal(rows[1].rate, null, 'a bare #N/A cell is an error state, not a value');
for (const row of rows) {
  for (const [name, value] of Object.entries(row)) {
    assert.ok(
      value === null || typeof value !== 'object',
      `column ${name} must never carry a raw cell object: ${JSON.stringify(value)}`,
    );
  }
}

const profile = await profileLocalData(input, dataSet, 'Asia/Shanghai', { collectSamples: true });
const column = (name: string) => profile.columns.find((candidate) => candidate.name === name);

assert.equal(column('discount')?.inferred_type, 'number');
assert.equal(column('discount')?.missing_ratio, 0);
assert.deepEqual(column('discount')?.samples, ['0', '6']);
assert.equal(column('amount')?.inferred_type, 'number');
assert.equal(column('remark')?.inferred_type, 'string');
// The cells that hold nothing profile as missing — which is the honest reading, and the reason
// the warnings below exist: `missing_ratio: 1` alone does not say the column was expected to
// carry data.
assert.equal(column('total')?.missing_ratio, 1);
assert.equal(column('rate')?.missing_ratio, 1);
for (const candidate of profile.columns) {
  assert.notEqual(candidate.inferred_type, 'object', `column ${candidate.name} must not profile as object`);
}

// inspect names the affected columns and counts, so the user can decide whether to re-export
// before uploading anything. Counts only — cell values are never printed.
const noCache = profile.warnings.find((warning) => warning.includes('last computed result is not stored'));
assert.ok(noCache, 'an uncomputed formula must be reported in warnings');
assert.match(noCache, /total \(2\)/);
assert.doesNotMatch(noCache, /discount/);
assert.match(noCache, /never evaluates a formula/);
const errorValues = profile.warnings.find((warning) => warning.includes('Excel error value'));
assert.ok(errorValues, 'error cells must be reported in warnings');
assert.match(errorValues, /rate \(2\)/);

// convert repeats the counts in the manifest, because by then the rows are already written and
// the record count says nothing about a cell that was skipped inside a kept row.
const mapping: LocalDataMapping = {
  version: 'ae-data-integration-mapping/v1',
  source: { sha256: input.sha256, format: 'xlsx', data_set: dataSet.id },
  mode: 'track',
  confidence: 'high',
  account_id_field: 'user_id',
  default_event_name: 'order_paid',
  time: { field: 'event_time', format: 'auto', source_timezone: 'Asia/Shanghai' },
  properties: [
    { source: 'amount', target: 'amount', type: 'number' },
    { source: 'discount', target: 'discount', type: 'number' },
    { source: 'remark', target: 'remark', type: 'string' },
    { source: 'total', target: 'total', type: 'number' },
    { source: 'rate', target: 'rate', type: 'number' },
  ],
};

const outputDir = join(mkdtempSync(join(tmpdir(), 'ae-cli-xlsx-formula-')), 'out');
const converted = await convertLocalData({
  inputFile: path,
  mapping,
  outputDir,
  now: new Date('2026-09-02T00:00:00Z'),
});
assert.equal(converted.status, 'ready');
assert.equal(converted.manifest.output.valid_records, 2, 'a skipped cell must not drop its row');
assert.deepEqual(converted.manifest.output.unreadable_cells, {
  formula_no_cached_value: { total: 2 },
  error_value: { rate: 2 },
});

const records = readFileSync(join(outputDir, 'valid.ue.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
assert.equal(records[0].properties.discount, 0, 'a real zero must be uploaded as zero');
assert.equal(records[0].properties.amount, 21);
assert.ok(!('total' in records[0].properties), 'an uncomputed formula must not be uploaded');
assert.ok(!('rate' in records[0].properties), 'an error cell must not be uploaded');

process.stdout.write('local data xlsx formula tests: passed\n');
