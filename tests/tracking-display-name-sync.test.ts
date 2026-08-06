import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setCliTokenManual, clearCliToken } from '../src/core/cli-token.js';
import { trackingPlanSyncDisplayNames } from '../src/commands/te-analysis/tracking/plan/sync-display-names.js';
import {
  assertTrackingDraft,
  buildDisplayNameSyncPlan,
} from '../src/tracking/plan/display-name-sync.js';
import type { Draft } from '../src/tracking/plan/types.js';

const draft: Draft = {
  meta: {
    app_type: 'web',
    sdk_integration_mode: 'client_only',
    plan_name: 'Display name sync test',
  },
  events: [
    {
      event_name: 'signup',
      display_name: '注册',
      source: 'codebase',
      prop_names: ['channel'],
    },
    {
      event_name: 'purchase',
      display_name: '支付成功',
      source: 'codebase',
      prop_names: ['amount'],
    },
    {
      event_name: 'missing_event_label',
      source: 'codebase',
      prop_names: [],
    },
  ],
  common_event_properties: [
    {
      name: 'channel',
      type: 'string',
      source: 'codebase',
    },
  ],
  event_properties: [
    {
      name: 'channel',
      display_name: '渠道',
      type: 'string',
      source: 'codebase',
    },
    {
      name: 'amount',
      display_name: '订单金额',
      type: 'number',
      source: 'codebase',
    },
  ],
  user_properties: [
    {
      name: 'vip_level',
      display_name: '会员等级',
      type: 'string',
      source: 'codebase',
    },
    {
      name: 'account@country',
      display_name: '账号国家',
      type: 'string',
      source: 'codebase',
    },
  ],
};

const plan = buildDisplayNameSyncPlan(draft, {
  events: [
    { event_name: 'signup', event_desc: '' },
    { event_name: 'purchase', event_desc: '现有支付名称' },
  ],
  eventProperties: [
    { prop_name: 'channel', prop_desc: null },
    { prop_name: 'amount', prop_desc: '现有金额名称' },
  ],
  userProperties: [
    { prop_name: 'vip_level', prop_desc: '   ' },
    { prop_name: 'account@country', prop_desc: '' },
  ],
});

assert.deepEqual(plan.event.items, [
  { event_name: 'signup', event_desc: '注册' },
]);
assert.deepEqual(plan.event.skippedExisting, ['purchase']);
assert.deepEqual(plan.event.missingInDraft, ['missing_event_label']);
assert.deepEqual(plan.event_property.items, [
  { prop_name: 'channel', prop_desc: '渠道' },
]);
assert.deepEqual(plan.event_property.skippedExisting, ['amount']);
assert.deepEqual(plan.event_property.missingInDraft, []);
assert.deepEqual(plan.user_property.items, [
  { prop_name: 'vip_level', prop_desc: '会员等级' },
  { prop_name: 'account@country', prop_desc: '账号国家' },
]);

assert.throws(
  () =>
    buildDisplayNameSyncPlan(
      {
        ...draft,
        common_event_properties: [
          {
            name: 'channel',
            display_name: '来源渠道',
            type: 'string',
            source: 'codebase',
          },
        ],
      },
      {
        events: [],
        eventProperties: [],
        userProperties: [],
      },
    ),
  /conflicting display names/,
);

assert.throws(
  () => assertTrackingDraft({ events: [] }),
  /event_properties.*must be an array/,
);

const host = 'http://localhost';
const tempDir = await mkdtemp(path.join(tmpdir(), 'ae-display-name-sync-'));
const draftPath = path.join(tempDir, 'draft.json');
const previousFetch = globalThis.fetch;
const requests: Array<{ url: string; body: any }> = [];
try {
  await writeFile(draftPath, JSON.stringify(draft), 'utf8');
  setCliTokenManual('cli-test-token', host);
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    requests.push({ url, body });

    let data: unknown = {};
    if (url.includes('metadata.event.list')) {
      data = body?.input?.offset === 0
        ? {
            events: [{ event_name: 'purchase', event_desc: '现有支付名称' }],
            total: 2,
            limit: 200,
            offset: 0,
            has_more: true,
            next_offset: 200,
          }
        : {
            events: [{ event_name: 'signup', event_desc: '' }],
            total: 2,
            limit: 200,
            offset: 200,
            has_more: false,
            next_offset: null,
          };
    } else if (url.includes('metadata.property.list')) {
      data =
        body?.input?.table_type === 'event'
          ? {
              properties: [
                { prop_name: 'channel', prop_desc: '' },
                { prop_name: 'amount', prop_desc: '现有金额名称' },
              ],
              total: 2,
              limit: 200,
              offset: 0,
              has_more: false,
              next_offset: null,
            }
          : {
              properties: [
                { prop_name: 'vip_level', prop_desc: '' },
                { prop_name: 'account@country', prop_desc: '' },
              ],
              total: 2,
              limit: 200,
              offset: 0,
              has_more: false,
              next_offset: null,
            };
    } else if (url.includes('metadata.super_metadata.batch_edit')) {
      data = { updated_count: body?.input?.items?.length ?? 0 };
    }
    return new Response(JSON.stringify({ ok: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const result = (await trackingPlanSyncDisplayNames.execute({
    str: (name) => (name === 'draft' ? draftPath : ''),
    num: () => 63,
    optionalNum: () => undefined,
    bool: () => false,
    json: () => undefined,
    api: async () => undefined,
    communityReport: async () => undefined,
    querySql: async () => undefined,
    queryReportData: async () => undefined,
    token: async () => 'cli-test-token',
    host: () => host,
    mcpUrl: () => undefined,
    service: () => 'tracking',
    out: async () => undefined,
  })) as any;

  assert.deepEqual(result.updated, {
    event: 1,
    event_property: 1,
    user_property: 2,
  });
  const eventListRequests = requests.filter((request) =>
    request.url.includes('metadata.event.list'),
  );
  assert.deepEqual(
    eventListRequests.map((request) => ({
      limit: request.body.input.limit,
      offset: request.body.input.offset,
    })),
    [
      { limit: 200, offset: 0 },
      { limit: 200, offset: 200 },
    ],
  );
  const edits = requests.filter((request) =>
    request.url.includes('metadata.super_metadata.batch_edit'),
  );
  assert.deepEqual(
    edits.map((request) => request.body.input),
    [
      {
        project_id: 63,
        type: 'event',
        items: [{ event_name: 'signup', event_desc: '注册' }],
      },
      {
        project_id: 63,
        type: 'event_property',
        items: [{ prop_name: 'channel', prop_desc: '渠道' }],
      },
      {
        project_id: 63,
        type: 'user_property',
        items: [
          { prop_name: 'vip_level', prop_desc: '会员等级' },
          { prop_name: 'account@country', prop_desc: '账号国家' },
        ],
      },
    ],
  );
} finally {
  globalThis.fetch = previousFetch;
  clearCliToken(host);
  await rm(tempDir, { recursive: true, force: true });
}

process.stdout.write('tracking display-name sync tests passed\n');
