import assert from 'node:assert/strict';
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  truncateSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import XLSXMod from 'xlsx';
import { CliValidationError } from '../src/core/errors.js';
import {
  inspectLocalDataInput,
  readExcelSheetHeaders,
  selectDataSet,
  sha256File,
} from '../src/commands/data-integration/local-data/input.js';
import { profileLocalData } from '../src/commands/data-integration/local-data/profile.js';
import { detectHeaderPresence } from '../src/commands/data-integration/local-data/inspect.js';
import { buildNestedTree } from '../src/commands/data-integration/local-data/flatten.js';
import { convertLocalData, convertRow, stripQuotes } from '../src/commands/data-integration/local-data/conversion.js';
import type { LocalDataMapping } from '../src/commands/data-integration/local-data/types.js';

const root = mkdtempSync(join(tmpdir(), 'ae-local-data-convert-'));
const XLSX = (XLSXMod as any).default ?? XLSXMod;
const fixture = (name: string): string => fileURLToPath(new URL(`fixtures/local-data/${name}`, import.meta.url));

try {
  const csvPath = join(root, 'events.csv');
  writeFileSync(
    csvPath,
    '\uFEFFaccount_id,event_time,event_name,note,amount,active\n'
      + 'u-1,2026-08-10 10:00:00,level_start,"quoted\nline",10,true\n'
      + 'u-1,2026-08-10 11:00:00,level_finish,done,20,false\n',
  );
  const csvInput = await inspectLocalDataInput(csvPath);
  const csvProfile = await profileLocalData(csvInput, selectDataSet(csvInput), 'Asia/Shanghai');
  assert.equal(csvProfile.row_count, 2, 'quoted CSV newline must stay inside one record');
  assert.equal(csvProfile.recommended_mapping.mode, 'track');
  assert.equal(csvProfile.recommended_mapping.confidence, 'high');
  assert.equal(csvProfile.columns.find((column) => column.name === 'amount')?.inferred_type, 'number');
  assert.equal(csvProfile.columns.find((column) => column.name === 'active')?.inferred_type, 'boolean');
  assert.doesNotMatch(JSON.stringify(csvProfile), /quoted\nline/, 'profile must not expose raw values');

  const jsonArrayPath = join(root, 'events.json');
  writeFileSync(jsonArrayPath, JSON.stringify([
    { distinct_id: 'd-1', event_time: '2026-08-10T01:00:00Z', action: 'open' },
  ]));
  const jsonArrayInput = await inspectLocalDataInput(jsonArrayPath);
  assert.deepEqual(jsonArrayInput.dataSets.map((item) => item.id), ['$']);
  assert.equal((await profileLocalData(jsonArrayInput, selectDataSet(jsonArrayInput))).row_count, 1);

  const jsonObjectPath = join(root, 'one-object.json');
  writeFileSync(jsonObjectPath, JSON.stringify({ account_id: 'u-1', time: '2026-08-10', event: 'open' }));
  const jsonObjectInput = await inspectLocalDataInput(jsonObjectPath);
  assert.equal((await profileLocalData(jsonObjectInput, selectDataSet(jsonObjectInput))).row_count, 1);

  const invalidJsonPath = join(root, 'invalid.json');
  writeFileSync(invalidJsonPath, '{"events": [');
  await assert.rejects(
    inspectLocalDataInput(invalidJsonPath),
    (error: unknown) => error instanceof CliValidationError && error.code === 'LOCAL_DATA_INPUT_INVALID',
  );

  const jsonPathsFile = join(root, 'multi.json');
  writeFileSync(jsonPathsFile, JSON.stringify({
    payload: { events: [{ account_id: 'u-1', time: '2026-08-10', event: 'open' }] },
    users: [{ account_id: 'u-1', time: '2026-08-10', country: 'CN' }],
  }));
  const jsonPathsInput = await inspectLocalDataInput(jsonPathsFile);
  assert.deepEqual(jsonPathsInput.dataSets.map((item) => item.id), [
    'json-path:$.payload.events',
    'json-path:$.users',
  ]);
  const usersProfile = await profileLocalData(
    jsonPathsInput,
    selectDataSet(jsonPathsInput, 'json-path:$.users'),
  );
  assert.equal(usersProfile.recommended_mapping.mode, 'user_set');

  const jsonlPath = join(root, 'events.jsonl');
  writeFileSync(jsonlPath, [
    JSON.stringify({ account_id: 'u-1', time: '2026-08-10', event: 'open' }),
    JSON.stringify({ account_id: 'u-2', time: '2026-08-10', event: 'close' }),
  ].join('\n'));
  const jsonlInput = await inspectLocalDataInput(jsonlPath);
  assert.equal((await profileLocalData(jsonlInput, selectDataSet(jsonlInput))).row_count, 2);

  const xlsxPath = join(root, 'multi.xlsx');
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Events').addRows([
    ['account_id', 'event_time', 'event_name'],
    ['u-1', '2026-08-10 10:00:00', 'open'],
  ]);
  workbook.addWorksheet('Users').addRows([
    ['account_id', 'event_time', 'country'],
    ['u-1', new Date('2026-08-10T10:00:00Z'), 'CN'],
  ]);
  await workbook.xlsx.writeFile(xlsxPath);
  const xlsxInput = await inspectLocalDataInput(xlsxPath);
  assert.deepEqual(xlsxInput.dataSets.map((item) => item.id), ['sheet:Events', 'sheet:Users']);
  const xlsxUsers = await profileLocalData(xlsxInput, selectDataSet(xlsxInput, 'sheet:Users'));
  assert.equal(xlsxUsers.row_count, 1);
  assert.equal(xlsxUsers.recommended_mapping.mode, 'user_set');
  assert.equal(xlsxUsers.columns.find((column) => column.name === 'event_time')?.time_parse_ratio, 1);

  const xlsPath = join(root, 'legacy.xls');
  const legacyBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(legacyBook, XLSX.utils.aoa_to_sheet([
    ['account_id', 'event_time', 'event_name'],
    ['u-1', '2026-08-10 10:00:00', 'open'],
  ]), 'Legacy');
  XLSX.writeFile(legacyBook, xlsPath, { bookType: 'xls' });
  const xlsInput = await inspectLocalDataInput(xlsPath);
  assert.deepEqual(xlsInput.dataSets.map((item) => item.id), ['sheet:Legacy']);
  assert.equal((await profileLocalData(xlsInput, selectDataSet(xlsInput))).row_count, 1);

  // Excel multi-sheet header consistency: the fixture workbook has 5 sheets with differing headers.
  const multiSheetHeaders = await readExcelSheetHeaders(fixture('13_multi_sheet.xlsx'), 'xlsx');
  assert.equal(multiSheetHeaders.length, 5);
  assert.ok(multiSheetHeaders.some((sheet) => sheet.name === '用户事件'));
  assert.ok(new Set(multiSheetHeaders.map((sheet) => JSON.stringify(sheet.headers))).size > 1,
    'multi-sheet headers must differ across sheets');
  // The generated two-sheet workbook exposes each sheet's header row.
  const generatedHeaders = await readExcelSheetHeaders(xlsxPath, 'xlsx');
  assert.equal(generatedHeaders.length, 2);
  assert.deepEqual(generatedHeaders[0].headers, ['account_id', 'event_time', 'event_name']);
  const legacyHeaders = await readExcelSheetHeaders(xlsPath, 'xls');
  assert.deepEqual(legacyHeaders[0].headers, ['account_id', 'event_time', 'event_name']);

  // Bounded inspect samples: at most 5 distinct values per column, truncated at ~40 chars.
  const ecommerce = await inspectLocalDataInput(fixture('01_normal_ecommerce.csv'));
  const sampled = await profileLocalData(ecommerce, selectDataSet(ecommerce), 'Asia/Shanghai', { collectSamples: true });
  const city = sampled.columns.find((column) => column.name === 'city');
  assert.ok(city && city.samples);
  assert.ok(city.samples.length <= 5, 'city samples must be bounded to 5');
  assert.equal(new Set(city.samples).size, city.samples.length, 'city samples must be distinct');
  // Mixed-format time column (standard/slash/ISO/Chinese/epoch seconds) must still be
  // detected as the time field, even though the column name `order_time` is not in TIME_NAMES.
  assert.equal(sampled.ue_eligible, true, '01_normal_ecommerce must be UE-eligible');
  assert.equal(sampled.recommended_mapping.time.field, 'order_time');
  assert.equal(sampled.recommended_mapping.time_format, undefined, 'mixed time formats must not pin a single time_format');
  // JSON-encoded object strings in CSV must infer as `object`, not `string`.
  const userMeta = sampled.columns.find((column) => column.name === 'user_meta');
  assert.equal(userMeta?.inferred_type, 'object', '{"level":"gold"} values must infer as object');
  const userMetaMapping = sampled.recommended_mapping.properties.find((property) => property.source === 'user_meta');
  assert.equal(userMetaMapping?.type, 'object');
  assert.equal(userMetaMapping?.transform, 'json', 'object/list columns inferred from JSON text must carry transform json');

  // Chinese business headers: 事件名称/下单时间 must be recognized as event/time columns so a
  // Chinese event table is classified track (not user_set) with the right system fields.
  const chineseHeaders = await inspectLocalDataInput(fixture('03_chinese_headers.csv'));
  const chineseProfile = await profileLocalData(chineseHeaders, selectDataSet(chineseHeaders), 'Asia/Shanghai', { collectSamples: true });
  assert.equal(chineseProfile.recommended_mapping.mode, 'track', 'Chinese event table must classify track, not user_set');
  assert.equal(chineseProfile.recommended_mapping.account_id_field, '用户ID');
  assert.equal(chineseProfile.recommended_mapping.event_name_field, '事件名称');
  assert.equal(chineseProfile.recommended_mapping.time.field, '下单时间');
  assert.deepEqual(
    chineseProfile.identity_candidates.map((candidate) => [candidate.name, candidate.kind]),
    [['用户ID', 'account']],
    'a Chinese identity column must surface as an account candidate for confirmation',
  );

  // Identity candidates: a table with both an account-like and a distinct-like column must list
  // both for the confirmation step and map each to its own field (the user decides which is which).
  const identityPath = join(root, 'identity.csv');
  writeFileSync(identityPath,
    'user_id,device_id,event_name,event_time\n'
    + 'u-1,d-1,open,2026-08-10 10:00:00\n'
    + 'u-1,d-1,close,2026-08-10 11:00:00\n');
  const identityProfile = await profileLocalData(
    await inspectLocalDataInput(identityPath),
    { id: '$', kind: 'file', label: '$' },
    'Asia/Shanghai',
  );
  assert.deepEqual(
    identityProfile.identity_candidates.map((candidate) => [candidate.name, candidate.kind]),
    [['user_id', 'account'], ['device_id', 'distinct']],
    'both identity-shaped columns must be listed for confirmation',
  );
  assert.equal(identityProfile.recommended_mapping.account_id_field, 'user_id');
  assert.equal(identityProfile.recommended_mapping.distinct_id_field, 'device_id');

  // ID-like columns stay strings even when every value is numeric (leading zeros/precision).
  const idLikePath = join(root, 'id-like.csv');
  writeFileSync(idLikePath, 'id,sku_id,amount\n42,100,10\n43,200,20\n');
  const idLikeProfile = await profileLocalData(
    await inspectLocalDataInput(idLikePath),
    { id: '$', kind: 'file', label: '$' },
    'Asia/Shanghai',
  );
  assert.equal(idLikeProfile.columns.find((column) => column.name === 'id')?.inferred_type, 'string', 'numeric `id` downgrades to string');
  assert.equal(idLikeProfile.columns.find((column) => column.name === 'sku_id')?.inferred_type, 'string', 'numeric `*_id` downgrades to string');
  assert.equal(idLikeProfile.columns.find((column) => column.name === 'amount')?.inferred_type, 'number', 'non-ID numeric column stays number');
  const longPath = join(root, 'long.csv');
  writeFileSync(longPath, `account_id,event_time,event_name,note\nu-1,2026-08-10 10:00:00,open,${'x'.repeat(60)}\n`);
  const longProfile = await profileLocalData(
    await inspectLocalDataInput(longPath),
    { id: '$', kind: 'file', label: '$' },
    'Asia/Shanghai',
    { collectSamples: true },
  );
  const note = longProfile.columns.find((column) => column.name === 'note');
  assert.ok(note && note.samples && note.samples[0]);
  assert.equal(note.samples[0].length, 41, 'truncated sample keeps 40 chars plus ellipsis');
  assert.ok(note.samples[0].endsWith('…'));

  // TSV / TXT-NDJSON fixture parsing exercises delimiter and format sniffing.
  const tsvFixture = await inspectLocalDataInput(fixture('15_tsv_data.tsv'));
  assert.equal((await profileLocalData(tsvFixture, selectDataSet(tsvFixture))).row_count, 3);
  const txtNdjson = await inspectLocalDataInput(fixture('20_txt_ndjson_content.txt'));
  assert.equal((await profileLocalData(txtNdjson, selectDataSet(txtNdjson))).row_count, 3);

  // Whitespace-padded quoted CSV must parse: the streaming delimiter parser trims fields
  // (regression for the missing `trim: true` that made `06_quoted_whitespace.csv` fail).
  const quoted = await inspectLocalDataInput(fixture('06_quoted_whitespace.csv'));
  const quotedProfile = await profileLocalData(quoted, selectDataSet(quoted), 'Asia/Shanghai', { collectSamples: true });
  assert.equal(quotedProfile.row_count, 4);
  assert.deepEqual(quotedProfile.columns.map((column) => column.name), ['user_id', 'event_name', 'amount', 'status']);

  // Headerless input with `noHeader` auto-generates col_1..col_N and keeps the first row as data.
  const headerless = await inspectLocalDataInput(fixture('02_no_header.csv'));
  const headerlessProfile = await profileLocalData(headerless, selectDataSet(headerless), 'Asia/Shanghai', { noHeader: true });
  assert.equal(headerlessProfile.row_count, 5);
  assert.deepEqual(headerlessProfile.columns.map((column) => column.name), ['col_1', 'col_2', 'col_3', 'col_4', 'col_5']);

  // inspect auto-detects a missing header row on delimited input and reports auto-names.
  const headerlessDetected = detectHeaderPresence(headerless);
  assert.ok(headerlessDetected, '02_no_header.csv must be detected as headerless');
  assert.equal(headerlessDetected.detection.hasHeaders, false);
  assert.deepEqual(headerlessDetected.autoHeaders, ['col_1', 'col_2', 'col_3', 'col_4', 'col_5']);
  assert.equal(detectHeaderPresence(ecommerce), undefined, '01_normal_ecommerce.csv has a header row');

  // NDJSON nested structure is surfaced as a bounded tree for flatten decisions.
  const ndjsonInput = await inspectLocalDataInput(fixture('19_ndjson_nested.ndjson'));
  const ndjsonProfile = await profileLocalData(ndjsonInput, selectDataSet(ndjsonInput), 'Asia/Shanghai', { collectNestedTree: true });
  assert.ok(ndjsonProfile.nested_tree, 'nested tree must be present for NDJSON');
  const rootNodes = ndjsonProfile.nested_tree!;
  const userInfo = rootNodes.find((node) => node.name === 'user_info');
  assert.ok(userInfo, 'user_info node must exist');
  assert.equal(userInfo.kind, 'object');
  assert.ok(userInfo.children!.some((child) => child.name === 'name' && child.kind === 'primitive'));
  const tags = rootNodes.find((node) => node.name === 'tags');
  assert.equal(tags?.kind, 'array');
  assert.equal(tags?.elementKind, 'primitive');
  // buildNestedTree is a pure reducer over sampled rows.
  const tree = buildNestedTree([
    { a: 1, nested: { b: 'x' }, list: [1, 2] },
    { a: 2, nested: { b: 'y' }, list: [] },
  ]);
  assert.equal(tree.find((node) => node.name === 'a')?.inferredType, 'number');
  assert.equal(tree.find((node) => node.name === 'nested')?.kind, 'object');
  assert.equal(tree.find((node) => node.name === 'list')?.elementKind, 'primitive');

  // CSV/TSV JSON-encoded object columns surface a cell-relative nested tree; array cells stay list.
  const csvNestedInput = await inspectLocalDataInput(fixture('10_array_object_data.csv'));
  const csvNestedProfile = await profileLocalData(csvNestedInput, selectDataSet(csvNestedInput), 'Asia/Shanghai', { collectNestedTree: true });
  const userProfileCol = csvNestedProfile.columns.find((column) => column.name === 'user_profile');
  assert.ok(userProfileCol?.nested_tree, 'user_profile must expose a cell-relative nested tree');
  assert.equal(userProfileCol.nested_tree!.find((node) => node.name === 'name')?.kind, 'primitive');
  assert.equal(userProfileCol.nested_tree!.find((node) => node.name === 'level')?.inferredType, 'number');
  assert.equal(userProfileCol.nested_tree!.find((node) => node.name === 'tags')?.kind, 'array');
  const itemsCol = csvNestedProfile.columns.find((column) => column.name === 'items');
  assert.equal(itemsCol?.inferred_type, 'list', 'items is a JSON array cell');
  assert.equal(itemsCol?.nested_tree, undefined, 'array cells are kept whole, no tree');

  // Multi-level nested JSON in a CSV cell: the column tree recurses through each object level.
  const deepCsvInput = await inspectLocalDataInput(fixture('24_csv_deep_nested.csv'));
  const deepCsvProfile = await profileLocalData(deepCsvInput, selectDataSet(deepCsvInput), 'Asia/Shanghai', { collectNestedTree: true });
  const profileCol = deepCsvProfile.columns.find((column) => column.name === 'profile');
  assert.equal(profileCol?.inferred_type, 'object');
  assert.ok(profileCol?.nested_tree, 'profile must expose a cell-relative nested tree');
  const profileUserInfo = profileCol.nested_tree!.find((node) => node.name === 'user_info');
  assert.equal(profileUserInfo?.kind, 'object');
  const address = profileUserInfo!.children!.find((node) => node.name === 'address');
  assert.equal(address?.kind, 'object');
  const geo = address!.children!.find((node) => node.name === 'geo');
  assert.equal(geo?.kind, 'object');
  assert.equal(geo!.children!.find((node) => node.name === 'lat')?.inferredType, 'number');
  assert.equal(address!.children!.find((node) => node.name === 'city')?.inferredType, 'string');

  // All 8 record types are counted in the manifest via a mixed-mode conversion.
  const eightPath = join(root, 'eight.csv');
  writeFileSync(eightPath,
    'account_id,type,event,time\n'
      + 'u-1,track,open,2026-08-10 10:00:00\n'
      + 'u-1,user_set,,2026-08-10 10:00:00\n'
      + 'u-1,user_setOnce,,2026-08-10 10:00:00\n'
      + 'u-1,user_add,,2026-08-10 10:00:00\n'
      + 'u-1,user_unset,,2026-08-10 10:00:00\n'
      + 'u-1,user_del,,2026-08-10 10:00:00\n'
      + 'u-1,user_append,,2026-08-10 10:00:00\n'
      + 'u-1,user_uniq_append,,2026-08-10 10:00:00\n');
  const eightSha = await sha256File(eightPath);
  const eightMapping: LocalDataMapping = {
    version: 'ae-local-data-mapping/v1',
    source: { sha256: eightSha, format: 'csv', data_set: '$' },
    mode: 'mixed',
    confidence: 'high',
    account_id_field: 'account_id',
    record_type_field: 'type',
    event_name_field: 'event',
    time: { field: 'time', format: 'auto', source_timezone: 'Asia/Shanghai' },
    properties: [],
  };
  const eightOut = join(root, 'eight-out');
  const eightConverted = await convertLocalData({
    inputFile: eightPath,
    mapping: eightMapping,
    outputDir: eightOut,
    now: new Date('2026-08-11T00:00:00Z'),
  });
  assert.equal(eightConverted.status, 'ready');
  assert.equal(eightConverted.manifest.output.valid_records, 8);
  for (const type of ['track', 'user_set', 'user_setOnce', 'user_add', 'user_unset', 'user_del', 'user_append', 'user_uniq_append']) {
    assert.equal(
      eightConverted.manifest.output.record_types[type as keyof typeof eightConverted.manifest.output.record_types],
      1,
      `${type} must be counted`,
    );
  }

  const tooLargePath = join(root, 'too-large.csv');
  writeFileSync(tooLargePath, 'x');
  truncateSync(tooLargePath, 200 * 1024 * 1024 + 1);
  await assert.rejects(
    inspectLocalDataInput(tooLargePath),
    (error: unknown) => error instanceof CliValidationError && error.code === 'LOCAL_DATA_FILE_TOO_LARGE',
  );
  const tooLargeXlsPath = join(root, 'too-large.xls');
  writeFileSync(tooLargeXlsPath, 'x');
  truncateSync(tooLargeXlsPath, 50 * 1024 * 1024 + 1);
  await assert.rejects(
    inspectLocalDataInput(tooLargeXlsPath),
    (error: unknown) => error instanceof CliValidationError && error.code === 'LOCAL_DATA_FILE_TOO_LARGE',
  );

  const noIdentityPath = join(root, 'aggregate.csv');
  writeFileSync(noIdentityPath, 'date,total\n2026-08-10,10\n');
  const noIdentityInput = await inspectLocalDataInput(noIdentityPath);
  const noIdentityProfile = await profileLocalData(noIdentityInput, selectDataSet(noIdentityInput));
  assert.equal(noIdentityProfile.ue_eligible, false);
  assert(noIdentityProfile.warnings.some((warning) => warning.includes('No real account')));

  const usersPath = join(root, 'users.csv');
  writeFileSync(usersPath,
    'account_id,updated_at,country,tags\n'
      + 'u-1,2026-08-10 12:00:00,CN,"[\"\"a\"\"]"\n'
      + 'u-1,2026-08-10 10:00:00,US,"[\"\"b\"\"]"\n'
      + ',bad-time,JP,"[]"\n');
  const sourceSha = await sha256File(usersPath);
  const mapping: LocalDataMapping = {
    version: 'ae-local-data-mapping/v1',
    source: { sha256: sourceSha, format: 'csv', data_set: '$' },
    mode: 'user_set',
    confidence: 'high',
    account_id_field: 'account_id',
    time: { field: 'updated_at', format: 'auto', source_timezone: 'Asia/Shanghai' },
    properties: [
      { source: 'country', target: 'country', type: 'string' },
      { source: 'tags', target: 'tags', type: 'list', transform: 'json' },
    ],
  };
  const outputDir = join(root, 'converted');
  const converted = await convertLocalData({
    inputFile: usersPath,
    mapping,
    outputDir,
    now: new Date('2026-08-11T00:00:00Z'),
  });
  assert.equal(converted.status, 'blocked');
  assert.equal(converted.manifest.output.valid_records, 2);
  assert.equal(converted.manifest.output.invalid_records, 1);
  assert.equal(converted.manifest.output.record_types.user_set, 2);
  const validLines = readFileSync(join(outputDir, 'valid.ue.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(validLines[0]['#time'], '2026-08-10 10:00:00.000', 'user_set must be sorted by identity and time');
  assert.equal(validLines[1]['#time'], '2026-08-10 12:00:00.000');
  assert.equal(readFileSync(join(outputDir, 'invalid.rows.jsonl'), 'utf8').trim().split('\n').length, 1);
  assert.equal(statSync(outputDir).mode & 0o777, 0o700);
  for (const fileName of ['profile.json', 'mapping.json', 'transform.mjs', 'valid.ue.jsonl', 'invalid.rows.jsonl', 'manifest.json']) {
    assert.equal(statSync(join(outputDir, fileName)).mode & 0o777, 0o600, `${fileName} must be private`);
  }
  assert.equal(await sha256File(usersPath), sourceSha, 'conversion must not modify the source');
  const transform = readFileSync(join(outputDir, 'transform.mjs'), 'utf8');
  assert.doesNotMatch(transform, /appid|receiver|access.?token|cli.?token/i);

  const trackMapping: LocalDataMapping = {
    ...mapping,
    mode: 'track',
    event_name_field: 'event',
    properties: [
      { source: 'amount', target: 'amount', type: 'number' },
      { source: 'items', target: 'items', type: 'list' },
      { source: 'context', target: 'context', type: 'object' },
      { source: 'created_at', target: 'created_at', type: 'datetime' },
    ],
  };
  const validTrack = convertRow({
    account_id: 42,
    updated_at: '2026-08-10 10:00:00',
    event: 'purchase',
    amount: '10.5',
    items: ['sku-1'],
    context: { source: 'shop' },
    created_at: '2026-08-10T02:00:00Z',
  }, 1, trackMapping, new Date('2026-08-11T00:00:00Z'));
  assert(validTrack.ok);
  assert.equal(validTrack.record['#account_id'], '42');
  assert.equal(validTrack.record.properties.amount, 10.5);
  assert.equal(validTrack.record.properties.created_at, '2026-08-10 10:00:00.000');
  const conflict = convertRow({
    account_id: 'u-1', updated_at: '2026-08-10', event: 'purchase', amount: 'not-a-number', items: [], context: {},
  }, 2, trackMapping, new Date('2026-08-11T00:00:00Z'));
  assert.equal(conflict.ok, false);
  if (!conflict.ok) assert(conflict.errors.some((error) => error.code === 'PROPERTY_TYPE_CONFLICT'));
  const impossibleDate = convertRow({
    account_id: 'u-1', updated_at: '2026-02-30 10:00:00', event: 'purchase', amount: 1, items: [], context: {},
  }, 3, trackMapping, new Date('2026-08-11T00:00:00Z'));
  assert.equal(impossibleDate.ok, false);
  if (!impossibleDate.ok) assert(impossibleDate.errors.some((error) => error.code === 'INVALID_TIME'));
  const outsideWindow = convertRow({
    account_id: 'u-1', updated_at: '2020-01-01 10:00:00', event: 'purchase', amount: 1, items: [], context: {},
  }, 4, trackMapping, new Date('2026-08-11T00:00:00Z'));
  assert.equal(outsideWindow.ok, false);
  if (!outsideWindow.ok) assert(outsideWindow.errors.some((error) => error.code === 'TIME_OUT_OF_RANGE'));
  const limitMapping: LocalDataMapping = {
    ...trackMapping,
    properties: [
      { source: 'text', target: 'text', type: 'string' },
      { source: 'number', target: 'number', type: 'number' },
      { source: 'list', target: 'list', type: 'list' },
      { source: 'object', target: 'object', type: 'object' },
    ],
  };
  const overLimits = convertRow({
    account_id: 'u-1',
    updated_at: '2026-08-10',
    event: 'purchase',
    text: 'x'.repeat(2049),
    number: 9e15 + 1,
    list: Array.from({ length: 501 }, () => 'x'),
    object: Object.fromEntries(Array.from({ length: 101 }, (_, index) => [`field_${index}`, index])),
  }, 5, limitMapping, new Date('2026-08-11T00:00:00Z'));
  assert.equal(overLimits.ok, false);
  if (!overLimits.ok) {
    assert.equal(overLimits.errors.filter((error) => error.code === 'PROPERTY_LIMIT_EXCEEDED').length, 4);
  }

  chmodSync(root, 0o700);

  // stripQuotes strips paired single/double quotes and trims; unmatched quotes and
  // non-string values pass through untouched (mirrors the standalone tool).
  assert.equal(stripQuotes("'u001'"), 'u001');
  assert.equal(stripQuotes('"purchase"'), 'purchase');
  assert.equal(stripQuotes("'99.50'"), '99.50');
  // Quotes are stripped only at the raw string boundaries; surrounding whitespace is
  // trimmed either way (CSV fields arrive pre-trimmed via `trim: true` in the parser).
  assert.equal(stripQuotes('  "completed"  '), '"completed"');
  assert.equal(stripQuotes('u004'), 'u004');
  assert.equal(stripQuotes("'unmatched"), "'unmatched");
  assert.equal(stripQuotes(42), 42);
  assert.equal(stripQuotes(null), null);

  // convertRow must strip quotes from identity, event name, and properties before
  // value_mapping / type coercion (regression for 06_quoted_whitespace.csv).
  const quotedMapping: LocalDataMapping = {
    version: 'ae-local-data-mapping/v1',
    source: { sha256: '*', format: 'csv', data_set: '$' },
    mode: 'track',
    confidence: 'high',
    account_id_field: 'user_id',
    event_name_field: 'event_name',
    time: { field: 'updated_at', format: 'auto', source_timezone: 'Asia/Shanghai' },
    properties: [
      { source: 'amount', target: 'amount', type: 'number' },
      { source: 'status', target: 'status', type: 'string' },
    ],
  };
  const quotedRow = convertRow({
    user_id: "'u001'",
    updated_at: '2026-08-10 10:00:00',
    event_name: '"purchase"',
    amount: "'99.50'",
    status: '"completed"',
  }, 1, quotedMapping, new Date('2026-08-11T00:00:00Z'));
  assert(quotedRow.ok);
  assert.equal(quotedRow.record['#account_id'], 'u001');
  assert.equal(quotedRow.record['#event_name'], 'purchase');
  assert.equal(quotedRow.record.properties.amount, 99.5);
  assert.equal(quotedRow.record.properties.status, 'completed');

  process.stdout.write('local data inspect and convert tests: passed\n');
} finally {
  rmSync(root, { recursive: true, force: true });
}
