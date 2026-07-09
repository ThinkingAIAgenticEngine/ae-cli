import fs from 'fs';
import path from 'path';
import { getToken } from './auth.js';
import { getActiveHost, getFallbackCliToken, getConfigDir, listHosts } from './config.js';
import {
  load as secureStoreLoad,
  save as secureStoreSave,
  loadCliToken as loadSecureCliToken,
} from './secure-store.js';
import { safeJsonParse, safeReadJsonFile } from './json-utils.js';
import { logger } from './logger.js';
import { normalizeUrl } from './url-utils.js';

const CLI_TOKEN_GENERATE_PATH = '/v1/ta/cli/token/generate';
const CLI_TOKEN_RENEW_PATH = '/v1/ta/cli/token/renew';

/**
 * In-process CLI token cache (host -> token).
 * Valid only within the current process lifetime; the durable copy lives in secure-store.
 */
const _cliTokenCache = new Map<string, string>();

/** In-process map of hosts whose CLI token was successfully renewed for a local calendar day (YYYY-MM-DD). */
const _renewedLocalDateByHost = new Map<string, string>();

/** Coalesce concurrent renew attempts for the same host within one process. */
const _renewInFlightByHost = new Map<string, Promise<void>>();

type RenewStore = Record<string, { date: string }>;

/** Canonical host key for renew state maps and cli-token-renew.json. */
function renewHostKey(hostUrl: string): string {
  return normalizeUrl(hostUrl);
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
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    return data as RenewStore;
  } catch {
    return {};
  }
}

function saveRenewStore(store: RenewStore): void {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = renewStateFilePath();
  if (Object.keys(store).length === 0) {
    try { fs.unlinkSync(file); } catch {}
    return;
  }
  fs.writeFileSync(file, JSON.stringify(store, null, 2), { encoding: 'utf8' });
  try { fs.chmodSync(file, 0o600); } catch {}
}

function getPersistedRenewDate(hostUrl: string): string | null {
  const key = renewHostKey(hostUrl);
  const store = loadRenewStore();
  return store[key]?.date ?? (key !== hostUrl ? store[hostUrl]?.date : undefined) ?? null;
}

function markRenewSucceeded(hostUrl: string, date: string): void {
  const key = renewHostKey(hostUrl);
  _renewedLocalDateByHost.set(key, date);
  const store = loadRenewStore();
  if (key !== hostUrl && store[hostUrl]) {
    delete store[hostUrl];
  }
  store[key] = { date };
  saveRenewStore(store);
}

function clearRenewState(hostUrl?: string): void {
  if (hostUrl) {
    const key = renewHostKey(hostUrl);
    _renewedLocalDateByHost.delete(key);
    _renewInFlightByHost.delete(key);
    if (key !== hostUrl) {
      _renewedLocalDateByHost.delete(hostUrl);
      _renewInFlightByHost.delete(hostUrl);
    }
    const store = loadRenewStore();
    let changed = false;
    for (const k of new Set([key, hostUrl])) {
      if (store[k]) {
        delete store[k];
        changed = true;
      }
    }
    if (changed) {
      saveRenewStore(store);
    }
    return;
  }
  _renewedLocalDateByHost.clear();
  _renewInFlightByHost.clear();
  saveRenewStore({});
}

/**
 * Mint a CLI token on-demand by calling /v1/ta/cli/token/generate with the AE access token.
 */
async function generateCliToken(hostUrl: string): Promise<string> {
  const accessToken = await getToken(hostUrl);
  const base = hostUrl.replace(/\/+$/, '');
  const url = `${base}${CLI_TOKEN_GENERATE_PATH}`;

  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `bearer ${accessToken}`,
    },
  });

  if (!resp.ok) {
    throw new Error(`CLI token generate HTTP error: ${resp.status} ${resp.statusText}`);
  }

  const data = safeJsonParse(await resp.text());

  if (data.return_code !== 0) {
    throw new Error(`CLI token generate error: ${data.return_message || 'unknown'} (code: ${data.return_code})`);
  }

  const cliToken = data.data?.userSecret;
  if (!cliToken) {
    throw new Error('CLI token generate error: empty userSecret in response');
  }

  return cliToken;
}

/**
 * Call the explicit renew API. Auth is the cli-token query param (server validates the secret).
 * Optionally attach a bearer access token when one is already available — never required for renew.
 */
async function renewCliTokenOnServer(hostUrl: string, cliToken: string): Promise<void> {
  const base = hostUrl.replace(/\/+$/, '');
  const url = new URL(`${base}${CLI_TOKEN_RENEW_PATH}`);
  url.searchParams.set('cli-token', cliToken);

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  try {
    const accessToken = await getToken(hostUrl);
    if (accessToken) {
      headers.Authorization = `bearer ${accessToken}`;
    }
  } catch {
    // Sandbox / cli-token-only sessions may have no access token; renew is keyed by cli-token.
  }

  const resp = await fetch(url.toString(), { method: 'GET', headers });
  const text = await resp.text();
  const data = safeJsonParse(text);

  if (!resp.ok) {
    throw new Error(`CLI token renew HTTP error: ${resp.status} ${resp.statusText}`);
  }
  if (data?.return_code !== undefined && data.return_code !== 0) {
    throw new Error(`CLI token renew error: ${data.return_message || 'unknown'} (code: ${data.return_code})`);
  }
}

/**
 * Once per local calendar day, attempt to renew the CLI token on the server.
 * - Success → persist today's date so subsequent calls (including new processes) skip renew.
 * - Failure → log only; do NOT mark the day, so the next call retries.
 * Never throws to the caller — renew must not block business API calls.
 */
async function maybeRenewCliTokenDaily(hostUrl: string, cliToken: string): Promise<void> {
  const hostKey = renewHostKey(hostUrl);
  const today = localRenewDate();
  if (_renewedLocalDateByHost.get(hostKey) === today) {
    return;
  }
  if (getPersistedRenewDate(hostUrl) === today) {
    _renewedLocalDateByHost.set(hostKey, today);
    return;
  }

  const existing = _renewInFlightByHost.get(hostKey);
  if (existing) {
    await existing;
    return;
  }

  const attempt = (async () => {
    try {
      await renewCliTokenOnServer(hostUrl, cliToken);
      markRenewSucceeded(hostUrl, today);
      logger.info(`cli-token: renewed for ${hostKey} (local day ${today})`);
    } catch (e: any) {
      // Intentionally do not mark success — next getCliToken should retry renew.
      logger.warn(`cli-token: renew failed for ${hostKey}: ${e?.message || e}; business call proceeds with cached token`);
    } finally {
      _renewInFlightByHost.delete(hostKey);
    }
  })();

  _renewInFlightByHost.set(hostKey, attempt);
  await attempt;
}

/**
 * Persist a freshly-minted/manually-set CLI token to secure-store, without disturbing
 * accessToken/refreshToken. Skipped when there is no existing secure-store session for the host.
 */
function persistCliTokenIfPossible(hostUrl: string, cliToken: string): void {
  const existing = secureStoreLoad(hostUrl);
  if (!existing) {
    logger.info(`cli-token: no secure-store session for ${hostUrl}, keeping token in-process only`);
    return;
  }
  secureStoreSave(hostUrl, { ...existing, cliToken });
}

/** Remove the persisted CLI token (if any) for a host, without touching accessToken/refreshToken. */
function clearPersistedCliToken(hostUrl: string): void {
  const existing = secureStoreLoad(hostUrl);
  if (existing?.cliToken) {
    secureStoreSave(hostUrl, { ...existing, cliToken: undefined });
  }
}

/**
 * Get the CLI token — the single credential source shared by the legacy MCP JSON-RPC transport
 * and the new REST API transport.
 *
 * Priority:
 *   1. In-process cache
 *   2. secure-store.cliToken (written at login or a previous mint)
 *   3. Sandbox-provisioned cli-token.json (agent injection; no user access token available there)
 *   4. Mint via /v1/ta/cli/token/generate using the AE access token, then persist to secure-store
 *      so subsequent CLI invocations (new processes) do not need to re-mint.
 *
 * After a token is resolved, the first call each local calendar day best-effort renews it via
 * `/v1/ta/cli/token/renew`. Renew failure never blocks returning the token.
 */
export async function getCliToken(hostOverride?: string): Promise<string> {
  const hostUrl = hostOverride || getActiveHost();

  let token: string | undefined = _cliTokenCache.get(hostUrl);

  if (!token) {
    const storedToken = loadSecureCliToken(hostUrl);
    if (storedToken) {
      _cliTokenCache.set(hostUrl, storedToken);
      logger.info(`Using persisted CLI token (secure-store) for ${hostUrl}`);
      token = storedToken;
    }
  }

  if (!token) {
    const fallbackToken = getFallbackCliToken(hostUrl);
    if (fallbackToken) {
      _cliTokenCache.set(hostUrl, fallbackToken);
      logger.info(`Using sandbox-provisioned CLI token (fallback file) for ${hostUrl}`);
      token = fallbackToken;
    }
  }

  if (!token) {
    token = await mintCliToken(hostUrl);
  }

  // TODO: 后端 /v1/ta/cli/token/renew 发布后再打开
  // await maybeRenewCliTokenDaily(hostUrl, token);
  return token;
}

/**
 * Mint a CLI token with the current access token and persist it to secure-store.
 * Called eagerly after device login; also used by getCliToken when no token is cached.
 */
export async function mintCliToken(hostUrl: string): Promise<string> {
  logger.info(`Generating CLI token for ${hostUrl}`);
  const cliToken = await generateCliToken(hostUrl);
  _cliTokenCache.set(hostUrl, cliToken);
  persistCliTokenIfPossible(hostUrl, cliToken);
  // Do not mark today's renew here: /generate returns an existing token without sliding
  // expireTime. getCliToken() will best-effort call /renew after resolve.
  logger.info(`CLI token generated, cached, and persisted for ${hostUrl}`);
  return cliToken;
}

/**
 * Clear the CLI token: in-process cache always, plus the persisted secure-store copy.
 * With no hostUrl, clears every known host (config.json hosts list) so a global reset also
 * scrubs disk state, not just the current process's memory.
 */
export function clearCliToken(hostUrl?: string): void {
  if (hostUrl) {
    _cliTokenCache.delete(hostUrl);
    clearPersistedCliToken(hostUrl);
    clearRenewState(hostUrl);
    return;
  }
  _cliTokenCache.clear();
  clearRenewState();
  for (const { url } of listHosts()) {
    clearPersistedCliToken(url);
  }
}

/** Test helper: seed in-process cache and persist to secure-store when a session exists. */
export function setCliTokenManual(token: string, hostUrl: string): void {
  _cliTokenCache.set(hostUrl, token);
  persistCliTokenIfPossible(hostUrl, token);
  logger.info(`CLI token set for ${hostUrl}`);
}

/** @internal Test helper — clear in-memory renew markers without touching disk. */
export function _resetRenewMemoryForTest(): void {
  _renewedLocalDateByHost.clear();
  _renewInFlightByHost.clear();
}
