import fs from 'fs';
import path from 'path';
import { safeReadJsonFile, safeJsonParse } from './json-utils.js';
import { getConfigDir, getActiveHost } from './config.js';
import { logger } from './logger.js';
import { getValidAccessToken, SecureStoreAuthError } from './secure-store.js';

const TOKENS_FILE = path.join(getConfigDir(), 'tokens.json');
/** Legacy plaintext MCP token cache file (deprecated; automatically cleaned up on first run) */
const LEGACY_MCP_TOKENS_FILE = path.join(getConfigDir(), 'mcp-tokens.json');
const LEGACY_DIR = path.join(process.env.HOME || '', '.te-mcp');

// One-time cleanup of the legacy plaintext MCP token file at startup
(function removeLegacyMcpTokens() {
  try {
    if (fs.existsSync(LEGACY_MCP_TOKENS_FILE)) {
      fs.rmSync(LEGACY_MCP_TOKENS_FILE);
      logger.info('auth: removed legacy mcp-tokens.json (plaintext MCP token file)');
    }
  } catch {}
})();

interface TokenEntry {
  token: string;
  updatedAt: string;
}

type TokenStore = Record<string, TokenEntry>;

function ensureDir(): void {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Resolve the host URL to use. Simply reads activeHost from config.
 * The --host flag override is handled at the runner/command level.
 */
export function resolveHost(hostOverride?: string): string {
  if (hostOverride) return hostOverride;
  return getActiveHost();
}

/**
 * Validate token
 * @param token
 * @param hostUrl
 */
export async function validateToken(token: string, hostUrl: string): Promise<boolean> {
  // F-013: the server's /v1/oauth/checkToken binds accessToken via @RequestParam (query/form), NOT a JSON body.
  // A JSON body yields return_code -1008 (missing accessToken parameter) on both old and new servers, so set-token would
  // reject even valid tokens. Send it as application/x-www-form-urlencoded: it binds to @RequestParam AND stays out
  // of the URL/query (no token leak into access logs — the original reason a JSON body was used).
  const url = `${hostUrl}/v1/oauth/checkToken`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ accessToken: token }).toString(),
    });
    const respJson = safeJsonParse(await resp.text());
    return respJson?.return_code === 0;
  } catch {
    return false;
  }
}

function loadAllTokens(): TokenStore {
  try {
    // Migrate from legacy ~/.te-mcp/tokens.json
    const legacyTokens = path.join(LEGACY_DIR, 'tokens.json');
    if (fs.existsSync(legacyTokens) && !fs.existsSync(TOKENS_FILE)) {
      const data = safeReadJsonFile(legacyTokens);
      // Migrate keys to full URLs
      const migrated: TokenStore = {};
      for (const [key, val] of Object.entries(data)) {
        const url = key.startsWith('http') ? key : `https://${key}`;
        migrated[url] = val as TokenEntry;
      }
      ensureDir();
      fs.writeFileSync(TOKENS_FILE, JSON.stringify(migrated, null, 2));
      return migrated;
    }
    if (fs.existsSync(TOKENS_FILE)) {
      const data = safeReadJsonFile(TOKENS_FILE);
      // Remove stale empty token file left by previous versions
      if (data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0) {
        try { fs.unlinkSync(TOKENS_FILE); } catch {}
        return {};
      }
      // Check if any keys need URL migration
      let needsMigration = false;
      const migrated: TokenStore = {};
      for (const [key, val] of Object.entries(data)) {
        if (!key.startsWith('http')) {
          migrated[`https://${key}`] = val as TokenEntry;
          needsMigration = true;
        } else {
          migrated[key] = val as TokenEntry;
        }
      }
      if (needsMigration) {
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(migrated, null, 2));
        return migrated;
      }
      return data;
    }
  } catch {}
  return {};
}

function saveAllTokens(tokens: TokenStore): void {
  ensureDir();
  if (Object.keys(tokens).length === 0) {
    // Remove the file when no tokens remain — avoids writing empty {}
    try { fs.unlinkSync(TOKENS_FILE); } catch {}
    return;
  }
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
  // Ensure only the current user can read/write (0600)
  try { fs.chmodSync(TOKENS_FILE, 0o600); } catch {}
}

export function loadToken(hostUrl: string): { host: string; token: string; updatedAt: string } | null {
  const tokens = loadAllTokens();
  const entry = tokens[hostUrl];
  if (!entry || !entry.token) return null;
  // F-010: no client-side TTL — the token's real validity is server-authoritative. A stale token
  // surfaces as a real 401 (lazy discovery) rather than being deleted on a fabricated 20h timer.
  return { host: hostUrl, token: entry.token, updatedAt: entry.updatedAt };
}

export function saveToken(token: string, hostUrl: string): void {
  const tokens = loadAllTokens();
  tokens[hostUrl] = { token, updatedAt: new Date().toISOString() };
  saveAllTokens(tokens);
  logger.info(`Token saved for ${hostUrl}`);
}

export function clearToken(hostUrl: string): void {
  const tokens = loadAllTokens();
  delete tokens[hostUrl];
  saveAllTokens(tokens);
}

export function setTokenManual(token: string, hostUrl: string): void {
  saveToken(token, hostUrl);
}

export function getAuthStatus(hostUrl: string): { authenticated: boolean; host: string; tokenAge?: string; source?: string } {
  if (process.env.TE_TOKEN) {
    return { authenticated: true, host: hostUrl, source: 'env:TE_TOKEN' };
  }
  const cached = loadToken(hostUrl);
  if (cached) {
    const ageMs = Date.now() - new Date(cached.updatedAt).getTime();
    const hours = Math.round(ageMs / 3600000);
    return { authenticated: true, host: hostUrl, tokenAge: `${hours}h ago`, source: 'cache' };
  }
  return { authenticated: false, host: hostUrl };
}

/**
 * Get a valid access token. Priority order:
 *   1. TE_TOKEN environment variable (CI / automation escape hatch)
 *   2. Legacy tokens.json cache (written by set-token)
 *   3. secure-store (written by device code flow; includes automatic refresh)
 *
 * Throws an error with guidance when no source can provide a token.
 */
export async function getToken(hostUrl: string): Promise<string> {
  if (!hostUrl) {
    throw new Error(
      `No AE host configured.\n` +
      `Run: ae-cli config set-host <url>`
    );
  }

  // 1. Environment variable (CI / headless escape hatch)
  if (process.env.TE_TOKEN) {
    logger.info('Using token from env:TE_TOKEN');
    return process.env.TE_TOKEN;
  }

  // 2. Legacy tokens.json cache (compatible with set-token)
  const cached = loadToken(hostUrl);
  if (cached && cached.token) {
    logger.info(`Using cached token for ${hostUrl}`);
    return cached.token;
  }

  // 3. secure-store (device code flow; includes automatic refresh)
  try {
    const secureToken = await getValidAccessToken(hostUrl);
    logger.info(`Using secure-store token for ${hostUrl}`);
    return secureToken;
  } catch (e: any) {
    if (e instanceof SecureStoreAuthError) {
      // secure-store has no token or refresh failed
      logger.info(`secure-store: ${e.message}`);
    } else {
      logger.warn(`secure-store unexpected error: ${e.message}`);
    }
  }

  throw new Error(
    `Cannot obtain token for ${hostUrl}.\n` +
    `Options:\n` +
    `  1. ae-cli auth login   (device code flow, cross-platform)\n` +
    `  2. ae-cli auth set-token <token>\n` +
    `  3. export TE_TOKEN=<token>  (CI/headless)`
  );
}
