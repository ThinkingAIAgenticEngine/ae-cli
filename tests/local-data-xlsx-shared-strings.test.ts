import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import unzipper from 'unzipper';
import {
  inspectLocalDataInput,
  selectDataSet,
  streamLocalDataRows,
} from '../src/commands/data-integration/input.js';
import type { LocalDataRow } from '../src/commands/data-integration/types.js';

// An XLSX keeps the text its cells display once each in `xl/sharedStrings.xml`, and a worksheet
// cell only points at an index in that table. The table is read as a stream, so on any workbook
// with more than a few thousand distinct strings it arrives in chunks — and a chunk boundary lands
// wherever the compressor put it, including halfway through a multi-byte character. Decoding each
// chunk on its own turns that one character into two replacement characters, one at the tail of
// the chunk and one at the head of the next, and the cell reaches AE as `华东区??第202号...`:
// silently wrong text, uploaded as a property value or an event name, with nothing in any count to
// show it happened. This fixture is built at run time rather than committed, because the only
// thing being fixtured is size.
const dir = mkdtempSync(join(tmpdir(), 'ae-cli-shared-strings-'));
const path = join(dir, 'many_chinese_strings.xlsx');

const ROW_COUNT = 3000;
const remarkFor = (index: number): string => `华东区域第${index}号客户备注说明文字，按季度复核一次`;

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('销售明细');
sheet.addRow(['user_id', '备注']);
for (let index = 0; index < ROW_COUNT; index += 1) {
  sheet.addRow([`u${index}`, remarkFor(index)]);
}
await workbook.xlsx.writeFile(path);

// The test is only meaningful if the shared-string table really is streamed in more than one
// chunk. Assert that instead of assuming it, so a future writer or zip library that emits one
// chunk turns this into a visible skip rather than a test that silently proves nothing.
const archive = await unzipper.Open.file(path);
const sharedStrings = archive.files.find((file) => file.path === 'xl/sharedStrings.xml');
assert.ok(sharedStrings, 'the workbook must store its cell text in a shared-string table');
let chunkCount = 0;
for await (const _chunk of sharedStrings.stream()) chunkCount += 1;
assert.ok(chunkCount > 1, `sharedStrings.xml must stream in multiple chunks (got ${chunkCount})`);

const input = await inspectLocalDataInput(path);
const rows: LocalDataRow[] = [];
await streamLocalDataRows(input, selectDataSet(input), (row) => { rows.push(row); });

assert.equal(rows.length, ROW_COUNT);
// Every string must arrive byte-for-byte as it was written. Checking each row rather than a
// sample matters because the corruption is positional: it hits only the handful of strings that
// happen to straddle a boundary, which is exactly what a sampled check would miss.
for (const [index, row] of rows.entries()) {
  assert.equal(row['备注'], remarkFor(index), `row ${index + 1} cell text must survive the stream`);
}
const corrupted = rows.filter((row) => typeof row['备注'] === 'string' && (row['备注'] as string).includes('�'));
assert.deepEqual(corrupted, [], 'no cell may contain a Unicode replacement character');

process.stdout.write('local data xlsx shared string tests: passed\n');
