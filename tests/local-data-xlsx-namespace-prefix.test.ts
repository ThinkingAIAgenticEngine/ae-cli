import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  createXlsxStructureCollector,
  inspectLocalDataInput,
  selectDataSet,
  streamLocalDataRows,
  xlsxStructureReport,
} from '../src/commands/data-integration/input.js';
import type { LocalDataRow } from '../src/commands/data-integration/types.js';

const fixture = (name: string): string => fileURLToPath(new URL(`fixtures/local-data/${name}`, import.meta.url));

// The metadata parts of this workbook carry the default namespace as the `x:` prefix (`<x:sheet>`
// in workbook.xml, `<x:si>` in sharedStrings.xml), the way some cleaning/export tools emit them;
// the worksheets themselves stay unprefixed. ae-cli must read it identically to an unprefixed
// workbook: sheet recognition, shared-string text and merge detection all match by local name
// rather than by the exact `<sheet>` spelling, so a prefixed export never reads as "no sheets".
const input = await inspectLocalDataInput(fixture('33_xlsx_namespace_prefix.xlsx'));

// Sheet recognition: the prefixed `<x:sheet>` entries must still surface as readable data sets.
assert.deepEqual(input.dataSets.map((item) => item.label), ['events', 'profiles']);

// Shared-string text: a prefixed `<x:si>` / `<x:t>` must resolve to the cell text it indexes. The
// events sheet also merges D2:D3, so its second remark reads empty — the value lives on the block's
// first row only, exactly as the file stores it.
const events = selectDataSet(input, 'events');
const rows: LocalDataRow[] = [];
await streamLocalDataRows(input, events, (row) => { rows.push(row); });
assert.equal(rows.length, 2);
assert.equal(rows[0].remark, '华东订单', 'prefixed shared strings must resolve to the cell text');
assert.equal(rows[1].remark, null, 'the merged cell below the anchor reads empty, as in the file');

// The second sheet proves the whole table resolved: every string, not just the first cell's.
const profiles = selectDataSet(input, 'profiles');
const profileRows: LocalDataRow[] = [];
await streamLocalDataRows(input, profiles, (row) => { profileRows.push(row); });
assert.deepEqual(profileRows.map((row) => row.nickname), ['张三', '李四'], 'every shared string must survive the prefixed table');

// Merge detection still reads the (unprefixed) worksheet structure.
const collector = createXlsxStructureCollector();
await streamLocalDataRows(input, events, () => {}, { xlsxStructure: collector });
const structure = xlsxStructureReport(collector);
assert.equal(structure?.merged_ranges, 1);
assert.ok(structure?.merged_range_samples?.includes('D2:D3'));
assert.deepEqual(structure?.merged_covered_cells, { remark: 1 });

process.stdout.write('local data xlsx namespace prefix tests: passed\n');
