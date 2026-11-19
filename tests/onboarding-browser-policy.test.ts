import assert from 'node:assert/strict';
import { test } from 'node:test';
import { onboardingBrowserPolicy, readBrowserMode } from '../src/core/onboarding/browser-policy.js';

test('the default and legacy browser flags all use the system browser', () => {
  for (const mode of [undefined, 'auto', 'agent', 'system']) {
    assert.equal(readBrowserMode(mode), 'system');
  }
  for (const mode of ['', 'chrome', 'codex', 'cursor', 'claude-code', null, false]) {
    assert.throws(() => readBrowserMode(mode), /auto, agent, or system/);
  }
});

for (const target of ['website_login', 'device_authorization'] as const) {
  test(`${target} opens once and reuses the window on resume`, () => {
    let calls = 0;
    const open_system = () => { calls++; return true; };
    assert.deepEqual(onboardingBrowserPolicy({ target, new_page: true, open_system }), {
      owner: 'cli', target, attempted_this_call: true, open_command_succeeded: true,
      agent_action: 'guide_existing_window',
    });
    assert.deepEqual(onboardingBrowserPolicy({ target, new_page: false, open_system }), {
      owner: 'cli', target, attempted_this_call: false, open_command_succeeded: null,
      agent_action: 'guide_existing_window',
    });
    assert.equal(calls, 1);
  });
}

test('failed, unavailable and budget-skipped system openers offer the manual link', () => {
  let calls = 0;
  for (const open_system of [() => { calls++; return false; }, () => { calls++; throw new Error('private-opener-context'); }]) {
    const result = onboardingBrowserPolicy({ target: 'website_login', new_page: true, open_system });
    assert.equal(result.attempted_this_call, true);
    assert.equal(result.open_command_succeeded, false);
    assert.equal(result.agent_action, 'show_fallback_link');
    assert.doesNotMatch(JSON.stringify(result), /private-opener-context/);
  }
  const skipped = onboardingBrowserPolicy({ target: 'website_login', new_page: true,
    system_open_allowed: false, open_system: () => { calls++; return true; } });
  const absent = onboardingBrowserPolicy({ target: 'website_login', new_page: true });
  for (const result of [skipped, absent]) {
    assert.equal(result.attempted_this_call, false);
    assert.equal(result.open_command_succeeded, null);
    assert.equal(result.agent_action, 'show_fallback_link');
  }
  assert.equal(calls, 2);
});
