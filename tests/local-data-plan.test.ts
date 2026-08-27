import assert from 'node:assert/strict';
import { buildDraftFromMapping, dataIntegrationPlan } from '../src/commands/data-integration/plan.js';
import { validateDraft } from '../src/tracking/xlsx/write.js';
import { validateAndFix } from '../src/tracking/plan/fix.js';
import { CliValidationError } from '../src/core/errors.js';
import type { RuntimeContext } from '../src/framework/types.js';
import type { LocalDataMapping } from '../src/commands/data-integration/types.js';

const baseMapping: LocalDataMapping = {
  version: 'ae-data-integration-mapping/v1',
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

// array_row (object array) maps 1:1 to array_row; list (scalar array) stays array_string; object stays object.
{
  const draft = options({
    properties: [
      { source: 'tags', target: 'tags', type: 'list' },
      { source: 'items', target: 'items', type: 'array_row' },
      { source: 'extra', target: 'extra', type: 'object' },
    ],
  });
  const byName = Object.fromEntries(draft.event_properties.map((property) => [property.name, property]));
  assert.equal(byName.tags.type, 'array_string');
  assert.equal(byName.items.type, 'array_row');
  assert.equal(byName.extra.type, 'object');
}

// validateDraft rule 4: an object/array_row property must have at least one parent.child child.
{
  const draft = buildDraftFromMapping({
    mapping: { ...baseMapping, properties: [{ source: 'profile', target: 'profile', type: 'object' }] },
    planName: 'ecommerce', eventNames: [], appType: 'unknown', lang: 'zh',
  });
  assert.throws(() => validateDraft(draft), /"profile" has no child properties/);
}

// validateDraft rule 5: a composite parent's child must be scalar or array_string, never object/array_row.
{
  const draft = buildDraftFromMapping({
    mapping: { ...baseMapping, properties: [
      { source: 'profile', target: 'profile', type: 'object' },
      { source: 'profile.address', target: 'profile.address', type: 'object' },
      { source: 'profile.address.city', target: 'profile.address.city', type: 'string' },
    ] },
    planName: 'ecommerce', eventNames: [], appType: 'unknown', lang: 'zh',
  });
  assert.throws(() => validateDraft(draft), /composite children must be scalar or array_string/);
}

// A kept-whole object/array_row with dotted `parent.child` targets round-trips: the parent keeps
// its container type and each child becomes a `parent.child` plan property whose display_name/desc
// default to the leaf segment (never the parent source column).
{
  const draft = buildDraftFromMapping({
    mapping: { ...baseMapping, properties: [
      { source: 'profile', target: 'profile', type: 'object' },
      { source: 'profile', target: 'profile.name', type: 'string' },
      { source: 'profile', target: 'profile.age', type: 'number' },
      { source: 'orders', target: 'orders', type: 'array_row' },
      { source: 'orders', target: 'orders.sku', type: 'string' },
      { source: 'orders', target: 'orders.price', type: 'number' },
    ] },
    planName: 'ecommerce', eventNames: [], appType: 'unknown', lang: 'zh',
  });
  const byName = Object.fromEntries(draft.event_properties.map((property) => [property.name, property]));
  assert.equal(byName.profile.type, 'object');
  assert.equal(byName['profile.name'].type, 'string');
  assert.equal(byName['profile.name'].display_name, 'name');
  assert.equal(byName['profile.age'].type, 'number');
  assert.equal(byName.orders.type, 'array_row');
  assert.equal(byName['orders.sku'].type, 'string');
  assert.equal(byName['orders.sku'].display_name, 'sku');
  assert.doesNotThrow(() => validateDraft(draft));
}

// The full command path accepts a mapping with dotted `parent.child` targets and produces a valid
// draft (mapping validation + plan round-trip together).
await assert.doesNotReject(
  dataIntegrationPlan.execute(planCtx(JSON.stringify(mappingWith([
    { source: 'profile', target: 'profile', type: 'object' },
    { source: 'profile', target: 'profile.name', type: 'string' },
    { source: 'profile', target: 'profile.age', type: 'number' },
  ])))),
);

// validateAndFix auto-disambiguates a duplicate display_name within a pool (property name appended).
{
  const draft = buildDraftFromMapping({
    mapping: { ...baseMapping, properties: [
      { source: 'level', target: 'a_level', type: 'string' },
      { source: 'level', target: 'b_level', type: 'string' },
    ] },
    planName: 'ecommerce', eventNames: [], appType: 'unknown', lang: 'zh',
  });
  assert.deepEqual(draft.event_properties.map((property) => property.display_name), ['level', 'level']);
  validateAndFix(draft);
  assert.deepEqual(
    draft.event_properties.map((property) => property.display_name),
    ['level', 'level (b_level)'],
  );
}

// The command path fails fast on a composite property with no children, wrapping validateDraft's
// message in a LOCAL_DATA_PLAN_INVALID_DRAFT validation error before any upload.
await assert.rejects(
  dataIntegrationPlan.execute(planCtx(JSON.stringify({
    version: 'ae-data-integration-mapping/v1',
    source: { sha256: 'a'.repeat(64), format: 'csv', data_set: '$' },
    mode: 'track',
    confidence: 'high',
    account_id_field: 'user_id',
    default_event_name: 'purchase',
    time: { field: 't', format: 'auto', source_timezone: 'Asia/Shanghai' },
    properties: [{ source: 'profile', target: 'profile', type: 'object' }],
  }))),
  (error: unknown) => error instanceof CliValidationError && error.code === 'LOCAL_DATA_PLAN_INVALID_DRAFT',
);

function mappingWith(properties: LocalDataMapping['properties']): LocalDataMapping {
  return {
    version: 'ae-data-integration-mapping/v1',
    source: { sha256: 'a'.repeat(64), format: 'csv', data_set: '$' },
    mode: 'track',
    confidence: 'high',
    account_id_field: 'user_id',
    default_event_name: 'purchase',
    time: { field: 'time', format: 'auto', source_timezone: 'Asia/Shanghai' },
    properties,
  };
}

async function expectPlanInvalid(mapping: LocalDataMapping, hintPattern: RegExp): Promise<void> {
  await assert.rejects(
    dataIntegrationPlan.execute(planCtx(JSON.stringify(mapping))),
    (error: unknown) =>
      error instanceof CliValidationError
      && error.code === 'LOCAL_DATA_PLAN_INVALID_DRAFT'
      && (error.hint ?? '').match(hintPattern) !== null,
  );
}

// L1 — whole-chain positive round-trip. A valid mapping (scalars + a scalar-array list) must
// survive plan → validateAndFix → validateDraft and emerge with the exact AE prop types, proving
// the happy path needs no manual post-upload repair. object/array_row containers round-trip only
// when each declares its children as dotted `parent.child` targets (see the block above); a kept
// container with no children fails fast — see contract A.
{
  const draft = await dataIntegrationPlan.execute(planCtx(JSON.stringify(mappingWith([
    { source: 'amount', target: 'amount', type: 'number' },
    { source: 'is_paid', target: 'is_paid', type: 'boolean' },
    { source: 'created_at', target: 'created_at', type: 'datetime' },
    { source: 'tags', target: 'tags', type: 'list' },
    { source: 'note', target: 'note', type: 'string' },
  ]))));
  assert.doesNotThrow(() => validateDraft(draft));
  const byName = Object.fromEntries(draft.event_properties.map((property) => [property.name, property]));
  assert.equal(draft.event_properties.length, 5);
  assert.equal(byName.amount.type, 'number');
  assert.equal(byName.is_paid.type, 'bool');
  assert.equal(byName.created_at.type, 'datetime');
  assert.equal(byName.tags.type, 'array_string');
  assert.equal(byName.note.type, 'string');
  assert.deepEqual(draft.events[0].prop_names, ['amount', 'is_paid', 'created_at', 'tags', 'note']);
}

// L2 — negative contract matrix. One labeled entry per AE-side failure the local plan path must
// catch or fix BEFORE upload (the five errors the nested-JSON flow used to hit). A/B/C/D are
// plan-side; E (flatten path miss) is convert-side and asserted in local-data-mapping-extras.test.ts.
const planSideContract: Array<{ id: string; label: string; run: () => Promise<void> }> = [
  {
    id: 'A',
    label: 'complex_event_property_not_child_property — object with no parent.child',
    run: () => expectPlanInvalid(
      mappingWith([{ source: 'profile', target: 'profile', type: 'object' }]),
      /has no child properties/,
    ),
  },
  {
    id: 'B',
    label: 'complex_sub_event_property_type_error — composite child typed object (shared validateDraft rule the plan path also enforces)',
    run: async () => {
      // A composite-typed child (`profile.address` as `object`) is expressible as a dotted mapping
      // target but must still fail the shared validateDraft rule 5; the plan path invokes this same
      // validator, so rule 5 is asserted at that seam.
      const draft = buildDraftFromMapping({
        mapping: mappingWith([
          { source: 'profile', target: 'profile', type: 'object' },
          { source: 'profile.address', target: 'profile.address', type: 'object' },
          { source: 'profile.address.city', target: 'profile.address.city', type: 'string' },
        ]),
        planName: 'ecommerce', eventNames: [], appType: 'unknown', lang: 'zh',
      });
      assert.throws(() => validateDraft(draft), /composite children must be scalar or array_string/);
    },
  },
  {
    id: 'C',
    label: 'display_name duplicates — same source column under two object paths',
    run: async () => {
      const draft = await dataIntegrationPlan.execute(planCtx(JSON.stringify(mappingWith([
        { source: 'level', target: 'a_level', type: 'string' },
        { source: 'level', target: 'b_level', type: 'string' },
      ]))));
      assert.deepEqual(
        draft.event_properties.map((property) => property.display_name),
        ['level', 'level (b_level)'],
      );
    },
  },
  {
    id: 'D',
    label: 'list-of-objects must be declared array_row, never collapsed to array_string',
    run: async () => {
      const draft = buildDraftFromMapping({
        mapping: mappingWith([
          { source: 'items', target: 'items', type: 'array_row' },
          { source: 'tags', target: 'tags', type: 'list' },
        ]),
        planName: 'ecommerce', eventNames: [], appType: 'unknown', lang: 'zh',
      });
      const byName = Object.fromEntries(draft.event_properties.map((property) => [property.name, property]));
      assert.equal(byName.items.type, 'array_row');
      assert.equal(byName.tags.type, 'array_string');
    },
  },
];

for (const contract of planSideContract) {
  await contract.run().catch((error: unknown) => {
    throw new Error(
      `plan-side contract ${contract.id} failed (${contract.label}): ${error instanceof Error ? error.message : String(error)}`,
    );
  });
}

process.stdout.write('local data plan tests: passed\n');

function planCtx(mappingJson: string): RuntimeContext {
  return {
    str: (name) => (name === 'mapping' ? mappingJson : name === 'lang' ? 'zh' : ''),
    num: () => 0,
    optionalNum: () => undefined,
    bool: () => false,
    json: () => undefined,
    list: () => [],
    api: async () => undefined,
    communityReport: async () => undefined,
    localDataUpload: async () => undefined,
    querySql: async () => undefined,
    queryReportData: async () => undefined,
    token: async () => '',
    host: () => '',
    mcpUrl: () => undefined,
    service: () => 'tracking',
    out: async () => undefined,
  };
}
