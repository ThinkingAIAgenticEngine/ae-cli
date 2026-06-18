import fs from 'fs';
import path from 'path';
import { safeReadJsonFile } from './json-utils.js';
import { logger } from './logger.js';

const CONFIG_DIR = path.join(process.env.HOME || '', '.ae-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const MCP_TOKENS_FILE = path.join(CONFIG_DIR, 'mcp-tokens.json');
const FALLBACK_MCP_TOKEN_FILE = '/home/ta/te_agent_ta/.ae-config/mcp-token.json';

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
 * 从 fallback MCP token 文件迁移配置
 * 返回迁移后的 MCP token store
 */
function migrateFromFallback(): Record<string, string> | null {
  // 只在 fallback 存在且 mcp-tokens.json 不存在时迁移
  if (!fs.existsSync(FALLBACK_MCP_TOKEN_FILE) || fs.existsSync(MCP_TOKENS_FILE)) {
    return null;
  }
  return doMigrateFromFallback();
}

/**
 * 强制从 fallback 更新 MCP token（无论 mcp-tokens.json 是否存在）
 * 用于失败时的重试场景
 */
export function forceMigrateFromFallback(): Record<string, string> | null {
  if (!fs.existsSync(FALLBACK_MCP_TOKEN_FILE)) {
    return null;
  }
  return doMigrateFromFallback();
}

/**
 * 实际执行迁移的逻辑
 */
function doMigrateFromFallback(): Record<string, string> | null {
  try {
    const fallbackData = safeReadJsonFile(FALLBACK_MCP_TOKEN_FILE);
    const tokenStore: Record<string, string> = {};

    // 新格式：{ "url": "...", "mcp-token": "..." }
    if (fallbackData && typeof fallbackData === 'object' && !Array.isArray(fallbackData)) {
      const url = fallbackData.url as string;
      const token = fallbackData['mcp-token'] as string;
      if (url && token) {
        tokenStore[url] = token;
      }
    }

    if (Object.keys(tokenStore).length > 0) {
      // 保存 MCP tokens（覆盖或创建）
      ensureDir();
      fs.writeFileSync(MCP_TOKENS_FILE, JSON.stringify(tokenStore, null, 2));
      return tokenStore;
    }
  } catch {}

  return null;
}

export function loadConfig(): TeConfig {
  try {
    // 先检查是否需要从 fallback 迁移
    const migratedTokens = migrateFromFallback();

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

    // 如果有迁移的 tokens，创建对应的 config
    if (migratedTokens && Object.keys(migratedTokens).length > 0) {
      const hosts: Record<string, HostEntry> = {};
      for (const url of Object.keys(migratedTokens)) {
        hosts[url] = { label: url };
        process.stderr.write(`[ae-cli] Added host: ${url}\n`);
      }
      const activeHost = Object.keys(migratedTokens)[0];
      process.stderr.write(`[ae-cli] Active host set to: ${activeHost}\n`);
      process.stderr.write(`[ae-cli] MCP tokens migrated from ${FALLBACK_MCP_TOKEN_FILE}\n`);
      logger.info(`MCP tokens migrated from fallback: activeHost=${activeHost}, hosts=${Object.keys(hosts).length}`);
      const config = { activeHost, hosts };
      saveConfig(config);  // 保存到磁盘
      return config;
    }
  } catch (err: any) {
    // 如果配置文件损坏，返回空配置
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
  return config.activeHost;
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
    config.hosts[url].label = label;
    saveConfig(config);
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