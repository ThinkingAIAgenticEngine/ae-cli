import { readSandboxCliTokenEntry } from './config.js';
import { readExternalCliToken } from './external-cli-token.js';
import { isAeSandboxRuntime } from './sandbox-runtime.js';

/** Reuse sandbox identity signals, including older runtimes without explicit environment markers. */
export function isSandboxExecutionContext(): boolean {
  return process.env.TE_AGENT_CLI_CONFIG_DIR !== undefined
    || isAeSandboxRuntime()
    || !!readSandboxCliTokenEntry();
}

/** Injected and session identities must not manage the host user's global Skills. */
export function canManageGlobalSkills(): boolean {
  return !readExternalCliToken() && !isSandboxExecutionContext();
}
