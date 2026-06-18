import fs from 'fs';
import path from 'path';
import { safeReadJsonFile, safeJsonParse } from './json-utils.js';
import { execFileSync } from 'node:child_process';
import { getConfigDir, getActiveHost, extractHostname } from './config.js';
import { logger } from './logger.js';

const TOKENS_FILE = path.join(getConfigDir(), 'tokens.json');
const MCP_TOKENS_FILE = path.join(getConfigDir(), 'mcp-tokens.json');
const LEGACY_DIR = path.join(process.env.HOME || '', '.te-mcp');
const TOKEN_TTL_MS = 20 * 60 * 60 * 1000; // 20 hours
const OSASCRIPT_POLL_INTERVAL_MS = 2000;
const OSASCRIPT_POLL_TIMEOUT_MS = 60000;

interface TokenEntry {
  token: string;
  updatedAt: string;
}

type TokenStore = Record<string, TokenEntry>;
type McpTokenStore = Record<string, string>;

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
  const url = `${hostUrl}/v1/oauth/checkToken?accessToken=${token}`;
  try {
    const resp = await fetch(url, { method: 'POST' });
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
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

export function loadToken(hostUrl: string): { host: string; token: string; updatedAt: string } | null {
  const tokens = loadAllTokens();
  const entry = tokens[hostUrl];
  if (!entry || !entry.token) return null;
  if (entry.updatedAt) {
    const age = Date.now() - new Date(entry.updatedAt).getTime();
    if (age > TOKEN_TTL_MS) {
      clearToken(hostUrl);
      return null;
    }
  }
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

function getCachedMcpToken(hostUrl: string): string | undefined {
  try {
    if (!fs.existsSync(MCP_TOKENS_FILE)) return undefined;
    const store = safeReadJsonFile(MCP_TOKENS_FILE) as McpTokenStore;
    const normalizedHost = hostUrl.replace(/\/+$/, '');

    if (store[hostUrl]) return store[hostUrl];
    if (store[normalizedHost]) return store[normalizedHost];

    for (const [key, token] of Object.entries(store)) {
      if (key.replace(/\/+$/, '') === normalizedHost) {
        return token;
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function extractTokenViaOsascript(hostUrl: string): { token: string | null; error: string | null } {
  if (process.platform !== 'darwin') return { token: null, error: 'not_mac' };
  const hostname = extractHostname(hostUrl);
  const lines = [
    'tell application "Google Chrome"',
    '  repeat with w in windows',
    '    repeat with t in tabs of w',
    `      if URL of t contains "${hostname}" then`,
    '        return execute t javascript "localStorage.getItem(\'ACCESS_TOKEN\')"',
    '      end if',
    '    end repeat',
    '  end repeat',
    '  return "NO_TAB_FOUND"',
    'end tell',
  ];
  try {
    const args = lines.flatMap(line => ['-e', line]);
    const result = execFileSync('osascript', args, { encoding: 'utf8', timeout: 5000 }).trim();
    if (result === 'NO_TAB_FOUND') return { token: null, error: 'no_tab' };
    if (!result || result === 'missing value') return { token: null, error: 'no_token' };
    return { token: result.replace(/^["']|["']$/g, ''), error: null };
  } catch (e: any) {
    const msg = e.message || '';
    if (msg.includes('not allowed') || msg.includes('assistive access') || msg.includes('(-1743)')) {
      return { token: null, error: 'no_js_permission' };
    }
    return { token: null, error: 'no_tab' };
  }
}

/**
 * 兜底：搜索 Chrome 所有 Tab 的 localStorage 中的 ACCESS_TOKEN。
 * 用于处理登录后页面跳转到其他 URL（如 SSO 回调）导致原 hostname 匹配失败的情况。
 */
function extractTokenFromAllTabs(): { token: string | null; error: string | null } {
  const lines = [
    'tell application "Google Chrome"',
    '  repeat with w in windows',
    '    repeat with t in tabs of w',
    '      try',
    '        set tokenVal to execute t javascript "localStorage.getItem(\'ACCESS_TOKEN\')"',
    '        if tokenVal is not null and tokenVal is not missing value and tokenVal is not "" then',
    '          return tokenVal',
    '        end if',
    '      end try',
    '    end repeat',
    '  end repeat',
    '  return "NO_TOKEN_FOUND"',
    'end tell',
  ];
  try {
    const args = lines.flatMap(line => ['-e', line]);
    const result = execFileSync('osascript', args, { encoding: 'utf8', timeout: 10000 }).trim();
    if (result === 'NO_TOKEN_FOUND' || !result || result === 'missing value') {
      return { token: null, error: 'no_token' };
    }
    return { token: result.replace(/^["']|["']$/g, ''), error: null };
  } catch (e: any) {
    const msg = e.message || '';
    if (msg.includes('not allowed') || msg.includes('assistive access') || msg.includes('(-1743)')) {
      return { token: null, error: 'no_js_permission' };
    }
    return { token: null, error: 'no_tab' };
  }
}

async function requestTokenViaOsascript(hostUrl: string): Promise<string | null> {
  logger.info(`Opening Chrome to ${hostUrl} for token extraction`);
  process.stderr.write(`[ae-cli] No AE tab found in Chrome. Opening ${hostUrl} ...\n`);
  process.stderr.write(`[ae-cli] Please login, then your token will be captured automatically.\n`);
  try {
    const openScript = [
      'tell application "Google Chrome"',
      '  activate',
      '  if (count of windows) > 0 then',
      `    make new tab at end of tabs of window 1 with properties {URL:"${hostUrl}"}`,
      '  else',
      `    open location "${hostUrl}"`,
      '  end if',
      'end tell',
    ];
    execFileSync('osascript', openScript.flatMap(line => ['-e', line]), { timeout: 5000 });
  } catch {
    logger.warn(`Failed to open Chrome, user may need to open ${hostUrl} manually`);
    process.stderr.write(`[ae-cli] Could not open browser. Please open ${hostUrl} in Chrome manually.\n`);
  }
  const deadline = Date.now() + OSASCRIPT_POLL_TIMEOUT_MS;
  let pollCount = 0;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, OSASCRIPT_POLL_INTERVAL_MS));
    pollCount++;
    let result = extractTokenViaOsascript(hostUrl);
    // hostname 匹配不到时兜底搜全 Tab（登录后页面跳转到其他 URL 如 SSO 回调）
    if (result.error === 'no_tab') {
      const fallback = extractTokenFromAllTabs();
      if (fallback.token) {
        logger.info('Token captured via all-tabs fallback search');
        result = fallback;
      }
    }
    if (result.token) {
      saveToken(result.token, hostUrl);
      logger.info(`Token captured after ${pollCount} poll(s)`);
      process.stderr.write(`[ae-cli] Token captured from Chrome for ${hostUrl}.\n`);
      return result.token;
    }
    if (result.error === 'no_js_permission') {
      logger.warn('Chrome JS permission denied during polling');
      return null;
    }
  }
  logger.warn(`Token polling timed out after ${OSASCRIPT_POLL_TIMEOUT_MS / 1000}s (${pollCount} polls)`);
  process.stderr.write(`[ae-cli] Polling timed out after ${OSASCRIPT_POLL_TIMEOUT_MS / 1000}s.\n`);
  return null;
}

export async function getToken(hostUrl: string): Promise<string> {
  if (!hostUrl) {
    throw new Error(
      `No AE host configured.\n` +
      `Run: ae-cli config set-host`
    );
  }

  // 1. Environment variable
  if (process.env.TE_TOKEN) {
    logger.info('Using token from env:TE_TOKEN');
    return process.env.TE_TOKEN;
  }

  // 2. Cached token for this URL
  const cached = loadToken(hostUrl);
  if (cached && cached.token) {
    logger.info(`Using cached token for ${hostUrl}`);
    return cached.token;
  }

  // 3. If an MCP token is already available, do not trigger browser login.
  if (getCachedMcpToken(hostUrl)) {
    logger.info(`MCP token exists for ${hostUrl}; skipping browser token extraction`);
    throw new Error(
      `MCP token already exists for ${hostUrl}; skipped browser login.\n` +
      `Use an MCP-token aware command, or run: ae-cli auth set-token <token>`
    );
  }

  // 4. osascript extraction
  const { token: osascriptToken, error } = extractTokenViaOsascript(hostUrl);
  if (error === 'no_js_permission') {
    logger.warn('Chrome JS Apple Events not enabled');
    throw new Error(
      `Chrome JavaScript from Apple Events is not enabled.\n` +
      `Enable it: Chrome menu → View → Developer → Allow JavaScript from Apple Events`
    );
  }
  if (error === 'not_mac') {
    throw new Error(
      `Auto token extraction is only available on macOS + Chrome.\n` +
      `Use: ae-cli auth set-token <token>`
    );
  }
  if (osascriptToken) {
    saveToken(osascriptToken, hostUrl);
    return osascriptToken;
  }

  // 5. Open Chrome and poll
  const polledToken = await requestTokenViaOsascript(hostUrl);
  if (polledToken) {
    saveToken(polledToken, hostUrl);
    return polledToken;
  }

  throw new Error(
    `Cannot obtain token for ${hostUrl}.\n` +
    `Options:\n` +
    `  1. ae-cli auth login (macOS + Chrome)\n` +
    `  2. ae-cli auth set-token <token>`
  );
}
