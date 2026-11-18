import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aeRegistrationUrl, missingAeHostGuidance, missingAeHostHint, normalizeRegistrationLanguage, registrationLanguage, registrationMarket } from '../src/core/host-guidance.js';
import { spawnSync } from 'node:child_process';
import { environmentForWebsiteOrigin, websiteEnvironment, websiteOrigin, withCliEntryContext } from '../src/core/website-entry.js';

test('overseas registration uses the localized official website pages', () => {
  for (const [language, market, pathname] of [
    ['en-US', 'us', '/en/experience-login/'],
    ['ja-JP', 'jp', '/jp/experience-login/'],
    ['ko-KR', 'kr', '/kr/experience-login/'],
  ]) {
    const normalized = registrationLanguage(language, { LANG: 'en_US.UTF-8' });
    assert.equal(registrationMarket(normalized), market);
    assert.equal(websiteOrigin(market, 'production'), 'https://thinkingai.io');
    assert.equal(aeRegistrationUrl(language, {}), `https://www.thinkingai.io${pathname}?entry=cli&source=other&market=${market}`);
  }
});

test('website onboarding resolves production and rejects explicit test requests', () => {
  assert.equal(websiteEnvironment(undefined, {}), 'production');
  assert.throws(() => websiteEnvironment('test', {}), /production/);
  assert.throws(() => websiteEnvironment(undefined, { AE_CLI_WEBSITE_ENV: 'test' }), /production/);
  assert.equal(websiteEnvironment('production', { AE_CLI_WEBSITE_ENV: 'test' }), 'production');
});

test('tool context preserves original public continuation parameters', () => {
  assert.equal(environmentForWebsiteOrigin('https://thinkingai.io'), 'production');
  assert.equal(environmentForWebsiteOrigin('https://www.thinkingai.io'), 'production');
  for (const origin of ['https://test.thinkingai.cn', 'https://test.thinkingai.io']) {
    assert.throws(() => environmentForWebsiteOrigin(origin), /Untrusted onboarding website/);
  }
  const thread = '3278330f-ec86-45c1-b4d3-a40617db096a';
  const registration = aeRegistrationUrl('ja-JP', { CODEX_THREAD_ID: thread }, 'codex');
  assert.ok(registration);
  const direct = new URL(registration);
  assert.equal(direct.origin, 'https://www.thinkingai.io');
  assert.equal(direct.pathname, '/jp/experience-login/');
  assert.equal(direct.searchParams.get('entry'), 'cli');
  assert.equal(direct.searchParams.get('source'), 'codex');
  assert.equal(direct.searchParams.get('tool_reference'), thread);
  const resumed = new URL(withCliEntryContext(`https://thinkingai.io/jp/experience-login/?intent_id=${thread}&market=jp&return_to=%2Fjp%2Fexperience-cli%2F%3Fx%3D1&custom=kept`, 'cursor', 'us'));
  assert.equal(resumed.searchParams.get('intent_id'), thread);
  assert.equal(resumed.searchParams.get('market'), 'jp');
  assert.equal(resumed.searchParams.get('return_to'), '/jp/experience-cli/?x=1');
  assert.equal(resumed.searchParams.get('custom'), 'kept');
  assert.equal(resumed.searchParams.get('source'), 'cursor');
  assert.equal(resumed.searchParams.get('entry'), 'cli');
  assert.throws(() => withCliEntryContext('https://thinkingai.io/jp/experience-login/?poll_token=private', 'codex'), /private credential/);
  assert.throws(() => withCliEntryContext('https://thinkingai.io/jp/experience-login/?tool_reference=private', 'codex'), /Invalid AI tool/);
});

test('an invalid environment does not break regular host guidance', () => {
  const target = new URL('../src/core/host-guidance.ts', import.meta.url).href;
  const script = `import assert from 'node:assert/strict'; const module = await import(${JSON.stringify(target)}); assert.equal(module.aeRegistrationUrl('zh-CN'), undefined); assert.equal(new URL(module.aeRegistrationUrl('en-US')).origin, 'https://www.thinkingai.io');`;
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', script],
    { env: { ...process.env, AE_CLI_WEBSITE_ENV: 'invalid' }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('conversation language wins over terminal locale without changing an existing host', () => {
  assert.equal(registrationLanguage('ko-KR', { AE_LANG: 'zh-CN', LC_ALL: 'ja_JP.UTF-8' }), 'ko-KR');
  assert.equal(registrationLanguage(undefined, { LC_ALL: 'ja_JP.UTF-8', LANG: 'en_US.UTF-8' }), 'ja-JP');
  assert.equal(registrationLanguage(undefined, { LANGUAGE: 'ko_KR:en_US' }), 'ko-KR');
  assert.equal(registrationLanguage(undefined, { LANG: 'fr_FR.UTF-8' }), 'en-US');
  assert.equal(normalizeRegistrationLanguage('constructor'), undefined);
});

test('missing-host guidance offers overseas onboarding and existing-account login in China', () => {
  const previous = process.env.AE_LANG;
  try {
    process.env.AE_LANG = 'en-US';
    const guidance = missingAeHostGuidance();
    assert.equal(guidance.configure_host, 'ae-cli config set-host <url>');
    assert.match(guidance.existing_customer, /administrator/);
    assert.equal(guidance.request_trial_url, guidance.registration_login_url);
    assert.equal(guidance.onboarding_command, 'ae-cli analysis onboarding run');
    assert.match(missingAeHostHint('Keep this action.'), /register or sign in/);
    assert.match(missingAeHostHint('Keep this action.'), /Keep this action\.$/);
    assert.doesNotMatch(JSON.stringify(guidance) + missingAeHostHint(), /request-demo|request a trial/);

    process.env.AE_LANG = 'zh-CN';
    const domestic = missingAeHostGuidance();
    assert.equal(domestic.configure_host, 'ae-cli config set-host <url>');
    assert.match(domestic.existing_customer, /administrator/);
    assert.equal(domestic.request_trial_url, null);
    assert.equal(domestic.registration_login_url, undefined);
    assert.equal(domestic.onboarding_command, undefined);
    assert.match(missingAeHostHint(), /ae-cli auth login --host <url>/);
    assert.match(missingAeHostHint(), /signup for CLI onboarding is currently unavailable in China/);
    assert.doesNotMatch(JSON.stringify(domestic) + missingAeHostHint(), /request-demo|experience-login|analysis onboarding/);
  } finally {
    if (previous === undefined) delete process.env.AE_LANG;
    else process.env.AE_LANG = previous;
  }
});
