/**
 * 沙箱凭证读取
 *
 * 优先级（高 → 低）：
 *   1. process.env（TE_CLAUDE_BASE_URL / SANDBOX_ID / SECRET_KEY）
 *   2. 持久化 .env（默认 /home/ta/te_agent_ta/.env，由 te-agent-sandbox 写入）
 *   3. ~/.te-agent/credentials.json（老镜像兼容兜底）
 *
 * ae-cli sync/model 命令依赖这些字段；不在沙箱内执行时直接报错引导。
 */

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

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

/** 与 te-agent-sandbox env-persist 保持一致 */
export function getPersistentEnvPath(): string {
  const runtimeRoot = process.env.SANDBOX_RUNTIME_ROOT ?? '/home/ta/te_agent_ta';
  return join(runtimeRoot, '.env');
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
      `${envPath} 读取失败：${err?.message ?? err}`,
      '请检查文件权限，或通过 TE_CLAUDE_BASE_URL / SANDBOX_ID / SECRET_KEY 注入运行时凭证',
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
        `${credPath} 解析失败：${err.message}`,
        '凭证文件可能已损坏；也可以通过 TE_CLAUDE_BASE_URL / SANDBOX_ID / SECRET_KEY 注入运行时凭证',
      );
    }
    throw new TeAgentCredentialsError(
      `${credPath} 读取失败：${err?.message ?? err}`,
      '请检查文件权限，或通过 TE_CLAUDE_BASE_URL / SANDBOX_ID / SECRET_KEY 注入运行时凭证',
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
      'TE_CLAUDE_BASE_URL 缺失',
      `请在 te-agent 沙箱内执行，或配置 ${envPath} / ${credPath}`,
    );
  }
  if (typeof sandboxId !== 'string' || !sandboxId) {
    throw new TeAgentCredentialsError(
      'SANDBOX_ID 缺失',
      `请在 te-agent 沙箱内执行，或配置 ${envPath} / ${credPath}`,
    );
  }
  if (typeof sandboxSecretKey !== 'string' || !sandboxSecretKey) {
    throw new TeAgentCredentialsError(
      'SECRET_KEY 缺失',
      `请在 te-agent 沙箱内执行，或配置 ${envPath} / ${credPath}`,
    );
  }

  return { mainApp: { url, sandboxId, sandboxSecretKey } };
}

/**
 * 解析 ae-cli 写入 settings.json 的目标目录。
 *
 * 优先读取 PTY 注入的 CLAUDE_CONFIG_DIR（每工作空间私有 `<wp>/.claude/`）。
 * 缺失时回退到全局 `~/.claude`，用于沙箱外或非 PTY 场景。
 */
export function getClaudeConfigDir(): string {
  const fromEnv = process.env.CLAUDE_CONFIG_DIR;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) {
    return fromEnv;
  }
  return join(homedir(), '.claude');
}
