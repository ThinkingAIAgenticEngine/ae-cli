import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getActiveHost, getConfigDir } from './config.js';
import { peekCliToken } from './cli-token.js';
import { PermissionError } from './errors.js';
import { normalizeUrl } from './url-utils.js';
import { normalizeBusinesses, type BusinessStates, type OptionalBusiness } from './businesses.js';
import { isSandboxExecutionContext } from './local-skill-context.js';

export const BUSINESS_CONFIG_TTL_MS = 10 * 60 * 1000;
const UNAVAILABLE_TTL_MS = 5 * 60 * 1000;

interface BusinessEntry {
  businesses: BusinessStates;
  fetchedAt: number;
  unavailableAt?: number;
}

interface BusinessStore {
  entries: Record<string, BusinessEntry>;
}

function cachePath(): string {
  return path.join(getConfigDir(), 'business-config.json');
}

function cacheKey(host: string, token: string): string {
  return `${normalizeUrl(host)}#${crypto.createHash('sha256').update(token).digest('hex')}`;
}

function readStore(): BusinessStore {
  try {
    const value = JSON.parse(fs.readFileSync(cachePath(), 'utf8'));
    if (value?.entries && typeof value.entries === 'object' && !Array.isArray(value.entries)) return value;
  } catch {}
  return { entries: {} };
}

function remember(host: string, token: string, entry: BusinessEntry): void {
  const store = readStore();
  store.entries[cacheKey(host, token)] = entry;
  const target = cachePath();
  const temporary = `${target}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(temporary, JSON.stringify(store), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporary, target);
    fs.chmodSync(target, 0o600);
  } catch {
    try { fs.rmSync(temporary, { force: true }); } catch {}
  }
}

export function rememberBusinessConfig(host: string, token: string, businesses: unknown, now = Date.now()): void {
  remember(host, token, { businesses: normalizeBusinesses(businesses), fetchedAt: now });
}

/** Read-only discovery: never fetch config, mint a token or synchronize Skills. */
export function peekBusinessConfig(host: string, token: string, now = Date.now()): BusinessStates | undefined {
  const entry = readStore().entries[cacheKey(host, token)];
  if (entry?.unavailableAt !== undefined && now >= entry.unavailableAt && now - entry.unavailableAt < UNAVAILABLE_TTL_MS) return {};
  if (!entry || !Number.isFinite(entry.fetchedAt) || now < entry.fetchedAt || now - entry.fetchedAt >= BUSINESS_CONFIG_TTL_MS) return undefined;
  return normalizeBusinesses(entry.businesses);
}

/** Help and installation may reuse the last successful snapshot for this exact identity. */
export function readBusinessConfig(host: string, token: string): BusinessStates | undefined {
  const entry = readStore().entries[cacheKey(host, token)];
  return entry && Number.isFinite(entry.fetchedAt) && entry.fetchedAt > 0
    ? normalizeBusinesses(entry.businesses)
    : undefined;
}

export function readCurrentBusinessConfig(hostOverride?: string): BusinessStates {
  try {
    if (isSandboxExecutionContext()) return {};
    const host = hostOverride || getActiveHost();
    if (!host) return {};
    const token = peekCliToken(host);
    return token ? readBusinessConfig(host, token) ?? {} : {};
  } catch {
    return {};
  }
}

export async function resolveBusinessConfig(
  host: string,
  token: string,
  fetchRemote: () => Promise<{ businesses?: unknown } | null>,
  now = Date.now(),
): Promise<BusinessStates> {
  const cached = peekBusinessConfig(host, token, now);
  if (cached !== undefined) return cached;
  const config = await fetchRemote().catch(() => null);
  if (!config) {
    // A failed refresh cannot keep an old false value blocking commands indefinitely.
    const previous = readStore().entries[cacheKey(host, token)];
    remember(host, token, {
      businesses: normalizeBusinesses(previous?.businesses),
      fetchedAt: previous?.fetchedAt ?? 0,
      unavailableAt: now,
    });
    return {};
  }
  const businesses = normalizeBusinesses(config.businesses);
  rememberBusinessConfig(host, token, businesses, now);
  return businesses;
}

export class BusinessDisabledError extends PermissionError {
  constructor(readonly business: OptionalBusiness) {
    super(
      `The '${business}' business is not enabled for the current environment.`,
      'BUSINESS_NOT_ENABLED',
      'Contact your administrator if this business should be enabled, then run: ae-cli config refresh',
    );
    this.name = 'BusinessDisabledError';
  }
}

export async function readBusinessConfigForExecution(hostOverride?: string): Promise<BusinessStates> {
  try {
    if (isSandboxExecutionContext()) return {};
    const host = hostOverride || getActiveHost();
    if (!host) return {};
    const token = peekCliToken(host);
    if (!token) return {};
    return await resolveBusinessConfig(host, token, async () => {
      const { fetchCliConfig } = await import('./compat-check.js');
      return fetchCliConfig(host, token);
    });
  } catch {
    // The business API remains authoritative when optional config is unavailable.
    return {};
  }
}

export async function assertBusinessEnabled(business: OptionalBusiness | undefined, hostOverride?: string): Promise<void> {
  if (business && (await readBusinessConfigForExecution(hostOverride))[business] === false) {
    throw new BusinessDisabledError(business);
  }
}
