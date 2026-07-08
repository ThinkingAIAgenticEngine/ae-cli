import { homedir } from 'node:os';
import { join } from 'node:path';

/** Linux AE sandbox runtime root; aligned with te-agent-sandbox ConfigService / env-persist. */
export const LINUX_SANDBOX_RUNTIME_ROOT = '/home/ta/te_agent_ta';

/** @deprecated Use getDefaultSandboxRuntimeRoot(); kept as the Linux sandbox path constant. */
export const DEFAULT_SANDBOX_RUNTIME_ROOT = LINUX_SANDBOX_RUNTIME_ROOT;

/**
 * Platform default for the sandbox runtime root (when SANDBOX_RUNTIME_ROOT is unset):
 * - linux: /home/ta/te_agent_ta (AE sandbox container layout)
 * - darwin: user home (~)
 * - win32: %USERPROFILE% (same as homedir())
 */
export function getDefaultSandboxRuntimeRoot(): string {
  if (process.platform === 'linux') {
    return LINUX_SANDBOX_RUNTIME_ROOT;
  }
  return homedir();
}

/**
 * Resolve the sandbox runtime root.
 * Priority: SANDBOX_RUNTIME_ROOT env > platform default from getDefaultSandboxRuntimeRoot().
 */
export function getSandboxRuntimeRoot(): string {
  return process.env.SANDBOX_RUNTIME_ROOT || getDefaultSandboxRuntimeRoot();
}

/** ae-cli sandbox config directory for CLI token, cluster-info, and related files. */
export function getSandboxAeConfigDir(): string {
  return join(getSandboxRuntimeRoot(), '.ae-config');
}

export function getSandboxCliTokenFilePath(): string {
  return join(getSandboxAeConfigDir(), 'cli-token.json');
}

export function getSandboxClusterInfoFilePath(): string {
  return join(getSandboxAeConfigDir(), 'cluster-info.json');
}
