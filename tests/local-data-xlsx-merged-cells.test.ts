import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createXlsxStructureCollector,
  inspectLocalDataInput,
  selectDataSet,
  streamLocalDataRows,
  xlsxStructureReport,
  xlsxStructureWarnings,
} from '../src/commands/data-integration/input.js';
import { convertLocalData } from '../src/commands/data-integration/conversion.js';
import { validateMapping } from '../src/commands/data-integration/mapping.js';
import { dataIntegrationInspect } from '../src/commands/data-integration/inspect.js';
import type { LocalDataMapping, LocalDataProfile, LocalDataRow } from '../src/commands/data-integration/types.js';

const fixture = (name: string): string => fileURLToPath(new URL(`fixtures/local-data/${name}`, import.meta.url));
const root = mkdtempSync(join(tmpdir(), 'ae-cli-merged-cells-'));

const runInspect = async (flags: Record<string, unknown>): Promise<LocalDataProfile> => {
  const values: Record<string, unknown> = {
    'source-timezone': 'Asia/Shanghai',
    headers: '',
    headerless: false,
    'skip-rows': 0,
    'fill-merged-cells': false,
    'exclude-hidden-rows': false,
    ...flags,
  };
  const ctx = {
    str: (name: string) => String(values[name] ?? ''),
    num: (name: string) => Number(values[name] ?? 0),
    bool: (name: string) => Boolean(values[name]),
    list: (name: string) => (Array.isArray(values[name]) ? values[name] as string[] : [String(values[name])]),
  };
  if (dataIntegrationInspect.validate) dataIntegrationInspect.validate(ctx as never);
  return await dataIntegrationInspect.execute(ctx as never) as LocalDataProfile;
};

/** Run a body with stderr captured, so the user-facing warnings can be asserted. */
async function withStderr(body: () => Promise<void>): Promise<string> {
  const original = process.stderr.write.bind(process.stderr);
  let captured = '';
  (process.stderr as any).write = (chunk: any) => {
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

// A sheet maintained by hand: `区域` is merged down each region's block of rows, so Excel keeps the
// value on the block's first row and stores the rest as empty cells. Read as-is, a column that looks
// full on screen arrives 60% missing, row 5 is hidden inside a block, and column E is hidden — none
// of which a row carries, because merge ranges and hidden flags live outside the row data.
// `--skip-rows 1` gets past the merged banner in row 1; the title-row behaviour is P5's, tested there.
const xlsxPath = fixture('32_xlsx_merged_cells.xlsx');
const asIs = await runInspect({ 'input-file': [xlsxPath], 'skip-rows': 1 });
assert.deepEqual(asIs.columns.map((column) => column.name), ['区域', 'user_id', 'event_time', 'amount', '备注']);
assert.equal(asIs.row_count, 5, 'the hidden row is still read by default');
const region = asIs.columns.find((column) => column.name === '区域');
assert.equal(region?.missing_count, 3, 'three cells read as missing only because a merge covers them');

// The default read is unchanged; the layout is reported instead. Filling cells changes the data, and
// an AE property type is locked by the first value it receives, so the user decides.
assert.equal(asIs.xlsx_structure?.merged_ranges, 3);
assert.ok(asIs.xlsx_structure?.merged_range_samples?.includes('A3:A5'), 'a merge ref must locate the block in Excel');
assert.deepEqual(asIs.xlsx_structure?.merged_covered_cells, { 区域: 3 });
assert.equal(asIs.xlsx_structure?.merged_cells_filled, false);
assert.equal(asIs.xlsx_structure?.hidden_rows, 1);
assert.deepEqual(asIs.xlsx_structure?.hidden_row_samples, [5], 'row numbers are Excel row numbers, not emitted ordinals');
assert.equal(asIs.xlsx_structure?.excluded_hidden_rows, 0);
assert.deepEqual(asIs.xlsx_structure?.hidden_columns, ['备注']);
assert.equal(asIs.recommended_mapping.fill_merged_cells, undefined, 'no behaviour is recommended by default');
assert.equal(asIs.recommended_mapping.exclude_hidden_rows, undefined);

const coveredWarning = asIs.warnings.find((warning) => warning.includes('merged block'));
assert.ok(coveredWarning, 'the covered cells must be reported');
assert.match(coveredWarning, /--fill-merged-cells/, 'the warning must name the remedy');
const hiddenRowWarning = asIs.warnings.find((warning) => warning.includes('hidden in the source worksheet'));
assert.ok(hiddenRowWarning, 'a hidden row read as data must be reported');
assert.match(hiddenRowWarning, /--exclude-hidden-rows/);
assert.ok(
  asIs.warnings.some((warning) => warning.includes('备注') && warning.includes('exclude_columns')),
  'a hidden column read as data must be reported, with the mapping field that drops it',
);
// Row numbers and column names locate the problem; cell text would leak source data into a log.
for (const warning of asIs.warnings) {
  assert.doesNotMatch(warning, /华东|华北|内部备注|2026年3月销售明细/, 'a warning must not quote cell text');
}

// The remedy, bounded: each block's value reaches the rows its own range covers and no further.
const filled = await runInspect({ 'input-file': [xlsxPath], 'skip-rows': 1, 'fill-merged-cells': true });
assert.equal(filled.row_count, 5);
assert.equal(filled.columns.find((column) => column.name === '区域')?.missing_count, 0);
assert.equal(filled.xlsx_structure?.merged_cells_filled, true);
assert.deepEqual(filled.xlsx_structure?.merged_covered_cells, { 区域: 3 }, 'the report still counts what was changed');
assert.equal(filled.recommended_mapping.fill_merged_cells, true, 'a later convert must read the same rows');

// Hidden rows are dropped only when asked: a row hidden inside a data block may still be real data,
// so unlike a hidden worksheet it is not excluded by default.
const withoutHidden = await runInspect({ 'input-file': [xlsxPath], 'skip-rows': 1, 'exclude-hidden-rows': true });
assert.equal(withoutHidden.row_count, 4);
assert.equal(withoutHidden.xlsx_structure?.excluded_hidden_rows, 1);
assert.deepEqual(
  withoutHidden.xlsx_structure?.merged_covered_cells,
  { 区域: 2 },
  'a dropped row is not counted as covered — the report equals what this run would change',
);
assert.equal(withoutHidden.recommended_mapping.exclude_hidden_rows, true);
assert.match(
  withoutHidden.warnings.find((warning) => warning.includes('hidden in the source worksheet')) ?? '',
  /Skipped 1 row/,
);

// The reader is what both inspect and convert go through, so the same facts hold one level down.
const input = await inspectLocalDataInput(xlsxPath);
const dataSet = selectDataSet(input);
const rows: LocalDataRow[] = [];
const collector = createXlsxStructureCollector();
await streamLocalDataRows(input, dataSet, (row) => { rows.push(row); }, {
  skipRows: 1,
  fillMergedCells: true,
  xlsxStructure: collector,
});
assert.equal(rows.length, 5);
assert.deepEqual(rows.map((row) => row['区域']), ['华东', '华东', '华东', '华北', '华北']);
assert.deepEqual(rows.map((row) => row.user_id), ['u001', 'u002', 'u003', 'u004', 'u005']);
assert.equal(rows[4]['备注'], '内部备注', 'a hidden column is read as data, not dropped');
assert.deepEqual(xlsxStructureWarnings(collector).length, 3);

// Nothing to report is reported as nothing: a workbook without merges or hidden markers must not
// gain a section that reads as a finding.
const plain = await inspectLocalDataInput(fixture('31_xlsx_title_row.xlsx'));
const plainCollector = createXlsxStructureCollector();
await streamLocalDataRows(plain, selectDataSet(plain), () => {}, { xlsxStructure: plainCollector });
assert.equal(xlsxStructureReport(plainCollector), undefined);
assert.deepEqual(xlsxStructureWarnings(plainCollector), []);

// convert has no read flags of its own — both decisions travel in the mapping, which is what makes
// the converted rows the rows inspect profiled.
const mapping: LocalDataMapping = {
  version: 'ae-data-integration-mapping/v1',
  source: { sha256: input.sha256, format: 'xlsx', data_set: dataSet.id },
  mode: 'track',
  confidence: 'high',
  account_id_field: 'user_id',
  default_event_name: 'order_paid',
  time: { field: 'event_time', format: 'auto', source_timezone: 'Asia/Shanghai' },
  skip_rows: 1,
  fill_merged_cells: true,
  exclude_hidden_rows: true,
  exclude_columns: ['备注'],
  properties: [
    { source: '区域', target: 'region', type: 'string' },
    { source: 'amount', target: 'amount', type: 'number' },
  ],
};
const outputDir = join(root, 'out');
let converted: Awaited<ReturnType<typeof convertLocalData>> | undefined;
const convertWarnings = await withStderr(async () => {
  converted = await convertLocalData({
    inputFile: xlsxPath,
    mapping,
    outputDir,
    now: new Date('2026-09-02T00:00:00Z'),
  });
});
assert.ok(converted, 'the conversion must have run');
assert.equal(converted.status, 'ready');
assert.equal(converted.manifest.output.valid_records, 4, 'the hidden row must not become a record');
// The hidden column is already in exclude_columns, so repeating the advice would tell the user to do
// what they have done. The manifest still records that the column was hidden.
assert.doesNotMatch(convertWarnings, /hidden in the source worksheet and were read as data/);
assert.deepEqual(converted.manifest.output.xlsx_structure?.hidden_columns, ['备注']);
// The converted rows no longer show the source layout, so the manifest is the only record of it.
assert.equal(converted.manifest.output.xlsx_structure?.merged_cells_filled, true);
assert.equal(converted.manifest.output.xlsx_structure?.excluded_hidden_rows, 1);
assert.deepEqual(converted.manifest.output.xlsx_structure?.merged_covered_cells, { 区域: 2 });
const records = readFileSync(join(outputDir, 'valid.ue.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
assert.deepEqual(records.map((record) => record.properties.region), ['华东', '华东', '华北', '华北']);
assert.deepEqual(records.map((record) => record['#account_id']), ['u001', 'u002', 'u004', 'u005']);

// Both fields are read from worksheet XML, which only .xlsx carries; a mapping that asks for them on
// another format is refused at validation rather than silently ignored during a conversion.
assert.throws(() => validateMapping({ ...mapping, fill_merged_cells: 'yes' }), /must be a boolean/);
assert.throws(
  () => validateMapping({
    ...mapping,
    source: { ...mapping.source, format: 'xls' },
    skip_rows: undefined,
    fill_merged_cells: undefined,
    exclude_hidden_rows: true,
  }),
  /exclude_hidden_rows is not supported for xls/,
);

process.stdout.write('local data xlsx merged cell tests: passed\n');
