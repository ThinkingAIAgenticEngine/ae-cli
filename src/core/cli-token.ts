import { getToken } from './auth.js';
import { getActiveHost, getFallbackCliToken, listHosts } from './config.js';
import {
  load as secureStoreLoad,
  save as secureStoreSave,
  loadCliToken as loadSecureCliToken,
} from './secure-store.js';
import { safeJsonParse } from './json-utils.js';
import { logger } from './logger.js';

const CLI_TOKEN_GENERATE_PATH = '/v1/ta/cli/token/generate';

/**
 * In-process CLI token cache (host -> token).
 * Valid only within the current process lifetime; the durable copy lives in secure-store.
 */
const _cliTokenCache = new Map<string, string>();

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
 */
export async function getCliToken(hostOverride?: string): Promise<string> {
  const hostUrl = hostOverride || getActiveHost();

  const cached = _cliTokenCache.get(hostUrl);
  if (cached) {
    return cached;
  }

  const storedToken = loadSecureCliToken(hostUrl);
  if (storedToken) {
    _cliTokenCache.set(hostUrl, storedToken);
    logger.info(`Using persisted CLI token (secure-store) for ${hostUrl}`);
    return storedToken;
  }

  const fallbackToken = getFallbackCliToken(hostUrl);
  if (fallbackToken) {
    _cliTokenCache.set(hostUrl, fallbackToken);
    logger.info(`Using sandbox-provisioned CLI token (fallback file) for ${hostUrl}`);
    return fallbackToken;
  }

  return mintCliToken(hostUrl);
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
    return;
  }
  _cliTokenCache.clear();
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
