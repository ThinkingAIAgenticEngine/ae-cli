import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertLocalData, convertRow } from '../src/commands/data-integration/local-data/conversion.js';
import {
  buildRowWithFlatten,
  flattenDelimitedRow,
  flattenLocalDataRow,
  getNestedValue,
} from '../src/commands/data-integration/local-data/flatten.js';
import { sha256File } from '../src/commands/data-integration/local-data/input.js';
import { validateMapping } from '../src/commands/data-integration/local-data/mapping.js';
import { CliValidationError } from '../src/core/errors.js';
import type { LocalDataMapping } from '../src/commands/data-integration/local-data/types.js';

const fixture = (name: string): string => fileURLToPath(new URL(`fixtures/local-data/${name}`, import.meta.url));
const root = mkdtempSync(join(tmpdir(), 'ae-local-data-mapping-extras-'));
const now = new Date('2026-08-11T00:00:00Z');

const baseMapping: LocalDataMapping = {
  version: 'ae-local-data-mapping/v1',
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
    version: 'ae-local-data-mapping/v1',
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
    version: 'ae-local-data-mapping/v1',
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
    version: 'ae-local-data-mapping/v1',
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
  const csvNestedSrc = join(root, 'csv-nested.csv');
  writeFileSync(csvNestedSrc,
    'user_id,event,time,profile\n'
    + 'u-1,open,2026-08-10 10:00:00,"{""name"":""alice"",""level"":3}"\n'
    + 'u-2,open,2026-08-10 10:00:00,"{""name"":""bob"",""level"":1}"\n');
  const csvNestedSha = await sha256File(csvNestedSrc);
  const csvNestedMapping: LocalDataMapping = {
    version: 'ae-local-data-mapping/v1',
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
    version: 'ae-local-data-mapping/v1',
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
    { user: 'u-1', event: 'open', t: '2026-08-10 10:00:00', client_ip: '1.2.3.4', request_id: 'abc-123' },
    4, sysMapping, now,
  );
  assert(sysRow.ok);
  assert.equal(sysRow.record['#ip'], '1.2.3.4');
  assert.equal(sysRow.record['#uuid'], 'abc-123');
  const sysNoIp = convertRow({ user: 'u-1', event: 'open', t: '2026-08-10 10:00:00' }, 5, sysMapping, now);
  assert(sysNoIp.ok);
  assert.equal(sysNoIp.record['#ip'], undefined);
  assert.equal(sysNoIp.record['#uuid'], undefined);

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
    version: 'ae-local-data-mapping/v1',
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
