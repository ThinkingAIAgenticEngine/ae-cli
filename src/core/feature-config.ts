import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getConfigDir } from './config.js';
import { normalizeUrl } from './url-utils.js';

const FEATURE_TTL_MS = 24 * 60 * 60 * 1000;
const UNAVAILABLE_TTL_MS = 5 * 60 * 1000;

interface FeatureEntry {
  enabled: boolean;
  available: boolean;
  fetchedAt: number;
}

interface FeatureStore {
  entries: Record<string, FeatureEntry>;
}

export interface AutoDiscoveryFeature {
  enabled: boolean;
  source: 'cache' | 'remote' | 'unavailable';
}

function cachePath(): string {
  return path.join(getConfigDir(), 'feature-config.json');
}

function cacheKey(host: string, token: string): string {
  const fingerprint = crypto.createHash('sha256').update(token).digest('hex');
  return `${normalizeUrl(host)}#${fingerprint}`;
}

function readStore(): FeatureStore {
  try {
    const value = JSON.parse(fs.readFileSync(cachePath(), 'utf8')) as FeatureStore;
    return value?.entries && typeof value.entries === 'object' ? value : { entries: {} };
  } catch {
    return { entries: {} };
  }
}

function writeStore(store: FeatureStore): void {
  const target = cachePath();
  const temp = `${target}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(temp, JSON.stringify(store), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temp, target);
    fs.chmodSync(target, 0o600);
  } catch {
    try { fs.rmSync(temp, { force: true }); } catch {}
  }
}

function remember(host: string, token: string, entry: FeatureEntry): void {
  const store = readStore();
  store.entries[cacheKey(host, token)] = entry;
  writeStore(store);
}

/** Reuse a successful daily CLI config fetch from the compatibility check. */
export function rememberKbAutoDiscoveryFeature(host: string, token: string, enabled: boolean): void {
  remember(host, token, { enabled, available: true, fetchedAt: Date.now() });
}

/** Read only a fresh value already obtained by the CLI startup config check. */
export function peekKbAutoDiscoveryFeature(host: string, token: string): boolean | undefined {
  const entry = readStore().entries[cacheKey(host, token)];
  const ttl = entry?.available ? FEATURE_TTL_MS : UNAVAILABLE_TTL_MS;
  if (!entry || !entry.available || Date.now() < entry.fetchedAt || Date.now() - entry.fetchedAt >= ttl) {
    return undefined;
  }
  return entry.enabled;
}

/** A feature lookup never enables discovery when config is missing or unavailable. */
export async function resolveKbAutoDiscoveryFeature(
  host: string,
  token: string,
  fetchRemote: () => Promise<{ projectSemanticKbAutoDiscovery?: boolean } | null>,
): Promise<AutoDiscoveryFeature> {
  const entry = readStore().entries[cacheKey(host, token)];
  const ttl = entry?.available ? FEATURE_TTL_MS : UNAVAILABLE_TTL_MS;
  if (entry && Date.now() >= entry.fetchedAt && Date.now() - entry.fetchedAt < ttl) {
    return { enabled: entry.enabled, source: entry.available ? 'cache' : 'unavailable' };
  }

  const remote = await fetchRemote().catch(() => null);
  if (!remote) {
    remember(host, token, { enabled: false, available: false, fetchedAt: Date.now() });
    return { enabled: false, source: 'unavailable' };
  }
  const enabled = remote.projectSemanticKbAutoDiscovery === true;
  remember(host, token, { enabled, available: true, fetchedAt: Date.now() });
  return { enabled, source: 'remote' };
}
