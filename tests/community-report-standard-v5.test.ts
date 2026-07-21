/**
 * Community #standard/5.0.0 validation and normalization contract tests.
 *
 * Run: npx tsx tests/community-report-standard-v5.test.ts
 */

import assert from 'node:assert/strict';
import {
  CommunityJsonParseError,
  parseCommunityJson,
} from '../src/commands/te-community/data/lossless-json.ts';
import {
  CommunityDataValidationError,
  type CommunityDataType,
  type NormalizedCommunityReport,
  normalizeCommunityReportInput,
} from '../src/commands/te-community/data/standard-v5.ts';

const BASE_INPUT = {
  spaceId: '5',
  channelId: '1',
  sourceId: '9',
  zoneId: 'Asia/Shanghai',
};

const MINIMAL_RECORDS: Record<CommunityDataType, Record<string, unknown>> = {
  post: { post_uuid: 'post-1' },
  video: { video_uuid: 'video-1' },
  reply: { reply_uuid: 'reply-1', root_id: 'post-1', root_type: 'post' },
  danmu: { danmu_uuid: 'danmu-1', timestamp: 0, root_id: 'video-1', root_type: 'video' },
  live_room: {
    uuid: 1,
    room_id: 'room-1',
    room_name: 'Room',
    room_avatar: 'avatar',
    fans: 0,
    timestamp: '2026-07-21',
  },
  live_interaction: {
    uuid: 1,
    activity_type: 'danmu',
    activity_content: 'hello',
    room_id: 'room-1',
    stream_start_time: '2026-07-21 10:00',
    timestamp: '2026-07-21',
  },
  chat: {
    chat_uuid: 'chat-1',
    user_id: 'user-1',
    chat_room_type: 'custom-room-kind',
    chat_room_id: 'room-1',
    content: 'hello',
    publish_time: '2026-07-21',
  },
  interaction: {
    content_uuid: 'post-1',
    content_type: 0,
    collect_time: '2026-07-21',
    metrics: { views: 0 },
  },
};

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    process.stdout.write(`  OK: ${name}\n`);
  } catch (error) {
    failed += 1;
    process.stdout.write(`  FAIL: ${name}\n`);
    process.stdout.write(`    ${error instanceof Error ? error.message : String(error)}\n`);
  }
}

function normalize(dataType: CommunityDataType, data: unknown, overrides: Record<string, unknown> = {}): NormalizedCommunityReport {
  return normalizeCommunityReportInput({
    ...BASE_INPUT,
    ...overrides,
    dataType,
    data,
  });
}

function firstRecord(result: NormalizedCommunityReport): Record<string, any> {
  return result.wirePayload.payload[0].data[0] as Record<string, any>;
}

function expectValidation(
  fn: () => unknown,
  expected: {
    code?: string;
    segment?: number;
    record?: number;
    field?: string;
    excludes?: string;
  } = {},
): CommunityDataValidationError {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof CommunityDataValidationError);
    if (expected.code !== undefined) assert.equal(error.code, expected.code);
    if (expected.segment !== undefined) assert.equal(error.segment, expected.segment);
    if (expected.record !== undefined) assert.equal(error.record, expected.record);
    if (expected.field !== undefined) assert.equal(error.field, expected.field);
    if (expected.excludes !== undefined) assert.equal(error.message.includes(expected.excludes), false);
    return error;
  }
  assert.fail('Expected CommunityDataValidationError.');
}

process.stdout.write('\ncommunity #standard/5.0.0 validation contract\n');

for (const dataType of Object.keys(MINIMAL_RECORDS) as CommunityDataType[]) {
  test(`accepts a minimal ${dataType} record`, () => {
    const result = normalize(dataType, MINIMAL_RECORDS[dataType]);
    assert.equal(result.segmentCount, 1);
    assert.equal(result.recordCount, 1);
    assert.deepEqual(result.dataTypes, [dataType]);
    assert.equal(result.wirePayload.payload[0].data_type, dataType);
    assert.equal(result.wirePayload.payload[0].data.length, 1);
  });
}

test('normalizes a mixed payload and every segment data value to arrays', () => {
  const result = normalizeCommunityReportInput({
    ...BASE_INPUT,
    payload: [
      { data_type: 'post', data: MINIMAL_RECORDS.post },
      { data_type: 'interaction', data: [MINIMAL_RECORDS.interaction] },
    ],
  });
  assert.equal(result.segmentCount, 2);
  assert.equal(result.recordCount, 2);
  assert.deepEqual(result.dataTypes, ['post', 'interaction']);
  assert.equal(Array.isArray(result.wirePayload.payload), true);
  assert.equal(Array.isArray(result.wirePayload.payload[0].data), true);
  assert.equal(Array.isArray(result.wirePayload.payload[1].data), true);
});

test('normalizes a single payload segment to an array', () => {
  const result = normalizeCommunityReportInput({
    ...BASE_INPUT,
    payload: { data_type: 'chat', data: MINIMAL_RECORDS.chat },
  });
  assert.equal(result.segmentCount, 1);
  assert.equal(result.recordCount, 1);
});

test('rejects empty data and payload arrays', () => {
  expectValidation(
    () => normalize('post', []),
    { code: 'community_empty_data', segment: 0, field: 'data' },
  );
  expectValidation(
    () => normalizeCommunityReportInput({ ...BASE_INPUT, payload: [] }),
    { code: 'community_empty_payload', field: 'payload' },
  );
});

test('preserves unknown record fields and omits known optional null fields', () => {
  const result = normalize('post', {
    post_uuid: 'post-1',
    user_id: null,
    publish_time: null,
    interaction: null,
    unknown_field: { nested: true },
    unknown_null: null,
  });
  const record = firstRecord(result);
  assert.equal('user_id' in record, false);
  assert.equal('publish_time' in record, false);
  assert.equal('interaction' in record, false);
  assert.equal(record.unknown_field.nested, true);
  assert.equal(record.unknown_null, null);
  assert.deepEqual(record.extras, {});
});

test('accepts all four Iris date-time formats', () => {
  for (const publishTime of [
    '2026-07-21',
    '2026-07-21 10:11',
    '2026-07-21 10:11:12',
    '2026-07-21 10:11:12.123',
  ]) {
    const record = { ...MINIMAL_RECORDS.chat, publish_time: publishTime };
    assert.equal(firstRecord(normalize('chat', record)).publish_time, publishTime);
  }
});

test('rejects invalid calendar dates and non-string date values', () => {
  expectValidation(
    () => normalize('chat', { ...MINIMAL_RECORDS.chat, publish_time: '2026-02-30' }),
    { code: 'community_invalid_datetime', field: 'publish_time' },
  );
  expectValidation(
    () => normalize('chat', { ...MINIMAL_RECORDS.chat, publish_time: 20260721 }),
    { code: 'community_invalid_text', field: 'publish_time' },
  );
});

test('truncates by UTF-16 code units exactly like Iris', () => {
  const result = normalize('post', {
    post_uuid: 'post-1',
    user_id: `${'a'.repeat(63)}😀`,
  });
  const value = firstRecord(result).user_id as string;
  assert.equal(value.length, 64);
  assert.equal(value.charCodeAt(63), 0xd83d);
  assert.equal(result.normalization.truncatedFields, 1);
  assert.equal(result.normalization.fields['post.user_id'], 1);
});

test('rejects overlong fields that have no Iris fallback', () => {
  expectValidation(
    () => normalize('post', { post_uuid: 'x'.repeat(33) }),
    { code: 'community_text_too_long', field: 'post_uuid' },
  );
  expectValidation(
    () => normalize('live_room', { ...MINIMAL_RECORDS.live_room, room_name: 'x'.repeat(81) }),
    { code: 'community_text_too_long', field: 'room_name' },
  );
});

test('normalizes native, encoded, missing, and invalid extras objects', () => {
  assert.equal(firstRecord(normalize('post', { post_uuid: 'p', extras: { source: 'native' } })).extras.source, 'native');
  assert.equal(firstRecord(normalize('post', { post_uuid: 'p', extras: '{"source":"encoded"}' })).extras.source, 'encoded');
  assert.deepEqual(firstRecord(normalize('post', { post_uuid: 'p' })).extras, {});
  assert.deepEqual(firstRecord(normalize('post', { post_uuid: 'p', extras: '[1]' })).extras, {});
  assert.deepEqual(firstRecord(normalize('post', { post_uuid: 'p', extras: 'invalid-json' })).extras, {});
});

test('normalizes user_extra and enforces its compact JSON length', () => {
  const encoded = normalize('live_interaction', {
    ...MINIMAL_RECORDS.live_interaction,
    user_extra: '{"level":7}',
  });
  assert.equal(firstRecord(encoded).user_extra.level, 7);
  assert.deepEqual(firstRecord(normalize('live_interaction', {
    ...MINIMAL_RECORDS.live_interaction,
    user_extra: 'invalid-json',
  })).user_extra, {});
  expectValidation(
    () => normalize('live_interaction', {
      ...MINIMAL_RECORDS.live_interaction,
      user_extra: { text: 'x'.repeat(1024) },
    }),
    { code: 'community_object_too_long', field: 'user_extra' },
  );
});

test('normalizes subtitle to an object array and rejects invalid elements', () => {
  const encoded = firstRecord(normalize('video', {
    video_uuid: 'video-1',
    subtitle: '[{"language":"en"}]',
  }));
  assert.equal(Array.isArray(encoded.subtitle), true);
  assert.equal(encoded.subtitle[0].language, 'en');
  expectValidation(
    () => normalize('video', { video_uuid: 'video-1', subtitle: '["not-an-object"]' }),
    { code: 'community_invalid_array', field: 'subtitle' },
  );
});

test('does not impose an enum on chat_room_type', () => {
  const record = firstRecord(normalize('chat', {
    ...MINIMAL_RECORDS.chat,
    chat_room_type: 'arbitrary-kind',
  }));
  assert.equal(record.chat_room_type, 'arbitrary-kind');
});

test('requires UUID fields without silently truncating them', () => {
  for (const [dataType, uuidField] of [
    ['post', 'post_uuid'],
    ['video', 'video_uuid'],
    ['reply', 'reply_uuid'],
    ['danmu', 'danmu_uuid'],
  ] as Array<[CommunityDataType, string]>) {
    const missing = { ...MINIMAL_RECORDS[dataType] };
    delete missing[uuidField];
    expectValidation(
      () => normalize(dataType, missing),
      { code: 'community_required_field', field: uuidField },
    );
    expectValidation(
      () => normalize(dataType, { ...MINIMAL_RECORDS[dataType], [uuidField]: 'x'.repeat(33) }),
      { code: 'community_text_too_long', field: uuidField },
    );
  }
});

test('validates reply and danmu root fields', () => {
  expectValidation(
    () => normalize('reply', { ...MINIMAL_RECORDS.reply, root_type: 'chat' }),
    { code: 'community_invalid_enum', field: 'root_type' },
  );
  expectValidation(
    () => normalize('danmu', { ...MINIMAL_RECORDS.danmu, root_id: null }),
    { code: 'community_required_field', field: 'root_id' },
  );
});

test('requires a timed stream_start_time for live stream details and metrics', () => {
  expectValidation(
    () => normalize('live_room', { ...MINIMAL_RECORDS.live_room, online: 1 }),
    { code: 'community_required_field', field: 'stream_start_time' },
  );
  expectValidation(
    () => normalize('live_room', {
      ...MINIMAL_RECORDS.live_room,
      stream_start_time: '2026-07-21',
    }),
    { code: 'community_invalid_datetime', field: 'stream_start_time' },
  );
  expectValidation(
    () => normalize('live_room', {
      ...MINIMAL_RECORDS.live_room,
      stream_start_time: '2026-07-21 10:00',
      stream_end_time: 'not-a-date',
    }),
    { code: 'community_invalid_datetime', field: 'stream_end_time' },
  );
});

test('requires live interaction stream identity and validates activity_type', () => {
  expectValidation(
    () => normalize('live_interaction', { ...MINIMAL_RECORDS.live_interaction, room_id: null }),
    { code: 'community_required_field', field: 'room_id' },
  );
  expectValidation(
    () => normalize('live_interaction', {
      ...MINIMAL_RECORDS.live_interaction,
      stream_start_time: '2026-07-21',
    }),
    { code: 'community_invalid_datetime', field: 'stream_start_time' },
  );
  expectValidation(
    () => normalize('live_interaction', { ...MINIMAL_RECORDS.live_interaction, activity_type: 'unknown' }),
    { code: 'community_invalid_enum', field: 'activity_type' },
  );
});

test('normalizes live_room status and int64 room metrics', () => {
  const missingStatus = firstRecord(normalize('live_room', MINIMAL_RECORDS.live_room));
  assert.equal(missingStatus.stream_status, 0);

  const normalized = normalize('live_room', {
    ...MINIMAL_RECORDS.live_room,
    fans: '9223372036854775807',
    stream_status: '2',
    stream_start_time: '2026-07-21 10:00',
    online: '7',
  });
  const record = firstRecord(normalized);
  assert.equal(record.stream_status, 0);
  assert.equal(record.fans, 9223372036854775807n);
  assert.equal(record.online, 7n);
  assert.equal(normalized.normalization.defaultedFields, 1);
  assert.equal(normalized.normalization.convertedIntegerFields, 3);
});

test('rejects conflicting guardian aliases and invalid live metrics', () => {
  expectValidation(
    () => normalize('live_room', {
      ...MINIMAL_RECORDS.live_room,
      stream_start_time: '2026-07-21 10:00',
      guardian_count: 1,
      dfans_count: 2,
    }),
    { code: 'community_conflicting_fields', field: 'dfans_count' },
  );
  expectValidation(
    () => normalize('live_room', {
      ...MINIMAL_RECORDS.live_room,
      stream_start_time: '2026-07-21 10:00',
      heat: 1.5,
    }),
    { code: 'community_invalid_integer', field: 'heat' },
  );
});

test('rejects numeric and textual derived live identifiers that overflow', () => {
  expectValidation(
    () => normalize('live_room', {
      ...MINIMAL_RECORDS.live_room,
      uuid: '1844674407370955161',
    }),
    { code: 'community_derived_id_overflow', field: 'uuid' },
  );
  expectValidation(
    () => normalize('live_interaction', {
      ...MINIMAL_RECORDS.live_interaction,
      room_id: 'r'.repeat(32),
    }, {
      channelId: '9223372036854775807',
    }),
    { code: 'community_derived_id_too_long', field: 'stream_start_time' },
  );
});

test('validates interaction metric names against content_type', () => {
  normalize('interaction', {
    content_uuid: 'post-1',
    content_type: 0,
    collect_time: '2026-07-21',
    metrics: { views: 1, favorites: 2 },
  });
  normalize('interaction', {
    content_uuid: 'user-1',
    content_type: 7,
    collect_time: '2026-07-21',
    metrics: { followers: 1 },
  });
  expectValidation(
    () => normalize('interaction', {
      content_uuid: 'live-1',
      content_type: 2,
      collect_time: '2026-07-21',
      metrics: { favorites: 1, views: 2 },
    }),
    { code: 'community_invalid_metric', field: 'metrics.views' },
  );
  expectValidation(
    () => normalize('interaction', {
      content_uuid: 'post-1',
      content_type: 0,
      collect_time: '2026-07-21',
      metrics: {},
    }),
    { code: 'community_empty_metrics', field: 'metrics' },
  );
});

test('validates every sidecar metric before allowing the main record', () => {
  const result = normalize('post', {
    post_uuid: 'post-1',
    interaction: '{"collect_time":"2026-07-21","metrics":{"views":"3"}}',
  });
  assert.equal(firstRecord(result).interaction.metrics.views, 3n);
  expectValidation(
    () => normalize('video', {
      video_uuid: 'video-1',
      interaction: {
        collect_time: '2026-07-21',
        metrics: { comments: 1, followers: 2 },
      },
    }),
    { code: 'community_invalid_metric', field: 'interaction.metrics.followers' },
  );
  expectValidation(
    () => normalize('post', { post_uuid: 'post-1', interaction: { metrics: { views: 1 } } }),
    { code: 'community_required_field', field: 'interaction.collect_time' },
  );
});

test('keeps signed int64 max exact and unquoted in the wire body', () => {
  const record = parseCommunityJson(
    '{"danmu_uuid":"danmu-1","timestamp":9223372036854775807,"root_id":"post-1","root_type":"post"}',
  );
  const result = normalize('danmu', record);
  assert.equal(firstRecord(result).timestamp, 9223372036854775807n);
  assert.equal(result.wireBody.includes('"timestamp":9223372036854775807'), true);
  assert.equal(result.wireBody.includes('"timestamp":"9223372036854775807"'), false);
});

test('rejects out-of-range, negative, fractional, and noncanonical integers', () => {
  expectValidation(
    () => normalize('danmu', { ...MINIMAL_RECORDS.danmu, timestamp: '9223372036854775808' }),
    { code: 'community_integer_out_of_range', field: 'timestamp' },
  );
  expectValidation(
    () => normalize('danmu', { ...MINIMAL_RECORDS.danmu, timestamp: -1 }),
    { code: 'community_integer_out_of_range', field: 'timestamp' },
  );
  expectValidation(
    () => normalize('danmu', { ...MINIMAL_RECORDS.danmu, timestamp: 1.5 }),
    { code: 'community_invalid_integer', field: 'timestamp' },
  );
  expectValidation(
    () => normalize('danmu', { ...MINIMAL_RECORDS.danmu, timestamp: '01' }),
    { code: 'community_invalid_integer', field: 'timestamp' },
  );
});

test('reports segment, record, and field without exposing business values', () => {
  const secret = 'secret-business-value';
  const error = expectValidation(
    () => normalizeCommunityReportInput({
      ...BASE_INPUT,
      payload: [
        { data_type: 'post', data: MINIMAL_RECORDS.post },
        { data_type: 'reply', data: [{ ...MINIMAL_RECORDS.reply }, { ...MINIMAL_RECORDS.reply, root_type: secret }] },
      ],
    }),
    { code: 'community_invalid_enum', segment: 1, record: 1, field: 'root_type', excludes: secret },
  );
  assert.equal(JSON.stringify(error).includes(secret), false);
});

test('rejects prototype and constructor keys with sanitized parse errors', () => {
  for (const json of [
    '{"__proto__":{"polluted":true}}',
    '{"constructor":{"polluted":true}}',
  ]) {
    assert.throws(
      () => parseCommunityJson(json),
      (error: unknown) => {
        assert.ok(error instanceof CommunityJsonParseError);
        assert.equal(error.message, 'Input must be valid JSON.');
        assert.equal(error.message.includes('polluted'), false);
        return true;
      },
    );
  }
});

test('constructs the fixed #standard/5.0.0 envelope with numeric IDs', () => {
  const result = normalize('chat', MINIMAL_RECORDS.chat);
  assert.deepEqual(result.wirePayload.custom_data, {
    channel_id: 1n,
    game_id: 5n,
    source_id: 9n,
    source_type: '#standard',
    version: '5.0.0',
  });
  assert.equal(result.wirePayload.zone_id, 'Asia/Shanghai');
  assert.equal(result.byteLength, Buffer.byteLength(result.wireBody, 'utf8'));
});

process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
