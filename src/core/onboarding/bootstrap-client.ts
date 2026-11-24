import { safeJsonParse } from '../json-utils.js';
import type { AeRegistrationLanguage } from '../host-guidance.js';
import { UUID_PATTERN } from './contracts.js';
import { cliEntrySource, environmentForWebsiteOrigin, websiteEnvironment, websiteOrigin, withCliEntryContext, type WebsiteEnvironment } from '../website-entry.js';

const PATH = '/backend/demo/v1/experience/cli/bootstrap-intents';
class BootstrapRequestError extends Error {
  constructor(readonly websiteStatus: number) { super(`The onboarding website request failed (HTTP ${websiteStatus}).`); }
}
export type BootstrapLoginMode = 'website_login' | 'device_confirmation';
export type BootstrapAuthorizationStatus = 'pending' | 'authorizing' | 'approved' | 'claimed' | 'expired';
export interface BootstrapCreated { intent_id: string; login_url: string; poll_token: string; expires_at: string; poll_after_ms: number; login_mode?: BootstrapLoginMode }
export interface BootstrapState { intent_id: string; status: 'pending' | 'account_ready' | 'browser_ready' | 'expired'; host: string | null; ready_url: string | null; expires_at: string; poll_after_ms: number; login_mode?: BootstrapLoginMode; authorization_status?: BootstrapAuthorizationStatus }
export interface BootstrapDevice {
  login_mode: 'website_login'; authorization_status: BootstrapAuthorizationStatus; host?: string; poll_after_ms?: number;
  device_code?: string; user_code?: string; expires_at?: string; interval?: number;
  expected_login_name?: string; expected_company_id?: string;
}

function loginMode(value: unknown): BootstrapLoginMode | undefined {
  if (value === undefined || value === null) return undefined;
  if (value === 'website_login' || value === 'device_confirmation') return value;
  throw new Error('The website returned an invalid login mode.');
}

function authorizationStatus(value: unknown): BootstrapAuthorizationStatus | undefined {
  if (value === undefined || value === null) return undefined;
  if (['pending', 'authorizing', 'approved', 'claimed', 'expired'].includes(String(value))) return value as BootstrapAuthorizationStatus;
  throw new Error('The website returned an invalid authorization status.');
}

export function bootstrapOrigin(market: string, environment: WebsiteEnvironment = websiteEnvironment()): string {
  return websiteOrigin(market, environment);
}

export function trustedProductHost(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) {
    throw new Error('Onboarding requires a trusted HTTPS product origin.');
  }
  return url.origin;
}

function websiteUrl(value: string, origin: string): string {
  const url = new URL(value);
  if (url.origin !== origin || url.username || url.password) throw new Error('The website returned an untrusted continuation URL.');
  return url.toString();
}

async function request(origin: string, endpoint: string, init: RequestInit, signal: AbortSignal): Promise<any> {
  environmentForWebsiteOrigin(origin);
  const response = await fetch(`${origin}${endpoint}`, { ...init, redirect: 'error', signal,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init.headers } });
  const body = safeJsonParse(await response.text());
  if (!response.ok || body?.return_code !== 0 || !body.data || typeof body.data !== 'object') {
    throw new BootstrapRequestError(response.status);
  }
  return body.data;
}

export async function createBootstrap(
  market: string, source: string, host: string | undefined, signal: AbortSignal,
  toolReference?: string, environment?: WebsiteEnvironment, language?: AeRegistrationLanguage,
): Promise<BootstrapCreated> {
  const origin = bootstrapOrigin(market, environment);
  const tool = cliEntrySource(source);
  if (toolReference && (tool !== 'codex' || !UUID_PATTERN.test(toolReference))) throw new Error('Invalid AI tool continuation reference.');
  const data = await request(origin, PATH, { method: 'POST', headers: {
    'X-AE-CLI-Login-Mode': 'website_login',
    ...(language ? { 'Accept-Language': language } : {}),
  }, body: JSON.stringify({ market, source,
    ...(host ? { requested_host: trustedProductHost(host) } : {}), ...(toolReference ? { tool_reference: toolReference } : {}) }) }, signal);
  if (typeof data.intent_id !== 'string' || !UUID_PATTERN.test(data.intent_id)
    || typeof data.poll_token !== 'string' || data.poll_token.length < 16 || !Number.isFinite(Date.parse(data.expires_at))) {
    throw new Error('The website returned an invalid bootstrap session.');
  }
  return { ...data, login_mode: loginMode(data.login_mode), login_url: withCliEntryContext(websiteUrl(data.login_url, origin), tool, market, toolReference) };
}

export async function readBootstrap(origin: string, intentId: string, pollToken: string, signal: AbortSignal, source?: string, market?: string): Promise<BootstrapState> {
  if (!UUID_PATTERN.test(intentId)) throw new Error('Invalid bootstrap continuation.');
  const data = await request(origin, `${PATH}/${encodeURIComponent(intentId)}`, {
    method: 'GET', headers: { 'X-CLI-Bootstrap-Token': pollToken },
  }, signal);
  if (data.intent_id !== intentId || !['pending', 'account_ready', 'browser_ready', 'expired'].includes(data.status)) throw new Error('Invalid bootstrap state.');
  return { ...data, login_mode: loginMode(data.login_mode), authorization_status: authorizationStatus(data.authorization_status), host: data.host ? trustedProductHost(data.host) : null,
    ready_url: data.ready_url ? source ? withCliEntryContext(websiteUrl(data.ready_url, origin), cliEntrySource(source), market)
      : websiteUrl(data.ready_url, origin) : null };
}

/** Private POST only; ordinary status reads never claim a device credential. */
export async function claimBootstrapDevice(origin: string, intentId: string, pollToken: string, signal: AbortSignal): Promise<BootstrapDevice> {
  if (!UUID_PATTERN.test(intentId)) throw new Error('Invalid bootstrap continuation.');
  const data = await request(origin, `${PATH}/${encodeURIComponent(intentId)}/device`, {
    method: 'POST', body: '{}', headers: { 'X-CLI-Bootstrap-Token': pollToken },
  }, signal).catch((error: unknown) => {
    // Only this private claim interprets HTTP 410 as expiry. Other endpoints keep their errors.
    if (error instanceof BootstrapRequestError && error.websiteStatus === 410) {
      return { login_mode: 'website_login', authorization_status: 'expired' };
    }
    throw error;
  });
  if (loginMode(data.login_mode) !== 'website_login') throw new Error('The website did not confirm this login mode.');
  const status = authorizationStatus(data.authorization_status);
  if (!status) throw new Error('The website returned an invalid authorization status.');
  if (status !== 'approved' && status !== 'claimed') return { login_mode: 'website_login', authorization_status: status,
    ...(Number.isFinite(data.poll_after_ms) ? { poll_after_ms: data.poll_after_ms } : {}) };
  if (typeof data.device_code !== 'string' || !/^uba_[A-Za-z0-9_-]{43}$/.test(data.device_code)
    || typeof data.user_code !== 'string' || !/^[A-HJ-NP-Z2-9]{8}$/.test(data.user_code)
    || !Number.isFinite(Date.parse(data.expires_at)) || !Number.isFinite(data.interval) || data.interval < 1 || data.interval > 60
    || typeof data.expected_login_name !== 'string' || !data.expected_login_name.trim() || data.expected_login_name.length > 256
    || !/^[1-9][0-9]*$/.test(String(data.expected_company_id))
    || !Number.isSafeInteger(Number(data.expected_company_id))) throw new Error('The website returned an invalid device connection.');
  return { login_mode: 'website_login', authorization_status: status, host: trustedProductHost(data.host),
    device_code: data.device_code, user_code: data.user_code, expires_at: data.expires_at, interval: data.interval,
    expected_login_name: data.expected_login_name, expected_company_id: String(data.expected_company_id) };
}
