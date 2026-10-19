/**
 * Sandbox credentials loader
 *
 * Priority (high -> low):
 *   1. process.env (TE_CLAUDE_BASE_URL / SANDBOX_ID / SECRET_KEY)
 *   2. Persistent .env under sandbox runtime root (Linux: /home/ta/te_agent_ta/.env; macOS/Windows: ~/.env)
 *   3. ~/.te-agent/credentials.json (legacy image compatibility fallback)
 *
 * ae-cli sync/model commands depend on these fields; errors with guidance when not executed inside a sandbox.
 */

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { getSandboxRuntimeRoot } from './sandbox-runtime.js';

export interface TeAgentCredentials {
  mainApp: {
    url: string;
    sandboxId: string;
    sandboxSecretKey: string;
  };
}

function getCredentialsPath(): string {
  return join(process.env.HOME || homedir(), '.te-agent', 'credentials.json');
}

/** Consistent with te-agent-sandbox env-persist */
export function getPersistentEnvPath(): string {
  return join(getSandboxRuntimeRoot(), '.env');
}

function parseDotEnv(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    if (/^\s*#/.test(line) || line.trim() === '') continue;
    const match = /^\s*([^=]+)=(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/\\"/g, '"');
    }
    if (value !== '') result[key] = value;
  }
  return result;
}

function readPersistentEnv(): Record<string, string> | null {
  const envPath = getPersistentEnvPath();
  try {
    const raw = readFileSync(envPath, 'utf8');
    return parseDotEnv(raw);
  } catch (err: any) {
    if (err?.code === 'ENOENT') return null;
    throw new TeAgentCredentialsError(
      `Failed to read ${envPath}: ${err?.message ?? err}`,
      'Check file permissions, or inject runtime credentials via TE_CLAUDE_BASE_URL / SANDBOX_ID / SECRET_KEY',
    );
  }
}

export class TeAgentCredentialsError extends Error {
  constructor(message: string, public readonly hint?: string) {
    super(message);
    this.name = 'TeAgentCredentialsError';
  }
}

function readLegacyCredentials(): Record<string, any> | null {
  const credPath = getCredentialsPath();
  try {
    const raw = readFileSync(credPath, 'utf8');
    const parsed = JSON.parse(raw);
    const main = parsed?.mainApp;
    return main && typeof main === 'object' ? main : null;
  } catch (err: any) {
    if (err?.code === 'ENOENT') return null;
    if (err instanceof SyntaxError) {
      throw new TeAgentCredentialsError(
        `Failed to parse ${credPath}: ${err.message}`,
        'The credentials file may be corrupted; alternatively inject runtime credentials via TE_CLAUDE_BASE_URL / SANDBOX_ID / SECRET_KEY',
      );
    }
    throw new TeAgentCredentialsError(
      `Failed to read ${credPath}: ${err?.message ?? err}`,
      'Check file permissions, or inject runtime credentials via TE_CLAUDE_BASE_URL / SANDBOX_ID / SECRET_KEY',
    );
  }
}

export function loadTeAgentCredentials(): TeAgentCredentials {
  const credPath = getCredentialsPath();
  const envPath = getPersistentEnvPath();
  const { url, sandboxId, sandboxSecretKey } = readSandboxCredentials();

  if (typeof url !== 'string' || !url) {
    throw new TeAgentCredentialsError(
      'TE_CLAUDE_BASE_URL is missing',
      `Run inside a te-agent sandbox, or configure ${envPath} / ${credPath}`,
    );
  }
  if (typeof sandboxId !== 'string' || !sandboxId) {
    throw new TeAgentCredentialsError(
      'SANDBOX_ID is missing',
      `Run inside a te-agent sandbox, or configure ${envPath} / ${credPath}`,
    );
  }
  if (typeof sandboxSecretKey !== 'string' || !sandboxSecretKey) {
    throw new TeAgentCredentialsError(
      'SECRET_KEY is missing',
      `Run inside a te-agent sandbox, or configure ${envPath} / ${credPath}`,
    );
  }

  return { mainApp: { url, sandboxId, sandboxSecretKey } };
}

/**
 * Attempts to load sandbox credentials without requiring them to be present.
 *
 * Return value meanings:
 * - `{ url, sandboxId, sandboxSecretKey }` — Sandbox credentials are complete; the X-Sandbox path can be used.
 * - `{ url, sandboxId: null, sandboxSecretKey: null }` — Only URL is present (rare; for reference only).
 * - `null` — No sandbox credentials at all (TE_CLAUDE_BASE_URL is also missing); caller should use the user CLI-token path instead.
 *
 * Note: file read errors (permission issues, corrupted JSON) still throw `TeAgentCredentialsError`,
 * as these require user intervention to fix and should not be silently swallowed.
 */
export function tryLoadTeAgentSandboxCredentials(): {
  url: string;
  sandboxId: string | null;
  sandboxSecretKey: string | null;
} | null {
  const credentials = readSandboxCredentials();
  return credentials.url ? { ...credentials, url: credentials.url } : null;
}

/** Read lower-priority files only when runtime credentials are incomplete. */
function readSandboxCredentials(): {
  url: string | null;
  sandboxId: string | null;
  sandboxSecretKey: string | null;
} {
  let url = process.env.TE_CLAUDE_BASE_URL || null;
  let sandboxId = process.env.SANDBOX_ID || null;
  let sandboxSecretKey = process.env.SECRET_KEY || process.env.SANDBOX_SECRET_KEY || null;
  if (!url || !sandboxId || !sandboxSecretKey) {
    const persistent = readPersistentEnv();
    url ||= persistent?.TE_CLAUDE_BASE_URL || null;
    sandboxId ||= persistent?.SANDBOX_ID || null;
    sandboxSecretKey ||= persistent?.SECRET_KEY || persistent?.SANDBOX_SECRET_KEY || null;
  }
  if (!url || !sandboxId || !sandboxSecretKey) {
    const legacy = readLegacyCredentials();
    url ||= typeof legacy?.url === 'string' ? legacy.url : null;
    sandboxId ||= typeof legacy?.sandboxId === 'string' ? legacy.sandboxId : null;
    const legacySecret = legacy?.sandboxSecretKey || legacy?.secretKey;
    sandboxSecretKey ||= typeof legacySecret === 'string' ? legacySecret : null;
  }
  return { url, sandboxId, sandboxSecretKey };
}

/**
 * Resolves the target directory where ae-cli writes settings.json.
 *
 * Prefers CLAUDE_CONFIG_DIR injected by the PTY (per-workspace private `<wp>/.claude/`).
 * Falls back to global `~/.claude` when absent, for out-of-sandbox or non-PTY scenarios.
 */
export function getClaudeConfigDir(): string {
  const fromEnv = process.env.CLAUDE_CONFIG_DIR;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) {
    return fromEnv;
  }
  return join(homedir(), '.claude');
}
