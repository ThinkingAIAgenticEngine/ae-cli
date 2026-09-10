import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getActiveHost, getFallbackCliToken, getConfigDir, listHosts } from './config.js';
import {
  clearAllCredentials,
  getActiveCredential,
  loadCliToken as loadSecureCliToken,
  markCredentialRenewed,
  saveCredential,
  SecureStoreAuthError,
} from './secure-store.js';
import { safeJsonParse, safeReadJsonFile } from './json-utils.js';
import { logger } from './logger.js';
import { PermissionError } from './errors.js';
import { normalizeUrl } from './url-utils.js';

const CLI_TOKEN_GENERATE_PATH = '/v1/ta/cli/token/generate';
const CLI_TOKEN_RENEW_PATH = '/v1/ta/cli/token/renew';
const CLI_TOKEN_VALIDATE_PATH = '/v1/ta/cli/token/validate';

export interface CliTokenAccount {
  openId: string;
  loginName: string;
  userName: string;
}

export interface CliTokenValidationResult {
  account?: CliTokenAccount;
  cliTokenExpiresAt?: string;
}

/** The configured host cannot serve the optional CLI token validation endpoint yet. */
export class CliTokenValidationUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliTokenValidationUnavailableError';
  }
}

function isExplicitCliTokenRejection(data: any, responseText: string): boolean {
  const code = String(data?.code ?? data?.error?.code ?? '');
  const message = String(data?.return_message ?? data?.message ?? data?.error?.message ?? responseText);
  return /cli[_-]?token[_-]?(invalid|expired)/i.test(code)
    || /cli[-_\s]?token.*\b(invalid|expired)\b/i.test(message)
    || /\b(invalid|expired)\b.*cli[-_\s]?token/i.test(message);
}

function optionalNonEmptyString(...values: unknown[]): string | undefined {
  return values.find((value) => typeof value === 'string' && value.trim()) as string | undefined;
}

function optionalIsoDate(...values: unknown[]): string | undefined {
  const value = values.find((candidate) =>
    (typeof candidate === 'string' && candidate.trim()) || typeof candidate === 'number');
  if (value === undefined) return undefined;
  const date = new Date(value as string | number);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

const cliTokenCache = new Map<string, string>();
const renewedLocalDate = new Map<string, string>();
const renewInFlight = new Map<string, Promise<void>>();

type RenewStore = Record<string, { date: string }>;

function tokenFingerprint(cliToken: string): string {
  return crypto.createHash('sha256').update(cliToken).digest('hex').slice(0, 16);
}

function renewKey(hostUrl: string, cliToken: string): string {
  return `${normalizeUrl(hostUrl)}#${tokenFingerprint(cliToken)}`;
}

function renewStateFilePath(): string {
  return path.join(getConfigDir(), 'cli-token-renew.json');
}

/** Local calendar day as YYYY-MM-DD (machine timezone). */
export function localRenewDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function loadRenewStore(): RenewStore {
  try {
    const file = renewStateFilePath();
    if (!fs.existsSync(file)) return {};
    const data = safeReadJsonFile(file);
    return data && typeof data === 'object' && !Array.isArray(data) ? data as RenewStore : {};
  } catch {
    return {};
  }
}

function saveRenewStore(store: RenewStore): void {
  const file = renewStateFilePath();
  if (Object.keys(store).length === 0) {
    try { fs.rmSync(file, { force: true }); } catch {}
    return;
  }
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(store, null, 2), { encoding: 'utf8', mode: 0o600 });
  try { fs.chmodSync(file, 0o600); } catch {}
}

function persistedRenewDate(hostUrl: string, cliToken: string): string | undefined {
  const credential = getActiveCredential(hostUrl);
  if (credential?.cliToken === cliToken && credential.lastRenewedOn) return credential.lastRenewedOn;
  return loadRenewStore()[renewKey(hostUrl, cliToken)]?.date;
}

function markRenewSucceeded(hostUrl: string, cliToken: string, date: string): void {
  const key = renewKey(hostUrl, cliToken);
  renewedLocalDate.set(key, date);
  markCredentialRenewed(hostUrl, cliToken, date);
  const store = loadRenewStore();
  store[key] = { date };
  saveRenewStore(store);
}

export function clearCliTokenCache(hostUrl?: string): void {
  if (!hostUrl) {
    cliTokenCache.clear();
    renewedLocalDate.clear();
    renewInFlight.clear();
    return;
  }
  const normalizedHost = normalizeUrl(hostUrl);
  cliTokenCache.delete(normalizedHost);
  for (const key of [...renewedLocalDate.keys()]) {
    if (key.startsWith(`${normalizedHost}#`)) renewedLocalDate.delete(key);
  }
  for (const key of [...renewInFlight.keys()]) {
    if (key.startsWith(`${normalizedHost}#`)) renewInFlight.delete(key);
  }
}

/** Mint a CLI token during device login. The access token is never persisted. */
async function generateCliToken(hostUrl: string, accessToken: string): Promise<string> {
  if (!accessToken) throw new Error('CLI token generation requires the access token returned by auth login.');
  const url = `${hostUrl.replace(/\/+$/, '')}${CLI_TOKEN_GENERATE_PATH}`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `bearer ${accessToken}` },
  });
  if (!resp.ok) {
    if (resp.status === 403) {
      const text = await resp.text();
      let body: any = {};
      try { body = text ? safeJsonParse(text) : {}; } catch {}
      const message = body.message ?? body.return_message ?? 'CLI access is disabled for this account.';
      const code = body.code ?? (String(message).includes('CLI_ACCESS_DISABLED') ? 'CLI_ACCESS_DISABLED' : undefined);
      throw new PermissionError(message, code, body.hint);
    }
    throw new Error(`CLI token generate HTTP error: ${resp.status} ${resp.statusText}`);
  }
  const data = safeJsonParse(await resp.text());
  if (data.return_code !== 0) {
    const message = data.return_message || data.message || 'unknown';
    if (data.code === 'CLI_ACCESS_DISABLED' || String(message).includes('CLI_ACCESS_DISABLED')) {
      throw new PermissionError(message, 'CLI_ACCESS_DISABLED', data.hint);
    }
    throw new Error(`CLI token generate error: ${message} (code: ${data.return_code})`);
  }
  const cliToken = data.data?.userSecret ?? data.data?.user_secret;
  if (!cliToken) throw new Error('CLI token generate error: empty userSecret in response');
  return cliToken;
}

/** Validate a CLI token without exposing it in the request URL. */
export async function validateCliTokenOnServer(
  hostUrl: string,
  cliToken: string,
): Promise<CliTokenValidationResult> {
  const url = `${hostUrl.replace(/\/+$/, '')}${CLI_TOKEN_VALIDATE_PATH}`;
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', 'cli-token': cliToken },
    });
  } catch (error: any) {
    throw new CliTokenValidationUnavailableError(`Unable to validate CLI token for ${hostUrl}: ${error.message}`);
  }

  const responseText = await resp.text();
  let body: any;
  try { body = safeJsonParse(responseText); } catch { body = undefined; }
  if (isExplicitCliTokenRejection(body, responseText)) {
    throw new SecureStoreAuthError(
      `CLI token is invalid or expired for ${hostUrl}. `
      + `Run: ae-cli auth logout --host ${hostUrl}, then ae-cli auth login --host ${hostUrl}`,
    );
  }
  if (!resp.ok) {
    throw new CliTokenValidationUnavailableError(
      `CLI token validation is unavailable for ${hostUrl} (HTTP ${resp.status} ${resp.statusText})`,
    );
  }
  if (body?.return_code !== 0) {
    throw new CliTokenValidationUnavailableError(`CLI token validation returned an unsupported response for ${hostUrl}`);
  }

  const data = body?.data;
  const openId = optionalNonEmptyString(data?.openId, data?.open_id);
  const loginName = optionalNonEmptyString(data?.loginName, data?.login_name);
  const userName = optionalNonEmptyString(data?.userName, data?.user_name);
  const account = openId && loginName && userName ? { openId, loginName, userName } : undefined;
  const cliTokenExpiresAt = optionalIsoDate(data?.expiresAt, data?.expires_at);
  return {
    ...(account ? { account } : {}),
    ...(cliTokenExpiresAt ? { cliTokenExpiresAt } : {}),
  };
}

/** Renew is authenticated exclusively by the CLI token itself. */
async function renewCliTokenOnServer(hostUrl: string, cliToken: string): Promise<void> {
  const url = new URL(`${hostUrl.replace(/\/+$/, '')}${CLI_TOKEN_RENEW_PATH}`);
  url.searchParams.set('cli-token', cliToken);
  const resp = await fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } });
  const text = await resp.text();
  let data: any;
  try { data = text ? safeJsonParse(text) : {}; } catch { data = {}; }
  if (!resp.ok) throw new Error(`CLI token renew HTTP error: ${resp.status} ${resp.statusText}`);
  if (data?.return_code !== undefined && data.return_code !== 0) {
    throw new Error(`CLI token renew error: ${data.return_message || 'unknown'} (code: ${data.return_code})`);
  }
}

async function maybeRenewCliTokenDaily(hostUrl: string, cliToken: string): Promise<void> {
  const key = renewKey(hostUrl, cliToken);
  const today = localRenewDate();
  if (renewedLocalDate.get(key) === today || persistedRenewDate(hostUrl, cliToken) === today) {
    renewedLocalDate.set(key, today);
    return;
  }
  const existing = renewInFlight.get(key);
  if (existing) return existing;
  const attempt = (async () => {
    try {
      await renewCliTokenOnServer(hostUrl, cliToken);
      markRenewSucceeded(hostUrl, cliToken, today);
      logger.info(`cli-token: renewed for ${normalizeUrl(hostUrl)} (local day ${today})`);
    } catch (error: any) {
      logger.warn(`cli-token: renew failed for ${normalizeUrl(hostUrl)}: ${error?.message || error}; business call proceeds`);
    } finally {
      renewInFlight.delete(key);
    }
  })();
  renewInFlight.set(key, attempt);
  await attempt;
}

/** Best-effort read without minting or validation, used before version auto-sync. */
export function peekCliToken(hostOverride?: string): string | undefined {
  const hostUrl = hostOverride || getActiveHost();
  if (!hostUrl) return undefined;
  const normalizedHost = normalizeUrl(hostUrl);
  const stored = loadSecureCliToken(normalizedHost);
  if (stored) {
    cliTokenCache.set(normalizedHost, stored);
    return stored;
  }
  return cliTokenCache.get(normalizedHost) || getFallbackCliToken(normalizedHost) || undefined;
}

export async function getCliToken(hostOverride?: string): Promise<string> {
  const resolvedHost = hostOverride || getActiveHost();
  if (!resolvedHost) throw new SecureStoreAuthError('No AE host configured. Run: ae-cli auth login --host <url>');
  const hostUrl = normalizeUrl(resolvedHost);
  const stored = loadSecureCliToken(hostUrl);
  let token = stored || getFallbackCliToken(hostUrl) || cliTokenCache.get(hostUrl);
  if (!token) {
    throw new SecureStoreAuthError(`No stored CLI token for ${hostUrl}. Run: ae-cli auth login --host ${hostUrl}`);
  }
  cliTokenCache.set(hostUrl, token);
  await maybeRenewCliTokenDaily(hostUrl, token);
  return token;
}

/** Mint during the current device-login exchange; caller decides how to store the CLI token. */
export async function mintCliToken(hostUrl: string, accessToken: string): Promise<string> {
  logger.info(`Generating CLI token for ${hostUrl}`);
  const cliToken = await generateCliToken(hostUrl, accessToken);
  cliTokenCache.set(normalizeUrl(hostUrl), cliToken);
  return cliToken;
}

/** Backward-compatible helper used by tests and local development. */
export function setCliTokenManual(token: string, hostUrl: string): void {
  saveCredential(hostUrl, { cliToken: token });
  cliTokenCache.set(normalizeUrl(hostUrl), token);
}

/** Clear process-local token/renew state. Persistent credentials are managed by auth commands. */
export function clearCliToken(hostUrl?: string): void {
  clearCliTokenCache(hostUrl);
  if (hostUrl) {
    const normalizedHost = normalizeUrl(hostUrl);
    const store = loadRenewStore();
    for (const key of Object.keys(store)) {
      if (key.startsWith(`${normalizedHost}#`) || key === normalizedHost || key === hostUrl) delete store[key];
    }
    saveRenewStore(store);
    clearAllCredentials(hostUrl);
    return;
  }
  saveRenewStore({});
  for (const { url } of listHosts()) clearAllCredentials(url);
}

/** @internal Test helper. */
export function _resetRenewMemoryForTest(): void {
  renewedLocalDate.clear();
  renewInFlight.clear();
}
