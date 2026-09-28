import assert from 'node:assert/strict';
import test from 'node:test';
import {
  renderWorkBuddyHostPage,
  startWorkBuddyHostPage,
  validateWorkBuddyHost,
} from '../src/integrations/workbuddy/host-page.ts';

test('validateWorkBuddyHost accepts and normalizes HTTPS hosts', () => {
  assert.deepEqual(
    validateWorkBuddyHost('  https://ae.example.com/base/  '),
    { ok: true, host: 'https://ae.example.com/base' },
  );
  assert.deepEqual(
    validateWorkBuddyHost('https://ae.example.com:8443'),
    { ok: true, host: 'https://ae.example.com:8443' },
  );
});

test('validateWorkBuddyHost rejects unsafe or malformed values', () => {
  for (const input of [
    '',
    'ae.example.com',
    'http://ae.example.com',
    'https://user:secret@ae.example.com',
    'https://ae.example.com?token=secret',
    'https://ae.example.com/#section',
  ]) {
    assert.equal(validateWorkBuddyHost(input).ok, false, String(input));
  }
});

test('renderWorkBuddyHostPage includes the approved Chinese UI and escapes host data', () => {
  const html = renderWorkBuddyHostPage(
    [
      { url: 'https://ae.example.com', label: '<script>alert(1)</script>', active: true },
      { url: 'https://ae-two.example.com', label: '最近使用', active: false },
      { url: 'http://localhost:3000', label: 'Local HTTP', active: false },
    ],
    '/workbuddy/session/',
    'test-nonce',
  );

  assert.match(html, /连接 ThinkingAI/);
  assert.match(html, /选择要在 WorkBuddy 中使用的 AE 环境/);
  assert.match(html, /账号密码将在 AE 统一登录页中输入，本页面仅用于选择 Host。/);
  assert.match(html, /继续前往 AE 登录/);
  assert.match(html, /id="submit-host"/);
  assert.match(html, /if \(submitButton\.disabled\) return;/);
  assert.match(html, /Host 已保存，AE 登录页正在打开。如已关闭，请返回 WorkBuddy 重新连接。/);
  assert.match(html, />取消</);
  assert.match(html, /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/);
  assert.match(html, /button \{ width: 100%; height: 44px;/);
  assert.match(html, /thinkingai\.svg/);
  assert.match(html, /workbuddy\.png/);
  assert.equal((html.match(/class="connection-dot"/g) ?? []).length, 3);
  assert.match(html, /@keyframes connectionPulse/);
  assert.match(html, /href="https:\/\/www\.thinkingai\.cn\/"/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /Local HTTP/);
});

test('startWorkBuddyHostPage serves the page, brand assets, and selection validation on loopback', async () => {
  const page = await startWorkBuddyHostPage({
    hosts: [
      { url: 'https://ae-one.example.com', label: '环境一', active: false },
      { url: 'https://ae-two.example.com', label: '环境二', active: true },
    ],
  });

  try {
    const pageUrl = new URL(page.url);
    assert.equal(pageUrl.hostname, '127.0.0.1');
    assert.match(pageUrl.pathname, /^\/workbuddy\/[A-Za-z0-9_-]{32}\/$/);

    const response = await fetch(page.url);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /^text\/html/);
    assert.match(response.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
    const html = await response.text();
    assert.match(html, /value="https:\/\/ae-two\.example\.com" checked/);

    for (const [asset, contentType] of [
      ['thinkingai.svg', 'image/svg+xml'],
      ['workbuddy.png', 'image/png'],
    ] as const) {
      const assetResponse = await fetch(new URL(asset, page.url));
      assert.equal(assetResponse.status, 200);
      assert.equal(assetResponse.headers.get('content-type'), contentType);
      assert.ok((await assetResponse.arrayBuffer()).byteLength > 1000);
    }

    const validResponse = await fetch(new URL('select', page.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: 'https://customer.example.com/' }),
    });
    assert.equal(validResponse.status, 200);
    assert.deepEqual(await validResponse.json(), { ok: true, host: 'https://customer.example.com' });
    assert.equal(await page.selection, 'https://customer.example.com');

    const invalidResponse = await fetch(new URL('select', page.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: 'http://customer.example.com' }),
    });
    assert.equal(invalidResponse.status, 400);
    assert.equal((await invalidResponse.json() as { ok: boolean }).ok, false);

    const wrongSession = await fetch(`${pageUrl.origin}/workbuddy/wrong/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: 'https://customer.example.com' }),
    });
    assert.equal(wrongSession.status, 404);
  } finally {
    await page.close();
  }
});
