import spawn from 'cross-spawn';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeUrl } from './url-utils.js';

export const INSTALL_TIMEOUT_MS = 120_000;
// Supports Node 20 and skips copying a Skill onto its own source directory.
export const SKILLS_TOOL = 'skills@1.5.12';

export interface ProcessResult {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
  signal?: NodeJS.Signals | null;
}
export type ProcessRunner = (command: string, args: string[], timeoutMs: number) => ProcessResult;

export const defaultInstallRunner: ProcessRunner = (command, args, timeoutMs) => {
  const result = spawn.sync(command, args, {
    encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'], timeout: timeoutMs, windowsHide: true,
    env: { ...process.env, DISABLE_TELEMETRY: '1', NO_COLOR: '1',
      // Select installed clients, not only the AI that launched AE CLI.
      ...(args[1] === SKILLS_TOOL && args[2] === 'add' ? { AI_AGENT: 'ae-cli' } : {}),
    },
  });
  return { ...result, stdout: result.stdout || '', stderr: result.stderr || '' };
};

export function resolveNodeTool(
  tool: 'npm' | 'npx', execPath = process.execPath, platform = process.platform,
): string {
  const filename = platform === 'win32' ? `${tool}.cmd` : tool;
  const sibling = path.join(path.dirname(execPath), filename);
  return fs.existsSync(sibling) ? sibling : filename;
}

export function commandSucceeded(result: ProcessResult): boolean {
  return !result.error && !result.signal && result.status === 0;
}

export function exactVersion(raw: string): string {
  const version = raw.trim().replace(/^v/i, '');
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(version)) {
    throw new Error('Expected an exact version such as 6.0.49 or 6.1.9.');
  }
  return version;
}

export function installHost(raw?: string): string | null {
  if (!raw) return null;
  const normalized = normalizeUrl(raw.trim());
  try {
    if (raw.includes('://') && !/^https?:\/\//.test(raw.trim())) throw new Error();
    const url = new URL(normalized);
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password
      || url.search || url.hash || /[\s'"`$\\<>]/.test(normalized)) throw new Error();
    return normalized;
  } catch {
    throw new Error('Host must be an HTTP(S) URL without credentials, query parameters, or fragments.');
  }
}

export type InstallFailureCause = 'network' | 'permission' | 'timeout' | 'package_missing' | 'validation' | 'unknown';

// Never return subprocess text: npm, git, and auth errors can contain credentials.
export function classifyInstallFailure(result: ProcessResult): InstallFailureCause {
  const text = `${result.error?.message || ''}\n${result.stderr}\n${result.stdout}`;
  if ((result.error as NodeJS.ErrnoException)?.code === 'ETIMEDOUT' || /timed?\s*out|ETIMEDOUT/i.test(text)) return 'timeout';
  if (/EACCES|EPERM|permission denied|access is denied/i.test(text)) return 'permission';
  if (/EAI_AGAIN|ENOTFOUND|ECONNRESET|ECONNREFUSED|network|unable to access|could not resolve|certificate|SSL/i.test(text)) return 'network';
  if (/E404|404 Not Found|no matching version|couldn't find remote ref/i.test(text)) return 'package_missing';
  return 'unknown';
}
