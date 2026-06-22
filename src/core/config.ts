import fs from 'fs';
import path from 'path';
import { safeReadJsonFile } from './json-utils.js';
import { logger } from './logger.js';
import { getSandboxMcpTokenFilePath } from './sandbox-runtime.js';

const CONFIG_DIR = path.join(process.env.HOME || '', '.ae-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
export interface SandboxMcpTokenEntry {
  url: string;
  token: string;
}

/** Candidate paths for sandbox-provisioned mcp-token.json (read-only). */
function sandboxMcpTokenCandidatePaths(): string[] {
  const paths = [getSandboxMcpTokenFilePath()];
  const homeFallback = path.join(process.env.HOME || '', '.ae-config', 'mcp-token.json');
  if (!paths.includes(homeFallback)) {
    paths.push(homeFallback);
  }
  return paths;
}

/**
 * Read sandbox-provisioned MCP token from disk.
 * The sandbox injects a pre-minted mcp-token so ae-cli can call MCP without a user access token.
 */
export function readSandboxMcpTokenEntry(): SandboxMcpTokenEntry | null {
  for (const file of sandboxMcpTokenCandidatePaths()) {
    if (!fs.existsSync(file)) continue;
    try {
      const data = safeReadJsonFile(file);
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const url = data.url as string;
        const token = data['mcp-token'] as string;
        if (url && token) {
          return { url, token };
        }
      }
    } catch {}
  }
  return null;
}

export interface HostEntry {
  label: string;
}

export interface TeConfig {
  activeHost: string;  // Full URL, e.g. https://ta.thinkingdata.cn
  hosts: Record<string, HostEntry>;  // Keyed by full URL
}

function ensureDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

/**
 * Read the token mapping from the fallback MCP token file (in-memory only; no longer writes mcp-tokens.json).
 * Used as a transition for sandbox environments before the first mint; returns null if no fallback is available.
 */
export function forceMigrateFromFallback(): Record<string, string> | null {
  const entry = readSandboxMcpTokenEntry();
  if (!entry) return null;
  return { [entry.url]: entry.token };
}

/**
 * Resolve a sandbox-provisioned MCP token for the given host from the fallback file.
 * Exact host match wins; otherwise, when the fallback contains exactly one entry, return it.
 * The single-entry fallback decouples the lookup from a fragile host-string match: the sandbox
 * writes one { url, mcp-token }, and the active host (or --host) may not byte-match that url
 * (e.g. activeHost is unset). Returns null when there is no fallback file or no safe match.
 */
export function getFallbackMcpToken(hostUrl: string): string | null {
  const store = forceMigrateFromFallback();
  if (!store) return null;
  if (hostUrl && store[hostUrl]) return store[hostUrl];
  const entries = Object.values(store);
  if (entries.length === 1) return entries[0];
  return null;
}

export function loadConfig(): TeConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = safeReadJsonFile(CONFIG_FILE);
      // Migrate from old format (defaultHost without protocol)
      if (raw.defaultHost && !raw.activeHost) {
        const migrated = migrateConfig(raw);
        saveConfig(migrated);
        return migrated;
      }
      return raw;
    }
  } catch (err: any) {
    // If the config file is corrupted, return an empty config
    logger.error(`Error loading config: ${err.message}`);
    console.error(`Error loading config: ${err.message}`);
  }
  return { activeHost: '', hosts: {} };
}

function migrateConfig(old: any): TeConfig {
  const hosts: Record<string, HostEntry> = {};
  const oldHost = old.defaultHost as string;
  // Convert bare hostnames to full URLs
  if (old.hosts) {
    for (const [key, val] of Object.entries(old.hosts)) {
      const url = key.startsWith('http') ? key : `https://${key}`;
      hosts[url] = val as HostEntry;
    }
  }
  const activeHost = oldHost.startsWith('http') ? oldHost : `https://${oldHost}`;
  if (!hosts[activeHost]) {
    hosts[activeHost] = { label: 'default' };
  }
  return { activeHost, hosts };
}

export function saveConfig(config: TeConfig): void {
  ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  logger.info(`Config saved: activeHost=${config.activeHost}, hosts=${Object.keys(config.hosts).length}`);
}

export function getActiveHost(): string {
  const config = loadConfig();
  if (config.activeHost) return config.activeHost;
  // Sandbox: host is provisioned alongside mcp-token.json when ~/.ae-cli/config.json is absent.
  return readSandboxMcpTokenEntry()?.url ?? '';
}

export function setActiveHost(url: string): void {
  const config = loadConfig();
  if (!config.hosts[url]) {
    throw new Error(`Host ${url} is not in the configured hosts list. Add it first.`);
  }
  config.activeHost = url;
  saveConfig(config);
}

export function addHost(url: string, label: string): void {
  const config = loadConfig();
  assertUniqueHostLabel(config, label, url);
  config.hosts[url] = { label };
  // If no active host, set this one
  if (!config.activeHost) {
    config.activeHost = url;
  }
  saveConfig(config);
}

export function updateHostLabel(url: string, label: string): void {
  const config = loadConfig();
  if (config.hosts[url]) {
    assertUniqueHostLabel(config, label, url);
    config.hosts[url].label = label;
    saveConfig(config);
  }
}

function assertUniqueHostLabel(config: TeConfig, label: string, excludeUrl: string): void {
  const duplicate = Object.entries(config.hosts).find(([url, entry]) => url !== excludeUrl && entry.label === label);
  if (duplicate) {
    throw new Error(`Label already exists: ${label}. Rename the existing label first: ${duplicate[0]}`);
  }
}

export function removeHost(url: string): void {
  const config = loadConfig();
  delete config.hosts[url];
  if (config.activeHost === url) {
    const remaining = Object.keys(config.hosts);
    config.activeHost = remaining.length > 0 ? remaining[0] : '';
  }
  saveConfig(config);
}

export function listHosts(): Array<{ url: string; label: string; active: boolean }> {
  const config = loadConfig();
  return Object.entries(config.hosts).map(([url, entry]) => ({
    url,
    label: entry.label,
    active: url === config.activeHost,
  }));
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}

/**
 * Extract hostname (with port) from a full URL for use in osascript Chrome tab matching.
 * e.g. "https://ta.thinkingdata.cn:8080" → "ta.thinkingdata.cn:8080"
 */
export function extractHostname(fullUrl: string): string {
  try {
    const u = new URL(fullUrl);
    return u.host; // includes port if present
  } catch {
    return fullUrl;
  }
}
