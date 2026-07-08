/**
 * device-auth.ts — RFC 8628 device code login client
 *
 * Flow:
 *   1. POST /api/auth/device/authorize → {device_code, user_code, verification_uri_complete, interval, expires_in}
 *   2. Print verification_uri_complete; attempt to open browser cross-platform (disable with --no-browser)
 *   3. Poll POST /api/auth/device/token at the given interval:
 *      - authorization_pending → keep waiting
 *      - slow_down            → increase interval by 5s and continue
 *      - expired_token        → throw error and abort
 *      - 200 + tokens         → return token set
 *
 * Cross-platform browser open (no native dependencies):
 *   macOS   → execFileSync('open', [url])
 *   Windows → execFileSync('cmd', ['/c', 'start', '', url])
 *   Linux   → execFileSync('xdg-open', [url])
 *   On failure, only print the URL — do not block the login flow.
 */

import { execFileSync } from 'node:child_process';
import { logger } from './logger.js';

// ---------- Types ----------

export interface DeviceAuthorizeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

export interface DeviceTokenResponse {
  access_token: string;
  /** refresh_token is optional; absent in dev-login / some server configs — degrade gracefully */
  refresh_token?: string | null;
  token_type: string;
  /** expires_in is a server heuristic in seconds; treat as advisory only */
  expires_in: number;
}

export interface DeviceAuthOptions {
  /** Skip auto-opening the browser; only print the URL */
  noBrowser?: boolean;
}

// ---------- Errors ----------

/**
 * Thrown when the AE server does not expose the device-code endpoints (e.g. an older server
 * predating this feature). The CLI should fail fast rather than retrying
 * a missing endpoint until the device code expires.
 */
export class DeviceFlowUnsupportedError extends Error {
  constructor() {
    super('This AE server does not support device code login (it may be an older server version).');
    this.name = 'DeviceFlowUnsupportedError';
  }
}

/**
 * Heuristic: does an HTTP response look like the device-code endpoint is missing?
 * Old servers return 404, or serve the SPA index.html (Content-Type text/html, or an HTML body) even at HTTP 200.
 */
function looksLikeMissingEndpoint(status: number, contentType: string | null, body: string): boolean {
  if (status === 404) return true;
  if (contentType && contentType.toLowerCase().includes('text/html')) return true;
  const head = body.trimStart().toLowerCase();
  return head.startsWith('<!doctype html') || head.startsWith('<html');
}

// ---------- Cross-platform browser open ----------

/**
 * Attempt to open a URL in the default browser.
 * Silently degrades on failure (does not throw; caller continues to print the URL).
 * @returns true if the command was issued successfully (does not guarantee the browser actually opened)
 */
export function openBrowser(url: string, _execFile?: typeof execFileSync): boolean {
  // C1: Validate URL protocol before passing to shell commands (prevents injection on all OSes)
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    logger.warn(`openBrowser: invalid URL, not opening`);
    return false;
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    logger.warn(`openBrowser: unsafe protocol "${parsedUrl.protocol}", not opening`);
    return false;
  }

  // M1: Log only origin+path — do NOT log query string (may contain user_code)
  const safeLogUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;

  const exec = _execFile ?? execFileSync;
  try {
    if (process.platform === 'darwin') {
      exec('open', [url], { timeout: 5000 });
      return true;
    }
    if (process.platform === 'win32') {
      // `start` is a built-in command and must be invoked via cmd /c; the second empty string is the window title
      exec('cmd', ['/c', 'start', '', url], { timeout: 5000 });
      return true;
    }
    // Linux & others
    exec('xdg-open', [url], { timeout: 5000 });
    return true;
  } catch (e: any) {
    logger.warn(`openBrowser: failed to open ${safeLogUrl}: ${e.message}`);
    return false;
  }
}

// ---------- Device code flow ----------

/**
 * Request a device code from te-claude.
 * @param host  Full base URL of te-claude, e.g. "https://ae.thinkingengine.io"
 */
export async function authorizeDevice(host: string): Promise<DeviceAuthorizeResponse> {
  const base = host.replace(/\/+$/, '');
  const url = `${base}/api/auth/device/authorize`;

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    throw new Error(`Device authorize request failed: ${e.message}`);
  }

  const contentType = resp.headers.get('content-type');
  const text = await resp.text().catch(() => '');

  // F-012: detect an old server that lacks the device-code endpoint (404, or an HTML SPA page even at HTTP 200) and fail fast
  if (looksLikeMissingEndpoint(resp.status, contentType, text)) {
    throw new DeviceFlowUnsupportedError();
  }

  if (!resp.ok) {
    throw new Error(`Device authorize returned HTTP ${resp.status}: ${text}`);
  }

  let body: DeviceAuthorizeResponse;
  try {
    body = JSON.parse(text) as DeviceAuthorizeResponse;
  } catch {
    throw new Error('Device authorize returned invalid JSON');
  }

  if (!body.device_code || !body.user_code) {
    throw new Error('Device authorize response missing required fields');
  }

  return body;
}

/**
 * Single poll of the device token endpoint.
 *
 * Returns:
 *   - `{ status: 'approved', tokens: DeviceTokenResponse }` — authorized, contains tokens
 *   - `{ status: 'pending' }`                               — waiting for user to scan/confirm
 *   - `{ status: 'slow_down' }`                             — polling too fast
 *   - `{ status: 'expired' }`                               — device_code has expired
 *   - `{ status: 'error', message: string }`                — other error
 */
export type PollResult =
  | { status: 'approved'; tokens: DeviceTokenResponse }
  | { status: 'pending' }
  | { status: 'slow_down' }
  | { status: 'expired' }
  | { status: 'unsupported' }
  | { status: 'error'; message: string };

export async function pollDeviceToken(host: string, deviceCode: string): Promise<PollResult> {
  const base = host.replace(/\/+$/, '');
  const url = `${base}/api/auth/device/token`;

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_code: deviceCode }),
    });
  } catch (e: any) {
    return { status: 'error', message: `Network error: ${e.message}` };
  }

  if (resp.status === 200) {
    let body: DeviceTokenResponse;
    try {
      body = await resp.json() as DeviceTokenResponse;
    } catch {
      return { status: 'error', message: 'Token response is not valid JSON' };
    }
    if (!body.access_token) {
      return { status: 'error', message: 'Token response missing access_token' };
    }
    return { status: 'approved', tokens: body };
  }

  if (resp.status === 400) {
    let errorBody: { error?: string };
    try {
      errorBody = await resp.json() as { error?: string };
    } catch {
      errorBody = {};
    }
    const err = errorBody.error;
    if (err === 'authorization_pending') return { status: 'pending' };
    if (err === 'slow_down') return { status: 'slow_down' };
    if (err === 'expired_token') return { status: 'expired' };
    return { status: 'error', message: `Unknown error: ${err ?? 'unknown'}` };
  }

  // F-012: an old server without the device-code endpoint returns 404 or an HTML SPA page — fatal "unsupported" signal
  const contentType = resp.headers.get('content-type');
  const text = await resp.text().catch(() => '');
  if (looksLikeMissingEndpoint(resp.status, contentType, text)) {
    return { status: 'unsupported' };
  }

  // I4: surface HTTP status in message so the poll loop can detect definitive 4xx
  return { status: 'error', message: `Unexpected HTTP ${resp.status} from token endpoint` };
}

/**
 * Build the device-activate URL from the CLI's own known te-claude base.
 * The CLI does NOT trust the server-returned verification_uri: the server address depends on its
 * env/reverse-proxy config, and in multi-layer proxy topologies the Host header may be rewritten to
 * an internal service name (unreachable by the user). Only the user_code is trusted from the server.
 */
export function buildVerificationUrl(host: string, userCode: string): string {
  return `${host.replace(/\/+$/, '')}/device-activate?user_code=${encodeURIComponent(userCode)}`;
}

export interface PollLoopOptions {
  /** Poll interval in milliseconds (default 5000) */
  intervalMs?: number;
  /** Overall deadline in seconds from now (default 300, matching the device_code TTL) */
  expiresIn?: number;
}

/**
 * Poll the device token endpoint until the user authorizes, the device code expires, or the deadline passes.
 * Shared by the full runDeviceFlow and by the split-flow resume path (`auth login --device-code <code>`),
 * which polls without first re-running authorize.
 *
 * @param host        te-claude base URL
 * @param deviceCode  device_code obtained from authorizeDevice
 * @param options     PollLoopOptions (interval + deadline)
 * @param onStatus    Progress callback (for UI/stderr display)
 */
export async function pollDeviceFlow(
  host: string,
  deviceCode: string,
  options: PollLoopOptions = {},
  onStatus?: (msg: string) => void,
): Promise<DeviceTokenResponse> {
  const emit = (msg: string) => {
    if (onStatus) onStatus(msg);
  };

  let intervalMs = options.intervalMs ?? 5000;
  const expiresIn = options.expiresIn ?? 300;
  const deadline = Date.now() + expiresIn * 1000;
  let pollCount = 0;

  while (Date.now() < deadline) {
    await sleep(intervalMs);
    pollCount++;

    const result = await pollDeviceToken(host, deviceCode);

    if (result.status === 'approved') {
      emit(`Authorization successful! (polled ${pollCount} time(s))`);
      return result.tokens;
    }

    if (result.status === 'pending') {
      // Normal wait; print a progress hint every 5 polls
      if (pollCount % 5 === 0) {
        const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
        emit(`Waiting for authorization... (expires in ${remaining}s)`);
      }
      logger.info(`device-auth: poll #${pollCount} pending`);
      continue;
    }

    if (result.status === 'slow_down') {
      // RFC 8628: slow_down requires increasing the interval by at least 5s
      intervalMs += 5000;
      logger.info(`device-auth: slow_down received, new interval=${intervalMs}ms`);
      continue;
    }

    if (result.status === 'expired') {
      throw new Error(
        `Device code has expired. Please run ae-cli auth login again to restart the authorization flow.`,
      );
    }

    if (result.status === 'unsupported') {
      // F-012: server lacks the device-code endpoint — fail fast instead of retrying until timeout
      throw new DeviceFlowUnsupportedError();
    }

    if (result.status === 'error') {
      logger.warn(`device-auth: poll error: ${result.message}`);
      emit(`Poll error: ${result.message}`);
      // I4: Abort immediately on definitive 4xx (401/403); retry transient errors until expiry
      if (result.message.includes('HTTP 401') || result.message.includes('HTTP 403')) {
        throw new Error(`Authorization denied (${result.message}). Please check your configuration or run ae-cli auth login again.`);
      }
      continue;
    }
  }

  throw new Error(
    `Authorization timed out (not completed within ${expiresIn}s). Please run ae-cli auth login again.`,
  );
}

/**
 * Full device code login state machine.
 *
 * 1. Call authorizeDevice to obtain device_code and verification URL
 * 2. Print the URL (optionally auto-open browser)
 * 3. Poll at the given interval until approved / expired / timed out
 *
 * @param host         te-claude base URL
 * @param options      DeviceAuthOptions
 * @param onStatus     Progress callback (for UI/stderr display)
 * @returns            DeviceTokenResponse (token set after authorization)
 */
export async function runDeviceFlow(
  host: string,
  options: DeviceAuthOptions = {},
  onStatus?: (msg: string) => void,
): Promise<DeviceTokenResponse> {
  const emit = (msg: string) => {
    if (onStatus) onStatus(msg);
  };

  // Step 1: Request device code
  emit('Requesting authorization code from server...');
  const auth = await authorizeDevice(host);

  const userCode = auth.user_code;
  const verifyUrl = buildVerificationUrl(host, userCode);
  const expiresIn = auth.expires_in ?? 300;

  // Step 2: Display URL
  emit('');
  emit(`Verification code: ${userCode}`);
  emit(`Open the following link in your browser to complete authorization:`);
  emit(`  ${verifyUrl}`);
  emit('');

  if (!options.noBrowser) {
    const opened = openBrowser(verifyUrl);
    if (opened) {
      emit('(Attempted to open the link in your browser)');
    } else {
      emit('(Could not open browser automatically; please copy the link above manually)');
    }
    emit('');
  }

  // Step 3: Poll until authorized
  return pollDeviceFlow(host, auth.device_code, { intervalMs: (auth.interval ?? 5) * 1000, expiresIn }, onStatus);
}

// ---------- Utilities ----------

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
