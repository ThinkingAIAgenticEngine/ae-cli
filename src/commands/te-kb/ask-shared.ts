/**
 * Shared constants, types, and submit/poll helpers for `+ask` / `+ask-status`.
 * Completed CLI output keeps the previous synchronous field set so consumers
 * do not need to change parsers; `executionId` is additive.
 */

import { PermissionError } from '../../core/errors.js';

export const ASK_API_PATH = '/agent/api/external/knowledge-bases/ask';

/** CLI poll interval: spec 5s fixed, no backoff. */
export const ASK_POLL_INTERVAL_MS = 5000;
/** CLI safety net; server hard-timeout is 5 minutes. */
export const ASK_POLL_TIMEOUT_MS = 10 * 60 * 1000;
export const ASK_MAX_TRANSIENT_POLL_FAILURES = 3;

export type AskExecutionStatus = 'running' | 'completed' | 'failed';

export interface AskSourceRef {
  scope: string;
  name: string;
  path: string;
}

/** Pass-through of the server `Record<modelId, ModelUsage>` object. */
export type AskModelUsage = Record<string, unknown>;

export interface AskExecutionError {
  type: string;
  message: string;
}

export interface AskExecutionResponse {
  executionId: string;
  status: AskExecutionStatus;
  elapsedMs?: number;
  answer?: string;
  sources?: AskSourceRef[];
  modelUsage?: AskModelUsage;
  toolCallCount?: number;
  maxTurns?: number;
  modelId?: string;
  error?: AskExecutionError;
}

export interface PollUntilSettledOptions {
  intervalMs?: number;
  timeoutMs?: number;
  maxTransientFailures?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export function isTransientAskPollError(error: unknown): boolean {
  if (error instanceof PermissionError) return false;
  if (error instanceof TypeError) return true;
  if (!(error instanceof Error)) return false;
  if (/KB MCP token auth failed|unauthorized|Invalid access token/i.test(error.message)) {
    return false;
  }
  return /fetch|network|socket|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|timeout/i.test(
    error.message,
  );
}

/**
 * Poll GET /ask until the execution leaves `running`.
 * Transient transport errors retry up to `maxTransientFailures`; 401/403/404 fail immediately.
 */
export async function pollUntilSettled(
  getStatus: (executionId: string) => Promise<AskExecutionResponse>,
  executionId: string,
  options: PollUntilSettledOptions = {},
): Promise<AskExecutionResponse> {
  const intervalMs = options.intervalMs ?? ASK_POLL_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? ASK_POLL_TIMEOUT_MS;
  const maxTransientFailures = options.maxTransientFailures ?? ASK_MAX_TRANSIENT_POLL_FAILURES;
  const now = options.now ?? Date.now;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const startTime = now();
  let transientFailures = 0;

  while (true) {
    const elapsed = now() - startTime;
    if (elapsed > timeoutMs) {
      throw new Error(
        `Ask execution timeout after ${Math.floor(elapsed / 1000)} seconds (executionId: ${executionId})`,
      );
    }

    let response: AskExecutionResponse;
    try {
      response = await getStatus(executionId);
      transientFailures = 0;
    } catch (err) {
      if (!isTransientAskPollError(err) || ++transientFailures >= maxTransientFailures) {
        throw err;
      }
      await sleep(intervalMs);
      continue;
    }

    if (response.status !== 'running') {
      return response;
    }

    await sleep(intervalMs);
  }
}

/**
 * Map a completed poll payload to the previous synchronous `+ask` JSON.
 * Drops `status` / `elapsedMs` / `error`. Keeps `executionId` as an additive field.
 */
export function transformCompletedResponse(response: AskExecutionResponse): Record<string, unknown> {
  const result: Record<string, unknown> = {
    executionId: response.executionId,
    answer: response.answer ?? '',
    sources: response.sources ?? [],
  };
  if (response.modelId !== undefined) result.modelId = response.modelId;
  if (response.modelUsage !== undefined) result.modelUsage = response.modelUsage;
  if (response.toolCallCount !== undefined) result.toolCallCount = response.toolCallCount;
  if (response.maxTurns !== undefined) result.maxTurns = response.maxTurns;
  return result;
}

/**
 * Prefix the server error.type so the runner's generic Error path still prints a grep-able code.
 * Non-zero exit is guaranteed by the framework.
 */
export function buildFailedMessage(response: AskExecutionResponse): string {
  const type = response.error?.type || 'unknown';
  const message = response.error?.message || 'Ask execution failed';
  return `[${type}] ${message} (executionId: ${response.executionId})`;
}
