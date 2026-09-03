import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  detectLeadingTitleRows,
  inspectLocalDataInput,
  peekXlsxRows,
  selectDataSet,
  streamLocalDataRows,
} from '../src/commands/data-integration/input.js';
import { convertLocalData } from '../src/commands/data-integration/conversion.js';
import { validateMapping } from '../src/commands/data-integration/mapping.js';
import { dataIntegrationInspect } from '../src/commands/data-integration/inspect.js';
import type { LocalDataMapping, LocalDataProfile, LocalDataRow } from '../src/commands/data-integration/types.js';

const fixture = (name: string): string => fileURLToPath(new URL(`fixtures/local-data/${name}`, import.meta.url));
const root = mkdtempSync(join(tmpdir(), 'ae-cli-title-rows-'));

const runInspect = async (flags: Record<string, unknown>): Promise<LocalDataProfile> => {
  const values: Record<string, unknown> = { 'source-timezone': 'Asia/Shanghai', headers: '', headerless: false, 'skip-rows': 0, ...flags };
  const ctx = {
    str: (name: string) => String(values[name] ?? ''),
    num: (name: string) => Number(values[name] ?? 0),
    bool: (name: string) => Boolean(values[name]),
    list: (name: string) => (Array.isArray(values[name]) ? values[name] as string[] : [String(values[name])]),
  };
  if (dataIntegrationInspect.validate) dataIntegrationInspect.validate(ctx as never);
  return await dataIntegrationInspect.execute(ctx as never) as LocalDataProfile;
};

// An exported report puts its caption in A1 and the real header row underneath. Read as-is, the
// caption becomes the only column name, every real column name is lost, and the header row is
// counted as data — so the row count is wrong too. The reader's behaviour is deliberately left
// alone here: an AE property type is locked by the first value it receives, so inspect reports the
// suspicion and the user decides.
const xlsxPath = fixture('31_xlsx_title_row.xlsx');
const asIs = await runInspect({ 'input-file': [xlsxPath] });
assert.equal(asIs.row_count, 4, 'the default read still treats row 1 as the header');
assert.deepEqual(asIs.columns.map((column) => column.name), ['2026年3月销售明细']);
assert.deepEqual(asIs.leading_title_rows, [
  { row: 1, non_empty_cells: 1 },
  { row: 2, non_empty_cells: 1 },
]);
assert.equal(asIs.skipped_rows, undefined, 'nothing was skipped, so no count is reported');
const titleWarning = asIs.warnings.find((warning) => warning.includes('title or banner'));
assert.ok(titleWarning, 'the suspected title rows must be reported');
assert.match(titleWarning, /--skip-rows N/, 'the warning must name the remedy');
assert.match(titleWarning, /header was still read from the first row/, 'the warning must say nothing was changed');
// The report carries ordinals and counts only. Printing the caption would leak source data into a
// log, and inspect never prints source values.
for (const warning of asIs.warnings) {
  assert.doesNotMatch(warning, /2026年3月销售明细/, 'a warning must not quote cell text');
}

// The remedy: the ordinals reported above are exactly the value --skip-rows takes.
const skipped = await runInspect({ 'input-file': [xlsxPath], 'skip-rows': 2 });
assert.deepEqual(skipped.columns.map((column) => column.name), ['user_id', 'event_time', 'amount']);
assert.equal(skipped.row_count, 2, 'the header row is no longer counted as data');
assert.equal(skipped.skipped_rows, 2);
assert.equal(skipped.leading_title_rows, undefined, 'past the titles there is nothing left to report');
assert.deepEqual(skipped.warnings, [], 'a correctly read file warns about nothing');
// The decision is carried into the mapping, so a later convert reads the same rows inspect saw.
assert.equal(skipped.recommended_mapping.skip_rows, 2);
assert.equal(skipped.recommended_mapping.time.field, 'event_time');

// Delimited input has the same defect and the same remedy: both readers honour --skip-rows, so
// both are scanned.
const csvPath = join(root, 'title.csv');
writeFileSync(csvPath, '2026年3月销售明细\nuser_id,event_time,amount\nu001,2026-03-04 05:06:07,21\nu002,2026-03-05 08:00:00,12\n');
const csvAsIs = await runInspect({ 'input-file': [csvPath] });
assert.deepEqual(csvAsIs.leading_title_rows, [{ row: 1, non_empty_cells: 1 }]);
assert.ok(csvAsIs.warnings.some((warning) => warning.includes('title or banner')));
const csvSkipped = await runInspect({ 'input-file': [csvPath], 'skip-rows': 1 });
assert.deepEqual(csvSkipped.columns.map((column) => column.name), ['user_id', 'event_time', 'amount']);
assert.equal(csvSkipped.recommended_mapping.skip_rows, 1);

// A normal export must stay silent. A single narrow file that happens to start with one value is
// not enough to call a title row, so the detector also requires a plausible header row below it.
const plainPath = join(root, 'plain.csv');
writeFileSync(plainPath, 'user_id,event_time,amount\nu001,2026-03-04 05:06:07,21\n');
const plain = await runInspect({ 'input-file': [plainPath] });
assert.equal(plain.leading_title_rows, undefined);
assert.equal(plain.header_signal, undefined);
assert.deepEqual(detectLeadingTitleRows([['only'], ['a', 'b']]), [], 'a two-column follower is too narrow to be a header row');
assert.deepEqual(detectLeadingTitleRows([[], ['a', 'b', 'c']]), [{ row: 1, non_empty_cells: 0 }], 'a blank leading row counts too');
assert.deepEqual(detectLeadingTitleRows([['a', 'b', 'c'], ['1', '2', '3']]), [], 'a full header row is not a title');

// --skip-rows is rejected rather than clamped: a fractional value would emit a skip_rows the
// mapping validator later refuses, and that failure would surface far from its cause.
for (const bad of [-1, 1.5]) {
  await assert.rejects(
    async () => await runInspect({ 'input-file': [xlsxPath], 'skip-rows': bad }),
    (error: Error & { code?: string }) => error.code === 'LOCAL_DATA_SKIP_ROWS_INVALID',
    `--skip-rows ${bad} must be rejected`,
  );
}

// The reader honours the same ordinals inspect reported, and both of convert's passes agree on
// where the data starts — otherwise the profile it writes would describe different rows than the
// records it uploads.
const input = await inspectLocalDataInput(xlsxPath);
const dataSet = selectDataSet(input);
const rows: LocalDataRow[] = [];
await streamLocalDataRows(input, dataSet, (row) => { rows.push(row); }, { skipRows: 2 });
assert.equal(rows.length, 2);
assert.deepEqual(Object.keys(rows[0]), ['user_id', 'event_time', 'amount']);
assert.equal(rows[0].user_id, 'u001');

// The peek that produces the report sees rows in the order the stream will, so an ordinal from one
// is the ordinal of the other.
const peeked = await peekXlsxRows(xlsxPath, dataSet.label, 10);
assert.equal(peeked.length, 5);
assert.deepEqual(peeked[2], ['user_id', 'event_time', 'amount']);

const mapping: LocalDataMapping = {
  version: 'ae-data-integration-mapping/v1',
  source: { sha256: input.sha256, format: 'xlsx', data_set: dataSet.id },
  mode: 'track',
  confidence: 'high',
  account_id_field: 'user_id',
  default_event_name: 'order_paid',
  time: { field: 'event_time', format: 'auto', source_timezone: 'Asia/Shanghai' },
  skip_rows: 2,
  properties: [{ source: 'amount', target: 'amount', type: 'number' }],
};
const outputDir = join(root, 'out');
const converted = await convertLocalData({
  inputFile: xlsxPath,
  mapping,
  outputDir,
  now: new Date('2026-09-02T00:00:00Z'),
});
assert.equal(converted.status, 'ready');
assert.equal(converted.manifest.output.valid_records, 2, 'the title rows must not become records');
const records = readFileSync(join(outputDir, 'valid.ue.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
assert.equal(records[0]['#account_id'], 'u001');
assert.equal(records[0]['#time'], '2026-03-04 05:06:07.000');
assert.equal(records[0].properties.amount, 21);

// skip_rows is a row ordinal, so it only means anything for formats that have one.
assert.throws(() => validateMapping({ ...mapping, skip_rows: 0 }), /positive integer/);
assert.throws(
  () => validateMapping({ ...mapping, source: { ...mapping.source, format: 'jsonl' }, skip_rows: 2 }),
  /not supported for jsonl/,
);

process.stdout.write('local data title row tests: passed\n');
