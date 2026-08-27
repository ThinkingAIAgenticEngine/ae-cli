import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import XLSXMod from 'xlsx';
import { convertLocalData, convertRow } from '../src/commands/data-integration/conversion.js';
import {
  buildRowWithFlatten,
  flattenDelimitedRow,
  flattenLocalDataRow,
  getNestedValue,
} from '../src/commands/data-integration/flatten.js';
import { sha256File } from '../src/commands/data-integration/input.js';
import { validateMapping } from '../src/commands/data-integration/mapping.js';
import { CliValidationError } from '../src/core/errors.js';
import type { LocalDataMapping } from '../src/commands/data-integration/types.js';

const XLSX = (XLSXMod as any).default ?? XLSXMod;
const fixture = (name: string): string => fileURLToPath(new URL(`fixtures/local-data/${name}`, import.meta.url));
const root = mkdtempSync(join(tmpdir(), 'ae-local-data-mapping-extras-'));
const now = new Date('2026-08-11T00:00:00Z');

const baseMapping: LocalDataMapping = {
  version: 'ae-data-integration-mapping/v1',
  source: { sha256: 'a'.repeat(64), format: 'csv', data_set: '$' },
  mode: 'track',
  confidence: 'high',
  account_id_field: 'user',
  event_name_field: 'event',
  time: { field: 't', format: 'auto', source_timezone: 'Asia/Shanghai' },
  properties: [],
};

try {
  // Flatten primitives.
  assert.deepEqual(flattenLocalDataRow('scalar'), { value: 'scalar' });
  const nested = { a: 1, nested: { b: 2, c: { d: 3 } }, list: [1, 2] };
  assert.equal(getNestedValue(nested, 'nested.b'), 2);
  assert.equal(getNestedValue(nested, 'nested.c.d'), 3);
  assert.equal(getNestedValue(nested, 'missing'), undefined);
  const flat = flattenLocalDataRow(nested, { out: 'nested.b' });
  assert.equal(flat.a, '1');
  assert.equal(flat.list, '[1,2]');
  assert.equal(flat.out, '2');
  assert.equal(flat['nested.b'], undefined);
  assert.deepEqual(buildRowWithFlatten(nested, { out: 'nested.b' }), flat);

  // value_mapping for event_name and account_id (business-data keys map to AE names).
  const valueMapped: LocalDataMapping = {
    ...baseMapping,
    value_mapping: {
      event_name: { '登录': 'login' },
      account_id: { '张三': 'u_zhangsan' },
    },
  };
  const valueMappedRow = convertRow({ user: '张三', event: '登录', t: '2026-08-10 10:00:00' }, 1, valueMapped, now);
  assert(valueMappedRow.ok);
  assert.equal(valueMappedRow.record['#account_id'], 'u_zhangsan');
  assert.equal(valueMappedRow.record['#event_name'], 'login');

  // random_pool synthesizes an identity when the source field is absent.
  const pooled: LocalDataMapping = {
    ...baseMapping,
    account_id_field: undefined,
    random_pool: { account_ids: ['u-a', 'u-b', 'u-c'] },
  };
  const pooledRow = convertRow({ event: 'open', t: '2026-08-10 10:00:00' }, 2, pooled, now);
  assert(pooledRow.ok);
  assert.ok(['u-a', 'u-b', 'u-c'].includes(String(pooledRow.record['#account_id'])));

  // Fixed identity value: a placeholder applies to every row when no identity column exists,
  // and fills only the rows whose column is empty when a column is also configured.
  const fixedOnly: LocalDataMapping = {
    ...baseMapping,
    account_id_field: undefined,
    account_id_value: 'anonymous',
  };
  const fixedRow = convertRow({ event: 'open', t: '2026-08-10 10:00:00' }, 10, fixedOnly, now);
  assert(fixedRow.ok);
  assert.equal(fixedRow.record['#account_id'], 'anonymous');
  const fixedFallback: LocalDataMapping = {
    ...baseMapping,
    account_id_field: 'user',
    account_id_value: 'anonymous',
  };
  const fallbackFilled = convertRow({ event: 'open', t: '2026-08-10 10:00:00' }, 11, fixedFallback, now);
  assert(fallbackFilled.ok);
  assert.equal(fallbackFilled.record['#account_id'], 'anonymous', 'an empty column falls back to the fixed value');
  const fallbackColumn = convertRow({ user: 'u-7', event: 'open', t: '2026-08-10 10:00:00' }, 12, fixedFallback, now);
  assert(fallbackColumn.ok);
  assert.equal(fallbackColumn.record['#account_id'], 'u-7', 'a present column wins over the fixed value');

  // Validation: a fixed identity value satisfies the identity-required gate; nothing set does not.
  assert.doesNotThrow(() => validateMapping(fixedOnly));
  assert.doesNotThrow(() => validateMapping(pooled), 'a random_pool alone satisfies the identity gate');
  assert.doesNotThrow(() => validateMapping({ ...baseMapping, account_id_field: undefined, random_pool: { distinct_ids: ['d-a'] } }));
  assert.throws(() => validateMapping({ ...baseMapping, account_id_field: undefined }), CliValidationError);
  assert.throws(() => validateMapping({ ...baseMapping, account_id_field: undefined, random_pool: {} }), CliValidationError);
  assert.throws(() => validateMapping({ ...baseMapping, account_id_field: undefined, random_pool: { account_ids: [] } }), CliValidationError);
  assert.throws(() => validateMapping({ ...baseMapping, account_id_field: undefined, account_id_value: '' }), CliValidationError);
  assert.throws(() => validateMapping({ ...baseMapping, account_id_field: undefined, account_id_value: 'x'.repeat(129) }), CliValidationError);

  // exclude_columns skips the source column entirely.
  const excluded: LocalDataMapping = {
    ...baseMapping,
    properties: [
      { source: 'secret', target: 'secret', type: 'string' },
      { source: 'keep', target: 'keep', type: 'string' },
    ],
    exclude_columns: ['secret'],
  };
  const excludedRow = convertRow(
    { user: 'u-1', event: 'open', t: '2026-08-10 10:00:00', secret: 'hidden', keep: 'kept' },
    3, excluded, now,
  );
  assert(excludedRow.ok);
  assert.equal(excludedRow.record.properties.secret, undefined);
  assert.equal(excludedRow.record.properties.keep, 'kept');

  // headers on a headerless CSV: the first row is data.
  const headerless = fixture('02_no_header.csv');
  const headerlessSha = await sha256File(headerless);
  const headerlessMapping: LocalDataMapping = {
    version: 'ae-data-integration-mapping/v1',
    source: { sha256: headerlessSha, format: 'csv', data_set: '$' },
    mode: 'track',
    confidence: 'high',
    account_id_field: 'account_id',
    event_name_field: 'event',
    time: { field: 'updated_at', format: 'auto', source_timezone: 'Asia/Shanghai' },
    headers: ['account_id', 'event', 'amount', 'status', 'updated_at'],
    properties: [
      { source: 'amount', target: 'amount', type: 'number' },
      { source: 'status', target: 'status', type: 'string' },
    ],
  };
  const headerlessOut = join(root, 'headerless');
  const headerlessConverted = await convertLocalData({
    inputFile: headerless, mapping: headerlessMapping, outputDir: headerlessOut, now,
  });
  assert.equal(headerlessConverted.status, 'ready');
  assert.equal(headerlessConverted.manifest.output.valid_records, 5);
  const firstLine = JSON.parse(readFileSync(join(headerlessOut, 'valid.ue.jsonl'), 'utf8').trim().split('\n')[0]);
  assert.equal(firstLine['#account_id'], 'u001');
  assert.equal(firstLine['#event_name'], 'purchase');

  // flatten_rules end-to-end on nested NDJSON.
  const ndjson = fixture('19_ndjson_nested.ndjson');
  const ndjsonSha = await sha256File(ndjson);
  const ndjsonMapping: LocalDataMapping = {
    version: 'ae-data-integration-mapping/v1',
    source: { sha256: ndjsonSha, format: 'jsonl', data_set: '$' },
    mode: 'track',
    confidence: 'high',
    account_id_field: 'user_id',
    event_name_field: 'event_name',
    time: { field: 'create_time', format: 'auto', source_timezone: 'Asia/Shanghai' },
    flatten_rules: { user_name: 'user_info.name', user_level: 'user_info.level' },
    properties: [
      { source: 'user_name', target: 'user_name', type: 'string' },
      { source: 'user_level', target: 'user_level', type: 'string' },
    ],
  };
  const ndjsonOut = join(root, 'ndjson');
  const ndjsonConverted = await convertLocalData({
    inputFile: ndjson, mapping: ndjsonMapping, outputDir: ndjsonOut, now,
  });
  assert.equal(ndjsonConverted.status, 'ready');
  assert.equal(ndjsonConverted.manifest.output.valid_records, 3);
  const ndjsonLines = readFileSync(join(ndjsonOut, 'valid.ue.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(ndjsonLines[0].properties.user_name, '张三');
  assert.equal(ndjsonLines[0].properties.user_level, 'gold');

  // Deep-nested NDJSON flattened to object/list columns: container leaves arrive stringified,
  // so the mapping must declare type object/list with transform json to restore native structure.
  const deepNested = fixture('21_ndjson_deep_nested.ndjson');
  const deepSha = await sha256File(deepNested);
  const deepMapping: LocalDataMapping = {
    version: 'ae-data-integration-mapping/v1',
    source: { sha256: deepSha, format: 'jsonl', data_set: '$' },
    mode: 'track',
    confidence: 'high',
    account_id_field: 'user_id',
    event_name_field: 'event_name',
    time: { field: 'create_time', format: 'auto', source_timezone: 'Asia/Shanghai' },
    flatten_rules: {
      user_info_name: 'user_info.name',
      user_info_contact: 'user_info.contact',
      user_info_address: 'user_info.address',
      tags: 'tags',
    },
    properties: [
      { source: 'amount', target: 'amount', type: 'number' },
      { source: 'user_info_name', target: 'user_info_name', type: 'string' },
      { source: 'user_info_contact', target: 'user_info_contact', type: 'object', transform: 'json' },
      { source: 'user_info_address', target: 'user_info_address', type: 'object', transform: 'json' },
      { source: 'tags', target: 'tags', type: 'list', transform: 'json' },
    ],
  };
  const deepOut = join(root, 'deep-nested');
  const deepConverted = await convertLocalData({
    inputFile: deepNested, mapping: deepMapping, outputDir: deepOut, now,
  });
  assert.equal(deepConverted.status, 'ready', 'flattened object/list columns with transform json must convert cleanly');
  assert.equal(deepConverted.manifest.output.valid_records, 3);
  const deepLines = readFileSync(join(deepOut, 'valid.ue.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(deepLines[0].properties.tags, ['vip', 'premium']);
  assert.deepEqual(deepLines[0].properties.user_info_contact, { email: 'zhang@example.com', phone: '13800000001' });
  assert.deepEqual(deepLines[0].properties.user_info_address, { city: '上海', district: '浦东', geo: { lat: 31.23, lng: 121.47 } });

  // CSV/TSV nested-JSON flatten: flatten_rules paths are <column>.<cell-relative path>; the
  // source column is excluded so the whole object is not also mapped.
  assert.deepEqual(
    flattenDelimitedRow(
      { user_profile: '{"name":"alice","level":3,"tags":["vip"]}' },
      { profile_name: 'user_profile.name', profile_level: 'user_profile.level' },
    ),
    { user_profile: '{"name":"alice","level":3,"tags":["vip"]}', profile_name: 'alice', profile_level: '3' },
  );

  // Flatten miss counting: a rule that does not materialize for a row (missing path, non-JSON
  // cell, or a path without a <column>. prefix) is counted per out-column; the row itself is kept.
  const delimitedMisses: Record<string, number> = {};
  const delimitedMissed = flattenDelimitedRow(
    { profile: '{"name":"alice"}', broken: 'not-json', empty: null },
    { profile_missing: 'profile.age', broken_name: 'broken.name', no_prefix: 'missingdot' },
    delimitedMisses,
  );
  assert.equal(delimitedMissed.profile_missing, undefined, 'a missing path writes no out column');
  assert.equal(delimitedMissed.broken_name, undefined, 'a non-JSON cell writes no out column');
  assert.deepEqual(delimitedMisses, { profile_missing: 1, broken_name: 1, no_prefix: 1 });

  const ndjsonMisses: Record<string, number> = {};
  const ndjsonMissed = flattenLocalDataRow({ a: { b: 1 } }, { out: 'a.missing' }, ndjsonMisses);
  assert.equal(ndjsonMissed.out, '', 'a missing NDJSON path materializes an empty string');
  assert.deepEqual(ndjsonMisses, { out: 1 });
  const csvNestedSrc = join(root, 'csv-nested.csv');
  writeFileSync(csvNestedSrc,
    'user_id,event,time,profile\n'
    + 'u-1,open,2026-08-10 10:00:00,"{""name"":""alice"",""level"":3}"\n'
    + 'u-2,open,2026-08-10 10:00:00,"{""name"":""bob"",""level"":1}"\n');
  const csvNestedSha = await sha256File(csvNestedSrc);
  const csvNestedMapping: LocalDataMapping = {
    version: 'ae-data-integration-mapping/v1',
    source: { sha256: csvNestedSha, format: 'csv', data_set: '$' },
    mode: 'track',
    confidence: 'high',
    account_id_field: 'user_id',
    event_name_field: 'event',
    time: { field: 'time', format: 'auto', source_timezone: 'Asia/Shanghai' },
    flatten_rules: { profile_name: 'profile.name', profile_level: 'profile.level' },
    exclude_columns: ['profile'],
    properties: [
      { source: 'profile_name', target: 'profile_name', type: 'string' },
      { source: 'profile_level', target: 'profile_level', type: 'number' },
    ],
  };
  const csvNestedOut = join(root, 'csv-nested');
  const csvNestedConverted = await convertLocalData({
    inputFile: csvNestedSrc, mapping: csvNestedMapping, outputDir: csvNestedOut, now,
  });
  assert.equal(csvNestedConverted.status, 'ready');
  assert.equal(csvNestedConverted.manifest.output.valid_records, 2);
  const csvNestedLines = readFileSync(join(csvNestedOut, 'valid.ue.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(csvNestedLines[0].properties.profile_name, 'alice');
  assert.equal(csvNestedLines[0].properties.profile_level, 3);
  assert.equal(csvNestedLines[0].properties.profile, undefined, 'the source column is excluded');

  // Multi-level nested JSON in a CSV cell: deep paths flatten to leaves; the source column is excluded.
  const deepCsvSrc = fixture('24_csv_deep_nested.csv');
  const deepCsvSha = await sha256File(deepCsvSrc);
  const deepCsvMapping: LocalDataMapping = {
    version: 'ae-data-integration-mapping/v1',
    source: { sha256: deepCsvSha, format: 'csv', data_set: '$' },
    mode: 'track',
    confidence: 'high',
    account_id_field: 'user_id',
    event_name_field: 'event',
    time: { field: 'time', format: 'auto', source_timezone: 'Asia/Shanghai' },
    flatten_rules: {
      profile_name: 'profile.user_info.name',
      profile_city: 'profile.user_info.address.city',
      profile_lat: 'profile.user_info.address.geo.lat',
    },
    exclude_columns: ['profile'],
    properties: [
      { source: 'profile_name', target: 'profile_name', type: 'string' },
      { source: 'profile_city', target: 'profile_city', type: 'string' },
      { source: 'profile_lat', target: 'profile_lat', type: 'number' },
    ],
  };
  const deepCsvOut = join(root, 'csv-deep-nested');
  const deepCsvConverted = await convertLocalData({
    inputFile: deepCsvSrc, mapping: deepCsvMapping, outputDir: deepCsvOut, now,
  });
  assert.equal(deepCsvConverted.status, 'ready');
  assert.equal(deepCsvConverted.manifest.output.valid_records, 3);
  const deepCsvLines = readFileSync(join(deepCsvOut, 'valid.ue.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(deepCsvLines[0].properties.profile_name, 'alice');
  assert.equal(deepCsvLines[0].properties.profile_city, '上海');
  assert.equal(deepCsvLines[0].properties.profile_lat, 31.23);
  assert.equal(deepCsvLines[0].properties.profile, undefined, 'the source column is excluded');
  assert.equal(deepCsvLines[1].properties.profile_city, '北京');
  assert.equal(deepCsvLines[2].properties.profile_lat, 23.13);

  // XLSX nested-JSON flatten: same cell-relative rules as CSV, including deep paths. A cell
  // holding broken JSON skips the rule (CSV parity) instead of quarantining the row.
  const xlsxRows = [
    ['user_id', 'event', 'time', 'ext'],
    ['u-1', 'buy', '2026-08-10 10:00:00', '{"sku":{"id":"s1","type":"consumable"},"coupon":{"off":0.8}}'],
    ['u-2', 'buy', '2026-08-10 11:00:00', '{"sku":{"id":"s2","type":"durable"},"coupon":{"off":0.5}}'],
    ['u-3', 'buy', '2026-08-10 12:00:00', '{broken'],
  ];
  const xlsxNestedSrc = join(root, 'xlsx-nested.xlsx');
  const xlsxWorkbook = new ExcelJS.Workbook();
  xlsxWorkbook.addWorksheet('data').addRows(xlsxRows);
  await xlsxWorkbook.xlsx.writeFile(xlsxNestedSrc);
  const excelNestedMapping = (sha256: string, format: 'xls' | 'xlsx'): LocalDataMapping => ({
    version: 'ae-data-integration-mapping/v1',
    source: { sha256, format, data_set: 'sheet:data' },
    mode: 'track',
    confidence: 'high',
    account_id_field: 'user_id',
    event_name_field: 'event',
    time: { field: 'time', format: 'auto', source_timezone: 'Asia/Shanghai' },
    flatten_rules: { sku_type: 'ext.sku.type', coupon_off: 'ext.coupon.off' },
    exclude_columns: ['ext'],
    properties: [
      { source: 'sku_type', target: 'sku_type', type: 'string' },
      { source: 'coupon_off', target: 'coupon_off', type: 'number' },
    ],
  });
  const xlsxNestedOut = join(root, 'xlsx-nested');
  const xlsxNestedConverted = await convertLocalData({
    inputFile: xlsxNestedSrc,
    mapping: excelNestedMapping(await sha256File(xlsxNestedSrc), 'xlsx'),
    outputDir: xlsxNestedOut,
    now,
  });
  assert.equal(xlsxNestedConverted.status, 'ready');
  assert.equal(xlsxNestedConverted.manifest.output.valid_records, 3);
  const xlsxNestedLines = readFileSync(join(xlsxNestedOut, 'valid.ue.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(xlsxNestedLines[0].properties.sku_type, 'consumable');
  assert.equal(xlsxNestedLines[0].properties.coupon_off, 0.8);
  assert.equal(xlsxNestedLines[1].properties.sku_type, 'durable');
  assert.equal(xlsxNestedLines[1].properties.coupon_off, 0.5);
  assert.equal(xlsxNestedLines[0].properties.ext, undefined, 'the source column is excluded');
  assert.equal(xlsxNestedLines[2].properties.sku_type, undefined, 'a broken JSON cell skips the rule');

  // XLS nested-JSON flatten: identical behavior to XLSX on the same data.
  const xlsNestedSrc = join(root, 'xls-nested.xls');
  const xlsWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(xlsWorkbook, XLSX.utils.aoa_to_sheet(xlsxRows), 'data');
  XLSX.writeFile(xlsWorkbook, xlsNestedSrc, { bookType: 'xls' });
  const xlsNestedOut = join(root, 'xls-nested');
  const xlsNestedConverted = await convertLocalData({
    inputFile: xlsNestedSrc,
    mapping: excelNestedMapping(await sha256File(xlsNestedSrc), 'xls'),
    outputDir: xlsNestedOut,
    now,
  });
  assert.equal(xlsNestedConverted.status, 'ready');
  assert.equal(xlsNestedConverted.manifest.output.valid_records, 3);
  const xlsNestedLines = readFileSync(join(xlsNestedOut, 'valid.ue.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(xlsNestedLines[0].properties.sku_type, 'consumable');
  assert.equal(xlsNestedLines[0].properties.coupon_off, 0.8);
  assert.equal(xlsNestedLines[1].properties.sku_type, 'durable');
  assert.equal(xlsNestedLines[2].properties.sku_type, undefined, 'a broken JSON cell skips the rule');

  // --merge-sheets: flatten_rules apply to every worksheet, not just the first.
  const mergedSrc = join(root, 'xlsx-nested-merged.xlsx');
  const mergedWorkbook = new ExcelJS.Workbook();
  mergedWorkbook.addWorksheet('jan').addRows(xlsxRows.slice(0, 2));
  mergedWorkbook.addWorksheet('feb').addRows([xlsxRows[0], xlsxRows[2]]);
  await mergedWorkbook.xlsx.writeFile(mergedSrc);
  const mergedOut = join(root, 'xlsx-nested-merged');
  const mergedConverted = await convertLocalData({
    inputFile: mergedSrc,
    mapping: excelNestedMapping(await sha256File(mergedSrc), 'xlsx'),
    outputDir: mergedOut,
    mergeSheets: true,
    now,
  });
  assert.equal(mergedConverted.status, 'ready');
  assert.equal(mergedConverted.manifest.output.valid_records, 2);
  const mergedLines = readFileSync(join(mergedOut, 'valid.ue.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(mergedLines[0].properties.sku_type, 'consumable', 'sheet 1 rows are flattened');
  assert.equal(mergedLines[1].properties.sku_type, 'durable', 'sheet 2 rows are flattened too');

  const mergedXlsSrc = join(root, 'xls-nested-merged.xls');
  const mergedXlsBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(mergedXlsBook, XLSX.utils.aoa_to_sheet(xlsxRows.slice(0, 2)), 'jan');
  XLSX.utils.book_append_sheet(mergedXlsBook, XLSX.utils.aoa_to_sheet([xlsxRows[0], xlsxRows[2]]), 'feb');
  XLSX.writeFile(mergedXlsBook, mergedXlsSrc, { bookType: 'xls' });
  const mergedXlsOut = join(root, 'xls-nested-merged');
  const mergedXlsConverted = await convertLocalData({
    inputFile: mergedXlsSrc,
    mapping: excelNestedMapping(await sha256File(mergedXlsSrc), 'xls'),
    outputDir: mergedXlsOut,
    mergeSheets: true,
    now,
  });
  assert.equal(mergedXlsConverted.status, 'ready');
  const mergedXlsLines = readFileSync(join(mergedXlsOut, 'valid.ue.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(mergedXlsLines[0].properties.sku_type, 'consumable', 'XLS sheet 1 rows are flattened');
  assert.equal(mergedXlsLines[1].properties.sku_type, 'durable', 'XLS sheet 2 rows are flattened too');

  // Validation: flatten_rules are accepted for every format whose reader applies them.
  for (const format of ['csv', 'tsv', 'json', 'jsonl', 'xls', 'xlsx'] as const) {
    assert.doesNotThrow(
      () => validateMapping({ ...baseMapping, source: { ...baseMapping.source, format }, flatten_rules: { out: 'ext.sku.type' } }),
      `flatten_rules must validate for ${format}`,
    );
  }

  // Flatten misses flow into manifest.output.flatten_misses and never block the manifest.
  const missSrc = join(root, 'flatten-miss.csv');
  writeFileSync(missSrc,
    'user_id,event,time,profile\n'
    + 'u-1,open,2026-08-10 10:00:00,"{""name"":""alice""}"\n'
    + 'u-2,open,2026-08-10 10:00:00,"{""age"":20}"\n');
  const missSha = await sha256File(missSrc);
  const missMapping: LocalDataMapping = {
    version: 'ae-data-integration-mapping/v1',
    source: { sha256: missSha, format: 'csv', data_set: '$' },
    mode: 'track',
    confidence: 'high',
    account_id_field: 'user_id',
    event_name_field: 'event',
    time: { field: 'time', format: 'auto', source_timezone: 'Asia/Shanghai' },
    flatten_rules: { profile_name: 'profile.name' },
    exclude_columns: ['profile'],
    properties: [{ source: 'profile_name', target: 'profile_name', type: 'string' }],
  };
  const missConverted = await convertLocalData({ inputFile: missSrc, mapping: missMapping, outputDir: join(root, 'flatten-miss'), now });
  assert.equal(missConverted.status, 'ready', 'flatten misses do not block the manifest');
  assert.equal(missConverted.manifest.output.valid_records, 2);
  assert.deepEqual(missConverted.manifest.output.flatten_misses, { profile_name: 1 }, 'the second row lacks profile.name');

  // A null nested value inside an object property is "missing", not a limit violation: it must
  // not quarantine the whole row (23_ndjson_type_conflict row 4 regression).
  const nullNested: LocalDataMapping = {
    ...baseMapping,
    properties: [{ source: 'profile', target: 'profile', type: 'object', transform: 'json' }],
  };
  const nullNestedRow = convertRow(
    { user: 'u-1', event: 'open', t: '2026-08-10 10:00:00', profile: '{"age":26,"balance":null}' },
    1, nullNested, now,
  );
  assert(nullNestedRow.ok, 'a null nested value must not fail the row');
  if (nullNestedRow.ok) assert.deepEqual(nullNestedRow.record.properties.profile, { age: 26, balance: null });

  // missing_time: 'now' fills a missing #time for user-profile rows only (explicit decision).
  const userSetMapping: LocalDataMapping = {
    ...baseMapping,
    mode: 'user_set',
    account_id_field: 'user',
    event_name_field: undefined,
    time: { field: 't', format: 'auto', source_timezone: 'Asia/Shanghai' },
    missing_time: 'now',
  };
  const filled = convertRow({ user: 'u-1' }, 1, userSetMapping, now);
  assert(filled.ok);
  assert.equal(filled.record['#time'], '2026-08-11 08:00:00.000', 'filled #time uses the source timezone');
  const trackNoFill: LocalDataMapping = { ...baseMapping, missing_time: 'now' };
  const trackMissing = convertRow({ user: 'u-1', event: 'open' }, 2, trackNoFill, now);
  assert.equal(trackMissing.ok, false, 'track rows must never auto-fill #time');
  if (!trackMissing.ok) assert(trackMissing.errors.some((error) => error.code === 'INVALID_TIME'));
  const userSetNoFill: LocalDataMapping = { ...userSetMapping, missing_time: undefined };
  const unfilled = convertRow({ user: 'u-1' }, 3, userSetNoFill, now);
  assert.equal(unfilled.ok, false, 'without missing_time, a user_set row with no time fails');
  if (!unfilled.ok) assert(unfilled.errors.some((error) => error.code === 'INVALID_TIME'));

  // ip_field/uuid_field map source columns to the optional #ip/#uuid system fields.
  const sysMapping: LocalDataMapping = {
    ...baseMapping,
    ip_field: 'client_ip',
    uuid_field: 'request_id',
  };
  const sysRow = convertRow(
    { user: 'u-1', event: 'open', t: '2026-08-10 10:00:00', client_ip: '1.2.3.4', request_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8' },
    4, sysMapping, now,
  );
  assert(sysRow.ok);
  assert.equal(sysRow.record['#ip'], '1.2.3.4');
  assert.equal(sysRow.record['#uuid'], '6ba7b810-9dad-11d1-80b4-00c04fd430c8');
  const sysNoIp = convertRow({ user: 'u-1', event: 'open', t: '2026-08-10 10:00:00' }, 5, sysMapping, now);
  assert(sysNoIp.ok);
  assert.equal(sysNoIp.record['#ip'], undefined);
  assert.equal(sysNoIp.record['#uuid'], undefined);

  // Invalid #uuid/#ip values skip only that field (the row is kept); a private/LAN IP is
  // kept but flagged so the report can tell the user AE cannot geolocate it.
  const badUuid = convertRow(
    { user: 'u-1', event: 'open', t: '2026-08-10 10:00:00', client_ip: '1.2.3.4', request_id: 'abc-123' },
    6, sysMapping, now,
  );
  assert(badUuid.ok, 'an invalid #uuid skips the field, not the row');
  assert.equal(badUuid.record['#uuid'], undefined);
  assert.equal(badUuid.record['#ip'], '1.2.3.4');
  assert.deepEqual(badUuid.skips, [{ code: 'INVALID_UUID', field: 'request_id' }]);

  const badIp = convertRow(
    { user: 'u-1', event: 'open', t: '2026-08-10 10:00:00', client_ip: 'not-an-ip' },
    7, sysMapping, now,
  );
  assert(badIp.ok, 'an invalid #ip skips the field, not the row');
  assert.equal(badIp.record['#ip'], undefined);
  assert.deepEqual(badIp.skips, [{ code: 'INVALID_IP', field: 'client_ip' }]);

  const lanIp = convertRow(
    { user: 'u-1', event: 'open', t: '2026-08-10 10:00:00', client_ip: '192.168.1.10' },
    8, sysMapping, now,
  );
  assert(lanIp.ok);
  assert.equal(lanIp.record['#ip'], '192.168.1.10', 'a private IP is kept');
  assert.equal(lanIp.lanIp, true, 'a private IP is flagged for the report');

  // #ip and #zone_offset are event-data-only: a user_set row never carries them, but keeps #uuid.
  const userSetSys: LocalDataMapping = {
    ...baseMapping,
    mode: 'user_set',
    account_id_field: 'user',
    event_name_field: undefined,
    ip_field: 'client_ip',
    uuid_field: 'request_id',
    zone_offset_value: 8,
  };
  const userSetSysRow = convertRow(
    { user: 'u-1', t: '2026-08-10 10:00:00', client_ip: '1.2.3.4', request_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8' },
    9, userSetSys, now,
  );
  assert(userSetSysRow.ok);
  assert.equal(userSetSysRow.record['#ip'], undefined, 'user data has no #ip');
  assert.equal(userSetSysRow.record.properties['#zone_offset'], undefined, 'user data has no #zone_offset');
  assert.equal(userSetSysRow.record['#uuid'], '6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'user data keeps #uuid');

  // Field skips are non-blocking and aggregate into manifest.output.skipped_fields /
  // lan_ip_records so the agent reports them to the user at the end.
  const skipSrc = join(root, 'skip.csv');
  writeFileSync(skipSrc,
    'account_id,event,client_ip,request_id,time\n'
    + 'u-1,open,1.2.3.4,6ba7b810-9dad-11d1-80b4-00c04fd430c8,2026-08-10 10:00:00\n'
    + 'u-2,open,bad-ip,6ba7b810-9dad-11d1-80b4-00c04fd430c8,2026-08-10 10:00:00\n'
    + 'u-3,open,10.0.0.1,not-a-uuid,2026-08-10 10:00:00\n');
  const skipSha = await sha256File(skipSrc);
  const skipMapping: LocalDataMapping = {
    version: 'ae-data-integration-mapping/v1',
    source: { sha256: skipSha, format: 'csv', data_set: '$' },
    mode: 'track',
    confidence: 'high',
    account_id_field: 'account_id',
    event_name_field: 'event',
    ip_field: 'client_ip',
    uuid_field: 'request_id',
    time: { field: 'time', format: 'auto', source_timezone: 'Asia/Shanghai' },
    properties: [],
  };
  const skipConverted = await convertLocalData({ inputFile: skipSrc, mapping: skipMapping, outputDir: join(root, 'skip'), now });
  assert.equal(skipConverted.status, 'ready', 'field skips do not block the manifest');
  assert.equal(skipConverted.manifest.output.valid_records, 3);
  assert.deepEqual(skipConverted.manifest.output.skipped_fields, { INVALID_IP: 1, INVALID_UUID: 1 });
  assert.equal(skipConverted.manifest.output.lan_ip_records, 1);

  // zone_offset: option 1 is a fixed integer (or an IANA name resolved to its offset) and
  // option 2 reads the offset per row from a source column; both emit #zone_offset under properties.
  const zoneFixed: LocalDataMapping = { ...baseMapping, zone_offset_value: 8 };
  const zoneFixedRow = convertRow({ user: 'u-1', event: 'open', t: '2026-08-10 10:00:00' }, 6, zoneFixed, now);
  assert(zoneFixedRow.ok);
  assert.equal(zoneFixedRow.record.properties['#zone_offset'], 8);

  const zoneIana: LocalDataMapping = { ...baseMapping, zone_offset_value: 'Asia/Shanghai' };
  const zoneIanaRow = convertRow({ user: 'u-1', event: 'open', t: '2026-08-10 10:00:00' }, 7, zoneIana, now);
  assert(zoneIanaRow.ok);
  assert.equal(zoneIanaRow.record.properties['#zone_offset'], 8, 'Asia/Shanghai resolves to UTC+8');

  const zoneDst: LocalDataMapping = { ...baseMapping, zone_offset_value: 'America/New_York' };
  const zoneDstRow = convertRow({ user: 'u-1', event: 'open', t: '2026-08-10 10:00:00' }, 8, zoneDst, now);
  assert(zoneDstRow.ok);
  assert.equal(zoneDstRow.record.properties['#zone_offset'], -4, 'America/New_York in August is EDT (-4)');

  const zoneField: LocalDataMapping = { ...baseMapping, zone_offset_field: 'offset' };
  const zoneFieldRow = convertRow({ user: 'u-1', event: 'open', t: '2026-08-10 10:00:00', offset: '9' }, 9, zoneField, now);
  assert(zoneFieldRow.ok);
  assert.equal(zoneFieldRow.record.properties['#zone_offset'], 9);
  const zoneFieldMissing = convertRow({ user: 'u-1', event: 'open', t: '2026-08-10 10:00:00' }, 10, zoneField, now);
  assert.equal(zoneFieldMissing.ok, false, 'a missing offset quarantines the row');
  if (!zoneFieldMissing.ok) assert(zoneFieldMissing.errors.some((error) => error.code === 'INVALID_ZONE_OFFSET'));
  const zoneFieldBad = convertRow({ user: 'u-1', event: 'open', t: '2026-08-10 10:00:00', offset: 'abc' }, 11, zoneField, now);
  assert.equal(zoneFieldBad.ok, false, 'a non-integer offset quarantines the row');
  if (!zoneFieldBad.ok) assert(zoneFieldBad.errors.some((error) => error.code === 'INVALID_ZONE_OFFSET'));

  // Validation: the two options are mutually exclusive; numbers must be integers in [-12,14];
  // strings must be IANA names; the field must be a non-empty column name.
  assert.throws(() => validateMapping({ ...baseMapping, zone_offset_value: 8, zone_offset_field: 'offset' }), CliValidationError);
  assert.throws(() => validateMapping({ ...baseMapping, zone_offset_value: 15 }), CliValidationError);
  assert.throws(() => validateMapping({ ...baseMapping, zone_offset_value: 7.5 }), CliValidationError);
  assert.throws(() => validateMapping({ ...baseMapping, zone_offset_value: 'Not/AZone' }), CliValidationError);
  assert.throws(() => validateMapping({ ...baseMapping, zone_offset_field: ' ' }), CliValidationError);
  assert.doesNotThrow(() => validateMapping({ ...baseMapping, zone_offset_value: -12 }));
  assert.doesNotThrow(() => validateMapping({ ...baseMapping, zone_offset_value: 'Asia/Shanghai' }));

  // Salvage loop: --salvage-from re-processes only previously invalid rows, anchored to the
  // original source by row_number, and is iterable (each round's invalid rows feed the next).
  const salvageSrc = join(root, 'salvage.csv');
  writeFileSync(salvageSrc,
    'account_id,event,amount,quantity,time\n'
    + 'u-1,open,10,2,2026-08-10 10:00:00\n'
    + 'u-2,open,not-a-number,3,2026-08-10 10:00:00\n'
    + 'u-3,open,20,many,2026-08-10 10:00:00\n');
  const salvageSha = await sha256File(salvageSrc);
  const salvageBase = (overrides: Partial<LocalDataMapping>): LocalDataMapping => ({
    version: 'ae-data-integration-mapping/v1',
    source: { sha256: salvageSha, format: 'csv', data_set: '$' },
    mode: 'track',
    confidence: 'high',
    account_id_field: 'account_id',
    event_name_field: 'event',
    time: { field: 'time', format: 'auto', source_timezone: 'Asia/Shanghai' },
    properties: [
      { source: 'amount', target: 'amount', type: 'number' },
      { source: 'quantity', target: 'quantity', type: 'number' },
    ],
    ...overrides,
  });
  const round1 = await convertLocalData({ inputFile: salvageSrc, mapping: salvageBase({}), outputDir: join(root, 'salvage-1'), now });
  assert.equal(round1.status, 'blocked');
  assert.equal(round1.manifest.output.valid_records, 1);
  assert.equal(round1.manifest.output.invalid_records, 2);
  const round1Invalid = readFileSync(join(root, 'salvage-1', 'invalid.rows.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(round1Invalid.map((entry) => entry.row_number).sort(), [2, 3]);

  // Fix 1: amount becomes string, quantity still fails for u-3.
  const round2 = await convertLocalData({
    inputFile: salvageSrc,
    mapping: salvageBase({ properties: [
      { source: 'amount', target: 'amount', type: 'string' },
      { source: 'quantity', target: 'quantity', type: 'number' },
    ] }),
    outputDir: join(root, 'salvage-2'),
    salvageFrom: join(root, 'salvage-1', 'invalid.rows.jsonl'),
    now,
  });
  assert.equal(round2.status, 'blocked');
  assert.equal(round2.manifest.output.valid_records, 1, 'round 2 fixes only u-2');
  assert.equal(round2.manifest.output.invalid_records, 1);
  assert.equal(round2.manifest.salvage_from, 'invalid.rows.jsonl');
  const round2Lines = readFileSync(join(root, 'salvage-2', 'valid.ue.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(round2Lines.length, 1);
  assert.equal(round2Lines[0]['#account_id'], 'u-2', 'round 2 must emit only the newly fixed row');
  const round2Invalid = readFileSync(join(root, 'salvage-2', 'invalid.rows.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(round2Invalid.map((entry) => entry.row_number), [3]);

  // Fix 2: quantity becomes string; the loop converges to zero invalid rows.
  const round3 = await convertLocalData({
    inputFile: salvageSrc,
    mapping: salvageBase({ properties: [
      { source: 'amount', target: 'amount', type: 'string' },
      { source: 'quantity', target: 'quantity', type: 'string' },
    ] }),
    outputDir: join(root, 'salvage-3'),
    salvageFrom: join(root, 'salvage-2', 'invalid.rows.jsonl'),
    now,
  });
  assert.equal(round3.status, 'ready');
  assert.equal(round3.manifest.output.valid_records, 1);
  assert.equal(round3.manifest.output.invalid_records, 0);
  const round3Lines = readFileSync(join(root, 'salvage-3', 'valid.ue.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(round3Lines.length, 1);
  assert.equal(round3Lines[0]['#account_id'], 'u-3', 'round 3 must emit only the remaining fixed row');

  // A salvage file that matches no rows of the source is a hard error.
  const otherSrc = join(root, 'salvage-other.csv');
  writeFileSync(otherSrc, 'account_id,event,amount,quantity,time\nu-9,open,1,1,2026-08-10 10:00:00\n');
  const otherSha = await sha256File(otherSrc);
  await assert.rejects(
    convertLocalData({
      inputFile: otherSrc,
      mapping: salvageBase({ source: { sha256: otherSha, format: 'csv', data_set: '$' } }),
      outputDir: join(root, 'salvage-other-out'),
      salvageFrom: join(root, 'salvage-1', 'invalid.rows.jsonl'),
      now,
    }),
    (error: unknown) => error instanceof CliValidationError && error.code === 'LOCAL_DATA_SALVAGE_NO_MATCH',
  );

  process.stdout.write('local data mapping extras tests: passed\n');
} finally {
  rmSync(root, { recursive: true, force: true });
}
