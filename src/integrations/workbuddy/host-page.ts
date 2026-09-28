import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { listHosts, type ConfiguredHost } from '../../core/config.js';

const LOOPBACK_ADDRESS = '127.0.0.1';
const MAX_REQUEST_BYTES = 4096;

export interface WorkBuddyHostPageOptions {
  hosts?: ConfiguredHost[];
  port?: number;
  onSelect?: (host: string) => Promise<void> | void;
}

export interface WorkBuddyHostPageServer {
  url: string;
  selection: Promise<string>;
  close(): Promise<void>;
}

export type WorkBuddyHostValidation =
  | { ok: true; host: string }
  | { ok: false; message: string };

export function validateWorkBuddyHost(input: unknown): WorkBuddyHostValidation {
  if (typeof input !== 'string' || !input.trim()) {
    return { ok: false, message: '请输入 AE Host。' };
  }

  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, message: '请输入有效的 HTTPS 地址。' };
  }

  if (url.protocol !== 'https:') {
    return { ok: false, message: '仅支持 HTTPS 地址。' };
  }
  if (url.username || url.password) {
    return { ok: false, message: 'Host 地址不能包含用户名或密码。' };
  }
  if (url.search || url.hash) {
    return { ok: false, message: 'Host 地址不能包含查询参数或片段。' };
  }

  const pathname = url.pathname.replace(/\/+$/, '');
  return { ok: true, host: `${url.origin}${pathname === '/' ? '' : pathname}` };
}

export function renderWorkBuddyHostPage(
  hosts: ConfiguredHost[],
  sessionPath: string,
  nonce: string,
): string {
  const availableHosts = hosts.filter(host => validateWorkBuddyHost(host.url).ok);
  const selectedIndex = Math.max(0, availableHosts.findIndex(host => host.active));
  const hostRows = availableHosts.length > 0
    ? availableHosts.map((host, index) => renderHostRow(host, index === selectedIndex)).join('\n')
    : '<p class="empty">还没有保存的环境，请在下方输入 AE Host。</p>';

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ThinkingAI × WorkBuddy</title>
  <style nonce="${nonce}">
    :root { color-scheme: light; font-family: Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 28px 20px; color: #111c35; background: radial-gradient(circle at 50% 42%, #f8fbff 0, #eef3f9 48%, #e7edf5 100%); }
    .card { width: min(720px, 100%); padding: 34px 48px 26px; background: #fff; border: 1px solid #dde5ef; border-radius: 22px; box-shadow: 0 24px 64px rgba(39, 62, 92, .14); }
    .brands { display: flex; align-items: center; justify-content: center; gap: 24px; min-height: 58px; margin-bottom: 24px; }
    .thinkingai { width: 244px; height: auto; object-fit: contain; }
    .workbuddy { width: 136px; height: auto; object-fit: contain; }
    .collaboration { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-width: 55px; }
    .connection-dot { width: 7px; height: 7px; border-radius: 50%; background: #9aa8bd; opacity: .24; animation: connectionPulse 1.35s ease-in-out infinite; }
    .connection-dot:nth-child(2) { animation-delay: .18s; }
    .connection-dot:nth-child(3) { animation-delay: .36s; }
    @keyframes connectionPulse { 0%, 70%, 100% { opacity: .2; transform: translateY(0) scale(.82); } 35% { opacity: 1; transform: translateY(-1px) scale(1); } }
    h1 { margin: 0; text-align: center; font-size: 30px; line-height: 1.25; letter-spacing: -.025em; }
    .subtitle { margin: 7px 0 22px; text-align: center; color: #62708a; font-size: 16px; }
    fieldset { margin: 0; padding: 0; border: 0; }
    legend, .field-label { display: block; margin-bottom: 10px; color: #18243c; font-size: 15px; font-weight: 700; }
    .host-list { display: grid; gap: 8px; max-height: 188px; overflow: auto; }
    .host-option { display: flex; align-items: center; gap: 14px; min-height: 68px; padding: 11px 16px; border: 1px solid #d5deea; border-radius: 8px; cursor: pointer; transition: border-color .15s, background .15s, box-shadow .15s; }
    .host-option:hover { border-color: #92b8ff; }
    .host-option:has(input:checked) { border-color: #0878f9; background: #edf5ff; box-shadow: 0 0 0 1px #0878f9 inset; }
    .host-option input { width: 18px; height: 18px; margin: 0; accent-color: #0878f9; flex: none; }
    .host-copy { min-width: 0; display: grid; gap: 3px; }
    .host-label { color: #111827; font-weight: 700; }
    .host-url { overflow: hidden; color: #65738d; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
    .empty { margin: 0; padding: 18px; color: #65738d; background: #f7f9fc; border: 1px dashed #cad5e3; border-radius: 8px; }
    .divider { display: flex; align-items: center; gap: 16px; margin: 18px 0; color: #7b879d; font-size: 14px; }
    .divider::before, .divider::after { content: ""; height: 1px; background: #dbe3ee; flex: 1; }
    input[type="url"] { width: 100%; height: 46px; padding: 0 14px; color: #162238; font: inherit; border: 1px solid #cad5e3; border-radius: 7px; outline: none; }
    input[type="url"]:focus { border-color: #0878f9; box-shadow: 0 0 0 3px rgba(8, 120, 249, .13); }
    input[type="url"]::placeholder { color: #8a96aa; }
    .helper { margin: 7px 0 0; color: #6b7890; font-size: 13px; }
    .notice { display: flex; align-items: center; gap: 10px; margin: 18px 0; padding: 12px 15px; color: #405579; background: #edf5ff; border: 1px solid #d8e6ff; border-radius: 7px; font-size: 13px; line-height: 1.55; }
    .info { width: 19px; height: 19px; flex: none; color: #0878f9; }
    .actions { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }
    button { width: 100%; height: 44px; border-radius: 7px; font: inherit; font-weight: 700; cursor: pointer; }
    button:disabled { cursor: not-allowed; opacity: .68; }
    .primary { color: #fff; background: #0878f9; border: 1px solid #0878f9; }
    .primary:hover { background: #0069df; }
    .secondary { color: #38465d; background: #fff; border: 1px solid #cad5e3; }
    .secondary:hover { background: #f6f8fb; }
    .status { min-height: 22px; margin: 14px 0 0; text-align: center; color: #0a6d3a; font-size: 13px; }
    .status.error { color: #bd1e2d; }
    footer { margin-top: 4px; text-align: center; font-size: 13px; }
    footer a { color: #7b879d; text-decoration: none; transition: color .15s; }
    footer a:hover { color: #0878f9; }
    @media (prefers-reduced-motion: reduce) { .connection-dot { animation: none; opacity: .65; } }
    @media (max-width: 620px) { body { padding: 0; background: #fff; } .card { min-height: 100vh; padding: 28px 20px 22px; border: 0; border-radius: 0; box-shadow: none; } .brands { gap: 12px; } .thinkingai { width: 184px; } .workbuddy { width: 104px; } .collaboration { gap: 4px; min-width: 34px; } .connection-dot { width: 5px; height: 5px; } h1 { font-size: 26px; } }
  </style>
</head>
<body>
  <main class="card">
    <header>
      <div class="brands" aria-label="ThinkingAI 与 WorkBuddy">
        <img class="thinkingai" src="${sessionPath}thinkingai.svg" alt="ThinkingAI">
        <span class="collaboration" aria-hidden="true"><span class="connection-dot"></span><span class="connection-dot"></span><span class="connection-dot"></span></span>
        <img class="workbuddy" src="${sessionPath}workbuddy.png" alt="WorkBuddy">
      </div>
      <h1>连接 ThinkingAI</h1>
      <p class="subtitle">选择要在 WorkBuddy 中使用的 AE 环境</p>
    </header>
    <form id="host-form" novalidate>
      <fieldset>
        <legend>已保存的环境</legend>
        <div class="host-list">${hostRows}</div>
      </fieldset>
      <div class="divider">或</div>
      <label class="field-label" for="custom-host">使用其他 Host</label>
      <input id="custom-host" name="custom-host" type="url" inputmode="url" autocomplete="url" placeholder="https://your-ae-host.example.com">
      <p class="helper">仅支持 HTTPS 地址</p>
      <div class="notice">
        <svg class="info" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor"/><path fill="currentColor" d="M11 10.5h2V17h-2zM12 6.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z"/></svg>
        <span>账号密码将在 AE 统一登录页中输入，本页面仅用于选择 Host。</span>
      </div>
      <div class="actions">
        <button class="secondary" id="cancel" type="button">取消</button>
        <button class="primary" id="submit-host" type="submit">继续前往 AE 登录</button>
      </div>
      <p class="status" id="status" role="status" aria-live="polite"></p>
    </form>
    <footer><a href="https://www.thinkingai.cn/" target="_blank" rel="noopener noreferrer">了解更多，访问 ThinkingAI 官网 →</a></footer>
  </main>
  <script nonce="${nonce}">
    const form = document.getElementById('host-form');
    const customHost = document.getElementById('custom-host');
    const status = document.getElementById('status');
    const submitButton = document.getElementById('submit-host');
    const cancelButton = document.getElementById('cancel');
    const radios = Array.from(document.querySelectorAll('input[name="saved-host"]'));

    customHost.addEventListener('input', () => {
      if (customHost.value.trim()) radios.forEach(radio => { radio.checked = false; });
      status.textContent = '';
      status.classList.remove('error');
    });
    radios.forEach(radio => radio.addEventListener('change', () => {
      customHost.value = '';
      status.textContent = '';
      status.classList.remove('error');
    }));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (submitButton.disabled) return;
      const selected = radios.find(radio => radio.checked);
      const host = customHost.value.trim() || (selected ? selected.value : '');
      status.textContent = '';
      status.classList.remove('error');
      submitButton.disabled = true;
      submitButton.textContent = '正在继续…';
      try {
        const response = await fetch('${sessionPath}select', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host }),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.message || 'Host 校验失败。');
        customHost.disabled = true;
        radios.forEach(radio => { radio.disabled = true; });
        cancelButton.disabled = true;
        submitButton.textContent = '已继续前往 AE 登录';
        status.textContent = 'Host 已保存，AE 登录页正在打开。如已关闭，请返回 WorkBuddy 重新连接。';
      } catch (error) {
        submitButton.disabled = false;
        submitButton.textContent = '继续前往 AE 登录';
        status.textContent = error instanceof Error ? error.message : 'Host 校验失败。';
        status.classList.add('error');
      }
    });
    cancelButton.addEventListener('click', () => {
      status.textContent = '已取消，可以关闭此页面。';
      status.classList.remove('error');
    });
  </script>
</body>
</html>`;
}

export async function startWorkBuddyHostPage(
  options: WorkBuddyHostPageOptions = {},
): Promise<WorkBuddyHostPageServer> {
  const hosts = options.hosts ?? listHosts();
  const sessionId = randomBytes(24).toString('base64url');
  const sessionPath = `/workbuddy/${sessionId}/`;
  const nonce = randomBytes(18).toString('base64url');
  const assets = {
    thinkingai: readBrandAsset('thinkingai.svg'),
    workbuddy: readBrandAsset('workbuddy.png'),
  };
  let resolveSelection = (_host: string) => {};
  const selection = new Promise<string>(resolve => {
    resolveSelection = resolve;
  });

  const server = createServer(async (request, response) => {
    setSecurityHeaders(response, nonce);
    const requestUrl = new URL(request.url ?? '/', `http://${LOOPBACK_ADDRESS}`);

    if (request.method === 'GET' && requestUrl.pathname === sessionPath) {
      respond(response, 200, 'text/html; charset=utf-8', renderWorkBuddyHostPage(hosts, sessionPath, nonce));
      return;
    }
    if (request.method === 'GET' && requestUrl.pathname === `${sessionPath}thinkingai.svg`) {
      respond(response, 200, 'image/svg+xml', assets.thinkingai);
      return;
    }
    if (request.method === 'GET' && requestUrl.pathname === `${sessionPath}workbuddy.png`) {
      respond(response, 200, 'image/png', assets.workbuddy);
      return;
    }
    if (request.method === 'POST' && requestUrl.pathname === `${sessionPath}select`) {
      const selectedHost = await handleSelection(request, response, options.onSelect);
      if (selectedHost) resolveSelection(selectedHost);
      return;
    }

    respond(response, 404, 'application/json; charset=utf-8', JSON.stringify({ ok: false, message: 'Not found.' }));
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 0, LOOPBACK_ADDRESS, () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    await closeServer(server);
    throw new Error('Cannot resolve the WorkBuddy host page address.');
  }

  return {
    url: `http://${LOOPBACK_ADDRESS}:${address.port}${sessionPath}`,
    selection,
    close: () => closeServer(server),
  };
}

function renderHostRow(host: ConfiguredHost, selected: boolean): string {
  const url = escapeHtml(host.url);
  return `<label class="host-option">
          <input type="radio" name="saved-host" value="${url}"${selected ? ' checked' : ''}>
          <span class="host-copy"><span class="host-label">${escapeHtml(host.label)}</span><span class="host-url">${url}</span></span>
        </label>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function readBrandAsset(name: string): Buffer {
  const candidates = [
    new URL(`../assets/workbuddy-host-page/${name}`, import.meta.url),
    new URL(`../../../assets/workbuddy-host-page/${name}`, import.meta.url),
  ];
  const match = candidates.find(candidate => fs.existsSync(fileURLToPath(candidate)));
  if (!match) throw new Error(`WorkBuddy host page asset is missing: ${name}`);
  return fs.readFileSync(match);
}

async function handleSelection(
  request: IncomingMessage,
  response: ServerResponse,
  onSelect?: WorkBuddyHostPageOptions['onSelect'],
): Promise<string | undefined> {
  try {
    const body = await readJsonBody(request);
    const result = validateWorkBuddyHost(body.host);
    if (!result.ok) {
      respond(response, 400, 'application/json; charset=utf-8', JSON.stringify(result));
      return undefined;
    }

    if (!onSelect) {
      respond(response, 200, 'application/json; charset=utf-8', JSON.stringify(result));
      return result.host;
    }

    await onSelect(result.host);
    respond(response, 200, 'application/json; charset=utf-8', JSON.stringify(result));
    return result.host;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request.';
    respond(response, 400, 'application/json; charset=utf-8', JSON.stringify({ ok: false, message }));
    return undefined;
  }
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > MAX_REQUEST_BYTES) {
      throw new Error('Request body is too large.');
    }
  }
  const parsed = JSON.parse(body || '{}');
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Request body must be a JSON object.');
  }
  return parsed as Record<string, unknown>;
}

function setSecurityHeaders(response: ServerResponse, nonce: string): void {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Security-Policy', `default-src 'none'; img-src 'self'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`);
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
}

function respond(response: ServerResponse, status: number, contentType: string, body: string | Buffer): void {
  response.statusCode = status;
  response.setHeader('Content-Type', contentType);
  response.end(body);
}

function closeServer(server: ReturnType<typeof createServer>): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  });
}
