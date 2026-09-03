import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  inspectLocalDataInput,
  readExcelSheetHeaders,
  selectDataSet,
  streamLocalDataRows,
} from '../src/commands/data-integration/input.js';
import { dataIntegrationInspect } from '../src/commands/data-integration/inspect.js';
import type { LocalDataRow } from '../src/commands/data-integration/types.js';

const fixture = (name: string): string => fileURLToPath(new URL(`fixtures/local-data/${name}`, import.meta.url));

/** Run a body with stderr captured, so the user-facing warnings can be asserted. */
async function withStderr(body: () => Promise<void>): Promise<string> {
  const original = process.stderr.write.bind(process.stderr);
  let captured = '';
  (process.stderr as any).write = (chunk: any, ...rest: any[]) => {
    captured += String(chunk);
    return true;
  };
  try {
    await body();
  } finally {
    (process.stderr as any).write = original;
  }
  return captured;
}

// A hidden worksheet is scratch space, a lookup table, or a superseded draft — never rows the
// user meant to upload. Sheet names here are real business data (exempt from the English rule):
// `临时草稿` is the hidden draft, `1月`/`2月` the two mergeable months.
const file = fixture('28_xlsx_hidden_sheet.xlsx');
const input = await inspectLocalDataInput(file);

assert.deepEqual(input.dataSets.map((dataSet) => dataSet.label), ['1月', '2月']);
assert.deepEqual(input.excludedDataSets?.map((dataSet) => dataSet.label), ['临时草稿']);

// The hidden sheet has different headers, so counting it would report this workbook as ragged
// and steer the user away from a merge that is in fact safe.
const headers = await readExcelSheetHeaders(file, 'xlsx');
assert.deepEqual(headers.map((sheet) => sheet.name), ['1月', '2月']);

// --merge-sheets reads whatever the workbook offers, so the exclusion has to happen there too:
// three scratch rows would otherwise be uploaded as real events.
const merged: LocalDataRow[] = [];
const mergeWarnings = await withStderr(async () => {
  await streamLocalDataRows(input, selectDataSet(input, 'sheet:1月'), (row) => { merged.push(row); }, {
    mergeSheets: true,
  });
});
assert.equal(merged.length, 4);
assert.ok(merged.every((row) => 'order_id' in row), 'merged rows must all come from the visible sheets');
assert.ok(!merged.some((row) => 'tmp_a' in row), 'a hidden sheet must not be merged');
// A quieter row count with no explanation is indistinguishable from a parse failure.
assert.match(mergeWarnings, /skipped 1 hidden worksheet/);
assert.match(mergeWarnings, /临时草稿/);

// Excluding it from the candidates must not make it unreachable: naming it is an explicit
// decision, and the warning is what keeps that decision informed.
const scratch: LocalDataRow[] = [];
const explicitWarnings = await withStderr(async () => {
  const explicit = selectDataSet(input, 'sheet:临时草稿');
  assert.equal(explicit.label, '临时草稿');
  await streamLocalDataRows(input, explicit, (row) => { scratch.push(row); });
});
assert.equal(scratch.length, 3);
assert.match(explicitWarnings, /hidden in the source workbook/);

// End to end: the excluded name reaches the agent through the command output, both in the
// discovery response and in the profile of a chosen sheet.
const ctx = (dataSet: string) => ({
  list: () => [file],
  str: (name: string) => (name === 'source-timezone' ? 'Asia/Shanghai' : name === 'data-set' ? dataSet : ''),
  bool: () => false,
  num: () => 0,
}) as any;

const discovery = await dataIntegrationInspect.execute(ctx(''));
assert.equal(discovery.selection_required, true);
assert.deepEqual(discovery.data_sets.map((dataSet: { label: string }) => dataSet.label), ['1月', '2月']);
assert.deepEqual(discovery.excluded_sheets, [
  { name: '临时草稿', reason: 'hidden', data_set: 'sheet:临时草稿' },
]);
assert.equal(discovery.header_consistency, 'all_same');

const profiled = await dataIntegrationInspect.execute(ctx('sheet:1月'));
assert.equal(profiled.row_count, 2);
assert.deepEqual(profiled.excluded_sheets, [
  { name: '临时草稿', reason: 'hidden', data_set: 'sheet:临时草稿' },
]);

// A workbook whose every sheet is hidden leaves no candidate at all. Falling through to the
// "multiple data sets" error would list nothing and read as a corrupt file, so this state gets its
// own message that names what is actually readable.
const allHidden = await inspectLocalDataInput(fixture('29_xlsx_all_hidden.xlsx'));
assert.deepEqual(allHidden.dataSets, []);
assert.deepEqual(allHidden.excludedDataSets?.map((dataSet) => dataSet.label), ['隐藏明细']);
assert.throws(() => selectDataSet(allHidden), (error: unknown) => {
  const failure = error as { code?: string; message: string; hint?: string };
  assert.equal(failure.code, 'LOCAL_DATA_ALL_DATA_SETS_HIDDEN');
  assert.match(failure.message, /Every data set in this file is hidden/);
  assert.match(failure.hint ?? '', /sheet:隐藏明细/);
  return true;
});

process.stdout.write('local data xlsx hidden sheet tests: passed\n');
