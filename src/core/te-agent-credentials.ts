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
  const legacy = readLegacyCredentials();
  const credPath = getCredentialsPath();
  const envPath = getPersistentEnvPath();
  const persistent = readPersistentEnv();

  const url =
    process.env.TE_CLAUDE_BASE_URL || persistent?.TE_CLAUDE_BASE_URL || legacy?.url;
  const sandboxId = process.env.SANDBOX_ID || persistent?.SANDBOX_ID || legacy?.sandboxId;
  const sandboxSecretKey =
    process.env.SECRET_KEY ||
    process.env.SANDBOX_SECRET_KEY ||
    persistent?.SECRET_KEY ||
    persistent?.SANDBOX_SECRET_KEY ||
    legacy?.sandboxSecretKey ||
    legacy?.secretKey;

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
 * - `null` — No sandbox credentials at all (TE_CLAUDE_BASE_URL is also missing); caller should use the user Bearer path instead.
 *
 * Note: file read errors (permission issues, corrupted JSON) still throw `TeAgentCredentialsError`,
 * as these require user intervention to fix and should not be silently swallowed.
 */
export function tryLoadTeAgentSandboxCredentials(): {
  url: string;
  sandboxId: string | null;
  sandboxSecretKey: string | null;
} | null {
  const legacy = readLegacyCredentials();
  const persistent = readPersistentEnv();

  const url =
    process.env.TE_CLAUDE_BASE_URL || persistent?.TE_CLAUDE_BASE_URL || legacy?.url;

  if (typeof url !== 'string' || !url) {
    // No URL at all — no sandbox credentials whatsoever
    return null;
  }

  const sandboxId = process.env.SANDBOX_ID || persistent?.SANDBOX_ID || legacy?.sandboxId || null;
  const sandboxSecretKey =
    process.env.SECRET_KEY ||
    process.env.SANDBOX_SECRET_KEY ||
    persistent?.SECRET_KEY ||
    persistent?.SANDBOX_SECRET_KEY ||
    legacy?.sandboxSecretKey ||
    legacy?.secretKey ||
    null;

  return {
    url,
    sandboxId: typeof sandboxId === 'string' ? sandboxId : null,
    sandboxSecretKey: typeof sandboxSecretKey === 'string' ? sandboxSecretKey : null,
  };
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
