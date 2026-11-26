import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { test } from 'node:test';
import { OnboardingRuntime } from '../src/core/onboarding/runtime.js';
import { OnboardingStore } from '../src/core/onboarding/session-store.js';
import { ONBOARDING_ADVANCE, ONBOARDING_STATUS, type CloudState } from '../src/core/onboarding/contracts.js';
import { isOnboardingInvocation } from '../src/core/onboarding/entrypoint.js';

const host = 'https://plg.example.test';
function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-plg-choice-'));
  const store = new OnboardingStore(path.join(directory, 'private'));
  const calls: string[] = [];
  let opened = 0;
  let state: CloudState = { project_id: 7, revision: 0, phase: 'not_started', can_advance: true };
  const runtime = new OnboardingRuntime(store, { activeHost: () => host, authenticated: () => true,
    credentialKey: () => 'test-credential', compatibility: async () => undefined,
    open: () => { opened++; return true; },
    capability: async (_host, id) => {
      calls.push(id);
      if (id === 'project.info.list') return { items: [{ project_id: 7 }], total: 1 };
      if (id === ONBOARDING_STATUS) return state;
      if (id === ONBOARDING_ADVANCE) return { ...state, revision: 1, phase: 'action_required', next_action: 'inspect_test_checkpoint' };
      throw new Error('Unexpected capability');
    },
  });
  runtime.preview.ensure = async () => { throw new Error('A demo preview cannot be created before the user chooses it.'); };
  return { runtime, store, calls, opened: () => opened, state: (next: CloudState) => { state = next; },
    cleanup: () => fs.rmSync(directory, { recursive: true, force: true }) };
}

test('new authenticated users see only the demo option before any preview or project mutation', async () => {
  const f = fixture();
  try {
    const result = await f.runtime.invoke('run', {});
    assert.equal(result.next_action, 'choose_demo');
    assert.deepEqual(result.choices, [{ value: 'demo', label: 'Try the demo' }]);
    assert.equal(f.calls.includes(ONBOARDING_ADVANCE), false);
    assert.equal(f.opened(), 0);
    assert.equal(result.preview, undefined);
    const session_id = String(result.session_id);
    const before = f.store.session(session_id);
    assert.equal((await f.runtime.invoke('status', { session_id })).next_action, 'choose_demo');
    assert.deepEqual(f.store.session(session_id), before);
    assert.equal((await f.runtime.invoke('run', { session_id, start_demo: false })).next_action, 'choose_demo');
    assert.equal(f.calls.includes(ONBOARDING_ADVANCE), false);
  } finally { f.cleanup(); }
});

test('an explicit demo selection resumes the existing bounded workflow and remains selected', async () => {
  const f = fixture();
  try {
    const choice = await f.runtime.invoke('run', {});
    const session_id = String(choice.session_id);
    const result = await f.runtime.invoke('run', { session_id, start_demo: true });
    assert.equal(result.phase, 'action_required');
    assert.equal(f.calls.filter(id => id === ONBOARDING_ADVANCE).length, 1);
    assert.equal(f.store.session(session_id)?.demo_selected, true);
    const resumed = await f.runtime.invoke('run', { session_id });
    assert.notEqual(resumed.next_action, 'choose_demo');
  } finally { f.cleanup(); }
});

test('legacy completed demo flows remain readable without restarting or asking again', async () => {
  const f = fixture();
  try {
    f.state({ project_id: 7, revision: 46, phase: 'completed', flow_id: crypto.randomUUID() });
    const result = await f.runtime.invoke('run', {});
    assert.equal(result.phase, 'completed');
    assert.equal(f.calls.includes(ONBOARDING_ADVANCE), false);
    assert.equal(f.opened(), 0);
  } finally { f.cleanup(); }
});

test('a demo selection is consumed by its server flow so a reset project asks again', async () => {
  const f = fixture();
  try {
    f.state({ project_id: 7, revision: 46, phase: 'completed', flow_id: crypto.randomUUID() });
    const completed = await f.runtime.invoke('run', { start_demo: true });
    const session_id = String(completed.session_id);
    assert.equal(f.store.session(session_id)?.demo_selected, undefined);
    f.state({ project_id: 7, revision: 0, phase: 'not_started', can_advance: true });
    assert.equal((await f.runtime.invoke('run', { session_id })).next_action, 'choose_demo');
    assert.equal(f.calls.includes(ONBOARDING_ADVANCE), false);
    assert.equal(f.opened(), 0);
  } finally { f.cleanup(); }
});

test('a different authenticated account cannot inherit the earlier demo selection', async () => {
  const f = fixture();
  try {
    const id = crypto.randomUUID();
    f.store.save({ schema_version: 1, id, host, project_id: 7, credential_key: 'earlier-credential', demo_selected: true, updated_at: new Date().toISOString() });
    assert.equal((await f.runtime.invoke('run', { session_id: id })).next_action, 'choose_demo');
    assert.equal(f.store.session(id)?.demo_selected, undefined);
    assert.equal(f.calls.includes(ONBOARDING_ADVANCE), false);
  } finally { f.cleanup(); }
});

test('agent login ownership persists through website polling and device authorization', async () => {
  const f = fixture();
  const now = Date.now();
  let ready = false;
  let opened = 0;
  const runtime = new OnboardingRuntime(f.store, { activeHost: () => '', authenticated: () => false, now: () => now,
    open: () => { opened++; return true; },
    createBootstrap: async () => ({ intent_id: crypto.randomUUID(), login_url: 'https://test.thinkingai.cn/experience-login',
      poll_token: 'private-poll', expires_at: new Date(now + 60_000).toISOString(), poll_after_ms: 5000 }),
    readBootstrap: async (_origin, intent_id) => ({ intent_id, status: ready ? 'account_ready' : 'pending', host: ready ? host : null,
      ready_url: null, expires_at: new Date(now + 60_000).toISOString(), poll_after_ms: 5000 }),
    authorize: async () => ({ baseUrl: host + '/agent', authorization: { device_code: 'private-device', user_code: 'ABCD-EFGH',
      verification_uri: host + '/agent/device-activate', expires_in: 300, interval: 5 } }),
  });
  try {
    const login = await runtime.invoke('run', { browser: 'agent', source: 'codex', start_demo: true });
    assert.equal((login.browser as { owner: string }).owner, 'agent');
    assert.equal((login.browser as { agent_action: string }).agent_action, 'open_in_agent_browser');
    const session_id = String(login.session_id);
    assert.equal(f.store.session(session_id)?.demo_selected, true);
    const waiting = await runtime.invoke('status', { session_id });
    assert.equal((waiting.browser as { agent_action: string }).agent_action, 'guide_existing_window');
    assert.equal(opened, 0);
    ready = true;
    const auth = await runtime.invoke('run', { session_id });
    assert.equal((auth.browser as { owner: string }).owner, 'agent');
    assert.equal((auth.browser as { agent_action: string }).agent_action, 'open_in_agent_browser');
    assert.equal(f.store.session(session_id)?.browser, 'agent');
    const status = await runtime.invoke('status', { session_id });
    assert.equal((status.browser as { agent_action: string }).agent_action, 'guide_existing_window');
    assert.equal(opened, 0);
  } finally { f.cleanup(); }
});

test('agent browser preference survives a separate registration for another region or environment', async () => {
  const f = fixture();
  const now = Date.now();
  let opened = 0;
  const runtime = new OnboardingRuntime(f.store, { activeHost: () => '', authenticated: () => false, now: () => now,
    open: () => { opened++; return true; },
    createBootstrap: async (_market, _source, _host, _signal, _thread, env) => ({ intent_id: crypto.randomUUID(),
      login_url: (env === 'production' ? 'https://www.thinkingai.cn' : 'https://test.thinkingai.cn') + '/experience-login',
      poll_token: 'private-poll', expires_at: new Date(now + 60_000).toISOString(), poll_after_ms: 5000 }),
    readBootstrap: async (_origin, intent_id) => ({ intent_id, status: 'pending', host: null, ready_url: null,
      expires_at: new Date(now + 60_000).toISOString(), poll_after_ms: 5000 }),
  });
  try {
    await runtime.invoke('run', { browser: 'agent', region: 'cn', website_env: 'production' });
    const moved = await runtime.invoke('run', { region: 'jp', website_env: 'test' });
    assert.equal((moved.browser as { owner: string }).owner, 'agent');
    assert.equal(f.store.session(String(moved.session_id))?.browser, 'agent');
    assert.equal(opened, 0);
  } finally { f.cleanup(); }
});

test('browser and demo flags remain recognized before authentication', () => {
  for (const args of [['--browser', 'agent'], ['--start-demo'], ['--start-demo', 'false'], ['--start-demo=true']]) {
    assert.equal(isOnboardingInvocation(['analysis', 'onboarding', 'run', ...args]), true);
  }
});
