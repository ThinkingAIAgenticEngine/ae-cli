import assert from 'node:assert/strict';
import { buildDraftFromMapping } from '../src/commands/data-integration/local-data/plan.js';
import { CliValidationError } from '../src/core/errors.js';
import type { LocalDataMapping } from '../src/commands/data-integration/local-data/types.js';

const baseMapping: LocalDataMapping = {
  version: 'ae-local-data-mapping/v1',
  source: { sha256: 'a'.repeat(64), format: 'csv', data_set: '$' },
  mode: 'track',
  confidence: 'high',
  account_id_field: 'user_id',
  default_event_name: 'purchase',
  time: { field: 'time', format: 'auto', source_timezone: 'Asia/Shanghai' },
  properties: [
    { source: 'amount', target: 'amount', type: 'number' },
    { source: 'is_paid', target: 'is_paid', type: 'boolean' },
    { source: 'created_at', target: 'created_at', type: 'datetime' },
    { source: 'tags', target: 'tags', type: 'list' },
    { source: 'extra', target: 'extra', type: 'object' },
    { source: 'note', target: 'note', type: 'string' },
  ],
};

const options = (overrides: Partial<LocalDataMapping>, eventNames: string[] = []) =>
  buildDraftFromMapping({
    mapping: { ...baseMapping, ...overrides },
    planName: 'ecommerce',
    eventNames,
    appType: 'unknown',
    lang: 'zh',
  });

// track mode with default_event_name → one event, all properties in event_properties.
{
  const draft = options({});
  assert.equal(draft.meta.sdk_integration_mode, 'none');
  assert.equal(draft.meta.source_type, 'data');
  assert.equal(draft.meta.plan_name, 'ecommerce');
  assert.equal(draft.events.length, 1);
  assert.equal(draft.events[0].event_name, 'purchase');
  assert.equal(draft.events[0].source, 'data');
  assert.deepEqual(draft.events[0].prop_names, ['amount', 'is_paid', 'created_at', 'tags', 'extra', 'note']);
  assert.equal(draft.event_properties.length, 6);
  assert.equal(draft.user_properties.length, 0);
  assert.equal(draft.common_event_properties.length, 0);

  const byName = Object.fromEntries(draft.event_properties.map((property) => [property.name, property]));
  assert.equal(byName.amount.type, 'number');
  assert.equal(byName.is_paid.type, 'bool');
  assert.equal(byName.created_at.type, 'datetime');
  assert.equal(byName.tags.type, 'array_string');
  assert.equal(byName.extra.type, 'object');
  assert.equal(byName.note.type, 'string');
  assert.equal(byName.amount.source, 'data');
  assert.equal(byName.amount.display_name, 'amount');
  assert.equal(byName.amount.desc, 'amount'); // falls back to the source column name
  assert.equal(draft.events[0].event_desc, 'purchase'); // falls back to the event name
  assert.equal(draft.events[0].event_tag, 'purchase'); // falls back to the event name
}

// desc and event_tag/event_desc are carried from the mapping when provided.
{
  const draft = options({
    properties: [
      { source: 'amount', target: 'amount', type: 'number', desc: '订单金额（元）' },
      { source: 'note', target: 'note', type: 'string' },
    ],
    event_meta: { purchase: { desc: '用户完成一笔支付', tag: '订单' } },
  });
  const byName = Object.fromEntries(draft.event_properties.map((property) => [property.name, property]));
  assert.equal(byName.amount.desc, '订单金额（元）');
  assert.equal(byName.note.desc, 'note'); // no desc → source column name fallback
  assert.equal(draft.events[0].event_desc, '用户完成一笔支付');
  assert.equal(draft.events[0].event_tag, '订单');
}

// multi-event without event_meta falls back to the source (business) event name via value_mapping.
{
  const draft = options(
    {
      default_event_name: undefined,
      event_name_field: 'event',
      value_mapping: { event_name: { '展示广告': 'ad_show', '点击广告': 'ad_click' } },
    },
    ['ad_show', 'ad_click'],
  );
  assert.deepEqual(draft.events.map((event) => event.event_desc), ['展示广告', '点击广告']);
  assert.deepEqual(draft.events.map((event) => event.event_tag), ['展示广告', '点击广告']);
}

// track mode with explicit event names → one event per name, all referencing the same properties.
{
  const draft = options({ default_event_name: undefined, event_name_field: 'event' }, ['ad_show', 'ad_click']);
  assert.equal(draft.events.length, 2);
  assert.deepEqual(draft.events.map((event) => event.event_name), ['ad_show', 'ad_click']);
  assert.deepEqual(draft.events[0].prop_names, draft.events[1].prop_names);
}

// track mode without default_event_name and without --event-name is a hard error.
{
  assert.throws(
    () => options({ default_event_name: undefined, event_name_field: 'event' }),
    (error: unknown) => error instanceof CliValidationError && error.code === 'LOCAL_DATA_PLAN_EVENT_NAMES_REQUIRED',
  );
}

// user_set mode → no events, every property becomes a user property.
{
  const draft = options({ mode: 'user_set', default_event_name: undefined });
  assert.equal(draft.events.length, 0);
  assert.equal(draft.event_properties.length, 0);
  assert.equal(draft.user_properties.length, 6);
  assert.ok(draft.user_properties.every((property) => property.update_type === 'user_set'));
}

// mixed mode → track event plus the same properties mirrored as user properties.
{
  const draft = options({ mode: 'mixed', record_type_field: 'type' });
  assert.equal(draft.events.length, 1);
  assert.equal(draft.event_properties.length, 6);
  assert.equal(draft.user_properties.length, 6);
  assert.deepEqual(
    draft.event_properties.map((property) => property.name),
    draft.user_properties.map((property) => property.name),
  );
}

// exclude_columns drops the source column from the draft entirely.
{
  const draft = options({ exclude_columns: ['extra', 'tags'] });
  assert.deepEqual(draft.events[0].prop_names, ['amount', 'is_paid', 'created_at', 'note']);
  assert.equal(draft.event_properties.length, 4);
}

// --event-name values must be legal AE event names.
{
  assert.throws(
    () => options({ default_event_name: undefined, event_name_field: 'event' }, ['Purchase']),
    (error: unknown) => error instanceof CliValidationError && error.code === 'LOCAL_DATA_PLAN_INVALID_EVENT_NAME',
  );
}

process.stdout.write('local data plan tests: passed\n');
