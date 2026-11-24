import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { test } from 'node:test';
import { OnboardingRuntime } from '../src/core/onboarding/runtime.js';
import { OnboardingStore } from '../src/core/onboarding/session-store.js';
import { createBootstrap, readBootstrap, claimBootstrapDevice, type BootstrapDevice, type BootstrapLoginMode } from '../src/core/onboarding/bootstrap-client.js';
import { verifyWebsiteLoginIdentity } from '../src/core/onboarding/website-login-identity.js';
import type { PollResult } from '../src/core/device-auth.js';

const host = 'https://plg.example.test';
const origin = 'https://thinkingai.io';
const chinaOrigin = 'https://www.thinkingai.cn';
const overseasTestOrigin = 'https://test.thinkingai.io';
const overseasTestHost = 'https://plg-test-overseas-web.thinkingai.io';
const intent = '3278330f-ec86-45c1-b4d3-a40617db096a';
const privatePoll = 'private-bootstrap-poll-secret';
const privateDevice = 'uba_0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdef';
const privateUserCode = 'ABCD2345';
const privateAccess = 'private-oauth-access-secret';

function fixture(selectedMode: BootstrapLoginMode | 'legacy' = 'website_login', accountHost = host) {
  const mode = selectedMode === 'legacy' ? undefined : selectedMode;
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-website-login-'));
  const store = new OnboardingStore(path.join(directory, 'private'));
  let now = Date.now();
  let effectiveMode = mode;
  let ready = false;
  let authenticated = false;
  let claimCount = 0;
  let createCount = 0;
  let readCount = 0;
  let issuedIntent = intent;
  let authorizeCount = 0;
  let persistCount = 0;
  let identityCount = 0;
  const opened: string[] = [];
  const codes: string[] = [];
  const bootstrapLanguages: Array<string | undefined> = [];
  let identityError = false;
  let result: PollResult = { status: 'approved', tokens: { access_token: privateAccess, token_type: 'Bearer', expires_in: 300 } };
  let grant: BootstrapDevice = { login_mode: 'website_login', authorization_status: 'approved', host: accountHost,
    device_code: privateDevice, user_code: privateUserCode, expires_at: new Date(now + 300_000).toISOString(), interval: 5,
    expected_login_name: 'test-user', expected_company_id: '30' };
  const runtime = new OnboardingRuntime(store, { activeHost: () => '', authenticated: () => authenticated, now: () => now,
    machineLoginAllowed: () => true, credentialKey: () => 'test-credential', compatibility: async () => undefined,
    open: url => { opened.push(url); return true; },
    createBootstrap: async (_market, _source, _host, _signal, _thread, _environment, language) => {
      bootstrapLanguages.push(language);
      if (createCount++) issuedIntent = crypto.randomUUID();
      return { intent_id: issuedIntent, login_url: `${origin}/en/experience-login/?intent_id=${issuedIntent}`, poll_token: privatePoll,
        expires_at: new Date(now + 600_000).toISOString(), poll_after_ms: 2000, ...(mode ? { login_mode: mode } : {}) };
    },
    readBootstrap: async () => {
      readCount++;
      return { intent_id: issuedIntent, status: ready ? 'account_ready' : 'pending', host: ready ? host : null,
        ready_url: `${origin}/en/experience-cli/?intent_id=${issuedIntent}`, expires_at: new Date(now + 600_000).toISOString(), poll_after_ms: 2000,
        ...(effectiveMode ? { login_mode: effectiveMode } : {}), authorization_status: grant.authorization_status };
    },
    claimBootstrapDevice: async (website, id, token) => { assert.equal(website, origin); assert.equal(id, issuedIntent); assert.equal(token, privatePoll); claimCount++; return grant; },
    authorize: async () => { authorizeCount++; return { baseUrl: `${host}/agent`, authorization: { device_code: 'legacy-device', user_code: 'OLD-CODE',
      verification_uri: `${host}/agent/device-activate`, verification_uri_complete: `${host}/agent/device-activate?user_code=OLD-CODE`, expires_in: 300, interval: 5 } }; },
    poll: async (issuer, code) => { assert.equal(issuer, accountHost); codes.push(code); return result; },
    verifyWebsiteLoginIdentity: async (actualHost, access, expected) => { identityCount++; assert.equal(actualHost, accountHost); assert.equal(access, privateAccess);
      assert.deepEqual(expected, { login_name: 'test-user', company_id: '30' }); if (identityError) throw new Error('Identity mismatch.'); },
    persist: async () => { assert.ok(identityCount > 0); persistCount++; authenticated = true; },
    capability: async () => ({ business_project: { project_id: 7, project_name: 'prj_sample' }, requires_confirmation: false }),
  });
  return { runtime, store, opened, codes, bootstrapLanguages, ready: () => { ready = true; }, mode: (value: BootstrapLoginMode) => { effectiveMode = value; },
    grant: (value: Partial<BootstrapDevice>) => { grant = { ...grant, ...value }; }, authenticated: () => { authenticated = true; },
    result: (value: PollResult) => { result = value; }, tick: (ms = 6000) => { now += ms; }, identityError: () => { identityError = true; },
    counts: () => ({ claimCount, authorizeCount, persistCount, identityCount }), created: () => createCount, reads: () => readCount,
    cleanup: () => fs.rmSync(directory, { recursive: true, force: true }) };
}

test('test signup rejects unsupported markets and unrelated product hosts before website login', async () => {
  const f = fixture();
  try {
    await assert.rejects(f.runtime.invoke('run', { region: 'us', website_env: 'test', host }), /overseas test product host/);
    await assert.rejects(f.runtime.invoke('run', { region: 'cn', website_env: 'test' }), /overseas test website/i);
    assert.equal(f.created(), 0);
    assert.equal(f.reads(), 0);
    assert.deepEqual(f.opened, []);

    const allowed = await f.runtime.invoke('run', { region: 'jp', language: 'zh-CN' });
    assert.equal(allowed.market, 'jp');
    assert.equal(allowed.language, 'zh-CN');
    assert.deepEqual(f.bootstrapLanguages, ['zh-CN']);
  } finally { f.cleanup(); }
});

test('overseas test signup resumes on its original website and only authorizes the test product host', async t => {
  const f = fixture('website_login', overseasTestHost);
  t.after(f.cleanup);
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const bootstrap = overseasTestOrigin + '/backend/demo/v1/experience/cli/bootstrap-intents';
  const expires_at = new Date(Date.now() + 300_000).toISOString();
  const calls: string[] = [];
  let returnedHost = 'https://ae-web-global.thinkingai.io';
  Object.assign(f.runtime.dependencies, { createBootstrap, readBootstrap, claimBootstrapDevice });
  globalThis.fetch = async (url, init) => {
    const endpoint = String(url);
    calls.push(endpoint);
    assert.equal(init?.redirect, 'error');
    let data: Record<string, unknown>;
    if (endpoint === bootstrap) {
      assert.deepEqual(JSON.parse(String(init?.body)), { market: 'us', source: 'other', requested_host: overseasTestHost });
      data = { intent_id: intent, login_url: overseasTestOrigin + '/en/experience-login/?intent_id=' + intent,
        poll_token: privatePoll, expires_at, poll_after_ms: 2000, login_mode: 'website_login' };
    } else {
      assert.equal(new Headers(init?.headers).get('X-CLI-Bootstrap-Token'), privatePoll);
      switch (endpoint) {
        case `${bootstrap}/${intent}`:
          data = { intent_id: intent, status: 'account_ready', host: returnedHost,
            ready_url: overseasTestOrigin + '/en/experience-cli/?intent_id=' + intent, expires_at,
            poll_after_ms: 2000, login_mode: 'website_login', authorization_status: 'approved' };
          break;
        case `${bootstrap}/${intent}/device`:
          data = { login_mode: 'website_login', authorization_status: 'approved', host: overseasTestHost,
            device_code: privateDevice, user_code: privateUserCode, expires_at, interval: 5,
            expected_login_name: 'test-user', expected_company_id: '30' };
          break;
        default: throw new Error(endpoint);
      }
    }
    return Response.json({ return_code: 0, data });
  };
  const login = await f.runtime.invoke('run', { website_env: 'test', language: 'zh-CN', source: 'other' });
  assert.equal(login.next_action, 'complete_website_login');
  assert.equal(login.market, 'us');
  assert.equal(login.host, overseasTestHost);
  assert.equal(new URL(f.opened[0]).origin, overseasTestOrigin);
  const session_id = String(login.session_id);
  await assert.rejects(f.runtime.invoke('run', { session_id, website_env: 'production' }), /previous website environment/);
  await assert.rejects(f.runtime.invoke('run', { session_id }), /another product host/);
  assert.equal(f.counts().persistCount, 0);
  returnedHost = overseasTestHost;
  const completed = await f.runtime.invoke('run', { session_id });
  assert.equal(completed.next_action, 'choose_experience');
  assert.equal(completed.website_env, 'test');
  assert.equal(f.counts().persistCount, 1);
  assert.equal(f.opened.length, 1);
  assert.deepEqual(calls, [bootstrap, `${bootstrap}/${intent}`, `${bootstrap}/${intent}`, `${bootstrap}/${intent}/device`]);
});

test('Chinese website login creates and resumes an intent on the production website', async () => {
  const f = fixture();
  const original = globalThis.fetch;
  const calls: { url: string; method?: string }[] = [];
  const expiresAt = new Date(Date.now() + 300_000).toISOString();
  try {
    Object.assign(f.runtime.dependencies, { createBootstrap, readBootstrap, claimBootstrapDevice });
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), method: init?.method });
      assert.equal(init?.redirect, 'error');
      const headers = new Headers(init?.headers);
      const endpoint = new URL(String(url)).pathname;
      let data: Record<string, unknown>;
      if (endpoint.endsWith('/bootstrap-intents')) {
        assert.deepEqual(JSON.parse(String(init?.body)), { market: 'cn', source: 'other' });
        assert.equal(headers.get('Accept-Language'), 'zh-CN');
        data = { intent_id: intent, login_url: `${chinaOrigin}/experience-login/?intent_id=${intent}`,
          poll_token: privatePoll, expires_at: expiresAt, poll_after_ms: 2000, login_mode: 'website_login' };
      } else if (endpoint.endsWith('/device')) {
        assert.equal(headers.get('X-CLI-Bootstrap-Token'), privatePoll);
        data = { login_mode: 'website_login', authorization_status: 'approved', host,
          device_code: privateDevice, user_code: privateUserCode, expires_at: expiresAt, interval: 5,
          expected_login_name: 'test-user', expected_company_id: '30' };
      } else {
        assert.equal(headers.get('X-CLI-Bootstrap-Token'), privatePoll);
        data = { intent_id: intent, status: 'account_ready', host, ready_url: `${chinaOrigin}/experience-cli/?intent_id=${intent}`,
          expires_at: expiresAt, poll_after_ms: 2000, login_mode: 'website_login', authorization_status: 'approved' };
      }
      return new Response(JSON.stringify({ return_code: 0, data }));
    };
    const login = await f.runtime.invoke('run', { language: 'zh-CN', source: 'other', browser: 'system' });
    assert.equal(login.market, 'cn');
    const opened = new URL(f.opened[0]);
    assert.equal(opened.origin, chinaOrigin);
    assert.equal(opened.pathname, '/experience-login/');
    assert.equal(opened.searchParams.get('market'), 'cn');
    assert.equal(opened.searchParams.get('intent_id'), intent);

    const completed = await f.runtime.invoke('run', { session_id: String(login.session_id) });
    assert.equal(completed.next_action, 'choose_experience');
    const bootstrap = `${chinaOrigin}/backend/demo/v1/experience/cli/bootstrap-intents`;
    assert.deepEqual(calls, [
      { url: bootstrap, method: 'POST' },
      { url: `${bootstrap}/${intent}`, method: 'GET' },
      { url: `${bootstrap}/${intent}/device`, method: 'POST' },
    ]);
    assert.equal(f.opened.length, 1);
    assert.equal(f.counts().persistCount, 1);
    assert.doesNotMatch(JSON.stringify([login, completed]), /private-bootstrap|uba_|private-oauth|ABCD2345/);
  } finally {
    globalThis.fetch = original;
    f.cleanup();
  }
});

for (const environment of ['test', undefined] as const) {
  test(`saved test website origin is preserved and never contacted with environment ${String(environment)}`, async () => {
    const f = fixture();
    try {
      const initial = await f.runtime.invoke('run', { region: 'us' });
      const id = String(initial.session_id);
      const saved = f.store.session(id)!;
      f.store.save({ ...saved, website_env: environment, bootstrap: { ...saved.bootstrap!, origin: 'https://test.thinkingai.io' } });
      const legacy = f.store.session(id);
      await assert.rejects(f.runtime.invoke('run', { session_id: id }), /previous website environment/);
      assert.equal(f.created(), 1);
      assert.equal(f.reads(), 0);

      const replacement = await f.runtime.invoke('run', { region: 'us' });
      assert.notEqual(replacement.session_id, id);
      assert.equal(f.store.session(String(replacement.session_id))?.bootstrap?.origin, origin);
      assert.equal(f.created(), 2);
      assert.equal(f.reads(), 0);
      assert.deepEqual(f.store.session(id), legacy);
    } finally { f.cleanup(); }
  });
}

test('website login claims the existing approved device and never opens a second authorization page', async () => {
  const f = fixture();
  try {
    const login = await f.runtime.invoke('run', { region: 'us', browser: 'system' });
    const session_id = String(login.session_id);
    assert.deepEqual(f.bootstrapLanguages, [undefined]);
    assert.equal(login.login_mode, 'website_login');
    assert.deepEqual((login.interaction as { options: { value: string }[] }).options.map(option => option.value), ['login_done', 'login_help']);
    f.ready();
    const completed = await f.runtime.invoke('run', { session_id });
    assert.equal(completed.next_action, 'choose_experience');
    assert.deepEqual(completed.interaction, { step: 'choose_experience', options: [
      { value: 'demo', label: 'Start the demo' }, { value: 'business', label: 'Connect my business data' },
    ] });
    assert.deepEqual(f.counts(), { claimCount: 1, authorizeCount: 0, persistCount: 1, identityCount: 1 });
    assert.deepEqual(f.codes, [privateDevice]);
    assert.equal(f.opened.length, 1);
    assert.doesNotMatch(JSON.stringify([login, completed]), /private-bootstrap|uba_|private-oauth|ABCD2345/);
    const saved = f.store.session(session_id)!;
    assert.equal(saved.bootstrap, undefined);
    assert.equal(saved.website_device, undefined);
    assert.equal(saved.device, undefined);
  } finally { f.cleanup(); }
});

test('website login exchanges the claimed UBA device at the product root across retries', async () => {
  const previous = process.env.TE_CLAUDE_BASE_PATH;
  const originalFetch = globalThis.fetch;
  const f = fixture();
  let claims = 0;
  let polls = 0;
  try {
    process.env.TE_CLAUDE_BASE_PATH = '/custom-agent';
    const login = await f.runtime.invoke('run', { region: 'us', browser: 'agent' });
    const session_id = String(login.session_id);
    assert.deepEqual(login.browser, { owner: 'cli', target: 'website_login', attempted_this_call: true,
      open_command_succeeded: true, agent_action: 'guide_existing_window' });
    f.ready();
    f.runtime.dependencies.claimBootstrapDevice = claimBootstrapDevice;
    f.runtime.dependencies.poll = new OnboardingRuntime(f.store).dependencies.poll;
    const loginExpiry = new Date(Date.now() + 60_000).toISOString();
    globalThis.fetch = async (url, init = {}) => {
      assert.equal(init.method, 'POST');
      assert.equal(init.redirect, 'error');
      if (String(url) === `${origin}/backend/demo/v1/experience/cli/bootstrap-intents/${intent}/device`) {
        claims++;
        assert.equal(new Headers(init.headers).get('X-CLI-Bootstrap-Token'), privatePoll);
        return Response.json({ return_code: 0, data: { login_mode: 'website_login', authorization_status: 'claimed', host,
          device_code: privateDevice, user_code: privateUserCode, expires_at: loginExpiry, interval: 5,
          expected_login_name: 'test-user', expected_company_id: 30 } });
      }
      assert.equal(String(url), `${host}/v1/ta/cli/auth/device/token`);
      assert.deepEqual(JSON.parse(String(init.body)), { device_code: privateDevice });
      if (++polls === 1) return Response.json({ error: 'authorization_pending' }, { status: 400 });
      return Response.json({ access_token: privateAccess, token_type: 'Bearer', expires_in: 300 });
    };
    assert.equal((await f.runtime.invoke('run', { session_id })).next_action, 'complete_website_login');
    assert.equal(f.store.session(session_id)?.website_device?.issuer, host);
    assert.equal(f.counts().persistCount, 0);
    f.tick();
    assert.equal((await f.runtime.invoke('run', { session_id })).authorization_status, 'claimed');
    assert.equal(claims, 2);
    assert.equal(polls, 2);
    assert.deepEqual(f.counts(), { claimCount: 0, authorizeCount: 0, persistCount: 1, identityCount: 1 });
    assert.deepEqual(f.opened, [login.login_url]);
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.TE_CLAUDE_BASE_PATH;
    else process.env.TE_CLAUDE_BASE_PATH = previous;
    f.cleanup();
  }
});

test('legacy device confirmation opens its configured authorization URL in the system browser', async () => {
  const previous = process.env.TE_CLAUDE_BASE_PATH;
  const f = fixture('device_confirmation');
  try {
    process.env.TE_CLAUDE_BASE_PATH = '/custom-agent';
    const login = await f.runtime.invoke('run', { region: 'us', language: 'ja-JP', browser: 'agent' });
    const session_id = String(login.session_id);
    const saved = f.store.session(session_id)!;
    f.store.save({ ...saved, browser: 'agent' });
    f.ready();
    const authorization = await f.runtime.invoke('run', { session_id });
    assert.equal(authorization.next_action, 'approve_device');
    assert.deepEqual(authorization.browser, { owner: 'cli', target: 'device_authorization', attempted_this_call: true,
      open_command_succeeded: true, agent_action: 'guide_existing_window' });
    assert.deepEqual(f.opened, [login.login_url, authorization.verification_url]);
    assert.deepEqual(f.bootstrapLanguages, ['ja-JP']);
    const verification = new URL(String(authorization.verification_url));
    assert.equal(verification.searchParams.get('locale'), 'ja-JP');
    assert.equal(verification.searchParams.get('user_code'), 'OLD-CODE');
    assert.equal(f.counts().authorizeCount, 1); assert.equal(f.counts().claimCount, 0);
  } finally {
    if (previous === undefined) delete process.env.TE_CLAUDE_BASE_PATH;
    else process.env.TE_CLAUDE_BASE_PATH = previous;
    f.cleanup();
  }
});

test('status only reads website state and preserves the private continuation without claiming or persisting', async () => {
  const f = fixture();
  try {
    const login = await f.runtime.invoke('run', { region: 'us', browser: 'agent' });
    const session_id = String(login.session_id);
    f.ready();
    const before = f.store.session(session_id);
    const status = await f.runtime.invoke('status', { session_id });
    assert.equal(status.next_action, 'run_onboarding');
    assert.equal(status.login_mode, 'website_login');
    assert.deepEqual(f.counts(), { claimCount: 0, authorizeCount: 0, persistCount: 0, identityCount: 0 });
    assert.deepEqual(f.store.session(session_id), before);
    assert.deepEqual(f.opened, [login.login_url]);
  } finally { f.cleanup(); }
});

for (const state of ['pending', 'authorizing'] as const) test(`unapproved website authorization ${state} retains the same website without opening or creating a challenge`, async () => {
  const f = fixture();
  try {
    const login = await f.runtime.invoke('run', { region: 'us', browser: 'agent' });
    f.ready(); f.grant({ authorization_status: state });
    const result = await f.runtime.invoke('run', { session_id: String(login.session_id) });
    assert.equal(result.next_action, 'complete_website_login');
    assert.equal(result.authorization_status, state);
    assert.equal(result.verification_url, undefined);
    assert.equal((result.browser as { agent_action: string }).agent_action, 'guide_existing_window');
    assert.equal(f.codes.length, 0);
    assert.equal(f.counts().authorizeCount, 0);
  } finally { f.cleanup(); }
});

for (const mode of ['legacy', 'device_confirmation'] as const) test(`legacy server mode ${mode} retains ordinary device authorization`, async () => {
  const f = fixture(mode);
  try {
    const login = await f.runtime.invoke('run', { region: 'us', browser: 'system' }); f.ready();
    const result = await f.runtime.invoke('run', { session_id: String(login.session_id) });
    assert.equal(result.next_action, 'approve_device');
    assert.equal(f.counts().authorizeCount, 1);
    assert.equal(f.counts().claimCount, 0);
    assert.equal(f.opened.length, 2);
  } finally { f.cleanup(); }
});

test('an old Bridge can explicitly select device confirmation after the new BFF accepted negotiation', async () => {
  const f = fixture();
  try {
    const login = await f.runtime.invoke('run', { region: 'us' }); f.ready(); f.mode('device_confirmation');
    assert.equal((await f.runtime.invoke('run', { session_id: String(login.session_id) })).next_action, 'approve_device');
    assert.equal(f.counts().claimCount, 0);
  } finally { f.cleanup(); }
});

test('a stale continuation cannot be upgraded to website login by a later server response', async () => {
  const f = fixture('legacy');
  try {
    const login = await f.runtime.invoke('run', { region: 'us' }); f.ready(); f.mode('website_login');
    await assert.rejects(f.runtime.invoke('run', { session_id: String(login.session_id) }), /did not negotiate/);
    assert.equal(f.counts().claimCount, 0); assert.equal(f.counts().authorizeCount, 0);
  } finally { f.cleanup(); }
});

test('an effective website login mode cannot downgrade after a pending private claim', async () => {
  const f = fixture();
  try {
    const login = await f.runtime.invoke('run', { region: 'us' }); const session_id = String(login.session_id); f.ready(); f.grant({ authorization_status: 'pending' });
    await f.runtime.invoke('run', { session_id }); f.mode('device_confirmation');
    await assert.rejects(f.runtime.invoke('run', { session_id }), /login mode changed/);
    assert.equal(f.counts().authorizeCount, 0);
  } finally { f.cleanup(); }
});

test('an already authenticated account does not create or claim website authorization', async () => {
  const f = fixture();
  try {
    f.authenticated();
    assert.equal((await f.runtime.invoke('run', { host })).next_action, 'choose_experience');
    assert.deepEqual(f.counts(), { claimCount: 0, authorizeCount: 0, persistCount: 0, identityCount: 0 });
    assert.equal(f.opened.length, 0);
  } finally { f.cleanup(); }
});

test('a different preexisting credential cannot bypass a pending website account connection', async () => {
  const f = fixture();
  try {
    const login = await f.runtime.invoke('run', { region: 'us' }); const session_id = String(login.session_id); f.ready(); f.grant({ authorization_status: 'pending' });
    await f.runtime.invoke('run', { session_id }); f.authenticated(); f.grant({ authorization_status: 'approved' });
    assert.equal((await f.runtime.invoke('run', { session_id })).next_action, 'choose_experience');
    assert.equal(f.counts().persistCount, 1); assert.equal(f.counts().identityCount, 1);
  } finally { f.cleanup(); }
});

test('same-turn continuation does not carry a previous account’s choices to a new sign-in', async () => {
  const f = fixture();
  try {
    const login = await f.runtime.invoke('run', { region: 'us' });
    const session_id = String(login.session_id);
    const pending = f.store.session(session_id)!;
    f.store.save({ ...pending, credential_key: 'previous-credential', choice: 'demo', sample_id: 'star-island' });
    f.runtime.dependencies.capability = async (_host, id) => {
      assert.equal(id, 'project.plg_demo.context', 'no Demo writes before a new choice');
      return { business_project: { project_id: 7 }, recommended_sample: 'season-pass' };
    };
    f.ready();
    const signedIn = await f.runtime.invoke('run', { session_id, choice: 'demo', sample: 'star-island' });
    assert.equal(signedIn.next_action, 'choose_experience');
    assert.equal(f.store.session(session_id)?.sample_id, undefined);
  } finally { f.cleanup(); }
});

for (const invalid of [{ host: 'https://another.example.test' }, { expires_at: '2000-01-01T00:00:00.000Z' }, { expected_login_name: '' }, { expected_company_id: undefined }]) {
  test(`invalid claimed website identity or host cannot persist: ${Object.keys(invalid)[0]}`, async () => {
    const f = fixture();
    try {
      const login = await f.runtime.invoke('run', { region: 'us' }); f.ready(); f.grant(invalid);
      await assert.rejects(f.runtime.invoke('run', { session_id: String(login.session_id) }), /does not match/);
      assert.equal(f.counts().persistCount, 0); assert.equal(f.counts().authorizeCount, 0);
    } finally { f.cleanup(); }
  });
}

test('failed OAuth identity validation never falls back to legacy metadata compatibility or saves credentials', async () => {
  const f = fixture();
  try {
    const login = await f.runtime.invoke('run', { region: 'us' }); f.ready(); f.identityError();
    await assert.rejects(f.runtime.invoke('run', { session_id: String(login.session_id) }), /Identity mismatch/);
    assert.equal(f.counts().persistCount, 0);
    assert.equal(f.counts().authorizeCount, 0);
  } finally { f.cleanup(); }
});

test('retry reclaims the same challenge, keeps secrets in memory and refuses challenge replacement', async () => {
  const f = fixture();
  try {
    const login = await f.runtime.invoke('run', { region: 'us' }); const session_id = String(login.session_id); f.ready(); f.result({ status: 'pending' });
    const result = await f.runtime.invoke('run', { session_id });
    assert.equal(result.next_action, 'complete_website_login');
    assert.equal(f.store.session(session_id)?.website_device?.fingerprint, crypto.createHash('sha256').update(privateDevice).digest('hex'));
    assert.doesNotMatch(JSON.stringify(f.store.session(session_id)), /uba_|private-oauth/);
    await f.runtime.invoke('run', { session_id }); assert.equal(f.counts().claimCount, 1);
    f.tick(); f.grant({ device_code: privateDevice.replace(/f$/, 'g') });
    await assert.rejects(f.runtime.invoke('run', { session_id }), /connection changed/);
    assert.equal(f.counts().persistCount, 0); assert.equal(f.counts().authorizeCount, 0);
  } finally { f.cleanup(); }
});

test('a pending token response resumes the same challenge once and never reopens the website', async () => {
  const f = fixture();
  try {
    const login = await f.runtime.invoke('run', { region: 'us' }); const session_id = String(login.session_id); f.ready(); f.result({ status: 'slow_down' });
    await f.runtime.invoke('run', { session_id });
    const before = f.store.session(session_id); await f.runtime.invoke('status', { session_id }); assert.deepEqual(f.store.session(session_id), before);
    f.tick(11_000); f.result({ status: 'approved', tokens: { access_token: privateAccess, token_type: 'Bearer', expires_in: 300 } });
    assert.equal((await f.runtime.invoke('run', { session_id })).next_action, 'choose_experience');
    assert.deepEqual(f.codes, [privateDevice, privateDevice]);
    assert.equal(f.counts().claimCount, 2); assert.equal(f.counts().persistCount, 1);
    assert.equal(f.counts().authorizeCount, 0); assert.equal(f.opened.length, 1);
  } finally { f.cleanup(); }
});

for (const status of ['expired', 'denied', 'unsupported'] as const) test(`a ${status} device result stays in website mode without new device confirmation`, async () => {
  const f = fixture();
  try {
    const login = await f.runtime.invoke('run', { region: 'us' }); f.ready();
    f.result(status === 'denied' ? { status, code: 'PRIVATE_BACKEND_CODE', message: privateAccess } : { status });
    const result = await f.runtime.invoke('run', { session_id: String(login.session_id) });
    assert.equal(result.next_action, 'restart_website_login');
    assert.equal(result.login_mode, 'website_login');
    assert.doesNotMatch(JSON.stringify(result), /private-|PRIVATE_BACKEND/);
    assert.equal(f.counts().persistCount, 0); assert.equal(f.counts().authorizeCount, 0);
    assert.equal(f.store.session(String(login.session_id))?.bootstrap, undefined);
    assert.equal(f.store.session(String(login.session_id))?.website_device, undefined);
    assert.equal((await f.runtime.invoke('run', { session_id: String(login.session_id) })).next_action, 'complete_website_login');
    assert.equal(f.created(), 2);
    assert.notEqual(f.store.session(String(login.session_id))?.bootstrap?.intent_id, intent);
  } finally { f.cleanup(); }
});

for (const expiry of ['local_device', 'server_grant'] as const) test(`${expiry} expiry offers an executable independent website restart`, async () => {
  const f = fixture();
  try {
    const login = await f.runtime.invoke('run', { region: 'us' }); const session_id = String(login.session_id); f.ready();
    if (expiry === 'local_device') {
      f.result({ status: 'pending' }); await f.runtime.invoke('run', { session_id }); f.tick(301_000);
    } else f.grant({ authorization_status: 'expired' });
    const expired = await f.runtime.invoke('run', { session_id });
    assert.equal(expired.next_action, 'restart_website_login');
    assert.equal(f.created(), 1);
    assert.equal(f.store.session(session_id)?.bootstrap, undefined); assert.equal(f.store.session(session_id)?.website_device, undefined);
    await f.runtime.invoke('run', { session_id });
    assert.equal(f.created(), 2); assert.notEqual(f.store.session(session_id)?.bootstrap?.intent_id, intent);
    assert.equal(f.counts().authorizeCount, 0); assert.equal(f.counts().persistCount, 0);
  } finally { f.cleanup(); }
});

test('an actual private-claim HTTP 410 before the first device fingerprint allows a new website intent', async () => {
  const f = fixture();
  const original = globalThis.fetch;
  try {
    const login = await f.runtime.invoke('run', { region: 'us' }); const session_id = String(login.session_id); f.ready();
    f.runtime.dependencies.claimBootstrapDevice = claimBootstrapDevice;
    globalThis.fetch = async (url, init = {}) => {
      assert.equal(String(url), `${origin}/backend/demo/v1/experience/cli/bootstrap-intents/${intent}/device`);
      assert.equal(init.method, 'POST');
      assert.equal(new Headers(init.headers).get('X-CLI-Bootstrap-Token'), privatePoll);
      return new Response(JSON.stringify({ return_code: -1003, code: 'CONNECTION_SERVICE_REJECTED', return_message: privateAccess }), { status: 410 });
    };
    const expired = await f.runtime.invoke('run', { session_id });
    assert.equal(expired.next_action, 'restart_website_login'); assert.equal(expired.code, 'WEBSITE_AUTHORIZATION_EXPIRED');
    assert.doesNotMatch(JSON.stringify(expired), /private-/);
    assert.equal(f.store.session(session_id)?.bootstrap, undefined); assert.equal(f.store.session(session_id)?.website_device, undefined);
    assert.equal(f.created(), 1);
    await f.runtime.invoke('run', { session_id });
    assert.equal(f.created(), 2); assert.notEqual(f.store.session(session_id)?.bootstrap?.intent_id, intent);
    assert.equal(f.counts().authorizeCount, 0); assert.equal(f.counts().persistCount, 0);
  } finally { globalThis.fetch = original; f.cleanup(); }
});

test('bootstrap negotiation and private claim use separate explicit requests without changing the old create body', async () => {
  const original = globalThis.fetch;
  const calls: Array<{ url: string; init: RequestInit }> = [];
  try {
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ return_code: 0, data: String(url).endsWith('/device')
        ? { login_mode: 'website_login', authorization_status: 'pending' }
        : init.method === 'POST' ? { intent_id: intent, login_url: `${origin}/en/experience-login/`, poll_token: privatePoll,
          expires_at: new Date(Date.now() + 60000).toISOString(), poll_after_ms: 2000, login_mode: 'website_login' }
          : { intent_id: intent, status: 'account_ready', host, ready_url: null, login_mode: 'website_login', authorization_status: 'pending' } }));
    };
    const signal = new AbortController().signal;
    const created = await createBootstrap('us', 'codex', undefined, signal, undefined, 'production', 'zh-CN');
    assert.equal(created.login_mode, 'website_login');
    assert.equal(calls[0].url, `${origin}/backend/demo/v1/experience/cli/bootstrap-intents`);
    assert.equal(new URL(created.login_url).origin, origin);
    assert.equal(new Headers(calls[0].init.headers).get('X-AE-CLI-Login-Mode'), 'website_login');
    assert.equal(new Headers(calls[0].init.headers).get('Accept-Language'), 'zh-CN');
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), { market: 'us', source: 'codex' });
    await readBootstrap(origin, intent, privatePoll, signal);
    assert.equal(calls[1].init.method, 'GET');
    await claimBootstrapDevice(origin, intent, privatePoll, signal);
    assert.equal(calls[2].init.method, 'POST'); assert.equal(calls[2].init.body, '{}');
    assert.equal(new Headers(calls[2].init.headers).get('X-CLI-Bootstrap-Token'), privatePoll);
    assert.equal(calls[2].init.redirect, 'error');
    assert.doesNotMatch(calls[2].url, /private-/);
  } finally { globalThis.fetch = original; }
});

test('the private claim validates complete approved fields and does not forward additional server secrets', async () => {
  const original = globalThis.fetch;
  const data: Record<string, unknown> = { login_mode: 'website_login', authorization_status: 'claimed', host, device_code: privateDevice,
    user_code: privateUserCode, expires_at: new Date(Date.now() + 60000).toISOString(), interval: 5,
    expected_login_name: 'test-user', expected_company_id: 30, access_token: privateAccess };
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ return_code: 0, data }));
    const signal = new AbortController().signal;
    const claimed = await claimBootstrapDevice(origin, intent, privatePoll, signal);
    assert.equal(claimed.device_code, privateDevice);
    assert.equal(claimed.authorization_status, 'claimed');
    assert.equal(Object.hasOwn(claimed, 'access_token'), false);
    for (const [deviceCode, userCode] of [[intent, 'ABCD-EFGH'], ['uba_invalid', privateUserCode],
      [privateDevice, 'ABCD-EFGH'], [privateDevice, 'ABCD0123']]) {
      data.device_code = deviceCode;
      data.user_code = userCode;
      await assert.rejects(claimBootstrapDevice(origin, intent, privatePoll, signal), /invalid device connection/);
    }
    data.device_code = privateDevice;
    data.user_code = privateUserCode;
    data.expected_company_id = Number.MAX_SAFE_INTEGER + 1;
    await assert.rejects(claimBootstrapDevice(origin, intent, privatePoll, signal), /invalid device connection/);
    data.expected_company_id = 30; delete data.expected_login_name;
    await assert.rejects(claimBootstrapDevice(origin, intent, privatePoll, signal), /invalid device connection/);
  } finally { globalThis.fetch = original; }
});

test('unsupported claim modes and business errors cannot silently trigger another authorization transport', async () => {
  const original = globalThis.fetch;
  try {
    const signal = new AbortController().signal;
    globalThis.fetch = async () => new Response(JSON.stringify({ return_code: 0, data: { login_mode: 'device_confirmation', authorization_status: 'pending' } }));
    await assert.rejects(claimBootstrapDevice(origin, intent, privatePoll, signal), /did not confirm/);
    globalThis.fetch = async () => new Response(JSON.stringify({ return_code: 42, message: privateAccess }), { status: 403 });
    await assert.rejects(claimBootstrapDevice(origin, intent, privatePoll, signal), error => error instanceof Error
      && /HTTP 403/.test(error.message) && !error.message.includes(privateAccess));
  } finally { globalThis.fetch = original; }
});

for (const data of [{}, { loginName: 'other', belongCompanyId: 30 }, { loginName: 'test-user', belongCompanyId: 31 }, { loginName: 'test-user', companyId: 30 },
  { loginName: 'test-user', belongCompanyId: 30, cliAccessEnabled: false }]) {
  test(`strict OAuth identity rejects absent or different identity: ${JSON.stringify(data)}`, async () => {
    const original = globalThis.fetch;
    try {
      globalThis.fetch = async () => new Response(JSON.stringify({ return_code: 0, data }));
      await assert.rejects(verifyWebsiteLoginIdentity(host, privateAccess, { login_name: 'test-user', company_id: '30' }, new AbortController().signal),
        error => error instanceof Error && /Credentials were not saved/.test(error.message) && !error.message.includes(privateAccess));
    } finally { globalThis.fetch = original; }
  });
}

test('website identity uses the established product OAuth POST and authoritative belonging company', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init = {}) => {
      assert.equal(String(url), `${host}/v1/oauth/check`);
      assert.equal(init.method, 'POST'); assert.equal(init.redirect, 'error'); assert.equal(init.body, '{}');
      assert.equal(new Headers(init.headers).get('Authorization'), `bearer ${privateAccess}`);
      assert.equal(new Headers(init.headers).get('Content-Type'), 'application/x-www-form-urlencoded');
      return new Response(JSON.stringify({ return_code: 0, data: { loginName: 'test-user', belongCompanyId: 30, openId: 'test-open-id', cliAccessEnabled: true } }));
    };
    await verifyWebsiteLoginIdentity(host, privateAccess, { login_name: 'test-user', company_id: '30' }, new AbortController().signal);
  } finally { globalThis.fetch = original; }
});
