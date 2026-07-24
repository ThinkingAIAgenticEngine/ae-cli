import fs from 'fs';
import path from 'path';
import { getActiveHost, getConfigDir } from './config.js';
import { peekCliToken } from './cli-token.js';
import { getToken } from './auth.js';
import { isAeSandboxRuntime } from './sandbox-runtime.js';
import { shouldSkipUpdateCheck } from './update-check.js';
import {
  evaluateCompat,
  formatCompatNotice,
  formatPinCommands,
  type CompatVerdict,
} from './version-compat.js';
import { normalizeUrl } from './url-utils.js';

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 3000;
const CLI_CONFIG_PATH = '/v1/ta/cli/config';

export interface CompatHostCache {
  host: string;
  localVersion: string;
  expectedVersion: string;
  clusterVersion: string;
  lastFetchedAt: string;
  lastNotifiedAt?: string;
}

export interface CompatCheckStore {
  hosts: Record<string, CompatHostCache>;
}

export interface CompatPackageInfo {
  name: string;
  version: string;
}

export interface UpdateNotice {
  command: string;
  current: string;
  expected: string;
  cluster: string;
  reason: CompatVerdict['kind'];
  message: string;
}

function cacheFilePath(): string {
  return path.join(getConfigDir(), 'compat-check.json');
}

function readStore(): CompatCheckStore {
  try {
    const file = cacheFilePath();
    if (!fs.existsSync(file)) return { hosts: {} };
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as CompatCheckStore;
    if (!raw || typeof raw !== 'object' || !raw.hosts) return { hosts: {} };
    return raw;
  } catch {
    return { hosts: {} };
  }
}

function writeStore(store: CompatCheckStore): void {
  try {
    const dir = getConfigDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cacheFilePath(), JSON.stringify(store, null, 2));
  } catch {
    // ignore
  }
}

function hostKey(host: string): string {
  return normalizeUrl(host);
}

function isStale(entry: CompatHostCache | undefined): boolean {
  if (!entry?.lastFetchedAt) return true;
  const age = Date.now() - new Date(entry.lastFetchedAt).getTime();
  return age >= CHECK_INTERVAL_MS;
}

function shouldNotify(entry: CompatHostCache | undefined): boolean {
  if (!entry?.lastNotifiedAt) return true;
  const age = Date.now() - new Date(entry.lastNotifiedAt).getTime();
  return age >= CHECK_INTERVAL_MS;
}

export function shouldSkipCompatCheck(argv: string[] = process.argv): boolean {
  if (process.env.AE_CLI_NO_COMPAT_CHECK === '1') return true;
  if (isAeSandboxRuntime()) return true;
  return shouldSkipUpdateCheck(argv);
}

type CliConfigPayload = {
  versions?: {
    clusterVersion?: string;
    aeCliVersion?: string;
    cluster_version?: string;
    ae_cli_version?: string;
  };
};

export async function fetchCliConfig(
  host: string,
  cliToken: string,
): Promise<{ clusterVersion: string | null; aeCliVersion: string | null } | null> {
  const url = new URL(CLI_CONFIG_PATH, host.endsWith('/') ? host : `${host}/`);
  url.searchParams.set('cli-token', cliToken);
  const headers: Record<string, string> = { Accept: 'application/json' };
  try {
    const accessToken = await getToken(host);
    if (accessToken) {
      headers.Authorization = `bearer ${accessToken}`;
    }
  } catch {
    // cli-token-only / sandbox: rely on ANONY_PATHS + query cli-token after backend whitelist.
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url.toString(), {
      signal: controller.signal,
      headers,
    });
    if (!resp.ok) return null;
    const body = (await resp.json()) as { data?: CliConfigPayload } & CliConfigPayload;
    const data = body.data ?? body;
    const versions = data.versions;
    if (!versions) return null;
    const clusterVersion =
      versions.clusterVersion ?? versions.cluster_version ?? null;
    const aeCliVersion = versions.aeCliVersion ?? versions.ae_cli_version ?? null;
    return {
      clusterVersion: clusterVersion?.trim() || null,
      aeCliVersion: aeCliVersion?.trim() || null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function printNotice(text: string): void {
  process.stderr.write(`${text}\n`);
}

/** True when stdout/stderr is not a TTY (Agent shells, pipes, CI capture). */
export function isNonInteractiveOutput(): boolean {
  return !process.stdout.isTTY || !process.stderr.isTTY;
}

/** Last computed host-compat notice for this process (JSON `_notice` / Agent stdout). */
let pendingHostCompatNotice: string | undefined;
let pendingUpdateNotice: UpdateNotice | undefined;

export function getPendingHostCompatNotice(): string | undefined {
  return pendingHostCompatNotice;
}

export function getPendingUpdateNotice(): UpdateNotice | undefined {
  return pendingUpdateNotice;
}

export function getCachedCompatForHost(host: string): CompatHostCache | undefined {
  return readStore().hosts[hostKey(host)];
}

/** Build pin hint lines when capability is missing (uses cache if present). */
export function formatCapabilityMissCompatHint(host?: string): string | undefined {
  if (shouldSkipCompatCheck()) return undefined;
  const active = host || getActiveHost();
  if (!active) {
    return (
      'This capability may be missing on the current private cluster. ' +
      'Update cluster components to the latest version, or pin this machine to the environment ae-cli version.'
    );
  }
  const cached = getCachedCompatForHost(active);
  if (cached?.expectedVersion) {
    const pins = formatPinCommands(cached.expectedVersion);
    if (pins.length > 0) {
      return [
        `Host may be older than this CLI (environment ae-cli ${cached.expectedVersion}, cluster ${cached.clusterVersion || '?'}).`,
        `Update cluster components to the latest version, or pin locally:`,
        ...pins.map((c) => `  ${c}`),
      ].join('\n');
    }
    return [
      `Host may be older than this CLI (environment ae-cli ${cached.expectedVersion}, cluster ${cached.clusterVersion || '?'}).`,
      `No public GitHub/npm release matches that environment version; update cluster components to the latest version instead of pinning.`,
    ].join('\n');
  }
  return (
    'This capability may be missing on the current private cluster. ' +
    'Update cluster components to the latest version, or pin this machine CLI + skills to the environment version ' +
    '(see ae-cli host compat notices after auth login).'
  );
}

async function refreshAndMaybeNotify(host: string, pkg: CompatPackageInfo): Promise<void> {
  const token = peekCliToken(host);
  if (!token) return;

  const store = readStore();
  const key = hostKey(host);
  const existing = store.hosts[key];

  let expected = existing?.expectedVersion;
  let cluster = existing?.clusterVersion;
  let fetchedAt = existing?.lastFetchedAt;

  if (isStale(existing)) {
    const remote = await fetchCliConfig(host, token);
    if (!remote?.aeCliVersion) {
      return;
    }
    expected = remote.aeCliVersion;
    cluster = remote.clusterVersion ?? '';
    fetchedAt = new Date().toISOString();
    store.hosts[key] = {
      host: key,
      localVersion: pkg.version,
      expectedVersion: expected,
      clusterVersion: cluster,
      lastFetchedAt: fetchedAt,
      lastNotifiedAt: existing?.lastNotifiedAt,
    };
    writeStore(store);
  }

  if (!expected) return;

  const verdict: CompatVerdict = evaluateCompat(pkg.version, expected, cluster);
  const notice = formatCompatNotice(verdict);
  if (!notice) {
    pendingHostCompatNotice = undefined;
    pendingUpdateNotice = undefined;
    return;
  }

  const entry = store.hosts[key] ?? {
    host: key,
    localVersion: pkg.version,
    expectedVersion: expected,
    clusterVersion: cluster || '',
    lastFetchedAt: fetchedAt || new Date().toISOString(),
  };

  entry.localVersion = pkg.version;
  entry.expectedVersion = expected;
  entry.clusterVersion = cluster || entry.clusterVersion;

  // Human and Agent-facing update hint: once per 24h for each host.
  const dueForTip = shouldNotify(entry);
  if (!dueForTip) {
    pendingHostCompatNotice = undefined;
    pendingUpdateNotice = undefined;
    store.hosts[key] = entry;
    writeStore(store);
    return;
  }

  pendingHostCompatNotice = notice;
  pendingUpdateNotice = {
    command: 'ae-cli update',
    current: pkg.version,
    expected,
    cluster: cluster || '',
    reason: verdict.kind,
    message: `Current ae-cli is ${pkg.version}; this host requires ${expected}. Run: ae-cli update`,
  };

  printNotice(notice);
  entry.lastNotifiedAt = new Date().toISOString();
  store.hosts[key] = entry;
  writeStore(store);
}

/**
 * Host compat check (personal terminal / personal agent only).
 * Sandbox runtimes skip entirely. Await so tips land before command stdout.
 */
export async function runHostCompatCheck(
  pkg: CompatPackageInfo,
  hostOverride?: string,
): Promise<void> {
  if (shouldSkipCompatCheck()) return;
  const host = hostOverride || getActiveHost();
  if (!host) return;
  try {
    await refreshAndMaybeNotify(host, pkg);
  } catch {
    // never block CLI
  }
}

/** Fire-and-forget wrapper (e.g. post-login); prefer {@link runHostCompatCheck} at startup. */
export function notifyIfHostCompat(pkg: CompatPackageInfo, hostOverride?: string): void {
  void runHostCompatCheck(pkg, hostOverride);
}
