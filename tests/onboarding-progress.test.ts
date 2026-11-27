import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { onboardingDemoCurrency } from '../src/core/onboarding/contracts.js';
import { isOnboardingProgressHost, verifyAndCompleteProgress } from '../src/core/onboarding/progress.js';
import { OnboardingRuntime } from '../src/core/onboarding/runtime.js';
import { OnboardingStore } from '../src/core/onboarding/session-store.js';

const overseasTestHost = 'https://plg-test-overseas-web.thinkingai.io';

test('shared progress uses the production product origins and the overseas test origin', () => {
  assert.equal(isOnboardingProgressHost('https://ae-web.thinkingai.cn/'), true);
  assert.equal(isOnboardingProgressHost('https://ae-web-global.thinkingai.io'), true);
  assert.equal(isOnboardingProgressHost(overseasTestHost + '/'), true);
  assert.equal(isOnboardingProgressHost('http://ae-web.thinkingai.cn'), false);
  assert.equal(isOnboardingProgressHost('https://ae-web.thinkingai.cn.example.org'), false);
  assert.equal(isOnboardingProgressHost(overseasTestHost + '.example.org'), false);
  assert.equal(isOnboardingProgressHost(overseasTestHost + ':8443'), false);
  assert.equal(isOnboardingProgressHost('https://plg-test-web.thinkingai.cn'), false);
  assert.equal(onboardingDemoCurrency(overseasTestHost, 'cn'), 'USD');
});

test('an existing overseas test account can check and start versioned onboarding on its own host', async t => {
  const root = mkdtempSync(join(tmpdir(), 'ae-onboarding-progress-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const progressActions: Array<Record<string, unknown>> = [];
  let signedIn = false;
  const runtime = new OnboardingRuntime(new OnboardingStore(root), {
    activeHost: () => overseasTestHost,
    authenticated: host => signedIn && host === overseasTestHost,
    credentialKey: () => 'test-credential',
    compatibility: async () => undefined,
    open: () => { throw new Error('The authenticated flow must not open a browser'); },
    capability: async (host, id, input) => {
      assert.equal(host, overseasTestHost);
      switch (id) {
        case 'analysis.plg_onboarding.progress':
          progressActions.push(input);
          if (input.action === 'start') return { state: 'in_progress', version: 2, journey_id: 'test-journey' };
          if (input.action === 'check_demo') return { state: 'ready' };
          return { state: 'not_started', version: 2 };
        case 'project.plg_demo.context':
          return { business_project: { project_id: 7 }, recommended_sample: 'star-island' };
        case 'project.plg_demo.ensure':
          return { status: 'ready', project_id: 40, sample_id: 'star-island', item_id: 'starlight-bundle' };
        default:
          throw new Error(id);
      }
    },
  });
  assert.deepEqual(await runtime.invoke('progress', { host: overseasTestHost }), { state: 'disabled' });
  assert.deepEqual(progressActions, []);
  signedIn = true;
  assert.deepEqual(await runtime.invoke('progress', { host: overseasTestHost }), { state: 'not_started', version: 2 });
  assert.deepEqual(progressActions, [{ action: 'status' }]);
  const result = await runtime.invoke('run', { choice: 'demo' });
  assert.equal(result.demo_project_id, 40);
  assert.deepEqual(progressActions, [
    { action: 'status' }, { action: 'status' }, { action: 'start', version: 2 }, { action: 'check_demo', demo_project_id: 40 },
  ]);
});

const exposureSchemas = [
  { label: 'legacy exposure columns', host: 'https://ae-web.thinkingai.cn', currency: 'CNY',
    columns: ['experiment_id', 'experiment_group_id'], refs: ['e.experiment_id', 'e.experiment_group_id'] },
  { label: 'reserved exposure columns', host: 'https://ae-web-global.thinkingai.io', currency: 'USD',
    columns: ['#experiment_id', '#experiment_group_id'], refs: ['e."#experiment_id"', 'e."#experiment_group_id"'] },
];

for (const { label, host, currency, columns, refs } of exposureSchemas) {
  test(`a shared experiment with ${label} completes only after the recorded exposures and outcomes are persisted`, async () => {
    const run = '1'.repeat(32);
    const checkpoint = {
      state: 'in_progress', run_id: run, journey_id: 'journey', demo_project_id: 9, experiment_id: 'exp-1',
      receipt: {
        sample_id: 'star-island', item_id: 'bundle', currency, timezone: '+08:00',
        start: '2026-11-23T12:00:00Z', end: '2026-11-23T12:00:05Z',
        arms: {
          control: { group_id: 'a', exposed_account_ids: ['alice'], paid_account_ids: [], coupon_claim_account_ids: [] },
          treatment: { group_id: 'b', exposed_account_ids: ['bob'],
            paid_account_ids: ['bob'], coupon_claim_account_ids: ['bob'] },
        },
      },
    };
    const rows = [
      ['te_experiment_exposure', 'alice', 'a'],
      ['te_experiment_exposure', 'bob', 'b'],
      ['demo_coupon_claim', 'bob', ''],
    ];
    let completed = false;
    const capability = async (_host: string, id: string, input: Record<string, unknown>) => {
      switch (id) {
        case 'analysis.plg_onboarding.progress':
          if (input.action === 'status') return checkpoint;
          assert.deepEqual(input, { action: 'complete', journey_id: 'journey',
            run_id: run, demo_project_id: 9, experiment_id: 'exp-1' });
          completed = true;
          return { state: 'completed' };
        case 'analysis.sql_table.list':
          return { items: [{ table_type: 'eventView', sql_reference: '"hive"."te"."v_event_9"' }], has_more: false };
        case 'analysis.sql_table.columns':
          return { columns: ['#event_time', '$part_date', '$part_event', 'plg_sample_id', 'item_id',
            'plg_seed_event_id', '#account_id', ...columns].map(column => ({ column })) };
        case 'analysis.adhoc.run': {
          const { sql } = input.definition as { sql: string };
          assert.ok(sql.includes(`CAST(${refs[0]} AS varchar) = 'exp-1'`));
          assert.ok(sql.includes(`CAST(${refs[1]} AS varchar) ELSE ''`));
          assert.ok(sql.includes(`e.currency = '${currency}'`));
          assert.ok(sql.includes(`e.demo_run_id = '${run}'`));
          return { rows, has_more: false };
        }
        default:
          throw new Error(id);
      }
    };
    const verify = () => verifyAndCompleteProgress({ capability }, host, run);
    assert.equal((await verify()).state, 'in_progress');
    assert.equal(completed, false);
    rows.push(['payment_success', 'bob', '']);
    assert.equal((await verify()).state, 'completed');
    assert.equal(completed, true);
  });
}

test('US progress refuses legacy replays without an explicitly USD currency', async () => {
  const run = '1'.repeat(32);
  const checkpoint = {
    state: 'in_progress', run_id: run, journey_id: 'journey', demo_project_id: 9, experiment_id: 'exp-1',
    receipt: {
      sample_id: 'star-island', item_id: 'bundle', timezone: '+00:00',
      start: '2026-11-23T12:00:00Z', end: '2026-11-23T12:00:05Z',
      arms: {
        control: { group_id: 'a', exposed_account_ids: ['alice'], paid_account_ids: [], coupon_claim_account_ids: [] },
        treatment: { group_id: 'b', exposed_account_ids: ['bob'], paid_account_ids: ['bob'], coupon_claim_account_ids: [] },
      },
    },
  };
  for (const currency of [undefined, 'CNY']) {
    const receipt = currency ? { ...checkpoint.receipt, currency } : checkpoint.receipt;
    const capability = async (_host: string, id: string, input: Record<string, unknown>) => {
      assert.equal(id, 'analysis.plg_onboarding.progress');
      assert.deepEqual(input, { action: 'status' });
      return { ...checkpoint, receipt };
    };
    await assert.rejects(verifyAndCompleteProgress({ capability }, 'https://ae-web-global.thinkingai.io', run),
      /saved Demo replay does not use USD/);
    await assert.rejects(verifyAndCompleteProgress({ capability }, 'https://onboarding-sandbox.invalid', run, 'us'),
      /saved Demo replay does not use USD/);
  }
});
