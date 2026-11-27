import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, type TestContext } from 'node:test';
import { CapabilityGatewayError } from '../src/core/capability-api.js';
import { safeJsonParse } from '../src/core/json-utils.js';
import { isOnboardingInvocation } from '../src/core/onboarding/entrypoint.js';
import { onboardingDemoCurrency } from '../src/core/onboarding/contracts.js';
import { onboardingEvidenceLinks } from '../src/core/onboarding/interaction.js';
import { replayReportDates, waitForExperimentSampleSize } from '../src/core/onboarding/experiment-report-wait.js';
import { checkoutShareMarkdown, purchasePathMarkdown } from '../src/core/onboarding/markdown-charts.js';
import { OnboardingRuntime } from '../src/core/onboarding/runtime.js';
import { OnboardingStore } from '../src/core/onboarding/session-store.js';

const host = 'https://plg.example.test';
const samples = {
  'star-island': { project: 40, item: 'starlight-bundle', size: 140, head: 18, tail: 10, summary: [96, 14, 44, 16, 140, 50, 30],
    checkout: [107, 116], dailyViewers: [38, 34, 0, 31, 42, 28, 33] },
  'season-pass': { project: 41, item: 'season-pass-item', size: 120, head: 12, tail: 20, summary: [76, 8, 44, 12, 120, 48, 20],
    checkout: [85, 92], dailyViewers: [30, 19, 38, 38, 23, 26, 32] },
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
  assert.ok(isOnboardingInvocation(['analysis', 'onboarding', 'experiment-plan', '--draft-only', 'true']));
  assert.ok(isOnboardingInvocation(['analysis', 'onboarding', 'experiment-plan', '--run-id', '1234', '--answered-question', 'review_audience']));
  assert.ok(isOnboardingInvocation(['analysis', 'onboarding', 'status', '--run-id', '1234']));
});

test('wait-report options keep experiment launch in its dedicated CLI runtime', () => {
  for (const option of [['--wait-report'], ['--wait-report=true'], ['--wait-report', 'true'], ['--wait-report', 'false']]) {
    assert.ok(isOnboardingInvocation(['analysis', 'onboarding', 'experiment-launch', ...option, '--format', 'json']));
  }
});

test('links to the demo funnel only within the selected project', () => {
  const native = { funnel_report_url: '/#/tga/funnel/40_5' };
  assert.deepEqual(onboardingEvidenceLinks(native, 40, host), { funnel_report_url: `${host}/#/tga/funnel/40_5` });
  assert.deepEqual(onboardingEvidenceLinks(native, 40), native);
  assert.equal(onboardingEvidenceLinks(native, 41), undefined);
  assert.equal(onboardingEvidenceLinks({ funnel_report_url: '/#/tga/ide/40_4' }, 40), undefined);
});

type CapabilityCall = { id: string; input: Record<string, unknown> };

test('Demo currency follows the selected cluster', () => {
  assert.equal(onboardingDemoCurrency('https://ae-web-global.thinkingai.io', 'cn'), 'USD');
  assert.equal(onboardingDemoCurrency('https://ae-web.thinkingai.cn', 'us'), 'CNY');
  assert.equal(onboardingDemoCurrency(host, 'us'), 'USD');
  assert.equal(onboardingDemoCurrency(host), 'CNY');
});

function fixture(t: TestContext, experiment?: (call: CapabilityCall) => Promise<unknown>, targetHost = host) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-plg-growth-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const store = new OnboardingStore(directory);
  const sessionId = randomUUID();
  const calls: CapabilityCall[] = [];
  const uploads: { endpoint: string; body: string }[] = [];
  const control = { sample: 'star-island' as Sample, status: 'ready', start: '2026-11-01', end: '2026-11-07', credential: 'k',
    truncated: false, unmapped: 0, wrongReceiverProject: false, checkoutCount: undefined as number | undefined,
    dailyViewerResult: undefined as string | undefined };
  const select = (sample: Sample) => {
    control.sample = sample;
    store.save({ schema_version: 1, id: sessionId, host: targetHost, choice: 'demo', sample_id: sample, credential_key: 'k', updated_at: '' });
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
      assert.equal(actualHost, targetHost);
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
        assert.ok(sql.includes(`count_if(contains(view_dates, DATE '${control.start}'))`));
        assert.ok(sql.includes(`count_if(contains(view_dates, DATE '${control.end}'))`));
        const checkout = checkoutAccounts(control.sample).slice(0, control.checkoutCount);
        return { has_more: control.truncated, returned_rows: 1,
          title: ['single_viewers', 'single_buyers', 'multi_viewers', 'multi_buyers', 'funnel_viewers', 'funnel_checkout', 'funnel_buyers',
            'account_ids_json', 'checkout_unpaid', 'checkout_account_ids_json', 'unmapped_accounts', 'daily_viewers_json'],
          rows: [[...sample.summary, JSON.stringify(expectedAccounts(control.sample)), checkout.length, JSON.stringify(checkout), control.unmapped,
            control.dailyViewerResult ?? JSON.stringify(sample.dailyViewers)]] };
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
    assert.deepEqual(result.data_basis, {
      source: 'demo_seed_events',
      counting_unit: 'distinct_accounts',
      funnel_transitions: [
        { from_event: 'item_detail_view', to_event: 'checkout_start', from_accounts: viewers, to_accounts: checkout,
          dropoff_accounts: viewers - checkout, conversion_rate: checkout / viewers },
        { from_event: 'checkout_start', to_event: 'payment_success', from_accounts: checkout, to_accounts: buyers,
          dropoff_accounts: checkout - buyers, conversion_rate: buyers / checkout },
      ],
    });
    assert.deepEqual(result.charts, {
      purchase_rate: { type: 'bar', data: [
        { label: 'Single-day viewers', value: Math.round(singleBuyers * 1000 / singleViewers) / 10 },
        { label: 'Multi-day viewers', value: Math.round(multiBuyers * 1000 / multiViewers) / 10 },
      ] },
      funnel: { type: 'bar', data: [
        { label: 'Viewed', value: viewers }, { label: 'Started checkout', value: checkout }, { label: 'Paid', value: buyers },
      ] },
      daily_viewers: { type: 'line', data: samples[sample].dailyViewers.map((value, index) => ({ label: `2026-11-0${index + 1}`, value })) },
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
    assert.deepEqual((result.interaction as { options: { value: string }[] }).options.map(option => option.value), ['follow_up']);
    assert.equal(result.follow_up_count, multiViewers - multiBuyers);
    const overlap = sample === 'star-island' ? 10 : 20;
    const checkoutUnpaid = sample === 'star-island' ? 20 : 28;
    assert.deepEqual(result.candidate_cohorts, { multi_day_unpaid: multiViewers - multiBuyers, checkout_unpaid: checkoutUnpaid,
      overlap, total_distinct: multiViewers - multiBuyers + checkoutUnpaid - overlap });
    assert.deepEqual(result.visuals, {
      overview: sample === 'star-island' ? 'purchase_rate' : 'checkout_share',
      checkout_share: { type: 'pie', data: [
        { label: 'Started checkout without paying', value: checkoutUnpaid },
        { label: 'Paid after checkout', value: buyers },
      ] },
      audience_overlap: { type: 'pie', data: [
        { label: 'Both signals', value: overlap },
        { label: 'Started checkout only', value: checkoutUnpaid - overlap },
        { label: 'Viewed on multiple days only', value: multiViewers - multiBuyers - overlap },
      ] },
    });
    const markdown = result.markdown_charts as Record<string, string>;
    assert.ok(markdown.purchase_rate.includes(`| Single-day viewers | ${(100 * singleBuyers / singleViewers).toFixed(1)}% |`));
    const unpaidBlocks = sample === 'star-island' ? 5 : 7;
    assert.equal(markdown.checkout_share.split('\n')[0], '🟦'.repeat(unpaidBlocks) + '🟪'.repeat(12 - unpaidBlocks));
    assert.ok(markdown.checkout_share.includes('| Group | Players | Share |'));
    assert.ok(markdown.checkout_share.includes(`| 🟦 Started checkout without paying | ${checkoutUnpaid} | ${(100 * checkoutUnpaid / checkout).toFixed(1)}% |`));
    assert.ok(markdown.checkout_share.includes(`| 🟪 Paid after checkout | ${buyers} | ${(100 * buyers / checkout).toFixed(1)}% |`));
    assert.equal(Array.from(markdown.audience_overlap.split('\n')[0]).length, 20);
    assert.ok(markdown.audience_overlap.includes(`| 🟦 Both signals | ${overlap} |`));
    assert.equal(markdown.purchase_funnel,
      `**${viewers}** Viewed → **${checkout}** Started checkout → **${buyers}** Paid\n\n` +
      `Viewed → Started checkout **${(100 * checkout / viewers).toFixed(1)}%** (${viewers - checkout} lost)` +
      ` · Started checkout → Paid **${(100 * buyers / checkout).toFixed(1)}%** (${checkout - buyers} lost)`);
    assert.ok(markdown.follow_up.includes(`| Multi-day viewers, unpaid | ${multiViewers - multiBuyers} |`));
    const dailyChanges = sample === 'star-island' ? ['—', '↓ 4', '↓ 34', '↑ 31', '↑ 11', '↓ 14', '↑ 5']
      : ['—', '↓ 11', '↑ 19', 'No change', '↓ 15', '↑ 3', '↑ 6'];
    const dailyRows = markdown.daily_viewers.split('\n');
    assert.equal(dailyRows[0], '| Date | Viewers | Change vs prior day |');
    assert.deepEqual(dailyRows.slice(2), samples[sample].dailyViewers.map((value, index) =>
      `| 11/0${index + 1} | ${value} | ${dailyChanges[index]} |`));
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
    assert.deepEqual(repeat.data_basis, result.data_basis);
    assert.deepEqual(repeat.charts, result.charts);
    const repeatMarkdown = repeat.markdown_charts as typeof markdown;
    assert.equal(repeatMarkdown.checkout_share, markdown.checkout_share);
    assert.equal(repeatMarkdown.daily_viewers, markdown.daily_viewers);
    assert.equal(repeatMarkdown.purchase_funnel, markdown.purchase_funnel);
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

test('checkout displays omit empty composition and distinguish zero from an undefined conversion rate', () => {
  assert.equal(checkoutShareMarkdown([
    { label: 'Started checkout without paying', value: 0 },
    { label: 'Paid after checkout', value: 0 },
  ]), null);
  assert.equal(purchasePathMarkdown([
    { label: 'Viewed', value: 15 },
    { label: 'Started checkout', value: 0 },
    { label: 'Paid', value: 0 },
  ], [
    { dropoff_accounts: 15, conversion_rate: 0 },
    { dropoff_accounts: 0, conversion_rate: null },
  ]), '**15** Viewed → **0** Started checkout → **0** Paid\n\n' +
    'Viewed → Started checkout **0.0%** (15 lost) · Started checkout → Paid **—** (0 lost)');
});

test('growth omits incomplete trends and keeps cohorts from older receipts usable', async t => {
  const f = fixture(t);
  f.control.dailyViewerResult = '[38,34,null,31,42,28,33]';
  const first = await f.runtime.invoke('growth', { session_id: f.sessionId });
  assert.equal(first.phase, 'ready');
  assert.equal(Object.hasOwn(first.charts as object, 'daily_viewers'), false);
  assert.equal(Object.hasOwn(first.markdown_charts as object, 'daily_viewers'), false);
  const receipt = String(first.cohort_path);
  assert.equal(Object.hasOwn(JSON.parse(fs.readFileSync(receipt, 'utf8')), 'dailyViewers'), false);
  const resumed = await f.runtime.invoke('growth', { session_id: f.sessionId, scenario: 'checkout-recovery' });
  assert.equal(resumed.cached, true);
  assert.equal(resumed.cohort_path, receipt);
  assert.equal(resumed.follow_up_count, 20);
  assert.equal(Object.hasOwn(resumed.charts as object, 'daily_viewers'), false);
  assert.equal(Object.hasOwn(resumed.markdown_charts as object, 'daily_viewers'), false);
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
  assert.deepEqual((plan.interaction as { options: { value: string }[] }).options.map(option => option.value), ['launch']);
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

test('US review and launch require an explicitly USD saved draft', async t => {
  const f = fixture(t, undefined, 'https://ae-web-global.thinkingai.io');
  const plan = await f.runtime.invoke('experiment-plan', { session_id: f.sessionId, draft_only: true });
  assert.match(String(plan.plan_preview_markdown), /\| \$100 · 50% \| \$80 · 50% \|/);
  assert.doesNotMatch(String(plan.plan_preview_markdown), /USD|CNY|[￥¥]/);
  const input = { session_id: f.sessionId, run_id: String(plan.run_id) };
  const store = new OnboardingStore(f.directory);
  const file = `experiment-plan-${input.run_id}.json`;
  const saved = store.read<{ plan: { currency?: string }; plan_preview_markdown: string }>(file)!;
  const { currency: _currency, ...legacyPlan } = saved.plan;
  const before = f.calls.length;

  for (const currency of [undefined, 'CNY']) {
    store.write(file, { ...saved, plan: currency ? { ...legacyPlan, currency } : legacyPlan,
      plan_preview_markdown: saved.plan_preview_markdown.replace(/\$(\d+)/g, '$1 CNY') });
    await assert.rejects(f.runtime.invoke('status', input), /saved Demo draft does not use USD/);
    await assert.rejects(f.runtime.invoke('experiment-plan', { ...input, answered_question: 'review_pilot' }),
      /saved Demo draft does not use USD/);
    await assert.rejects(f.runtime.invoke('experiment-launch-preview', input), /saved Demo draft does not use USD/);
    await assert.rejects(f.runtime.invoke('experiment-launch', input), /saved Demo draft does not use USD/);
  }
  assert.equal(f.calls.length, before);
  assert.deepEqual(f.uploads, []);
});

test('a non-US draft without a currency retains the legacy launch default', async t => {
  const f = fixture(t, undefined, 'https://ae-web.thinkingai.cn');
  const plan = await f.runtime.invoke('experiment-plan', { session_id: f.sessionId, draft_only: true });
  const input = { session_id: f.sessionId, run_id: String(plan.run_id) };
  const store = new OnboardingStore(f.directory);
  const file = `experiment-plan-${input.run_id}.json`;
  const saved = store.read<{ plan: { currency?: string } }>(file)!;
  const { currency: _currency, ...legacyPlan } = saved.plan;
  store.write(file, { ...saved, plan: legacyPlan });

  assert.deepEqual((await f.runtime.invoke('status', input)).plan, legacyPlan);
  assert.equal((await f.runtime.invoke('experiment-launch-preview', input)).currency, 'CNY');
});

test('US checkout draft review keeps the same proposal and replays the approved plan in USD', async t => {
  let active = true;
  let start = '';
  let matchesRevenue = false;
  let revenueMetric: { metricId: string; format: string; metricPurpose: string; metricDefinition: { filters: { items: unknown[] } } };
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
      case 'experiment.metric.save': {
        const metric = input.req as typeof revenueMetric;
        assert.deepEqual(metric.metricDefinition.filters.items.at(-1), { field: 'currency', operator: 'eq', values: ['USD'] });
        if (metric.metricId.startsWith('plg_net_revenue_')) {
          assert.equal(metric.metricId, 'plg_net_revenue_star_island_usd');
          revenueMetric = metric;
          throw new Error('Metric ID already exists');
        }
        return { result: true };
      }
      case 'experiment.metric.get': {
        assert.equal(input.metric_id, revenueMetric.metricId);
        const definition = structuredClone(revenueMetric.metricDefinition);
        if (!matchesRevenue) definition.filters.items[definition.filters.items.length - 1] = { field: 'currency', operator: 'eq', values: ['CNY'] };
        return safeJsonParse(JSON.stringify({ item: { metric_id: revenueMetric.metricId, format: revenueMetric.format,
          metric_purpose: revenueMetric.metricPurpose, metric_definition: definition } }));
      }
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
      case 'experiment.report.sample-size':
        assert.equal(input.exp_id, 'checkout-1');
        assert.match(String(input.start_time), /^\d{4}-\d{2}-\d{2}$/);
        assert.equal(f.uploads.length, 1);
        return { report: { has_data: true } };
      default:
        assert.fail(`Unexpected capability ${id}`);
    }
  }, 'https://ae-web-global.thinkingai.io');
  const scenario = { session_id: f.sessionId, scenario: 'checkout-recovery' };
  await f.runtime.invoke('growth', scenario);
  const beforeDraft = f.calls.length;
  const plan = await f.runtime.invoke('experiment-plan', { ...scenario, draft_only: true });
  const input = { session_id: f.sessionId, run_id: String(plan.run_id) };
  assert.equal(f.calls.length, beforeDraft);
  assert.deepEqual(plan.approver, { status: 'deferred' });
  assert.equal((plan.plan as { currency: string }).currency, 'USD');
  assert.match(String(plan.plan_preview_markdown), /\| \$100 · 50% \| \$100 · 50% \|/);
  assert.deepEqual(plan.review, { pilot_accounts_per_arm: 4 });
  const options = (draft: Record<string, unknown>) =>
    (draft.interaction as { options: { value: string }[] }).options.map(({ value }) => value);
  assert.deepEqual(options(plan), ['launch', 'review_audience', 'review_pilot', 'review_no_reward']);
  const { plan_path: _path, ...visiblePlan } = plan;
  const store = new OnboardingStore(f.directory);
  const planFile = `experiment-plan-${input.run_id}.json`;
  const savedPlan = store.read<Record<string, unknown>>(planFile)!;
  const legacyMarkdown = String(plan.plan_preview_markdown).replaceAll('$100', '100 USD');
  store.write(planFile, { ...savedPlan, plan_preview_markdown: legacyMarkdown });
  assert.deepEqual(await f.runtime.invoke('status', input), visiblePlan);
  assert.equal(store.read<Record<string, unknown>>(planFile)?.plan_preview_markdown, legacyMarkdown);
  const reviewPreview = await f.runtime.invoke('experiment-plan-preview', { ...input, answered_question: 'review_pilot' });
  assert.equal(reviewPreview.dry_run, true);
  assert.deepEqual(options(reviewPreview), ['launch', 'review_audience', 'review_no_reward']);
  assert.deepEqual(await f.runtime.invoke('status', input), visiblePlan);
  await assert.rejects(f.runtime.invoke('experiment-plan', { ...input, answered_question: 'launch' }), /Use --answered-question/);
  const answeredAnswers = [
    ['review_pilot', ['launch', 'review_audience', 'review_no_reward']],
    ['review_audience', ['launch', 'review_no_reward']],
    ['review_no_reward', ['launch']],
  ] as const;
  for (const [answered_question, remaining] of answeredAnswers) {
    const reviewed = await f.runtime.invoke('experiment-plan', { ...input, answered_question });
    assert.deepEqual(options(reviewed), remaining);
    assert.equal(reviewed.run_id, plan.run_id);
    assert.deepEqual(reviewed.plan, plan.plan);
    assert.ok(!Object.hasOwn(reviewed, 'checkout_cohort'));
    assert.deepEqual(await f.runtime.invoke('status', input), reviewed);
    assert.deepEqual(await f.runtime.invoke('experiment-plan', { ...input, answered_question }), reviewed);
  }
  assert.equal(f.calls.length, beforeDraft);
  assert.equal(f.uploads.length, 0);
  f.control.credential = 'another-account';
  await assert.rejects(f.runtime.invoke('status', input), /active Demo session and account/);
  await assert.rejects(f.runtime.invoke('experiment-plan', { ...input, answered_question: 'review_audience' }), /active Demo session and account/);
  f.control.credential = 'k';
  const preview = await f.runtime.invoke('experiment-launch-preview', { ...input, start_only: true });
  assert.ok((preview.steps as string[]).includes('start'));
  assert.ok((preview.steps as string[]).includes('prepare_signed_in_approver'));
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
  assert.ok(!f.calls.some(call => call.id === 'experiment.approver.add'));
  f.control.start = '2026-11-01';
  f.control.end = '2026-11-07';

  const guidedLaunch = { ...input, wait_report: true };
  const incompatibleMetric = await f.runtime.invoke('experiment-launch', guidedLaunch);
  assert.equal(incompatibleMetric.failed_stage, 'save_revenue_metric');
  assert.ok(!f.calls.some(call => call.id === 'experiment.experiment.save'));
  matchesRevenue = true;
  const complete = await f.runtime.invoke('experiment-launch', guidedLaunch);
  assert.equal(complete.next_action, 'verify_experiment_results', JSON.stringify(complete));
  assert.match(String(complete.experiment_url), /expId=checkout-1/);
  assert.deepEqual(complete.sample_size_report, { has_data: true });
  assert.equal(complete.currency, 'USD');
  assert.equal(complete.persistence_verified, false);
  const draftTarget = draft!.targeting.definitionRequest.conditions.items.map(item => item.values[0]);
  assert.deepEqual(draftTarget, checkoutAccounts('star-island').sort());
  assert.equal(f.uploads.length, 1);
  const rows = JSON.parse(f.uploads[0].body).map((row: { data: Record<string, any> }) => row.data);
  const exposures = rows.filter((row: Record<string, unknown>) => row['#event_name'] === 'te_experiment_exposure');
  const payments = rows.filter((row: Record<string, unknown>) => row['#event_name'] === 'payment_success');
  assert.deepEqual(exposures.map((row: Record<string, unknown>) => row['#account_id']).sort(), draftTarget);
  assert.equal(payments.length, 6);
  assert.equal(exposures.length + payments.length, rows.length);
  assert.ok(payments.every((row: Record<string, any>) => row.properties.amount === 100 && row.properties.currency === 'USD'
    && row.properties.item_id === 'starlight-bundle' && row.properties.demo_run_id === plan.run_id
    && draftTarget.includes(row['#account_id'])));
  const callCount = f.calls.length;
  assert.deepEqual(await f.runtime.invoke('experiment-launch', guidedLaunch), complete);
  assert.deepEqual(f.calls.slice(callCount).map(call => call.id), ['experiment.report.sample-size']);
  assert.equal(f.uploads.length, 1);
  assert.equal(f.calls.filter(call => call.id === 'experiment.approval.submit').length, 1);
  assert.equal(f.calls.filter(call => call.id === 'experiment.approver.add').length, 1);

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
        case 'experiment.report.sample-size':
          assert.equal(input.exp_id, '0040');
          assert.equal(input.start_time, input.end_time);
          assert.match(String(input.start_time), /^\d{4}-\d{2}-\d{2}$/);
          return { report: { groups: [{ exp_group_id: 'control', exposure_count: 12 }] } };
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
  const waited = await runtime.invoke('experiment-launch', { ...input, wait_report: true });
  assert.equal(waited.phase, 'complete');
  assert.equal(waited.persistence_verified, false);
  assert.equal(waited.next_action, 'verify_experiment_results');
  assert.ok(waited.sample_size_report);
  assert.equal(uploaded, 1);
  assert.deepEqual(calls.slice(callCount), ['experiment.report.sample-size']);
});

test('report wait retries only the scoped missing view inside one invocation', async () => {
  let attempts = 0;
  const input = { project_id: 973, exp_id: '0001', start_time: '2026-11-18', end_time: '2026-11-18' };
  const result = await waitForExperimentSampleSize(async (actual, signal) => {
    assert.deepEqual(actual, { ...input, force_refresh: true });
    assert.equal(signal.aborted, false);
    if (++attempts === 1) throw new CapabilityGatewayError(
      "Query failed: Table 'hive.hermes.v_atlas_experiment_exposure_973' does not exist",
      'BACKEND_OPERATION_FAILED');
    return { report: { exposed: 24 } };
  }, input, 1000, 1);
  assert.equal(result.phase, 'complete');
  assert.equal(attempts, 2);
  assert.deepEqual(result.sample_size_report, { exposed: 24 });

  for (const message of [
    "Table 'hive.hermes.v_atlas_experiment_exposure_9730' does not exist",
    "Table 'hive.ta.v_event_973' does not exist",
    'Permission denied',
  ]) {
    const failure = new CapabilityGatewayError(message, 'BACKEND_OPERATION_FAILED');
    await assert.rejects(waitForExperimentSampleSize(async () => { throw failure; }, input, 0, 1),
      error => error === failure);
  }
});

test('report wait returns pending normally when the view is still unavailable', async () => {
  const result = await waitForExperimentSampleSize(async () => {
    throw new CapabilityGatewayError('报告数据暂不可用，请稍后刷新；若持续出现，请联系管理员。');
  }, { project_id: 973, exp_id: '0001', start_time: '2026-11-18', end_time: '2026-11-18' }, 0, 1);
  assert.equal(result.phase, 'pending');
  assert.equal(result.next_action, 'wait_experiment_report');
  assert.equal(result.report_query_attempts, 1);
});

test('report wait keeps a successful empty exposure report pending', async () => {
  const result = await waitForExperimentSampleSize(async () => ({ report: { has_data: false } }),
    { project_id: 973, exp_id: '0001', start_time: '2026-11-18', end_time: '2026-11-18' }, 0, 1);
  assert.equal(result.phase, 'pending');
  assert.equal(result.next_action, 'wait_experiment_report');
});

test('report dates follow replay timezone across midnight and resume dates', () => {
  assert.deepEqual(replayReportDates({
    start: '2026-11-18T15:59:59.000Z', end: '2026-11-18T16:00:04.000Z', timezone: '+08:00',
  }), { start_time: '2026-11-18', end_time: '2026-11-19' });
  assert.deepEqual(replayReportDates({
    start: '2026-11-18T03:00:00.000Z', end: '2026-11-18T03:00:05.000Z', timezone: '-08:00',
  }), { start_time: '2026-11-17', end_time: '2026-11-17' });
  assert.throws(() => replayReportDates({ start: 'invalid', end: 'invalid', timezone: '+08:00' }));
});
