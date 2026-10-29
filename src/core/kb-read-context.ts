import fs from 'node:fs';
import { CliValidationError } from './errors.js';

export type KbExecutionContext = {
  formatVersion: 1;
  required: true;
  executionRef: string;
  readContextId: string;
  token: string;
  origin: string;
  expiresAt: string;
};
const secrets = new Set<string>();
function fail(code: string): never {
  throw new CliValidationError(code, { code });
}
export function kbExecutionContextRequired(): boolean {
  return (
    process.env.AE_KB_READ_CONTEXT_REQUIRED !== undefined ||
    process.env.AE_KB_READ_CONTEXT_FILE !== undefined
  );
}
export function isKbQueryPath(method: string, pathname: string): boolean {
  return (
    method === 'POST' &&
    /^\/(?:agent\/)?api\/external\/knowledge-bases\/(list|index|grep|read)$/.test(pathname)
  );
}

/** Only execution-owned, private, regular files are accepted. Never consult common credentials. */
export function readKbExecutionContext(): KbExecutionContext | undefined {
  if (!kbExecutionContextRequired()) return undefined;
  const file = process.env.AE_KB_READ_CONTEXT_FILE;
  if (process.env.AE_KB_READ_CONTEXT_REQUIRED !== '1' || !file) fail('KB_READ_CONTEXT_REQUIRED');
  let fd: number | undefined;
  let data: KbExecutionContext;
  try {
    fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const stat = fs.fstatSync(fd);
    if (
      !stat.isFile() ||
      stat.size > 16_384 ||
      (stat.mode & 0o777) !== 0o600 ||
      (process.getuid && stat.uid !== process.getuid())
    )
      throw new Error();
    data = JSON.parse(fs.readFileSync(fd, 'utf8'));
    if (
      !data ||
      Array.isArray(data) ||
      Object.keys(data).sort().join(',') !==
        'executionRef,expiresAt,formatVersion,origin,readContextId,required,token' ||
      data.formatVersion !== 1 ||
      data.required !== true ||
      typeof data.executionRef !== 'string' ||
      !/^[^\s\0]{1,191}$/.test(data.executionRef) ||
      typeof data.readContextId !== 'string' ||
      !/^[^\s\0]{1,191}$/.test(data.readContextId) ||
      typeof data.token !== 'string' ||
      !/^cli_kbr_[A-Za-z0-9_-]{43,}$/.test(data.token) ||
      typeof data.expiresAt !== 'string' ||
      !Number.isFinite(Date.parse(data.expiresAt))
    )
      throw new Error();
    const origin = new URL(data.origin);
    if (
      !['http:', 'https:'].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.origin !== data.origin
    )
      throw new Error();
  } catch {
    fail('KB_READ_CONTEXT_REQUIRED');
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
  secrets.add(data.token);
  if (Date.parse(data.expiresAt) <= Date.now()) fail('KB_READ_CONTEXT_EXPIRED');
  return data;
}

export function kbReadHeaders(
  url: string,
  explicitId?: string,
): Record<string, string> | undefined {
  const context = readKbExecutionContext();
  if (!context) return explicitId ? { 'X-KB-Read-Context': explicitId } : undefined;
  if (
    new URL(url).origin !== context.origin ||
    (explicitId && explicitId !== context.readContextId)
  )
    fail('KB_READ_CONTEXT_MISMATCH');
  return { 'cli-token': context.token, 'X-KB-Read-Context': context.readContextId };
}

export function redactKbReadCredential(value: string): string {
  for (const token of secrets) value = value.split(token).join('[REDACTED]');
  return value.replace(/cli_kbr_[A-Za-z0-9_-]+/g, '[REDACTED]');
}
