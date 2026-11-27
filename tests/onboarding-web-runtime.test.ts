import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { invokeOnboarding } from '../src/core/onboarding/web-runtime.js';

const guide = 'system-agent-onboarding-guide';
const journey = fileURLToPath(new URL('../skills/ae-onboarding/scripts/web-journey.mjs', import.meta.url));

test('Web continuation uses the verified account across rotated task channels', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-web-plg-'));
  const cwd = process.cwd();
  const conversation = path.join(root, 'chat-one');
  fs.mkdirSync(conversation);
  process.chdir(conversation);
  t.after(() => { process.chdir(cwd); fs.rmSync(root, { recursive: true, force: true }); });
  const env = process.env;
  const oldEnv = { ...env };
  t.after(() => { process.env = oldEnv; });
  delete env.AE_CLI_TOKEN_FILE;
  delete env.AE_CLI_WEBSITE_ENV;
  env.TE_AGENT_CURRENT_AGENT_ID = guide;
  env.TE_AGENT_CONVERSATION_ID = 'chat-one';
  env.AE_CLI_TOKEN_HOST = 'http://127.0.0.1:42001';
  env.AE_CLI_TOKEN = 'cli_task_synthetic_one';
  let account = 'same-user';
  let actorConversation = 'chat-one';
  let actorMarket: { platform_region?: string; market?: string } = {};
  const calls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL, init: RequestInit) => {
    const url = new URL(input);
    const headers = new Headers(init.headers);
    assert.equal(url.origin, env.AE_CLI_TOKEN_HOST);
    assert.equal(headers.get('cli-token'), env.AE_CLI_TOKEN);
    calls.push(url.pathname);
    if (url.pathname === '/v1/ta/cli/config') return Response.json({ return_code: 0, data: {
      task_cli_compat_enabled: true,
      plg_onboarding_actor: { account_id: account, company_id: 'company', conversation_id: actorConversation, ...actorMarket },
    } });
    if (url.pathname.endsWith('/project.plg_demo.context/execute')) return Response.json({ ok: true, data: {
      business_project: { project_id: 7 }, recommended_sample: 'star-island',
    } });
    if (url.pathname.endsWith('/project.plg_demo.ensure/execute')) {
      assert.deepEqual(JSON.parse(String(init.body)).input, { sample_id: 'star-island' });
      return Response.json({ ok: true, data: { status: 'ready', project_id: 42,
        sample_id: 'star-island', item_id: 'starlight-bundle',
        evidence: { dashboard_url: '/#/panel/panel/42_3' } } });
    }
    if (url.pathname.endsWith('/token/renew')) return Response.json({ return_code: 0 });
    throw new Error(`Unexpected request: ${url.pathname}`);
  });
  const first = await invokeOnboarding('run', {});
  const session_id = String(first.session_id);
  assert.equal(first.next_action, 'choose_experience');
  assert.deepEqual(first.choices, [{ value: 'demo', label: 'Start the demo' }]);
  assert.deepEqual((first.interaction as { options: { value: string }[] }).options.map(option => option.value), ['demo', 'learn', 'not_now']);
  assert.equal(first.host, null);
  assert.equal(first.market, null);
  assert.equal(first.product_resource_market, null);
  const initialStatus = await invokeOnboarding('status', { session_id });
  assert.deepEqual(initialStatus.choices, first.choices);
  assert.equal(initialStatus.business_data, undefined);
  const plan = await invokeOnboarding('plan', { session_id });
  assert.deepEqual(plan.actions, ['read_project_state', 'choose_demo', 'prepare_demo']);
  actorMarket = { platform_region: 'overseas', market: 'us' };
  const us = await invokeOnboarding('run', { session_id, language: 'zh-CN' });
  assert.equal(us.language, 'en-US');
  assert.equal(us.product_resource_market, 'us');
  assert.equal(us.market, null);
  const usDraft = await invokeOnboarding('experiment-plan-preview', { session_id });
  assert.equal(usDraft.currency, 'USD');
  actorMarket = { platform_region: 'overseas' };
  for (const [language, expectedMarket, expectedLanguage] of [
    ['zh-CN', 'us', 'en-US'], ['ja-JP', 'jp', 'ja-JP'], ['ko-KR', 'kr', 'ko-KR'],
  ] as const) {
    const localized = await invokeOnboarding('run', { session_id, language });
    assert.equal(localized.language, expectedLanguage);
    assert.equal(localized.product_resource_market, expectedMarket);
    assert.equal(localized.market, null);
    assert.equal(localized.next_action, 'choose_experience');
  }
  actorMarket = { platform_region: 'cn' };
  const domestic = await invokeOnboarding('run', { session_id, language: 'en-US' });
  assert.equal(domestic.language, 'en-US');
  assert.equal(domestic.product_resource_market, 'cn');
  actorMarket = { platform_region: 'overseas', market: 'jp' };
  assert.equal((await invokeOnboarding('status', { session_id })).product_resource_market, 'jp');
  actorMarket = { platform_region: 'unknown', market: 'unknown' };
  assert.equal((await invokeOnboarding('status', { session_id })).product_resource_market, null);
  actorMarket = { platform_region: 'overseas' };
  const beforeRejected = calls.length;
  for (const businessInput of [{ choice: 'business' }, { sdk_complete: true }, { confirm_business_project_id: 7 }]) {
    await assert.rejects(invokeOnboarding('run', { session_id, ...businessInput }), /Business SDK setup requires a local agent/);
  }
  assert.equal(calls.length, beforeRejected);
  env.AE_CLI_TOKEN_HOST = 'http://127.0.0.1:42002';
  env.AE_CLI_TOKEN = 'cli_task_synthetic_two';
  const second = await invokeOnboarding('run', { session_id, choice: 'demo' });
  assert.equal(second.session_id, session_id);
  assert.equal(second.product_resource_market, 'us');
  assert.equal(second.next_action, 'offer_growth_questions');
  assert.deepEqual((second.interaction as { options: { value: string }[] }).options.map(option => option.value),
    ['growth', 'checkout_recovery']);
  assert.equal(second.demo_project_id, 42);
  assert.deepEqual(second.evidence, { dashboard_url: '/#/panel/panel/42_3' });
  assert.equal(second.realtime_data_url, undefined);
  assert.equal(second.workspace_projects, undefined);
  assert.equal(second.business_data, undefined);
  actorMarket = { platform_region: 'overseas', market: 'us' };
  const draft = await invokeOnboarding('experiment-plan', { session_id, draft_only: true });
  assert.equal((draft.plan as { currency: string }).currency, 'USD');
  assert.match(String(draft.plan_preview_markdown), /\| \$100 · 50% \| \$80 · 50% \|/);
  actorMarket = { platform_region: 'overseas' };
  const count = calls.filter(call => call.includes('/capabilities/')).length;
  const localizedPlan = await invokeOnboarding('plan', { session_id, language: 'ja-JP' });
  assert.equal(localizedPlan.product_resource_market, 'jp');
  assert.equal(calls.filter(call => call.includes('/capabilities/')).length, count);
  account = 'other-user';
  await assert.rejects(invokeOnboarding('run', { session_id }), /does not match the onboarding session/);
  actorConversation = 'another-chat';
  await assert.rejects(invokeOnboarding('run', { session_id }), /could not verify/);
  await assert.rejects(invokeOnboarding('run', { session_id, host: 'https://another.example.test' }), /current AE account/);
  assert.equal(calls.filter(call => call.includes('/capabilities/')).length, count);
});

test('Web journey records endpoints in the current working directory', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-web-journey-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const cwd = path.join(root, 'chat-one');
  fs.mkdirSync(cwd);
  const run = (endpoint: string, actualCwd = cwd) => spawnSync(process.execPath, [journey, endpoint], { cwd: actualCwd, env: {}, encoding: 'utf8' });
  assert.notEqual(run('pending').status, 0);
  const options = (step: string) => {
    const result = run(step);
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout).data.interaction.options.map((option: { value: string }) => option.value);
  };
  assert.deepEqual(options('choose-sample'), ['star_island', 'season_pass', 'keep_sample']);
  assert.deepEqual(options('after-follow-up'), ['experiment_plan']);
  assert.equal(fs.existsSync(path.join(cwd, '.ae-onboarding')), false);
  const file = path.join(cwd, '.ae-onboarding', 'plg-journey.json');
  assert.equal(run('active').status, 0);
  const active = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(active.endpoint, 'active');
  assert.deepEqual(options('after-experiment'), ['change_sample', 'finish_demo']);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), active);
  const result = run('done');
  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(receipt.schema, 'ae-onboarding.state.v5');
  assert.equal(receipt.endpoint, 'done');
  assert.ok(receipt.revision > 0);
  assert.equal(run('done').status, 0);
  assert.equal(run('active').status, 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), receipt);
  const otherCwd = path.join(root, 'chat-two');
  fs.mkdirSync(otherCwd);
  assert.equal(run('after-experiment', otherCwd).status, 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(otherCwd, '.ae-onboarding', 'plg-journey.json'), 'utf8')).endpoint, 'active');
  const stopped = run('stopped', otherCwd);
  assert.equal(stopped.status, 0, stopped.stderr);
  const otherReceipt = JSON.parse(fs.readFileSync(path.join(otherCwd, '.ae-onboarding', 'plg-journey.json'), 'utf8'));
  assert.equal(otherReceipt.schema, 'ae-onboarding.state.v5');
  assert.equal(otherReceipt.endpoint, 'stopped');
  assert.ok(otherReceipt.revision > 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), receipt);
});
