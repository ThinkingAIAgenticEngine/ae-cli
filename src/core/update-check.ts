import fs from 'fs';
import path from 'path';

const CONFIG_DIR = path.join(process.env.HOME || '', '.ae-cli');
const CACHE_FILE = path.join(CONFIG_DIR, 'update-check.json');
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 3000;

const REGISTRY_BY_PACKAGE: Record<string, string> = {
  '@thinkingai/ae-cli': 'https://registry.npmjs.org',
};

/** Only the open-source npm package triggers update notices. */
export const UPDATE_CHECK_PACKAGE = '@thinkingai/ae-cli';

export function isUpdateCheckEnabled(packageName: string): boolean {
  return packageName === UPDATE_CHECK_PACKAGE;
}

const DEFAULT_REGISTRY = 'https://registry.npmjs.org';

export interface UpdateCheckCache {
  packageName: string;
  currentVersion: string;
  latestVersion: string;
  lastCheckedAt: string;
}

export interface PackageInfo {
  name: string;
  version: string;
}

function parseVersion(version: string): number[] {
  const core = version.trim().split('-')[0];
  return core.split('.').map((part) => {
    const n = Number.parseInt(part, 10);
    return Number.isFinite(n) ? n : 0;
  });
}

/** Returns true when `latest` is strictly newer than `current`. */
export function isNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  const len = Math.max(a.length, b.length, 3);
  for (let i = 0; i < len; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }
  return false;
}

export function resolveRegistry(packageName: string): string {
  if (REGISTRY_BY_PACKAGE[packageName]) {
    return REGISTRY_BY_PACKAGE[packageName];
  }
  const envRegistry = process.env.npm_config_registry?.replace(/\/$/, '');
  return envRegistry || DEFAULT_REGISTRY;
}

export function buildInstallCommand(packageName: string, registry: string): string {
  const base = `npm install -g ${packageName}@latest`;
  if (registry === DEFAULT_REGISTRY) {
    return base;
  }
  return `${base} --registry=${registry}`;
}

export function shouldSkipUpdateCheck(argv: string[] = process.argv): boolean {
  if (process.env.AE_CLI_NO_UPDATE_CHECK === '1') return true;
  if (process.env.CI === 'true' || process.env.CI === '1') return true;

  return argv.slice(2).some((arg) => {
    if (arg === '--no-update-check') return true;
    if (arg === '--version' || arg === '-V' || arg === '--help' || arg === '-h') return true;
    return false;
  });
}

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function readCache(): UpdateCheckCache | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const data = JSON.parse(raw) as UpdateCheckCache;
    if (!data.packageName || !data.latestVersion || !data.lastCheckedAt) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(cache: UpdateCheckCache): void {
  try {
    ensureConfigDir();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch {
    // cache write failure should not affect CLI usage
  }
}

function cacheIsStale(cache: UpdateCheckCache | null, packageName: string): boolean {
  if (!cache || cache.packageName !== packageName) return true;
  const age = Date.now() - new Date(cache.lastCheckedAt).getTime();
  return age >= CHECK_INTERVAL_MS;
}

function printUpdateNotice(current: string, latest: string, installCommand: string): void {
  process.stderr.write(`[ae-cli] Update available: ${current} → ${latest}\n`);
  process.stderr.write(`         Run: ${installCommand}\n`);
}

export async function fetchLatestVersion(packageName: string, registry: string): Promise<string | null> {
  const url = `${registry.replace(/\/$/, '')}/${encodeURIComponent(packageName)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!resp.ok) return null;

    const data = (await resp.json()) as { 'dist-tags'?: { latest?: string } };
    const latest = data['dist-tags']?.latest;
    return typeof latest === 'string' && latest.trim() ? latest.trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function refreshCache(pkg: PackageInfo, registry: string): Promise<UpdateCheckCache | null> {
  const latest = await fetchLatestVersion(pkg.name, registry);
  if (!latest) return readCache();

  const cache: UpdateCheckCache = {
    packageName: pkg.name,
    currentVersion: pkg.version,
    latestVersion: latest,
    lastCheckedAt: new Date().toISOString(),
  };
  writeCache(cache);
  return cache;
}

function maybeNotifyFromCache(pkg: PackageInfo, cache: UpdateCheckCache | null, registry: string): void {
  if (!cache || cache.packageName !== pkg.name) return;
  if (!isNewer(cache.latestVersion, pkg.version)) return;
  printUpdateNotice(pkg.version, cache.latestVersion, buildInstallCommand(pkg.name, registry));
}

/** Non-blocking update check; prints a notice when a newer version is known. */
export function notifyIfUpdateAvailable(pkg: PackageInfo): void {
  if (!isUpdateCheckEnabled(pkg.name)) return;
  if (shouldSkipUpdateCheck()) return;

  const registry = resolveRegistry(pkg.name);
  const cache = readCache();

  maybeNotifyFromCache(pkg, cache, registry);

  if (!cacheIsStale(cache, pkg.name)) return;

  void refreshCache(pkg, registry).then((fresh) => {
    if (!fresh) return;
    if (cache && fresh.latestVersion === cache.latestVersion) return;
    maybeNotifyFromCache(pkg, fresh, registry);
  });
}
