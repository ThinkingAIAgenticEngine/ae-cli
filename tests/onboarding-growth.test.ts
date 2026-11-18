import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, type TestContext } from 'node:test';
import { CapabilityGatewayError } from '../src/core/capability-api.js';
import { isOnboardingInvocation } from '../src/core/onboarding/entrypoint.js';
import { onboardingEvidenceLinks } from '../src/core/onboarding/interaction.js';
import { OnboardingRuntime } from '../src/core/onboarding/runtime.js';
import { OnboardingStore } from '../src/core/onboarding/session-store.js';

const host = 'https://plg.example.test';
const samples = {
  'star-island': { project: 40, item: 'starlight-bundle', size: 140, head: 18, tail: 10, summary: [96, 14, 44, 16, 140, 50, 30], checkout: [107, 116] },
  'season-pass': { project: 41, item: 'season-pass-item', size: 120, head: 12, tail: 20, summary: [76, 8, 44, 12, 120, 48, 20], checkout: [85, 92] },
};
type Sample = keyof typeof samples;

function expectedAccounts(sample: Sample): string[] {
  const { size, head, tail } = samples[sample];
  return Array.from({ length: size }, (_, index) => index + 1)
    .filter(index => index <= head || index > size - tail)
    .map(index => `${sample}-user-${index}`);
}

function checkoutAccounts(sample: Sample): string[] {
  const { size, tail, checkout: [start, end] } = samples[sample];
  return Array.from({ length: size }, (_, index) => index + 1)
    .filter(index => (index >= start && index <= end) || index > size - tail)
    .map(index => `${sample}-user-${index}`);
}

test('checkout scenario and start-only options keep onboarding in its dedicated CLI runtime', () => {
  for (const command of ['growth', 'experiment-plan']) {
    assert.ok(isOnboardingInvocation(['analysis', 'onboarding', command, '--scenario', 'checkout-recovery', '--format', 'json']));
  }
  assert.ok(isOnboardingInvocation(['analysis', 'onboarding', 'experiment-launch', '--start-only', 'true', '--format', 'json']));
});

test('links to the demo funnel only within the selected project', () => {
  const native = { funnel_report_url: '/#/tga/funnel/40_5' };
  assert.deepEqual(onboardingEvidenceLinks(native, 40, host), { funnel_report_url: `${host}/#/tga/funnel/40_5` });
  assert.deepEqual(onboardingEvidenceLinks(native, 40), native);
  assert.equal(onboardingEvidenceLinks(native, 41), undefined);
  assert.equal(onboardingEvidenceLinks({ funnel_report_url: '/#/tga/ide/40_4' }, 40), undefined);
});

type CapabilityCall = { id: string; input: Record<string, unknown> };

function fixture(t: TestContext, experiment?: (call: CapabilityCall) => Promise<unknown>) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-plg-growth-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const store = new OnboardingStore(directory);
  const sessionId = randomUUID();
  const calls: CapabilityCall[] = [];
  const uploads: { endpoint: string; body: string }[] = [];
  const control = { sample: 'star-island' as Sample, status: 'ready', start: '2026-11-01', end: '2026-11-07', credential: 'k',
    truncated: false, unmapped: 0, wrongReceiverProject: false, checkoutCount: undefined as number | undefined };
  const select = (sample: Sample) => {
    control.sample = sample;
    store.save({ schema_version: 1, id: sessionId, host, choice: 'demo', sample_id: sample, credential_key: 'k', updated_at: '' });
  };
  select(control.sample);
  const runtime = new OnboardingRuntime(store, {
    authenticated: () => true,
    credentialKey: () => control.credential,
    compatibility: async () => undefined,
    approverOpenId: async () => 'signed-in',
    now: experiment ? Date.now : () => Date.parse('2026-11-12T01:02:03.456Z'),
    upload: async (endpoint, body) => {
      uploads.push({ endpoint, body });
      return { code: 0, message: 'accepted', http_status: 200, request_bytes: body.length, response_bytes: 0 };
    },
    capability: async (actualHost, id, input) => {
      assert.equal(actualHost, host);
      calls.push({ id, input });
      const sample = samples[control.sample];
      if (id === 'project.plg_demo.context') return { recommended_sample: control.sample };
      if (id === 'project.plg_demo.status' || id === 'project.plg_demo.ensure') {
        assert.deepEqual(input, { sample_id: control.sample });
        return { status: control.status, project_id: sample.project, sample_id: control.sample,
          item_id: sample.item, start_date: control.start, end_date: control.end, zone_offset: 0,
          ...(control.sample === 'star-island' ? { evidence: {
            dashboard_url: `/#/panel/panel/${sample.project}_22`,
            purchase_rate_report_url: `/#/tga/ide/${sample.project}_3`,
            funnel_report_url: `/#/tga/funnel/${sample.project}_5`,
          } } : {}) };
      }
      assert.equal(input.project_id, sample.project);
      const table = `"hive"."ta"."v_event_${sample.project}"`;
      if (id === 'project.info.get') return { project_id: control.wrongReceiverProject ? 999 : sample.project,
        appid: 'private-demo-appid', public_receiver_address: 'https://receiver.example.test/', default_time_zone_offset: 0 };
      if (id === 'analysis.sql_table.list') return { items: [{ table_type: 'eventView', sql_reference: table }], has_more: false };
      if (id === 'analysis.sql_table.columns') {
        assert.equal(input.table_ref, table);
        return { columns: ['#account_id', '#event_time', '$part_date', '$part_event', 'plg_sample_id', 'item_id', 'plg_seed_event_id']
          .map(column => ({ column })) };
      }
      if (id === 'analysis.adhoc.run') {
        assert.equal(input.model_type, 'sql');
        assert.equal(Object.hasOwn(input, 'zone_offset'), false);
        const sql = (input.definition as { sql: string }).sql;
        const exclusiveEnd = new Date(Date.parse(control.end) + 86_400_000).toISOString().slice(0, 10);
        for (const expected of [table, '$part_date', 'plg_seed_event_id', 'item_detail_view', 'checkout_start', 'payment_success',
          control.sample, sample.item, control.start, exclusiveEnd]) {
          assert.ok(sql.includes(expected), `query includes ${expected}`);
        }
        const checkout = checkoutAccounts(control.sample).slice(0, control.checkoutCount);
        return { has_more: control.truncated, returned_rows: 1,
          title: ['single_viewers', 'single_buyers', 'multi_viewers', 'multi_buyers', 'funnel_viewers', 'funnel_checkout', 'funnel_buyers',
            'account_ids_json', 'checkout_unpaid', 'checkout_account_ids_json', 'unmapped_accounts'],
          rows: [[...sample.summary, JSON.stringify(expectedAccounts(control.sample)), checkout.length, JSON.stringify(checkout), control.unmapped]] };
      }
      if (id === 'experiment.approver.add') return { result: true };
      if (experiment && id.startsWith('experiment.')) return experiment({ id, input });
      assert.fail(`Unexpected capability ${id}`);
    },
  });
  return { runtime, directory, sessionId, calls, select, control, uploads };
}

test('growth queries AE once per Demo scope and saves a private cohort that can be reused', async t => {
  const f = fixture(t);
  const receipts = new Set<string>();
  for (const sample of Object.keys(samples) as Sample[]) {
    f.select(sample);
    const before = f.calls.length;
    const result = await f.runtime.invoke('growth', { session_id: f.sessionId });
    assert.equal(result.phase, 'ready');
    assert.equal(result.analysis_version, 2);
    assert.equal(result.scenario, 'item-coupon');
    assert.equal(result.cached, false);
    assert.equal(result.demo_project_id, samples[sample].project);
    assert.equal(result.sample_id, sample);
    assert.equal(result.item_id, samples[sample].item);
    const [singleViewers, singleBuyers, multiViewers, multiBuyers, viewers, checkout, buyers] = samples[sample].summary;
    assert.deepEqual(result.single_day, { viewers: singleViewers, buyers: singleBuyers });
    assert.deepEqual(result.multi_day, { viewers: multiViewers, buyers: multiBuyers });
    assert.deepEqual(result.funnel, { viewers, checkout, buyers });
    assert.deepEqual(result.purchase_rates, { single_day: singleBuyers / singleViewers, multi_day: multiBuyers / multiViewers,
      difference_pp: (multiBuyers / multiViewers - singleBuyers / singleViewers) * 100 });
    assert.deepEqual(result.charts, {
      purchase_rate: { type: 'bar', data: [
        { label: 'Single-day viewers', value: Math.round(singleBuyers * 1000 / singleViewers) / 10 },
        { label: 'Multi-day viewers', value: Math.round(multiBuyers * 1000 / multiViewers) / 10 },
      ] },
      funnel: { type: 'bar', data: [
        { label: 'Viewed', value: viewers }, { label: 'Started checkout', value: checkout }, { label: 'Paid', value: buyers },
      ] },
    });
    const followUp = result.follow_up_chart as { type: string; data: { label: string; value: number }[]; markdown: string };
    assert.equal(followUp.type, 'bar');
    assert.deepEqual(followUp.data, [
      { label: 'Multi-day viewers, unpaid', value: multiViewers - multiBuyers },
      { label: 'Single-day viewers, unpaid', value: singleViewers - singleBuyers },
      { label: 'Paid viewers', value: singleBuyers + multiBuyers },
    ]);
    assert.match(followUp.markdown, new RegExp(`Multi-day viewers, unpaid · █+ \\*\\*${multiViewers - multiBuyers}\\*\\*`));
    assert.deepEqual(result.evidence, sample === 'star-island' ? {
      dashboard_url: `${host}/#/panel/panel/${samples[sample].project}_22`,
      purchase_rate_report_url: `${host}/#/tga/ide/${samples[sample].project}_3`,
      funnel_report_url: `${host}/#/tga/funnel/${samples[sample].project}_5`,
    } : undefined);
    assert.deepEqual((result.interaction as { options: { value: string }[] }).options.map(option => option.value), ['follow_up', 'change_sample']);
    assert.equal(result.follow_up_count, multiViewers - multiBuyers);
    assert.deepEqual(f.calls.slice(before).map(call => call.id), [
      'project.plg_demo.status', 'analysis.sql_table.list', 'analysis.sql_table.columns', 'analysis.adhoc.run',
    ]);
    const receipt = String(result.cohort_path);
    assert.ok(path.isAbsolute(receipt));
    assert.equal(path.dirname(receipt), f.directory);
    receipts.add(receipt);
    if (process.platform !== 'win32') assert.equal(fs.statSync(receipt).mode & 0o077, 0);
    const saved = JSON.parse(fs.readFileSync(receipt, 'utf8'));
    assert.equal(saved.schemaVersion, 1);
    assert.equal(saved.sessionId, f.sessionId);
    assert.equal(saved.host, host);
    assert.equal(saved.projectId, samples[sample].project);
    assert.equal(saved.sampleId, sample);
    assert.equal(saved.itemId, samples[sample].item);
    assert.equal(saved.startDate, f.control.start);
    assert.equal(saved.endDate, f.control.end);
    assert.equal(saved.zoneOffset, 0);
    assert.deepEqual([...saved.accountIds].sort(), expectedAccounts(sample).sort());
    assert.ok(!JSON.stringify(result).includes(`${sample}-user-`));
    const repeat = await f.runtime.invoke('growth', { session_id: f.sessionId, scenario: 'checkout-recovery' });
    assert.equal(repeat.cached, true);
    assert.equal(repeat.scenario, 'checkout-recovery');
    const unpaid = sample === 'star-island' ? 20 : 28;
    assert.equal(repeat.follow_up_count, unpaid);
    assert.deepEqual(repeat.checkout_recovery, { unpaid_count: unpaid, unpaid_rate: unpaid / checkout });
    assert.deepEqual((repeat.follow_up_chart as typeof followUp).data, [
      { label: 'Started checkout', value: checkout },
      { label: 'Paid after checkout', value: buyers },
      { label: 'Checkout without payment', value: unpaid },
    ]);
    assert.match((repeat.follow_up_chart as typeof followUp).markdown, new RegExp(`Checkout without payment · █+ \\*\\*${unpaid}\\*\\*`));
    assert.deepEqual(saved.checkoutAccountIds, checkoutAccounts(sample));
    assert.ok(!JSON.stringify(repeat).includes(`${sample}-user-`));
    assert.equal(repeat.cohort_path, receipt);
    assert.equal(f.calls.length - before, 5);
    assert.equal(f.calls.at(-1)?.id, 'project.plg_demo.status');
  }
  assert.equal(receipts.size, 2);
  f.control.start = '2026-11-02';
  f.control.end = '2026-11-08';
  const changedWindow = await f.runtime.invoke('growth', { session_id: f.sessionId });
  assert.equal(changedWindow.cached, false);
  assert.ok(!receipts.has(String(changedWindow.cohort_path)));
});

test('growth dry-run leaves the session unchanged and waits when the Demo is preparing', async t => {
  const f = fixture(t);
  const files = fs.readdirSync(f.directory);
  const plan = await f.runtime.invoke('growth-plan', { session_id: f.sessionId });
  assert.equal(plan.dry_run, true);
  assert.deepEqual(f.calls, []);
  assert.deepEqual(fs.readdirSync(f.directory), files);
  f.control.status = 'initialized';
  const pending = await f.runtime.invoke('growth', { session_id: f.sessionId });
  assert.equal(pending.phase, 'pending');
  assert.equal(pending.next_action, 'poll_demo');
  assert.equal(pending.cohort_path, undefined);
  assert.deepEqual(f.calls.map(call => call.id), ['project.plg_demo.status']);
  assert.deepEqual(fs.readdirSync(f.directory), files);
});

test('growth publishes no cached cohort under a different credential', async t => {
  const f = fixture(t);
  assert.equal((await f.runtime.invoke('growth', { session_id: f.sessionId })).phase, 'ready');
  f.control.credential = 'another-account';
  const before = f.calls.length;
  const result = await f.runtime.invoke('growth', { session_id: f.sessionId });
  assert.equal(result.phase, 'action_required');
  assert.equal(result.cohort_path, undefined);
  assert.equal(f.calls.length, before);
});

test('growth declines truncated or unmapped evidence without persisting account IDs', async t => {
  const f = fixture(t);
  const files = fs.readdirSync(f.directory);
  f.control.truncated = true;
  await assert.rejects(f.runtime.invoke('growth', { session_id: f.sessionId }), /complete Demo growth result/);
  f.control.truncated = false;
  f.control.unmapped = 1;
  await assert.rejects(f.runtime.invoke('growth', { session_id: f.sessionId }), /incomplete or inconsistent Demo growth evidence/);
  assert.deepEqual(fs.readdirSync(f.directory), files);
});

test('experiment-plan prepares an approver by default and saves a private proposal', async t => {
  const f = fixture(t);
  await f.runtime.invoke('run', { session_id: f.sessionId });
  f.calls.length = 0;
  const plan = await f.runtime.invoke('experiment-plan', { session_id: f.sessionId });
  assert.equal(plan.phase, 'ready');
  assert.equal(plan.next_action, 'confirm_experiment');
  assert.equal(plan.demo_project_id, samples['star-island'].project);
  assert.equal(plan.item_id, samples['star-island'].item);
  assert.equal(plan.experiment_type, 'item-coupon');
  assert.equal((plan.plan as { audience_count: number }).audience_count, 28);
  assert.ok(!JSON.stringify(plan).includes('star-island-user-'));
  assert.deepEqual(plan.approver, { status: 'ready' });
  assert.deepEqual(f.calls, [{ id: 'experiment.approver.add', input: { project_id: samples['star-island'].project, approvers: ['signed-in'] } }]);
  const { plan_path, plan_preview_markdown, ...saved } = plan;
  assert.equal(plan_preview_markdown, [
    '| A · Control | B · Treatment |',
    '| --- | --- |',
    '| Full-price reminder | 20% coupon |',
    '| 100 CNY · 50% | 80 CNY · 50% |',
  ].join('\n'));
  assert.equal(path.dirname(String(plan_path)), f.directory);
  assert.deepEqual(JSON.parse(fs.readFileSync(String(plan_path), 'utf8')), saved);
  if (process.platform !== 'win32') assert.equal(fs.statSync(String(plan_path)).mode & 0o077, 0);
});

test('coupon plans expose approver preparation failures and accept the legacy flag', async t => {
  const f = fixture(t);
  await f.runtime.invoke('run', { session_id: f.sessionId });
  f.runtime.dependencies.approverOpenId = async () => { throw new Error('Approver lookup unavailable'); };
  const failed = await f.runtime.invoke('experiment-plan', { session_id: f.sessionId });
  assert.deepEqual(failed.approver, { status: 'failed', message: 'Approver lookup unavailable' });
  assert.deepEqual(JSON.parse(fs.readFileSync(String(failed.plan_path), 'utf8')).approver, failed.approver);
  f.runtime.dependencies.approverOpenId = async () => 'signed-in';
  const recovered = await f.runtime.invoke('experiment-plan', { session_id: f.sessionId, prepare_approver: true });
  assert.deepEqual(recovered.approver, { status: 'ready' });
});

test('experiment-plan refreshes legacy Demo scope once and rejects a different account', async t => {
  const f = fixture(t);
  f.select('season-pass');
  const preview = await f.runtime.invoke('experiment-plan-preview', { session_id: f.sessionId });
  assert.deepEqual(preview.capabilities, ['project.plg_demo.status', 'experiment.approver.add']);
  assert.deepEqual(f.calls, []);
  const plan = await f.runtime.invoke('experiment-plan', { session_id: f.sessionId });
  assert.equal((plan.plan as { audience_count: number }).audience_count, 32);
  assert.equal(plan.demo_project_id, samples['season-pass'].project);
  assert.deepEqual(f.calls.map(call => call.id), ['project.plg_demo.status', 'experiment.approver.add']);
  await f.runtime.invoke('experiment-plan', { session_id: f.sessionId });
  assert.equal(f.calls.length, 3);
  f.control.credential = 'different';
  const blocked = await f.runtime.invoke('experiment-plan', { session_id: f.sessionId });
  assert.equal(blocked.next_action, 'resume_onboarding');
  assert.equal(blocked.plan_path, undefined);
  assert.equal(f.calls.length, 3);
});

test('experiment-plan optionally submits one synthetic payment only to the scoped Demo receiver', async t => {
  const f = fixture(t);
  await f.runtime.invoke('run', { session_id: f.sessionId });
  f.calls.length = 0;
  const input = { session_id: f.sessionId, upload_metric_event: true };
  const preview = await f.runtime.invoke('experiment-plan-preview', input);
  assert.deepEqual(preview.capabilities, ['project.info.get', 'experiment.approver.add']);
  assert.deepEqual(f.uploads, []);

  const plan = await f.runtime.invoke('experiment-plan', input);
  const event = plan.metric_event as { status: string; event_id: string; persistence_verified: boolean };
  assert.equal(event.status, 'receiver_accepted');
  assert.equal(event.persistence_verified, false);
  assert.deepEqual(f.calls.map(call => call.id).sort(), ['experiment.approver.add', 'project.info.get']);
  assert.equal(f.uploads.length, 1);
  assert.equal(f.uploads[0].endpoint, 'https://receiver.example.test/sync_json');
  assert.deepEqual(JSON.parse(f.uploads[0].body), [{
    appid: 'private-demo-appid', debug: 0, data: {
      '#type': 'track', '#event_name': 'payment_success', '#account_id': 'star-island-user-1',
      '#time': '2026-11-12 01:02:03.456', '#uuid': event.event_id,
      properties: { '#zone_offset': 0, plg_sample_id: 'star-island', item_id: 'starlight-bundle',
        amount: 100, currency: 'CNY', order_id: event.event_id },
    },
  }]);
  assert.ok(!JSON.stringify(plan).includes('private-demo-appid'));

  f.control.wrongReceiverProject = true;
  const blocked = await f.runtime.invoke('experiment-plan', input);
  assert.equal(blocked.phase, 'ready');
  assert.equal((blocked.metric_event as { status: string }).status, 'not_sent');
  assert.equal(f.uploads.length, 1);
});

test('checkout plans prepare approvers and preserve each private cohort', async t => {
  const f = fixture(t);
  const input = { session_id: f.sessionId, scenario: 'checkout-recovery' };
  const preview = await f.runtime.invoke('experiment-plan-preview', input);
  assert.equal(preview.scenario, 'checkout-recovery');
  assert.deepEqual(f.calls, []);
  assert.equal((await f.runtime.invoke('experiment-plan', input)).next_action, 'run_checkout_recovery_growth');
  await assert.rejects(f.runtime.invoke('experiment-plan', { ...input, upload_metric_event: true }), /prepares the plan locally/);
  for (const sample of Object.keys(samples) as Sample[]) {
    f.select(sample);
    await f.runtime.invoke('growth', input);
    const before = f.calls.length;
    const plan = await f.runtime.invoke('experiment-plan', input);
    assert.equal(plan.experiment_type, 'checkout-recovery');
    assert.equal(plan.demo_project_id, samples[sample].project);
    assert.equal(plan.item_id, samples[sample].item);
    const details = plan.plan as { audience_count: number; arms: { price: number; allocation: number }[] };
    assert.equal(details.audience_count, checkoutAccounts(sample).length);
    assert.deepEqual(details.arms.map(arm => [arm.price, arm.allocation]), [[100, 50], [100, 50]]);
    assert.equal(plan.plan_preview_markdown, [
      '| A · Control | B · Treatment |',
      '| --- | --- |',
      '| Reminder to product details | Reminder directly to checkout |',
      '| 100 CNY · 50% | 100 CNY · 50% |',
    ].join('\n'));
    assert.deepEqual(plan.approver, { status: 'ready' });
    assert.deepEqual(f.calls.slice(before), [{ id: 'experiment.approver.add',
      input: { project_id: samples[sample].project, approvers: ['signed-in'] } }]);
    assert.ok(!JSON.stringify(plan).includes(`${sample}-user-`));
    const saved = JSON.parse(fs.readFileSync(String(plan.plan_path), 'utf8'));
    assert.deepEqual(saved.checkout_cohort, { start_date: f.control.start, end_date: f.control.end,
      zone_offset: 0, account_ids: checkoutAccounts(sample) });
    if (process.platform !== 'win32') assert.equal(fs.statSync(String(plan.plan_path)).mode & 0o077, 0);
  }
  f.select('star-island');
  f.control.start = '2026-11-02';
  f.control.end = '2026-11-08';
  f.control.checkoutCount = 1;
  const insufficient = await f.runtime.invoke('growth', input);
  assert.equal(insufficient.follow_up_count, 1);
  assert.equal((insufficient.interaction as { step: string }).step, 'offer_growth_questions');
  assert.match((insufficient.follow_up_chart as { markdown: string }).markdown, /Checkout without payment · █ \*\*1\*\*/);
  const blocked = await f.runtime.invoke('experiment-plan', input);
  assert.equal(blocked.next_action, 'choose_growth_scenario');
  assert.equal(blocked.run_id, undefined);
  assert.equal(f.uploads.length, 0);
});

test('checkout launch waits for the coupon experiment, then returns a link before replaying the saved audience', async t => {
  let active = true;
  let start = '';
  let draft: { expName: string; featureKeyList: string[];
    targeting: { definitionRequest: { conditions: { items: { values: string[] }[] } } } };
  const f = fixture(t, async ({ id, input }) => {
    switch (id) {
      case 'experiment.experiment.list':
        if (input.query_name === 'Demo offer A/B') {
          return { items: [{ exp_name: 'Demo offer A/B (previous)', exp_id: 'old', status: active ? 'running' : 'ended' }] };
        }
        assert.equal(input.query_name, 'Demo checkout recovery A/B');
        return { items: [{ exp_name: draft.expName, exp_id: 'checkout-1', status: 'running' }] };
      case 'experiment.metric.save':
      case 'experiment.feature.save':
        return { result: true };
      case 'experiment.experiment.save':
        draft = input.req as typeof draft;
        return { result: 'checkout-1' };
      case 'experiment.experiment.ready-check':
        return { readiness: { valid: true } };
      case 'experiment.approval.submit':
        return { result: 'checkout-1' };
      case 'experiment.approval.get':
        return { item: { approval_id: 1, state: 'approved', configuration: {
          exp_id: 'checkout-1', exp_name: draft.expName, feature_key_list: draft.featureKeyList,
        } } };
      case 'experiment.experiment.manage':
        start = new Date().toISOString();
        return { result: true };
      case 'experiment.experiment.get':
        return { item: { exp_id: 'checkout-1', status: start ? 'running' : 'pending', start_time: start,
          groups: [{ is_control: 1, exp_group_id: 'details' }, { is_control: 0, exp_group_id: 'checkout' }] } };
      default:
        assert.fail(`Unexpected capability ${id}`);
    }
  });
  const scenario = { session_id: f.sessionId, scenario: 'checkout-recovery' };
  await f.runtime.invoke('growth', scenario);
  const plan = await f.runtime.invoke('experiment-plan', scenario);
  const input = { session_id: f.sessionId, run_id: String(plan.run_id) };
  const preview = await f.runtime.invoke('experiment-launch-preview', { ...input, start_only: true });
  assert.ok((preview.steps as string[]).includes('start'));
  assert.ok(!(preview.steps as string[]).includes('upload_one_replay_batch'));
  const blocked = await f.runtime.invoke('experiment-launch', { ...input, start_only: true });
  assert.equal(blocked.next_action, 'wait_for_other_demo_experiment');
  assert.match(String(blocked.active_experiment_url), /expId=old/);
  assert.ok(!f.calls.some(call => call.id.endsWith('.save')));

  active = false;
  f.control.start = '2026-11-02';
  f.control.end = '2026-11-08';
  const stale = await f.runtime.invoke('experiment-launch', { ...input, start_only: true });
  assert.equal(stale.next_action, 'run_checkout_recovery_growth');
  assert.ok(!f.calls.some(call => call.id.endsWith('.save')));
  f.control.start = '2026-11-01';
  f.control.end = '2026-11-07';

  const running = await f.runtime.invoke('experiment-launch', { ...input, start_only: true });
  assert.equal(running.next_action, 'upload_experiment_replay', JSON.stringify(running));
  assert.match(String(running.experiment_url), /expId=checkout-1/);
  assert.equal(f.uploads.length, 0);
  const draftTarget = draft!.targeting.definitionRequest.conditions.items.map(item => item.values[0]);
  assert.deepEqual(draftTarget, checkoutAccounts('star-island').sort());

  const complete = await f.runtime.invoke('experiment-launch', input);
  assert.equal(complete.next_action, 'verify_experiment_results', JSON.stringify(complete));
  assert.equal(f.uploads.length, 1);
  const rows = JSON.parse(f.uploads[0].body).map((row: { data: Record<string, any> }) => row.data);
  const exposures = rows.filter((row: Record<string, unknown>) => row['#event_name'] === 'te_experiment_exposure');
  const payments = rows.filter((row: Record<string, unknown>) => row['#event_name'] === 'payment_success');
  assert.deepEqual(exposures.map((row: Record<string, unknown>) => row['#account_id']).sort(), draftTarget);
  assert.equal(payments.length, 6);
  assert.equal(exposures.length + payments.length, rows.length);
  assert.ok(payments.every((row: Record<string, any>) => row.properties.amount === 100
    && row.properties.item_id === 'starlight-bundle' && row.properties.demo_run_id === plan.run_id
    && draftTarget.includes(row['#account_id'])));
  const callCount = f.calls.length;
  assert.deepEqual(await f.runtime.invoke('experiment-launch', input), complete);
  assert.equal(f.calls.length, callCount);
  assert.equal(f.uploads.length, 1);
  assert.equal(f.calls.filter(call => call.id === 'experiment.approval.submit').length, 1);

  const coupon = await f.runtime.invoke('experiment-plan', { session_id: f.sessionId });
  const couponLaunch = await f.runtime.invoke('experiment-launch', { session_id: f.sessionId, run_id: String(coupon.run_id) });
  assert.equal(couponLaunch.next_action, 'wait_for_other_demo_experiment');
  assert.equal(f.calls.filter(call => call.id === 'experiment.experiment.save').length, 1);
});

test('experiment-launch retries approval and subscription readiness and uploads one replay batch', { timeout: 8_000 }, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-plg-launch-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const store = new OnboardingStore(directory);
  const sessionId = randomUUID();
  const sample = samples['star-island'];
  store.save({ schema_version: 1, id: sessionId, host, choice: 'demo', sample_id: 'star-island', credential_key: 'test',
    ready_demo: { sample_id: 'star-island', item_id: sample.item, project_id: sample.project }, updated_at: '' });
  const calls: string[] = [];
  let draft: { expName: string; featureKeyList: string[] } | undefined;
  let canApprove = false;
  let approved = false;
  let running = false;
  let uploaded = 0;
  let startAttempts = 0;
  let approvalAttempts = 0;
  let approvalReadFailures = 0;
  let resolvePrimary!: () => void;
  const primarySaved = new Promise<void>(resolve => { resolvePrimary = resolve; });
  let start = '';
  const runtime = new OnboardingRuntime(store, {
    credentialKey: () => 'test',
    approverOpenId: async () => 'signed-in',
    capability: async (actualHost, id, input) => {
      assert.equal(actualHost, host);
      assert.equal(input.project_id, sample.project);
      calls.push(id);
      switch (id) {
        case 'experiment.experiment.list':
          assert.equal(input.query_name, 'Demo checkout recovery A/B');
          throw new CapabilityGatewayError('Capability not found.', 'CAPABILITY_NOT_FOUND', 404);
        case 'experiment.metric.save':
          if ((input.req as { metricId: string }).metricId.startsWith('plg_primary_')) resolvePrimary();
          return { result: true };
        case 'experiment.feature.save':
          await primarySaved;
          return { result: true };
        case 'experiment.experiment.save':
          draft = input.req as typeof draft;
          return { result: '0040' };
        case 'experiment.experiment.ready-check':
          return { readiness: { valid: true } };
        case 'experiment.approval.submit':
          return { result: '0040' };
        case 'experiment.approval.get':
          if (approvalAttempts === 1 && approvalReadFailures++ === 0) throw new Error('Approval read timed out');
          return { item: { approval_id: 7, state: approved ? 'approved' : 'pending_review', can_approve: canApprove,
            configuration: { exp_id: '0040', exp_name: draft!.expName, feature_key_list: draft!.featureKeyList } } };
        case 'experiment.approver.add':
          assert.deepEqual(input.approvers, ['signed-in']);
          canApprove = true;
          return { result: true };
        case 'experiment.approval.approve':
          assert.equal(input.approval_id, 7);
          assert.ok(canApprove);
          assert.ok(approvalAttempts < 2, 'Do not resend approval after observing the approved state');
          if (++approvalAttempts === 1) throw new Error('Approval temporarily unavailable');
          approved = true;
          throw new Error('Approval response was lost after the write');
        case 'experiment.experiment.manage':
          assert.equal(input.target_status, 'running');
          assert.ok(approved);
          if (++startAttempts === 1) throw new Error('Asset subscription is not ready');
          start = new Date().toISOString();
          running = true;
          return { result: true };
        case 'experiment.experiment.get':
          return { item: { exp_id: '0040', status: running ? 'running' : 'pending', start_time: start, groups: [
            { is_control: 1, exp_group_id: 'control' }, { is_control: 0, exp_group_id: 'treatment' },
          ] } };
        case 'project.info.get':
          return { project_id: sample.project, appid: 'demo-appid', public_receiver_address: 'https://receiver.example.test',
            default_time_zone_offset: 8 };
        default:
          assert.fail(`Unexpected capability ${id}`);
      }
    },
    upload: async (endpoint, body) => {
      assert.ok(approved && running);
      assert.equal(endpoint, 'https://receiver.example.test/sync_json');
      const rows = JSON.parse(body).map((record: { appid: string; data: Record<string, string> }) => {
        assert.equal(record.appid, 'demo-appid');
        return record.data;
      });
      assert.equal(rows.length, 40);
      assert.deepEqual(rows.map((row: Record<string, string>) => row['#event_name']), [
        ...Array(24).fill('te_experiment_exposure'), 'payment_success',
        ...Array(8).fill('demo_coupon_claim'), ...Array(7).fill('payment_success'),
      ]);
      const exposedAt = new Map(rows.slice(0, 24).map((row: Record<string, string>) => [row['#account_id'], row['#time']]));
      const timestamp = (value: unknown) => Date.parse(String(value).replace(' ', 'T') + 'Z');
      assert.ok(Date.now() < timestamp(rows[24]['#time']), 'send the batch before the first outcome timestamp');
      for (const row of rows.slice(24)) {
        assert.equal(timestamp(row['#time']) - timestamp(exposedAt.get(row['#account_id'])), 5000);
      }
      uploaded++;
      return { code: 0, message: 'accepted', http_status: 200, request_bytes: body.length, response_bytes: 0 };
    },
  });
  const planInput = { session_id: sessionId };
  const preview = await runtime.invoke('experiment-plan-preview', planInput);
  assert.deepEqual(preview.capabilities, ['experiment.approver.add']);
  assert.deepEqual(calls, []);
  const plan = await runtime.invoke('experiment-plan', planInput);
  assert.deepEqual(plan.approver, { status: 'ready' });
  assert.deepEqual(calls, ['experiment.approver.add']);
  const input = { session_id: sessionId, run_id: String(plan.run_id) };
  assert.equal((await runtime.invoke('experiment-launch-preview', input)).dry_run, true);
  const launch = await runtime.invoke('experiment-launch', input);
  assert.equal(launch.phase, 'complete', JSON.stringify(launch));
  assert.equal(launch.experiment_id, '0040');
  assert.equal(launch.experiment_url, `${host}/#/atlas/experiment/detail?expId=0040&currentProjectId=${sample.project}`);
  assert.equal(launch.approval_state, 'approved');
  assert.equal(launch.experiment_status, 'running');
  assert.equal(launch.persistence_verified, false);
  assert.equal(launch.next_action, 'verify_experiment_results');
  assert.equal(uploaded, 1);
  assert.equal(startAttempts, 2);
  assert.equal(approvalAttempts, 2);
  assert.equal(calls.filter(call => call === 'experiment.approval.submit').length, 1);
  assert.deepEqual(calls.slice(calls.indexOf('experiment.approval.approve'), calls.indexOf('experiment.experiment.manage')), [
    'experiment.approval.approve', 'experiment.approval.get', 'experiment.approval.get',
    'experiment.approval.approve', 'experiment.approval.get', 'experiment.experiment.get',
  ]);
  assert.equal(calls.filter(call => call === 'experiment.approver.add').length, 1);
  assert.ok(calls.indexOf('project.info.get') < calls.indexOf('experiment.experiment.save'));
  const callCount = calls.length;
  assert.deepEqual(await runtime.invoke('experiment-launch', input), launch);
  assert.equal(calls.length, callCount);
  assert.equal(uploaded, 1);
});
