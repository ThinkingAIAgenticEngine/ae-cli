import fs from 'fs';
import path from 'path';
import { safeReadJsonFile } from './json-utils.js';

const CONFIG_DIR = path.join(process.env.HOME || '', '.ae-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

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
    // 如果配置文件损坏，返回空配置
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
