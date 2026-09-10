/**
 * AES-256-GCM credential storage for ae-cli.
 *
 * New CLIs keep all CLI-token-only credentials in `<host>.accounts.v1.enc.json` and
 * maintain the historical `<host>.enc.json` as a single-account projection. That
 * projection deliberately preserves the legacy plaintext shape so an automatic
 * downgrade can keep using `cliToken`; access/refresh values are never persisted by
 * the new login flow.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { getConfigDir } from './config.js';
import { logger } from './logger.js';
import { safeJsonParse } from './json-utils.js';
import { normalizeUrl } from './url-utils.js';

const STORE_DIR_SUFFIX = 'secure-tokens';
const SCRYPT_SALT = Buffer.from('ae-cli-secure-store-v1');
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 32;
const NONCE_LEN = 12;

/** Historical plaintext contract. Old CLIs require these exact field names. */
export interface TokenPayload {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  cliToken?: string;
}

export interface CredentialAccount {
  openId: string;
  loginName: string;
  userName: string;
}

export interface StoredCredential {
  id: string;
  cliToken: string;
  account?: CredentialAccount;
  /** ISO-8601 when supplied by a new backend. */
  cliTokenExpiresAt?: string;
  /** Local calendar day, YYYY-MM-DD. */
  lastRenewedOn?: string;
}

interface LegacyProjection {
  credentialId: string;
  tokenFingerprint: string;
}

export interface CredentialVault {
  version: 1;
  host: string;
  activeCredentialId: string;
  credentials: StoredCredential[];
  legacyProjection?: LegacyProjection;
}

export interface SaveCredentialOptions {
  /** Preserve other accounts. Requires account identity for a newly added token. */
  add?: boolean;
}

interface EncryptedBlob {
  nonce: string;
  tag: string;
  data: string;
}

function getMachineId(): string {
  if (process.platform === 'darwin') {
    try {
      const out = execFileSync('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], {
        encoding: 'utf8', timeout: 3000,
      });
      const match = out.match(/IOPlatformUUID.*?=.*?"([0-9A-F-]{36})"/i);
      if (match?.[1]) return `darwin:${match[1]}`;
    } catch {}
  }
  if (process.platform === 'linux') {
    for (const candidate of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
      try {
        const id = fs.readFileSync(candidate, 'utf8').trim();
        if (id) return `linux:${id}`;
      } catch {}
    }
  }
  if (process.platform === 'win32') {
    try {
      const out = execFileSync(
        'reg',
        ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'],
        { encoding: 'utf8', timeout: 3000 },
      );
      const match = out.match(/MachineGuid\s+REG_SZ\s+([0-9a-f-]+)/i);
      if (match?.[1]) return `win32:${match[1]}`;
    } catch {}
  }
  logger.warn('secure-store: using fallback machine-id (HOME+hostname+platform)');
  return `fallback:${os.homedir()}|${os.hostname()}|${os.platform()}`;
}

let cachedMachineId: string | undefined;
let cachedKey: Buffer | undefined;

function getKey(): Buffer {
  if (!cachedMachineId) cachedMachineId = getMachineId();
  if (!cachedKey) {
    cachedKey = crypto.scryptSync(cachedMachineId, SCRYPT_SALT, KEY_LEN, {
      N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P,
    });
  }
  return cachedKey;
}

export function _resetKeyCache(): void {
  cachedMachineId = undefined;
  cachedKey = undefined;
}

function encrypt(plaintext: string): EncryptedBlob {
  const nonce = crypto.randomBytes(NONCE_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), nonce);
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    nonce: nonce.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
    data: data.toString('hex'),
  };
}

function decrypt(blob: EncryptedBlob): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(blob.nonce, 'hex'));
  decipher.setAuthTag(Buffer.from(blob.tag, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(blob.data, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

function storeDir(): string {
  return path.join(getConfigDir(), STORE_DIR_SUFFIX);
}

function safeHost(host: string): string {
  return normalizeUrl(host).replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function legacyFilePath(host: string): string {
  return path.join(storeDir(), `${safeHost(host)}.enc.json`);
}

function vaultFilePath(host: string): string {
  return path.join(storeDir(), `${safeHost(host)}.accounts.v1.enc.json`);
}

function ensureStoreDir(): void {
  const dir = storeDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(dir, 0o700); } catch {}
}

function atomicWriteEncrypted(filePath: string, value: unknown): void {
  ensureStoreDir();
  const tempPath = `${filePath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  const blob = encrypt(JSON.stringify(value));
  try {
    fs.writeFileSync(tempPath, JSON.stringify(blob, null, 2), { encoding: 'utf8', mode: 0o600 });
    try { fs.chmodSync(tempPath, 0o600); } catch {}
    fs.renameSync(tempPath, filePath);
    try { fs.chmodSync(filePath, 0o600); } catch {}
  } finally {
    try { fs.rmSync(tempPath, { force: true }); } catch {}
  }
}

function readEncrypted<T>(filePath: string, label: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const blob = safeJsonParse(fs.readFileSync(filePath, 'utf8')) as EncryptedBlob;
    if (!blob?.nonce || !blob?.tag || !blob?.data) {
      logger.warn(`secure-store: malformed ${label}`);
      return null;
    }
    return safeJsonParse(decrypt(blob)) as T;
  } catch (error: any) {
    logger.error(`secure-store: decrypt failed for ${label}: ${error.message}`);
    return null;
  }
}

function tokenFingerprint(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex').slice(0, 24);
}

function credentialId(token: string): string {
  return `cred_${tokenFingerprint(token).slice(0, 12)}`;
}

function legacyProjectionPayload(cliToken: string): TokenPayload {
  return {
    accessToken: '',
    refreshToken: '',
    accessExpiresAt: '1970-01-01T00:00:00.000Z',
    cliToken,
  };
}

function writeLegacyProjection(host: string, credential: StoredCredential): LegacyProjection {
  atomicWriteEncrypted(legacyFilePath(host), legacyProjectionPayload(credential.cliToken));
  return {
    credentialId: credential.id,
    tokenFingerprint: tokenFingerprint(credential.cliToken),
  };
}

function readVaultRaw(host: string): CredentialVault | null {
  const normalizedHost = normalizeUrl(host);
  const vault = readEncrypted<CredentialVault>(vaultFilePath(normalizedHost), `${normalizedHost} account vault`);
  if (!vault || vault.version !== 1 || !Array.isArray(vault.credentials)) return null;
  const credentials = vault.credentials.filter((entry) => entry?.id && entry?.cliToken);
  if (credentials.length === 0 || !credentials.some((entry) => entry.id === vault.activeCredentialId)) return null;
  return { ...vault, host: normalizedHost, credentials };
}

function writeVault(host: string, vault: CredentialVault): void {
  atomicWriteEncrypted(vaultFilePath(host), vault);
}

function removeFile(filePath: string): void {
  try { fs.rmSync(filePath, { force: true }); } catch {}
}

/** Legacy API retained for old-format migration tests and downgrade interoperability. */
export function save(host: string, payload: TokenPayload): void {
  atomicWriteEncrypted(legacyFilePath(host), payload);
}

/** Read the historical single-account file. */
export function load(host: string): TokenPayload | null {
  return readEncrypted<TokenPayload>(legacyFilePath(host), normalizeUrl(host));
}

/** Delete only the historical projection. Prefer clearAllCredentials for new auth flows. */
export function clear(host: string): void {
  removeFile(legacyFilePath(host));
}

/**
 * Merge changes made by an older auto-downgraded CLI into the V1 vault.
 * A changed legacy token is imported; deletion means the projected account was logged out.
 */
export function loadCredentialVault(host: string): CredentialVault | null {
  const normalizedHost = normalizeUrl(host);
  let vault = readVaultRaw(normalizedHost);
  const legacyToken = load(normalizedHost)?.cliToken?.trim();

  if (!vault) {
    if (!legacyToken) return null;
    const imported: StoredCredential = { id: credentialId(legacyToken), cliToken: legacyToken };
    vault = {
      version: 1,
      host: normalizedHost,
      activeCredentialId: imported.id,
      credentials: [imported],
      legacyProjection: {
        credentialId: imported.id,
        tokenFingerprint: tokenFingerprint(legacyToken),
      },
    };
    writeVault(normalizedHost, vault);
    logger.info(`secure-store: migrated legacy CLI token for ${normalizedHost}`);
    return vault;
  }

  if (legacyToken) {
    let credential = vault.credentials.find((entry) => entry.cliToken === legacyToken);
    let changed = false;
    if (!credential) {
      credential = { id: credentialId(legacyToken), cliToken: legacyToken };
      vault.credentials.push(credential);
      changed = true;
      logger.info(`secure-store: imported CLI token changed by an older CLI for ${normalizedHost}`);
    }
    const fingerprint = tokenFingerprint(legacyToken);
    if (
      vault.activeCredentialId !== credential.id
      || vault.legacyProjection?.credentialId !== credential.id
      || vault.legacyProjection?.tokenFingerprint !== fingerprint
    ) {
      vault.activeCredentialId = credential.id;
      vault.legacyProjection = { credentialId: credential.id, tokenFingerprint: fingerprint };
      changed = true;
    }
    if (changed) writeVault(normalizedHost, vault);
    return vault;
  }

  if (vault.legacyProjection) {
    const projection = vault.legacyProjection;
    const projected = vault.credentials.find((entry) =>
      entry.id === projection.credentialId
      && tokenFingerprint(entry.cliToken) === projection.tokenFingerprint);
    if (projected) {
      vault.credentials = vault.credentials.filter((entry) => entry.id !== projected.id);
      logger.info(`secure-store: honored legacy logout for ${normalizedHost}`);
    }
    vault.legacyProjection = undefined;
    if (vault.credentials.length === 0) {
      removeFile(vaultFilePath(normalizedHost));
      return null;
    }
    if (!vault.credentials.some((entry) => entry.id === vault!.activeCredentialId)) {
      vault.activeCredentialId = vault.credentials[0].id;
    }
  }

  const active = vault.credentials.find((entry) => entry.id === vault!.activeCredentialId)!;
  vault.legacyProjection = writeLegacyProjection(normalizedHost, active);
  writeVault(normalizedHost, vault);
  return vault;
}

export function getActiveCredential(host: string): StoredCredential | null {
  const vault = loadCredentialVault(host);
  return vault?.credentials.find((entry) => entry.id === vault.activeCredentialId) ?? null;
}

export function listCredentials(host: string): StoredCredential[] {
  return loadCredentialVault(host)?.credentials ?? [];
}

/** Save a login result and make it the active legacy projection. */
export function saveCredential(
  host: string,
  credential: Omit<StoredCredential, 'id'>,
  options: SaveCredentialOptions = {},
): StoredCredential {
  const normalizedHost = normalizeUrl(host);
  const existingVault = loadCredentialVault(normalizedHost);
  if (options.add && !credential.account) {
    throw new SecureStoreAuthError(
      `This host does not return account identity from CLI token validation. `
      + `Upgrade the server before using auth login --add for ${normalizedHost}.`,
    );
  }

  const sameAccount = credential.account
    ? existingVault?.credentials.find((entry) =>
      entry.account?.openId === credential.account!.openId
      || entry.account?.loginName === credential.account!.loginName)
    : undefined;
  const sameToken = existingVault?.credentials.find((entry) => entry.cliToken === credential.cliToken);
  const saved: StoredCredential = {
    ...(sameAccount ?? sameToken ?? { id: credentialId(credential.cliToken) }),
    ...credential,
  };

  let credentials: StoredCredential[];
  if (options.add) {
    credentials = (existingVault?.credentials ?? []).filter((entry) => entry.id !== saved.id);
    credentials.push(saved);
  } else {
    credentials = [saved];
  }

  const legacyProjection = writeLegacyProjection(normalizedHost, saved);
  writeVault(normalizedHost, {
    version: 1,
    host: normalizedHost,
    activeCredentialId: saved.id,
    credentials,
    legacyProjection,
  });
  logger.info(`secure-store: saved CLI credential for ${normalizedHost}`);
  return saved;
}

/** Enrich the active entry after a successful optional /validate call. */
export function updateCredentialMetadata(
  host: string,
  cliToken: string,
  metadata: Pick<StoredCredential, 'account' | 'cliTokenExpiresAt'>,
): void {
  const normalizedHost = normalizeUrl(host);
  const vault = loadCredentialVault(normalizedHost);
  if (!vault) return;
  const index = vault.credentials.findIndex((entry) => entry.cliToken === cliToken);
  if (index < 0) return;
  vault.credentials[index] = {
    ...vault.credentials[index],
    ...(metadata.account ? { account: metadata.account } : {}),
    ...(metadata.cliTokenExpiresAt ? { cliTokenExpiresAt: metadata.cliTokenExpiresAt } : {}),
  };
  writeVault(normalizedHost, vault);
}

export function markCredentialRenewed(host: string, cliToken: string, date: string): void {
  const normalizedHost = normalizeUrl(host);
  const vault = loadCredentialVault(normalizedHost);
  const credential = vault?.credentials.find((entry) => entry.cliToken === cliToken);
  if (!vault || !credential) return;
  credential.lastRenewedOn = date;
  writeVault(normalizedHost, vault);
}

export function activateCredential(host: string, account: string): StoredCredential {
  const normalizedHost = normalizeUrl(host);
  const vault = loadCredentialVault(normalizedHost);
  if (!vault) throw new SecureStoreAuthError(`No stored CLI credentials for ${normalizedHost}.`);
  const matches = vault.credentials.filter((entry) =>
    entry.account?.loginName === account || entry.account?.openId === account);
  if (matches.length === 0) {
    throw new SecureStoreAuthError(`No stored account '${account}' for ${normalizedHost}. Run: ae-cli auth list --host ${normalizedHost}`);
  }
  if (matches.length > 1) {
    throw new SecureStoreAuthError(`Account '${account}' is ambiguous for ${normalizedHost}; use its open_id.`);
  }
  const selected = matches[0];
  vault.activeCredentialId = selected.id;
  vault.legacyProjection = writeLegacyProjection(normalizedHost, selected);
  writeVault(normalizedHost, vault);
  return selected;
}

/** Remove the active account; when others remain, project the first remaining account. */
export function removeActiveCredential(host: string): { removed: StoredCredential | null; active: StoredCredential | null } {
  const normalizedHost = normalizeUrl(host);
  const vault = loadCredentialVault(normalizedHost);
  if (!vault) return { removed: null, active: null };
  const removed = vault.credentials.find((entry) => entry.id === vault.activeCredentialId) ?? null;
  vault.credentials = vault.credentials.filter((entry) => entry.id !== vault.activeCredentialId);
  if (vault.credentials.length === 0) {
    removeFile(legacyFilePath(normalizedHost));
    removeFile(vaultFilePath(normalizedHost));
    return { removed, active: null };
  }
  const active = vault.credentials[0];
  vault.activeCredentialId = active.id;
  vault.legacyProjection = writeLegacyProjection(normalizedHost, active);
  writeVault(normalizedHost, vault);
  return { removed, active };
}

export function clearAllCredentials(host: string): void {
  const normalizedHost = normalizeUrl(host);
  removeFile(legacyFilePath(normalizedHost));
  removeFile(vaultFilePath(normalizedHost));
  logger.info(`secure-store: all CLI credentials cleared for ${normalizedHost}`);
}

export function loadCliToken(host: string): string | null {
  return getActiveCredential(host)?.cliToken ?? null;
}

export class SecureStoreAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecureStoreAuthError';
  }
}

export const secureStore = {
  save,
  load,
  clear,
  loadCliToken,
  loadCredentialVault,
  getActiveCredential,
  listCredentials,
  saveCredential,
  updateCredentialMetadata,
  markCredentialRenewed,
  activateCredential,
  removeActiveCredential,
  clearAllCredentials,
};
