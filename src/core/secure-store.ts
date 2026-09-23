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
      // Agent processes often omit /usr/sbin from PATH. Keep the historical UUID.
      const out = execFileSync('/usr/sbin/ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], {
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
    const systemRoot = process.env.SystemRoot || process.env.WINDIR;
    const commands = systemRoot && path.win32.isAbsolute(systemRoot)
      ? [path.win32.join(systemRoot, 'System32', 'reg.exe'), 'reg']
      : ['reg'];
    for (const command of commands) {
      try {
        // Keep the historical registry view; do not force /reg:32 or /reg:64.
        const out = execFileSync(
          command,
          ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'],
          { encoding: 'utf8', timeout: 3000 },
        );
        const match = out.match(/MachineGuid\s+REG_SZ\s+([0-9a-f-]+)/i);
        if (match?.[1]) return `win32:${match[1]}`;
      } catch {}
    }
  }
  logger.warn('secure-store: using fallback machine-id (HOME+hostname+platform)');
  return getFallbackMachineId();
}

function getFallbackMachineId(): string {
  return `fallback:${os.homedir()}|${os.hostname()}|${os.platform()}`;
}

let cachedKeys: Buffer[] | undefined;

function getKeys(): Buffer[] {
  if (!cachedKeys) {
    // Also read credentials written by older CLIs while the native ID was unavailable.
    const machineIds = [...new Set([getMachineId(), getFallbackMachineId()])];
    cachedKeys = machineIds.map((machineId) => crypto.scryptSync(machineId, SCRYPT_SALT, KEY_LEN, {
      N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P,
    }));
  }
  return cachedKeys;
}

export function _resetKeyCache(): void {
  cachedKeys = undefined;
}

function encrypt(plaintext: string, key: Buffer): EncryptedBlob {
  const nonce = crypto.randomBytes(NONCE_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    nonce: nonce.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
    data: data.toString('hex'),
  };
}

function decrypt(blob: EncryptedBlob, key: Buffer): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(blob.nonce, 'hex'));
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

function stageFile(filePath: string, contents: string): string {
  ensureStoreDir();
  const tempPath = `${filePath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(tempPath, contents, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    try { fs.chmodSync(tempPath, 0o600); } catch {}
    return tempPath;
  } catch (error) {
    removeFile(tempPath);
    throw error;
  }
}

function prepareEncrypted(filePath: string, value: unknown, companionPath?: string): { tempPath: string; previous: string | null } {
  // Never replace an unreadable file or silently change its encryption identity.
  const existing = readEncryptedFile(filePath);
  const companion = companionPath ? readEncryptedFile(companionPath) : null;
  const key = existing?.key ?? companion?.key ?? getKeys()[0];
  const blob = encrypt(JSON.stringify(value), key);
  return { tempPath: stageFile(filePath, JSON.stringify(blob, null, 2)), previous: existing?.raw ?? null };
}

function replaceFile(tempPath: string, filePath: string): void {
  fs.renameSync(tempPath, filePath);
  try { fs.chmodSync(filePath, 0o600); } catch {}
}

function atomicWriteEncrypted(filePath: string, value: unknown, companionPath?: string): void {
  const { tempPath } = prepareEncrypted(filePath, value, companionPath);
  try {
    replaceFile(tempPath, filePath);
  } finally {
    removeFile(tempPath);
  }
}

function readEncryptedFile(filePath: string): { value: unknown; key: Buffer; raw: string } | null {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      try {
        // A dangling symlink is an existing, inaccessible credential, not a logout.
        if (!fs.lstatSync(filePath, { throwIfNoEntry: false })) return null;
      } catch {
        // An inaccessible directory must not be treated as an empty store either.
      }
    }
    throw new CredentialStoreUnreadableError(filePath);
  }
  return decodeEncryptedFile(filePath, raw);
}

function decodeEncryptedFile(filePath: string, raw: string): { value: unknown; key: Buffer; raw: string } {
  try {
    const blob = safeJsonParse(raw) as EncryptedBlob;
    if (typeof blob?.nonce !== 'string' || !/^[0-9a-f]{24}$/i.test(blob.nonce)
      || typeof blob?.tag !== 'string' || !/^[0-9a-f]{32}$/i.test(blob.tag)
      || typeof blob?.data !== 'string' || !/^(?:[0-9a-f]{2})+$/i.test(blob.data)) {
      throw new Error('Malformed encrypted credential');
    }
    for (const key of getKeys()) {
      try {
        return { value: safeJsonParse(decrypt(blob, key)), key, raw };
      } catch {
        // Authentication must succeed before accepting either historical key source.
      }
    }
  } catch {
    // Do not log parser errors: they can contain credential file contents.
  }
  throw new CredentialStoreUnreadableError(filePath);
}

function readEncrypted<T>(filePath: string): T | null {
  const result = readEncryptedFile(filePath);
  if (!result) return null;
  if (!result.value || typeof result.value !== 'object' || Array.isArray(result.value)) {
    throw new CredentialStoreUnreadableError(filePath);
  }
  return result.value as T;
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

interface CredentialWriteRecovery {
  version: 1;
  pid: number;
  // Exact encrypted bytes only; never persist decrypted tokens in the recovery file.
  legacy: string | null;
  vault: string | null;
  legacyTemp: string;
  vaultTemp: string;
}

const activeWrites = new Set<string>();

function recoveryFilePath(host: string): string {
  return `${vaultFilePath(host)}.rollback`;
}

function restoreFile(filePath: string, previous: string | null): void {
  let current: string | null;
  try { current = fs.readFileSync(filePath, 'utf8'); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    current = null;
  }
  // In particular, do not replace an unchanged vault that is still locked on Windows.
  if (current === previous) return;
  if (previous === null) {
    fs.rmSync(filePath, { force: true });
    return;
  }
  const tempPath = stageFile(filePath, previous);
  try { replaceFile(tempPath, filePath); } finally { removeFile(tempPath); }
}

function restoreCredentialWrite(host: string, recovery: CredentialWriteRecovery): void {
  restoreFile(legacyFilePath(host), recovery.legacy);
  restoreFile(vaultFilePath(host), recovery.vault);
  for (const name of [recovery.legacyTemp, recovery.vaultTemp]) {
    fs.rmSync(path.join(storeDir(), name), { force: true });
  }
  fs.unlinkSync(recoveryFilePath(host));
}

function isRecoveryTemp(name: unknown, destination: string, pid: number): name is string {
  const prefix = `${path.basename(destination)}.${pid}.`;
  return typeof name === 'string' && name.startsWith(prefix)
    && /^[0-9a-f]{12}\.tmp$/.test(name.slice(prefix.length));
}

/** Recover an interrupted write before interpreting the projection as an old CLI edit. */
function recoverCredentialWrite(host: string): void {
  const filePath = recoveryFilePath(host);
  let raw: string;
  try { raw = fs.readFileSync(filePath, 'utf8'); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      try { if (!fs.lstatSync(filePath, { throwIfNoEntry: false })) return; } catch {}
    }
    throw new CredentialStoreUnreadableError(filePath);
  }
  try {
    const recovery = safeJsonParse(raw) as CredentialWriteRecovery;
    if (recovery?.version !== 1 || !Number.isSafeInteger(recovery.pid) || recovery.pid <= 0
      || !(recovery.legacy === null || typeof recovery.legacy === 'string')
      || !(recovery.vault === null || typeof recovery.vault === 'string')
      || !isRecoveryTemp(recovery.legacyTemp, legacyFilePath(host), recovery.pid)
      || !isRecoveryTemp(recovery.vaultTemp, vaultFilePath(host), recovery.pid)
      || activeWrites.has(filePath)) throw new Error('Invalid or active credential recovery');
    if (recovery.pid !== process.pid) {
      let ownerExited = false;
      try { process.kill(recovery.pid, 0); } catch (error) {
        ownerExited = (error as NodeJS.ErrnoException).code === 'ESRCH';
      }
      if (!ownerExited) throw new Error('Credential writer is still running');
    }
    // Authenticate every backup before restoring either destination. A damaged
    // recovery file or unavailable key must never overwrite a healthy credential.
    if (recovery.legacy !== null) decodeEncryptedFile(legacyFilePath(host), recovery.legacy);
    if (recovery.vault !== null) decodeEncryptedFile(vaultFilePath(host), recovery.vault);
    restoreCredentialWrite(host, recovery);
  } catch {
    // Keep the encrypted recovery file and refuse partial state until recovery can finish.
    throw new CredentialStoreUnreadableError(filePath);
  }
}

/** Commit a vault/projection pair, rolling back exact bytes on any failed replacement. */
function writeVaultAndProjection(host: string, vault: CredentialVault): void {
  const active = vault.credentials.find((entry) => entry.id === vault.activeCredentialId)!;
  vault.legacyProjection = { credentialId: active.id, tokenFingerprint: tokenFingerprint(active.cliToken) };
  const legacyPath = legacyFilePath(host);
  const vaultPath = vaultFilePath(host);
  const recoveryPath = recoveryFilePath(host);
  const staged: string[] = [];
  try {
    const legacy = prepareEncrypted(legacyPath, legacyProjectionPayload(active.cliToken), vaultPath);
    staged.push(legacy.tempPath);
    const nextVault = prepareEncrypted(vaultPath, vault, legacyPath);
    staged.push(nextVault.tempPath);
    const recovery: CredentialWriteRecovery = {
      version: 1, pid: process.pid, legacy: legacy.previous, vault: nextVault.previous,
      legacyTemp: path.basename(legacy.tempPath), vaultTemp: path.basename(nextVault.tempPath),
    };
    // Exclusive creation prevents overlapping pair commits by new CLIs. Do not clear
    // another writer's recovery file when creation fails.
    const fd = fs.openSync(recoveryPath, 'wx', 0o600);
    try {
      try {
        fs.writeFileSync(fd, JSON.stringify(recovery), 'utf8');
        fs.fsyncSync(fd);
      } finally { fs.closeSync(fd); }
    } catch (error) {
      removeFile(recoveryPath);
      throw error;
    }
    activeWrites.add(recoveryPath);
    try {
      replaceFile(legacy.tempPath, legacyPath);
      replaceFile(nextVault.tempPath, vaultPath);
      fs.unlinkSync(recoveryPath);
    } catch (error) {
      try { restoreCredentialWrite(host, recovery); } catch {
        throw new CredentialStoreUnreadableError(recoveryPath);
      }
      throw error;
    } finally {
      activeWrites.delete(recoveryPath);
    }
  } finally {
    for (const tempPath of staged) removeFile(tempPath);
  }
}

function readVaultRaw(host: string): CredentialVault | null {
  const normalizedHost = normalizeUrl(host);
  recoverCredentialWrite(normalizedHost);
  const filePath = vaultFilePath(normalizedHost);
  const vault = readEncrypted<CredentialVault>(filePath);
  if (!vault) return null;
  if (vault.version !== 1 || !Array.isArray(vault.credentials) || vault.credentials.length === 0
    || !vault.credentials.every((entry) => typeof entry?.id === 'string' && entry.id
      && typeof entry.cliToken === 'string' && entry.cliToken.trim())
    || !vault.credentials.some((entry) => entry.id === vault.activeCredentialId)
    || (vault.legacyProjection !== undefined && (!vault.legacyProjection
      || typeof vault.legacyProjection.credentialId !== 'string'
      || typeof vault.legacyProjection.tokenFingerprint !== 'string'))) {
    throw new CredentialStoreUnreadableError(filePath);
  }
  return { ...vault, host: normalizedHost };
}

function writeVault(host: string, vault: CredentialVault): void {
  atomicWriteEncrypted(vaultFilePath(host), vault, legacyFilePath(host));
}

function removeFile(filePath: string): void {
  try { fs.rmSync(filePath, { force: true }); } catch {}
}

/** Legacy API retained for old-format migration tests and downgrade interoperability. */
export function save(host: string, payload: TokenPayload): void {
  assertCredentialsReadable(host);
  atomicWriteEncrypted(legacyFilePath(host), payload, vaultFilePath(host));
}

/** Read the historical single-account file. */
export function load(host: string): TokenPayload | null {
  recoverCredentialWrite(host);
  const filePath = legacyFilePath(host);
  const payload = readEncrypted<TokenPayload>(filePath);
  if (payload && (typeof payload.accessToken !== 'string' || typeof payload.refreshToken !== 'string'
    || typeof payload.accessExpiresAt !== 'string'
    || (payload.cliToken !== undefined && typeof payload.cliToken !== 'string'))) {
    throw new CredentialStoreUnreadableError(filePath);
  }
  return payload;
}

/** Recover interrupted writes and verify readability before starting authorization. */
export function assertCredentialsReadable(host: string): void {
  readVaultRaw(host);
  load(host);
}

/** Delete only the historical projection. Prefer clearAllCredentials for new auth flows. */
export function clear(host: string): void {
  recoverCredentialWrite(host);
  removeFile(legacyFilePath(host));
}

/**
 * Merge changes made by an older auto-downgraded CLI into the V1 vault.
 * A changed legacy token is imported; deletion means the projected account was logged out.
 */
export function loadCredentialVault(host: string): CredentialVault | null {
  const normalizedHost = normalizeUrl(host);
  let vault = readVaultRaw(normalizedHost);
  const legacy = load(normalizedHost);
  const legacyToken = legacy?.cliToken?.trim();

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

  // Only an absent file represents logout by an old CLI. An access-token-only file
  // can also be written by old versions and must not delete the projected account.
  if (vault.legacyProjection && !legacy) {
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

  writeVaultAndProjection(normalizedHost, vault);
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
      + `Upgrade the server before adding another account for ${normalizedHost}.`,
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

  writeVaultAndProjection(normalizedHost, {
    version: 1,
    host: normalizedHost,
    activeCredentialId: saved.id,
    credentials,
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
  writeVaultAndProjection(normalizedHost, vault);
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
  writeVaultAndProjection(normalizedHost, vault);
  return { removed, active };
}

export function clearAllCredentials(host: string): void {
  const normalizedHost = normalizeUrl(host);
  recoverCredentialWrite(normalizedHost);
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

/** Existing credentials are inaccessible or damaged, not an expired server session. */
export class CredentialStoreUnreadableError extends Error {
  readonly code = 'CREDENTIAL_STORE_UNREADABLE';
  readonly hint = 'Keep the existing credential files. Retry in the original OS user and runtime '
    + 'with access to the machine identifier and credential directory. Do not log in again, '
    + 'replace tokens, or log out to fix a local credential read failure.';

  constructor(filePath: string) {
    super(`Cannot read or decrypt the existing credential file: ${filePath}`);
    this.name = 'CredentialStoreUnreadableError';
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
