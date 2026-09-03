import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectLocalDataInput, selectDataSet } from '../src/commands/data-integration/input.js';
import { profileLocalData } from '../src/commands/data-integration/profile.js';
import { convertLocalData } from '../src/commands/data-integration/conversion.js';
import type { LocalDataMapping } from '../src/commands/data-integration/types.js';

// An exported report ends with a 合计 row. Uploaded, it becomes an event that never happened, whose
// amount is the whole month's revenue; profiled, it doubles the column's sum and turns its maximum
// into the total. Nothing in the row itself says so — the detector is the only thing that can.
const dir = mkdtempSync(join(tmpdir(), 'ae-cli-summary-rows-'));

const profileOf = async (name: string, csv: string) => {
  const path = join(dir, name);
  writeFileSync(path, csv, 'utf8');
  const input = await inspectLocalDataInput(path);
  return profileLocalData(input, selectDataSet(input), 'Asia/Shanghai', { collectSamples: true });
};

// 1. The canonical shape: a trailing row with no identity and no time, labelled 合计, carrying the
// column total. Both signals must fire on the same row, and the row ordinal must be the reader's.
const totals = await profileOf(
  'totals.csv',
  [
    'user_id,时间,渠道,金额',
    'u1,2026-03-01 10:00:00,广告投放,100',
    'u2,2026-03-02 11:00:00,自然流量,200',
    'u3,2026-03-03 12:00:00,线下门店,300',
    ',,合计,600',
    '',
  ].join('\n'),
);
assert.ok(totals.summary_rows, 'a labelled total row must be reported');
assert.equal(totals.summary_rows.length, 1, 'only the total row is a summary line');
const [summary] = totals.summary_rows;
assert.equal(summary.row, 4, 'the ordinal counts data rows, excluding the header');
assert.deepEqual(summary.signals.slice().sort(), ['column_total', 'total_label']);
assert.equal(summary.label_column, '渠道', 'the label column is named; its text never is');
assert.deepEqual(summary.total_columns, ['金额']);
assert.equal(JSON.stringify(totals.summary_rows).includes('合计'), false, 'no cell text may be reported');

// 2. The row is reported, not removed — that is the whole contract. It stays in the row count and in
// the column's numbers, which is precisely why the warning has to say so.
assert.equal(totals.row_count, 4, 'the row is still a data row');
assert.equal(totals.columns.find((column) => column.name === '金额')?.numeric_summary?.sum, 1200);
const warning = totals.warnings.find((entry) => entry.includes('summary line'));
assert.ok(warning, 'the finding must reach the warnings, not only the structured field');
assert.match(warning, /Nothing was removed/);
assert.match(warning, /no flag that drops a data row/);
assert.match(warning, /twice its actual total/);

// 3. A grouped export repeats 小计 inside the file, where the row still carries a plausible date and
// would pass validation. The label is what catches it; its numbers are a group's total, not the
// column's, so only that signal fires.
const grouped = await profileOf(
  'grouped.csv',
  [
    'user_id,时间,项目,金额',
    'u1,2026-03-01 10:00:00,华东,100',
    'u2,2026-03-02 10:00:00,华东,200',
    'u3,2026-03-03 10:00:00,小计（华东）,300',
    'u4,2026-03-04 10:00:00,华南,400',
    'u5,2026-03-05 10:00:00,华南,500',
    'u6,2026-03-06 10:00:00,小计（华南）,900',
    '',
  ].join('\n'),
);
assert.deepEqual(
  grouped.summary_rows?.map((entry) => [entry.row, entry.signals.join('+')]),
  [[3, 'total_label'], [6, 'total_label']],
  'a scoped 小计 label is matched as a prefix, and a group total is not the column total',
);

// 4. Ordinary data must stay silent. A file of observations has no summary row, and neither field nor
// warning may appear — a detector that fires on normal files teaches the agent to ignore it.
const clean = await profileOf(
  'clean.csv',
  [
    'user_id,时间,渠道,金额',
    'u1,2026-03-01 10:00:00,广告投放,100',
    'u2,2026-03-02 10:00:00,自然流量,100',
    'u3,2026-03-03 10:00:00,线下门店,100',
    'u4,2026-03-04 10:00:00,广告投放,100',
    '',
  ].join('\n'),
);
assert.equal(clean.summary_rows, undefined, 'a file of observations reports no summary rows');
assert.equal(clean.warnings.some((entry) => entry.includes('summary line')), false);

// 5. Two rows holding the same amount make each one half of the pair's total. That is arithmetic, not
// a summary row, so a column needs more rows behind it before its total means anything.
const pair = await profileOf(
  'pair.csv',
  ['user_id,时间,金额', 'u1,2026-03-01 10:00:00,50', ',,50', ''].join('\n'),
);
assert.equal(pair.summary_rows, undefined, 'two equal values are not a total and its row');

// 6. A note that merely begins with an English total word is not a label: `sum`/`total` must match
// the whole cell, or every free-text column would report summary rows.
const notes = await profileOf(
  'notes.csv',
  [
    'user_id,时间,备注,金额',
    'u1,2026-03-01 10:00:00,summary of the complaint,10',
    'u2,2026-03-02 10:00:00,totally resolved,20',
    'u3,2026-03-03 10:00:00,Total,30',
    '',
  ].join('\n'),
);
assert.deepEqual(
  notes.summary_rows?.map((entry) => entry.row),
  [3],
  'only the cell that is exactly a total word counts',
);

// 7. A row that leaves every identity and time column empty while carrying the column total is a
// summary row even when it is not labelled — a spreadsheet's total row often has no caption at all.
const unlabelled = await profileOf(
  'unlabelled.csv',
  [
    'user_id,时间,金额',
    'u1,2026-03-01 10:00:00,100',
    'u2,2026-03-02 10:00:00,200',
    'u3,2026-03-03 10:00:00,300',
    ',,600',
    '',
  ].join('\n'),
);
assert.deepEqual(
  unlabelled.summary_rows?.map((entry) => [entry.row, entry.signals.join('+'), entry.label_column]),
  [[4, 'column_total', undefined]],
  'an unlabelled total row is caught by its own arithmetic',
);

// 8. A sparse row is not a summary row. Missing identity is a validation problem convert already
// reports; claiming it is a total would be a different, wrong finding.
const sparse = await profileOf(
  'sparse.csv',
  [
    'user_id,时间,金额',
    'u1,2026-03-01 10:00:00,100',
    'u2,2026-03-02 10:00:00,200',
    ',,7',
    '',
  ].join('\n'),
);
assert.equal(sparse.summary_rows, undefined, 'an empty-key row whose number is not the total is only sparse');

// 9. Money totals must survive float addition: 0.1 + 0.2 + 0.3 does not equal 0.6 in binary, so an
// exact comparison would miss every 金额 column in the wild.
const money = await profileOf(
  'money.csv',
  [
    'user_id,时间,金额',
    'u1,2026-03-01 10:00:00,0.1',
    'u2,2026-03-02 10:00:00,0.2',
    'u3,2026-03-03 10:00:00,0.3',
    ',,0.6',
    '',
  ].join('\n'),
);
assert.deepEqual(money.summary_rows?.map((entry) => entry.total_columns), [['金额']]);

// 10. The finding travels on the convert path too: it names columns and row ordinals, never values,
// so it belongs in the run's profile.json where a converted total row is otherwise invisible.
const path = join(dir, 'totals.csv');
const input = await inspectLocalDataInput(path);
const converted = await profileLocalData(input, selectDataSet(input), 'Asia/Shanghai', { collectSamples: false });
assert.deepEqual(converted.summary_rows, totals.summary_rows, 'convert must report the same rows as inspect');

// 11. The finding must reach the convert manifest, not only the run's profile.json: upload reads the
// manifest, and by then a 小计 row is an ordinary valid record carrying a plausible identity and time.
// The manifest is the last place the row can still be recognized for what it is.
const groupedPath = join(dir, 'grouped.csv');
const groupedInput = await inspectLocalDataInput(groupedPath);
const groupedMapping: LocalDataMapping = {
  version: 'ae-data-integration-mapping/v1',
  source: { sha256: groupedInput.sha256, format: 'csv', data_set: selectDataSet(groupedInput).id },
  mode: 'track',
  confidence: 'high',
  account_id_field: 'user_id',
  default_event_name: 'order_paid',
  time: { field: '时间', format: 'auto', source_timezone: 'Asia/Shanghai' },
  properties: [
    { source: '项目', target: 'project', type: 'string' },
    { source: '金额', target: 'amount', type: 'number' },
  ],
};
const groupedConverted = await convertLocalData({
  inputFile: groupedPath,
  mapping: groupedMapping,
  outputDir: join(dir, 'grouped-out'),
  now: new Date('2026-09-02T00:00:00Z'),
});
assert.equal(groupedConverted.manifest.output.valid_records, 6, 'a labelled 小计 row converts like any other row');
assert.deepEqual(
  groupedConverted.manifest.output.summary_rows?.map((entry) => [entry.row, entry.label_column]),
  [[3, '项目'], [6, '项目']],
  'the manifest must carry the rows, because the manifest is what upload reads',
);

process.stdout.write('local data summary row tests: passed\n');
