import assert from 'node:assert/strict';
import { convertRow } from '../src/commands/data-integration/conversion.js';
import {
  isUserProfileType,
  normalizeRecordType,
  USER_PROFILE_TYPES,
} from '../src/commands/data-integration/profile.js';
import type { LocalDataMapping } from '../src/commands/data-integration/types.js';

// All 8 canonical record types plus aliases normalize onto the same enum.
const aliases: Array<[unknown, string | undefined]> = [
  ['track', 'track'],
  ['event', 'track'],
  ['#track', 'track'],
  ['#user_set', 'user_set'],
  ['userSet', 'user_set'],
  ['userset', 'user_set'],
  ['user', 'user_set'],
  ['USER_SETONCE', 'user_setOnce'],
  ['user_setOnce', 'user_setOnce'],
  ['userAdd', 'user_add'],
  ['user_add', 'user_add'],
  ['user-unset', 'user_unset'],
  ['user_unset', 'user_unset'],
  ['user_del', 'user_del'],
  ['user_append', 'user_append'],
  ['user_uniq_append', 'user_uniq_append'],
  ['bogus', undefined],
  ['', undefined],
];
for (const [input, expected] of aliases) {
  assert.equal(normalizeRecordType(input), expected, `normalizeRecordType(${JSON.stringify(input)})`);
}

assert.equal(USER_PROFILE_TYPES.size, 7);
assert.equal(USER_PROFILE_TYPES.has('track'), false);
for (const type of USER_PROFILE_TYPES) {
  assert.equal(isUserProfileType(type), true);
}
assert.equal(isUserProfileType('track'), false);
assert.equal(isUserProfileType('bogus'), false);

// Mixed mode: `#event_name` is emitted only for track rows; record_type value mapping applies.
const mixedMapping: LocalDataMapping = {
  version: 'ae-data-integration-mapping/v1',
  source: { sha256: 'a'.repeat(64), format: 'csv', data_set: '$' },
  mode: 'mixed',
  confidence: 'high',
  account_id_field: 'user_id',
  record_type_field: 'type',
  event_name_field: 'event',
  time: { field: 't', format: 'auto', source_timezone: 'Asia/Shanghai' },
  value_mapping: { record_type: { '事件': 'track', '用户': 'user_set' } },
  properties: [],
};
const now = new Date('2026-08-11T00:00:00Z');

const trackRow = convertRow({ user_id: 'u-1', type: '事件', event: 'open', t: '2026-08-10 10:00:00' }, 1, mixedMapping, now);
assert(trackRow.ok);
assert.equal(trackRow.recordType, 'track');
assert.equal(trackRow.record['#type'], 'track');
assert.equal(trackRow.record['#event_name'], 'open');

const profileRow = convertRow({ user_id: 'u-1', type: '用户', event: 'open', t: '2026-08-10 10:00:00' }, 2, mixedMapping, now);
assert(profileRow.ok);
assert.equal(profileRow.recordType, 'user_set');
assert.equal(profileRow.record['#type'], 'user_set');
assert.equal(profileRow.record['#event_name'], undefined);

const aliasRow = convertRow({ user_id: 'u-1', type: 'event', event: 'open', t: '2026-08-10 10:00:00' }, 3, mixedMapping, now);
assert(aliasRow.ok);
assert.equal(aliasRow.recordType, 'track');

process.stdout.write('local data eight record type tests: passed\n');
