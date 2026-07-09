/**
 * secure-store.ts — AES-256-GCM encrypted token file storage
 *
 * ## Encryption scheme
 * - Algorithm: AES-256-GCM (Node built-in `crypto`, no native dependencies)
 * - Key derivation: `crypto.scryptSync(machineId, salt, 32)`
 *   - machineId: machine-bound identifier (see `getMachineId()`, works cross-platform / in containers / sandboxes)
 *   - salt: fixed salt "ae-cli-secure-store-v1" (does not need to be secret; prevents rainbow table attacks)
 * - Each encryption generates a 12-byte random nonce/IV; GCM auth tag is 16 bytes
 * - On-disk format (JSON): `{ nonce: <hex>, tag: <hex>, data: <hex> }`
 * - Decryption validates the auth tag; tampering or wrong key both throw (fail closed)
 * - File permissions: `0o600` (current user read/write only)
 *
 * ## machineId strategy (cross-platform & container/sandbox friendly)
 * Priority (high -> low):
 *   1. macOS:  `ioreg -rd1 -c IOPlatformExpertDevice` -> IOPlatformUUID
 *   2. Linux:  `/etc/machine-id`
 *   3. Windows: `reg query HKLM\SOFTWARE\Microsoft\Cryptography /v MachineGuid`
 *   4. Fallback: `$HOME` + `os.hostname()` + `os.platform()` (usable in containers/CI)
 *
 * ## Threat model / security boundary (limitations)
 * Protection scope of the machineId-derived key (0o600 file permissions):
 *   - Protects: token file copied/backed up and decrypted on a **different machine**; also protects against **other users on the same machine (group/other)**
 *   - Does NOT protect: **co-resident processes running as the same user on the same machine** — such processes can read the 0o600 file and re-derive the key, enabling decryption
 *     (stronger protection requires a future enhancement: use the OS keychain to protect the key; see design doc section B)
 *   - CI/containers: the fallback machineId (`$HOME|hostname|platform`) may be approximate or guessable, reducing confidentiality to obfuscation level
 *
 * ## Consumers
 * - Task 4 (ae-cli auth login): calls `save()` to persist to disk; calls `getValidAccessToken()` to retrieve a valid token
 * - Task 5 (te-agent-client):   calls `load()` to retrieve the accessToken
 * - Task 6 (secure cleanup):    calls `clear()` to remove the persisted token
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { getConfigDir } from './config.js';
import { logger } from './logger.js';
import { safeJsonParse } from './json-utils.js';

// ---------- Constants ----------

const STORE_DIR_SUFFIX = 'secure-tokens';
const SCRYPT_SALT = Buffer.from('ae-cli-secure-store-v1');
const SCRYPT_N = 16384; // CPU/memory cost (2^14)
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 32; // AES-256
const NONCE_LEN = 12; // GCM standard nonce
const TAG_LEN = 16; // GCM auth tag

// Refresh token endpoint path
const REFRESH_TOKEN_PATH = '/v1/oauth/refreshForToken';

// ---------- Types ----------

export interface TokenPayload {
  accessToken: string;
  refreshToken: string;
  /** ISO 8601 string, e.g. "2026-06-20T12:00:00.000Z" */
  accessExpiresAt: string;
  /**
   * CLI token (long-lived; server expireTime is slid by explicit /renew from ae-cli).
   * Minted by cli-token.ts immediately after device login
   * (using the accessToken above) and persisted here
   * so subsequent CLI invocations (new processes) reuse it instead of re-minting every time.
   * Also cleared by `auth logout`.
   */
  cliToken?: string;
}

/** Refresh response body (per backend contract) */
interface RefreshResponse {
  return_code: number;
  return_message?: string;
  data?: {
    accessToken?: string;
    access_token?: string;
    refreshToken?: string;
    refresh_token?: string;
    expiresIn?: number;
    expires_in?: number;
  };
}

/** On-disk JSON structure */
interface EncryptedBlob {
  nonce: string; // hex
  tag: string;   // hex
  data: string;  // hex
}

// ---------- Machine ID ----------

/**
 * Retrieves the machine-bound ID used to derive the encryption key.
 * Cross-platform with fallback for containers / sandboxes / CI; pure Node with no native dependencies.
 */
function getMachineId(): string {
  // macOS
  if (process.platform === 'darwin') {
    try {
      const out = execFileSync(
        'ioreg',
        ['-rd1', '-c', 'IOPlatformExpertDevice'],
        { encoding: 'utf8', timeout: 3000 },
      );
      const m = out.match(/IOPlatformUUID.*?=.*?"([0-9A-F-]{36})"/i);
      if (m?.[1]) return `darwin:${m[1]}`;
    } catch {
      // Continue to next option
    }
  }

  // Linux — machine-id
  if (process.platform === 'linux') {
    for (const p of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
      try {
        const id = fs.readFileSync(p, 'utf8').trim();
        if (id) return `linux:${id}`;
      } catch {
        // Continue
      }
    }
  }

  // Windows — MachineGuid
  if (process.platform === 'win32') {
    try {
      const out = execFileSync(
        'reg',
        ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'],
        { encoding: 'utf8', timeout: 3000 },
      );
      const m = out.match(/MachineGuid\s+REG_SZ\s+([0-9a-f-]+)/i);
      if (m?.[1]) return `win32:${m[1]}`;
    } catch {
      // Continue
    }
  }

  // Fallback (container/CI/sandbox): HOME + hostname + platform
  // Stable within the same machine/container; different machines produce different IDs
  const fallback = `${os.homedir()}|${os.hostname()}|${os.platform()}`;
  logger.warn('secure-store: using fallback machine-id (HOME+hostname+platform)');
  return `fallback:${fallback}`;
}

/** Cached after first call to avoid repeated syscalls within the same process */
let _cachedMachineId: string | undefined;
function getCachedMachineId(): string {
  if (!_cachedMachineId) _cachedMachineId = getMachineId();
  return _cachedMachineId;
}

// ---------- Key derivation ----------

/**
 * Derives a 32-byte AES-256 key from machineId using scrypt.
 * The salt is fixed and non-secret; cost parameter N=16384 is acceptable for CLI usage (infrequent encrypt/decrypt).
 */
function deriveKey(machineId: string): Buffer {
  return crypto.scryptSync(machineId, SCRYPT_SALT, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
}

let _cachedKey: Buffer | undefined;
function getKey(): Buffer {
  if (!_cachedKey) _cachedKey = deriveKey(getCachedMachineId());
  return _cachedKey;
}

// For test injection of a different key only; not part of the public API
export function _resetKeyCache(): void {
  _cachedKey = undefined;
  _cachedMachineId = undefined;
}

// ---------- Encrypt / Decrypt ----------

function encrypt(plaintext: string): EncryptedBlob {
  const key = getKey();
  const nonce = crypto.randomBytes(NONCE_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    nonce: nonce.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted.toString('hex'),
  };
}

function decrypt(blob: EncryptedBlob): string {
  const key = getKey();
  const nonce = Buffer.from(blob.nonce, 'hex');
  const tag = Buffer.from(blob.tag, 'hex');
  const data = Buffer.from(blob.data, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(tag);
  // If the tag does not match (tampered data or wrong key), this throws "Unsupported state or unable to authenticate data"
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

// ---------- File paths ----------

function storeDir(): string {
  return path.join(getConfigDir(), STORE_DIR_SUFFIX);
}

function tokenFilePath(host: string): string {
  // Convert host URL to a safe filename (strip protocol prefix, replace special characters)
  const safe = host.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(storeDir(), `${safe}.enc.json`);
}

function ensureStoreDir(): void {
  const dir = storeDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    // Set the directory itself to 0700 as well
    try { fs.chmodSync(dir, 0o700); } catch {}
  }
}

// ---------- Public API ----------

/**
 * Encrypts the token and writes it to `~/.ae-cli/secure-tokens/<host>.enc.json` (permissions 0600).
 */
export function save(host: string, payload: TokenPayload): void {
  ensureStoreDir();
  const plaintext = JSON.stringify(payload);
  const blob = encrypt(plaintext);
  const filePath = tokenFilePath(host);
  fs.writeFileSync(filePath, JSON.stringify(blob, null, 2), { encoding: 'utf8' });
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    // Windows does not support chmod; ignore
  }
  logger.info(`secure-store: token saved for ${host}`);
}

/**
 * Decrypts and returns the token for the specified host; returns null if the file does not exist or decryption fails.
 */
export function load(host: string): TokenPayload | null {
  const filePath = tokenFilePath(host);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const blob = safeJsonParse(raw) as EncryptedBlob;
    if (!blob?.nonce || !blob?.tag || !blob?.data) {
      logger.warn(`secure-store: malformed blob for ${host}`);
      return null;
    }
    const plaintext = decrypt(blob);
    return JSON.parse(plaintext) as TokenPayload;
  } catch (e: any) {
    logger.error(`secure-store: decrypt failed for ${host}: ${e.message}`);
    return null;
  }
}

/**
 * Deletes the encrypted token file for the specified host.
 */
export function clear(host: string): void {
  const filePath = tokenFilePath(host);
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath);
    logger.info(`secure-store: token cleared for ${host}`);
  }
}

/**
 * Returns a valid accessToken:
 * - Returns it immediately if not expired.
 * - If expired, refreshes via POST /v1/oauth/refreshForToken using the refreshToken and persists the result.
 * - Throws SecureStoreAuthError on refresh failure (caller should prompt the user to log in again).
 */
export async function getValidAccessToken(host: string): Promise<string> {
  const payload = load(host);
  if (!payload) {
    throw new SecureStoreAuthError(
      `No stored token for ${host}. Please run: ae-cli auth login`,
    );
  }

  const expiresAt = new Date(payload.accessExpiresAt).getTime();
  const now = Date.now();
  // Refresh 60 seconds early to avoid boundary race conditions
  const needsRefresh = expiresAt - now < 60_000;

  if (!needsRefresh) {
    return payload.accessToken;
  }

  // If a refresh token exists, use the refresh path (kept for environments that issue one).
  if (payload.refreshToken) {
    logger.info(`secure-store: access token past local expiry for ${host}, refreshing…`);
    const refreshed = await doRefresh(host, payload.refreshToken);
    // Preserve the (non-expiring) cliToken across an access-token refresh — doRefresh only returns access/refresh.
    save(host, { ...refreshed, cliToken: payload.cliToken });
    logger.info(`secure-store: token refreshed for ${host}`);
    return refreshed.accessToken;
  }

  // F-010: no refresh token. `accessExpiresAt` is a STATIC snapshot taken at login, but the server uses a
  // sliding window (renewed on every authenticated request), so the local timestamp does NOT reflect real
  // validity — proactively failing here would force a re-login even while the server keeps the token alive.
  // Hand over the stored token and let the server be the judge (lazy discovery): an actively-used token
  // stays valid via server-side sliding; a genuinely dead one surfaces as a 401 the caller maps to re-login.
  logger.info(`secure-store: ${host} past static local expiry, no refresh token — returning stored token, server validates (lazy)`);
  return payload.accessToken;
}

/**
 * Returns the persisted long-lived CLI token for a host, or null if absent.
 * Used by cli-token.ts to stay authenticated without re-minting from an access token.
 */
export function loadCliToken(host: string): string | null {
  return load(host)?.cliToken ?? null;
}

/**
 * Calls POST /v1/oauth/refreshForToken to refresh the token; throws SecureStoreAuthError on failure.
 */
async function doRefresh(host: string, refreshToken: string): Promise<TokenPayload> {
  const base = host.replace(/\/+$/, '');
  const url = `${base}${REFRESH_TOKEN_PATH}`;

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch (e: any) {
    throw new SecureStoreAuthError(
      `Token refresh network error for ${host}: ${e.message}. Please run: ae-cli auth login`,
    );
  }

  if (!resp.ok) {
    throw new SecureStoreAuthError(
      `Token refresh failed (HTTP ${resp.status}) for ${host}. Please run: ae-cli auth login`,
    );
  }

  let body: RefreshResponse;
  try {
    body = safeJsonParse(await resp.text()) as RefreshResponse;
  } catch {
    throw new SecureStoreAuthError(
      `Token refresh returned invalid JSON for ${host}. Please run: ae-cli auth login`,
    );
  }

  if (body.return_code !== 0) {
    throw new SecureStoreAuthError(
      `Token refresh error (${body.return_code}: ${body.return_message ?? 'unknown'}) for ${host}. Please run: ae-cli auth login`,
    );
  }

  const d = body.data;
  const newAccess = d?.accessToken ?? d?.access_token ?? '';
  const newRefresh = d?.refreshToken ?? d?.refresh_token ?? refreshToken; // Reuse old refresh token if backend does not rotate it
  const expiresIn = d?.expiresIn ?? d?.expires_in ?? 72000; // Default 20h

  if (!newAccess) {
    throw new SecureStoreAuthError(
      `Token refresh returned empty accessToken for ${host}. Please run: ae-cli auth login`,
    );
  }

  return {
    accessToken: newAccess,
    refreshToken: newRefresh,
    accessExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

/**
 * Authentication state error: prompts the user to log in again.
 * T4/T5 should print the hint and exit after catching this error.
 */
export class SecureStoreAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecureStoreAuthError';
  }
}

/** Namespace export (for use with import * as secureStore) */
export const secureStore = { save, load, clear, getValidAccessToken, loadCliToken };
