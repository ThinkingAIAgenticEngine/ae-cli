#!/usr/bin/env node
// Deterministic generator for the binary fixtures under tests/fixtures/local-data/.
//
// Text fixtures are hand-written and committed directly; XLSX fixtures cannot be, so they are
// generated here and committed alongside this script. Tests only read the committed files — they
// never run this generator, so a fixture stays a fixed regression anchor.
//
// Usage: node scripts/gen-local-data-fixtures.mjs
import archiver from 'archiver';
import ExcelJS from 'exceljs';
import { createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { SaxesParser } from 'saxes';
import unzipper from 'unzipper';

const outputDir = join(process.cwd(), 'tests/fixtures/local-data');

// A fixed creation date keeps the ZIP payload stable across runs.
const CREATED = new Date(Date.UTC(2026, 0, 1));

function newWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.created = CREATED;
  workbook.modified = CREATED;
  return workbook;
}

/**
 * Date-formatted cells across the shapes that reach the streaming reader differently: a date-only
 * column whose Chinese name misses the time-name list, a datetime column whose name hits it, an
 * elapsed-duration column that must stay a number, and a plain number column as the control.
 */
async function writeDateFormats() {
  const workbook = newWorkbook();
  const sheet = workbook.addWorksheet('events');
  sheet.columns = [
    { header: '用户ID', key: 'user', width: 12 },
    { header: '注册日期', key: 'signup', width: 14 },
    { header: 'event_time', key: 'eventTime', width: 22 },
    { header: '耗时', key: 'elapsed', width: 10 },
    { header: 'amount', key: 'amount', width: 10 },
  ];
  const rows = [
    { user: 'u001', signup: Date.UTC(2026, 2, 4), eventTime: Date.UTC(2026, 2, 4, 5, 6, 7), elapsed: 0.5, amount: 12.5 },
    { user: 'u002', signup: Date.UTC(2026, 2, 5), eventTime: Date.UTC(2026, 2, 5, 23, 59, 59), elapsed: 1.25, amount: 99 },
    { user: 'u003', signup: Date.UTC(2025, 11, 31), eventTime: Date.UTC(2025, 11, 31, 0, 0, 0), elapsed: 0.041666666666666664, amount: 0 },
  ];
  for (const row of rows) {
    const added = sheet.addRow({
      user: row.user,
      // ExcelJS' serial conversion is UTC-based on both ends (`utils.dateToExcel` uses getTime),
      // so a Date built from Date.UTC stores exactly the wall clock the reader gives back.
      signup: new Date(row.signup),
      eventTime: new Date(row.eventTime),
      elapsed: row.elapsed,
      amount: row.amount,
    });
    added.getCell('signup').numFmt = 'yyyy-mm-dd';
    added.getCell('eventTime').numFmt = 'yyyy-mm-dd hh:mm:ss';
    added.getCell('elapsed').numFmt = '[h]:mm:ss';
  }
  await workbook.xlsx.writeFile(join(outputDir, '26_xlsx_date_formats.xlsx'));
}

/** The same dates stored under the 1904 epoch, which shifts every serial by 1462 days. */
async function writeDate1904() {
  const workbook = newWorkbook();
  workbook.properties.date1904 = true;
  const sheet = workbook.addWorksheet('events');
  sheet.columns = [
    { header: '用户ID', key: 'user', width: 12 },
    { header: '注册日期', key: 'signup', width: 14 },
  ];
  for (const [user, utc] of [
    ['u001', Date.UTC(2026, 2, 4)],
    ['u002', Date.UTC(2026, 2, 5)],
  ]) {
    const added = sheet.addRow({ user, signup: new Date(utc) });
    added.getCell('signup').numFmt = 'yyyy-mm-dd';
  }
  await workbook.xlsx.writeFile(join(outputDir, '27_xlsx_date1904.xlsx'));
}

/**
 * A hidden worksheet next to two mergeable visible ones. The hidden sheet carries different
 * headers and a different row count, so leaking it would be visible three ways at once: an extra
 * candidate, a `different` header consistency, and inflated `--merge-sheets` rows.
 */
async function writeHiddenSheet() {
  const workbook = newWorkbook();
  const visible = [
    ['1月', [['A-1001', 12.5], ['A-1002', 99]]],
    ['2月', [['A-2001', 7], ['A-2002', 31.5]]],
  ];
  for (const [name, rows] of visible) {
    const sheet = workbook.addWorksheet(name);
    sheet.addRow(['order_id', 'amount']);
    for (const row of rows) sheet.addRow(row);
  }
  const scratch = workbook.addWorksheet('临时草稿', { state: 'hidden' });
  scratch.addRow(['tmp_a', 'tmp_b']);
  for (const row of [['x', 1], ['y', 2], ['z', 3]]) scratch.addRow(row);
  await workbook.xlsx.writeFile(join(outputDir, '28_xlsx_hidden_sheet.xlsx'));
}

/**
 * A workbook whose every worksheet is hidden. Excel's own UI refuses to hide the last visible
 * sheet, but generated exports do, and excluding hidden sheets makes the candidate list empty —
 * which must be reported as "everything here is hidden", not as a file with no readable data.
 */
async function writeAllHidden() {
  const workbook = newWorkbook();
  const sheet = workbook.addWorksheet('隐藏明细', { state: 'hidden' });
  sheet.addRow(['order_id', 'amount']);
  for (const row of [['A-3001', 5], ['A-3002', 8]]) sheet.addRow(row);
  await workbook.xlsx.writeFile(join(outputDir, '29_xlsx_all_hidden.xlsx'));
}

/**
 * Formula cells across every shape the streaming reader can hand back, because they are read
 * through one code path and only one of them is a plain success:
 *   - `amount`   a formula whose cached result is a non-zero number (the shape that already worked)
 *   - `discount` a formula whose cached result is `0` — ExcelJS' `cell.value` drops falsy fields,
 *                so this real value is invisible unless the reader goes through `cell.model`
 *   - `remark`   one cached `""` and one cached string, so an empty result must not erase the row
 *   - `total`    a formula the exporting tool never computed: no cached result to upload
 *   - `rate`     a cached error result, then a bare error cell
 */
async function writeFormulaCells() {
  const workbook = newWorkbook();
  const sheet = workbook.addWorksheet('orders');
  sheet.addRow(['user_id', 'event_time', 'qty', 'unit_price', 'amount', 'discount', 'remark', 'total', 'rate']);
  const rows = [
    {
      values: ['u001', '2026-03-04 05:06:07', 2, 10.5],
      amount: { formula: 'C2*D2', result: 21 },
      discount: { formula: 'E2*0', result: 0 },
      remark: { formula: 'IF(F2>0,"discounted","")', result: '' },
      total: { formula: 'E2-F2' },
      rate: { formula: 'F2/0', result: { error: '#DIV/0!' } },
    },
    {
      values: ['u002', '2026-03-05 08:00:00', 3, 4],
      amount: { formula: 'C3*D3', result: 12 },
      discount: { formula: 'E3*0.5', result: 6 },
      remark: { formula: 'IF(F3>0,"discounted","")', result: '已核对' },
      total: { formula: 'E3-F3' },
      rate: { error: '#N/A' },
    },
  ];
  for (const row of rows) {
    const added = sheet.addRow(row.values);
    added.getCell(5).value = row.amount;
    added.getCell(6).value = row.discount;
    added.getCell(7).value = row.remark;
    added.getCell(8).value = row.total;
    added.getCell(9).value = row.rate;
  }
  await workbook.xlsx.writeFile(join(outputDir, '30_xlsx_formula_cells.xlsx'));
}

/**
 * An exported report with a title row above the real header row: A1 holds a caption, the rest of
 * row 1 is blank, and the header row is row 2. Read as-is, the caption becomes the only header and
 * the real header row becomes the first data row — so every column name is lost and the row count
 * is one too high. Row 3 is a subtitle-style single value to prove the scan handles more than one.
 */
async function writeTitleRow() {
  const workbook = newWorkbook();
  const sheet = workbook.addWorksheet('明细');
  sheet.addRow(['2026年3月销售明细']);
  sheet.addRow(['统计口径：下单时间']);
  sheet.addRow(['user_id', 'event_time', 'amount']);
  for (const row of [['u001', '2026-03-04 05:06:07', 21], ['u002', '2026-03-05 08:00:00', 12]]) {
    sheet.addRow(row);
  }
  await workbook.xlsx.writeFile(join(outputDir, '31_xlsx_title_row.xlsx'));
}

/**
 * The layout a human maintains by hand: a merged banner across row 1, then a header row, then a
 * `区域` column merged down each region's block of rows. Excel stores such a block as one anchored
 * value plus empty cells, so a reader sees the region on its first row only — the rows below it
 * arrive with `区域` missing however full the sheet looks on screen. Row 5 is hidden inside a
 * merged block and column E is hidden, so the same fixture covers the two structure facts the row
 * stream cannot see on its own.
 */
async function writeMergedCells() {
  const workbook = newWorkbook();
  const sheet = workbook.addWorksheet('销售明细');
  sheet.addRow(['2026年3月销售明细']);
  sheet.addRow(['区域', 'user_id', 'event_time', 'amount', '备注']);
  const rows = [
    ['华东', 'u001', '2026-03-04 05:06:07', 21, null],
    [null, 'u002', '2026-03-05 08:00:00', 12, null],
    [null, 'u003', '2026-03-06 09:00:00', 33, null],
    ['华北', 'u004', '2026-03-07 10:00:00', 44, null],
    [null, 'u005', '2026-03-08 11:00:00', 55, '内部备注'],
  ];
  for (const row of rows) sheet.addRow(row);
  sheet.mergeCells('A1:E1');
  sheet.mergeCells('A3:A5');
  sheet.mergeCells('A6:A7');
  sheet.getRow(5).hidden = true;
  sheet.getColumn(5).hidden = true;
  await workbook.xlsx.writeFile(join(outputDir, '32_xlsx_merged_cells.xlsx'));
}

const PREFIXED_PARTS = new Set(['xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/sharedStrings.xml']);

const escapeXmlText = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeXmlAttr = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * Rewrite an OOXML part's default namespace as the `x:` prefix: `<sheet>` -> `<x:sheet>`,
 * `xmlns="…"` -> `xmlns:x="…"`. Attribute values, the `xmlns:r` / `xml:space` declarations and
 * every other token are left verbatim. The part is parsed and rebuilt element by element, so the
 * rewrite is exact rather than a string search that could hit an attribute value.
 */
function namespacePrefixXml(xml) {
  const parser = new SaxesParser();
  let out = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  parser.on('opentag', (tag) => {
    out += `<x:${tag.name}`;
    for (const [name, value] of Object.entries(tag.attributes)) {
      out += ` ${name === 'xmlns' ? 'xmlns:x' : name}="${escapeXmlAttr(String(value))}"`;
    }
    // Never emit `/>`: saxes reports a self-closing tag as an opentag *and* a closetag, so the
    // `</x:name>` below closes every element and a self-closing one would otherwise get two closes.
    out += '>';
  });
  parser.on('text', (text) => {
    out += escapeXmlText(text);
  });
  parser.on('closetag', (tag) => {
    out += `</x:${tag.name}>`;
  });
  parser.write(xml).close();
  return out;
}

/**
 * The same two-sheet workbook as any other fixture, but its metadata parts carry the default
 * namespace as the `x:` prefix — `<x:sheet>` in workbook.xml, `<x:si>` in sharedStrings.xml — the
 * way some cleaning/export tools emit them. The worksheets stay unprefixed, matching the real-world
 * failure where the sheet list is prefixed but the row data is not (ExcelJS streams worksheet rows
 * by exact unprefixed names). ae-cli must read this workbook identically to an unprefixed one:
 * sheet recognition, shared-string text and merge detection all match by local name.
 */
async function writeNamespacePrefix() {
  const workbook = newWorkbook();
  const events = workbook.addWorksheet('events');
  events.addRow(['user_id', 'event_time', 'amount', 'remark']);
  for (const row of [
    ['u001', '2026-03-04 05:06:07', 21, '华东订单'],
    ['u002', '2026-03-05 08:00:00', 12, '华北订单'],
  ]) events.addRow(row);
  events.mergeCells('D2:D3');

  const profiles = workbook.addWorksheet('profiles');
  profiles.addRow(['user_id', 'nickname']);
  for (const row of [['u001', '张三'], ['u002', '李四']]) profiles.addRow(row);

  // Build unprefixed, then repackage with the metadata parts rewritten.
  const archive = await unzipper.Open.buffer(await workbook.xlsx.writeBuffer());
  const entries = await Promise.all(archive.files
    .filter((entry) => !entry.path.endsWith('/'))
    .map(async (entry) => {
      const content = await entry.buffer();
      const text = PREFIXED_PARTS.has(entry.path)
        ? Buffer.from(namespacePrefixXml(content.toString('utf8')))
        : content;
      return { path: entry.path, content: text };
    }));

  const output = createWriteStream(join(outputDir, '33_xlsx_namespace_prefix.xlsx'));
  const pack = archiver('zip', { zlib: { level: 9 } });
  const done = new Promise((resolve, reject) => {
    output.on('close', resolve);
    output.on('error', reject);
  });
  pack.pipe(output);
  for (const entry of entries) pack.append(entry.content, { name: entry.path });
  await pack.finalize();
  await done;
}

await writeDateFormats();
await writeDate1904();
await writeHiddenSheet();
await writeAllHidden();
await writeFormulaCells();
await writeTitleRow();
await writeMergedCells();
await writeNamespacePrefix();
process.stdout.write('local-data xlsx fixtures written\n');
