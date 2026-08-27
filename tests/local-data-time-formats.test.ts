import assert from 'node:assert/strict';
import { convertRow } from '../src/commands/data-integration/conversion.js';
import {
  findFirstTimeFormat,
  isParseableByAnyFormat,
  parseTimeByAnyFormat,
  TIME_FORMATS,
  tryStrptime,
} from '../src/commands/data-integration/time.js';
import type { LocalDataMapping } from '../src/commands/data-integration/types.js';

assert.equal(TIME_FORMATS.length, 21);

assert.deepEqual(tryStrptime('20240116', 'yyyyMMdd'), {
  year: 2024, month: 1, day: 16, hour: 0, minute: 0, second: 0, millisecond: 0,
});
const english = tryStrptime('15 Jan 2024 17:00:00', 'dd MMM yyyy HH:mm:ss');
assert.equal(english?.day, 15);
assert.equal(english?.month, 1);
assert.equal(english?.hour, 17);
// Chinese business-data time format (English-rule exempt).
assert.equal(tryStrptime('2024年1月16日 16:00:00', 'yyyy年M月d日 HH:mm:ss')?.hour, 16);
assert.equal(tryStrptime('garbage', 'yyyy-MM-dd HH:mm:ss'), null);

assert.equal(isParseableByAnyFormat('20240116'), true);
assert.equal(isParseableByAnyFormat('2024-01-15 10:30:00'), true);
assert.equal(isParseableByAnyFormat('not a date'), false);
assert.ok(findFirstTimeFormat('20240116'));
assert.equal(parseTimeByAnyFormat('20240116')?.day, 16);

const mapping: LocalDataMapping = {
  version: 'ae-data-integration-mapping/v1',
  source: { sha256: 'a'.repeat(64), format: 'csv', data_set: '$' },
  mode: 'track',
  confidence: 'high',
  account_id_field: 'user_id',
  event_name_field: 'event_name',
  time: { field: 'event_time', format: 'auto', source_timezone: 'Asia/Shanghai' },
  properties: [],
};
const now = new Date('2026-08-11T00:00:00Z');
const timeOf = (t: string): unknown => {
  const result = convertRow({ user_id: 'u-1', event_name: 'open', event_time: t }, 1, mapping, now);
  return result.ok ? result.record['#time'] : result.errors.map((error) => error.code);
};

// Offset-bearing values are authoritative instants: they route to `new Date` and must
// never be re-interpreted as wall-clock (which would silently drop the offset).
assert.equal(timeOf('2026-08-10T02:00:00Z'), '2026-08-10 10:00:00.000');
assert.equal(timeOf('2026-08-10T02:00:00+05:00'), '2026-08-10 05:00:00.000');
// Epoch seconds and milliseconds.
assert.equal(timeOf('1705314600'), '2024-01-15 18:30:00.000');
assert.equal(timeOf('1705318200000'), '2024-01-15 19:30:00.000');
// Compact and slash wall-clock formats.
assert.equal(timeOf('20240116'), '2024-01-16 00:00:00.000');
assert.equal(timeOf('2024/01/16 09:00:00'), '2024-01-16 09:00:00.000');

// Explicit mapping.time_format wins over auto-detection: auto-detection reads the Chinese
// date as date-only (dropping 16:00:00), while the explicit format preserves the time.
const explicit: LocalDataMapping = {
  ...mapping,
  time: { ...mapping.time, source_timezone: 'Asia/Shanghai' },
  time_format: 'yyyy年M月d日 HH:mm:ss',
};
const explicitRow = convertRow(
  { user_id: 'u-1', event_name: 'open', event_time: '2024年1月16日 16:00:00' },
  2,
  explicit,
  now,
);
assert.equal(explicitRow.ok && explicitRow.record['#time'], '2024-01-16 16:00:00.000');

// Property-level time_format overrides the auto-detected format for a datetime property.
const propertyMapping: LocalDataMapping = {
  ...mapping,
  properties: [{ source: 'ts', target: 'ts', type: 'datetime', time_format: 'yyyy年M月d日 HH:mm:ss' }],
};
const propertyRow = convertRow(
  { user_id: 'u-1', event_name: 'open', event_time: '2026-08-10 10:00:00', ts: '2024年1月16日 16:00:00' },
  3,
  propertyMapping,
  now,
);
assert.equal(propertyRow.ok && propertyRow.record.properties.ts, '2024-01-16 16:00:00.000');

process.stdout.write('local data time format tests: passed\n');
