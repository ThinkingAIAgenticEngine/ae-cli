import type { Command, DryRunResult, Flag, RuntimeContext } from '../../framework/types.js';
import { EvalApiError, evalRequest, evalDownloadFile } from '../../core/eval-client.js';
import { CliValidationError } from '../../core/errors.js';
import { getCliToken } from '../../core/cli-token.js';
import { isAeSandboxRuntime } from '../../core/sandbox-runtime.js';
import { requestSandboxEvaluationSession } from '../../core/eval-session.js';
import { resolveEvaluationHost } from '../../core/eval-endpoint.js';

export const EVAL_API_PREFIX = '/agenteval/api/v1';

/** Keep the legacy endpoint flag parseable without allowing independent credential routing. */
export function evalFlags(): Flag[] {
  return [
    {
      name: 'endpoint',
      type: 'string',
      sensitive: true,
      desc: `Deprecated: must match the current AE Host. Independent endpoint overrides are unsupported; use --host to select the AE Host instead.`,
    },
  ];
}

export function resolveEvalBaseUrl(
  ctx: RuntimeContext,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const baseUrl = resolveEvaluationHost(ctx.host());
  for (const configured of [ctx.str('endpoint').trim(), environment.AE_EVAL_BASE_URL?.trim()]) {
    if (!configured) continue;
    const legacyBaseUrl = configured.replace(/\/+$/, '').replace(/(\/agenteval\/api\/v1|\/agenteval)$/, '');
    if (resolveEvaluationHost(legacyBaseUrl) !== baseUrl) {
      throw new CliValidationError('Independent evaluation endpoint overrides are unsupported.', {
        code: 'EVAL_ENDPOINT_OVERRIDE_UNSUPPORTED',
        hint: 'Remove --endpoint and AE_EVAL_BASE_URL; select the evaluation AE Host with --host instead.',
      });
    }
  }
  return baseUrl;
}

/** Keep untrusted identifiers inside one URL path segment; preserve existing opaque IDs. */
export function evalPathId(ctx: RuntimeContext, name = 'id'): string {
  const value = ctx.str(name);
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new CliValidationError(`--${name} must be a resource ID containing only letters, digits, hyphens, or underscores.`, {
      code: 'EVAL_RESOURCE_ID_INVALID',
    });
  }
  return encodeURIComponent(value);
}

export function evalHeaders(environment: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const accessToken = environment.AE_EVAL_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    throw new EvalApiError('AE_EVAL_ACCESS_TOKEN is not set.', {
      code: 'EVAL_ACCESS_TOKEN_MISSING',
      httpStatus: 0,
      hint: 'Export AE_EVAL_ACCESS_TOKEN with an Agent Evaluation platform session token (POST /agenteval/api/v1/auth/session on the platform web console).',
    });
  }
  return { Authorization: `Bearer ${accessToken}` };
}

async function resolveEvalHeaders(
  ctx: RuntimeContext,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<Record<string, string>> {
  if (environment.AE_EVAL_ACCESS_TOKEN?.trim()) return evalHeaders(environment);
  if (!isAeSandboxRuntime()) return evalHeaders(environment);
  const cliToken = await getCliToken(ctx.host());
  const sessionToken = await requestSandboxEvaluationSession(
    ctx.host(),
    cliToken,
    environment.AE_EVAL_TE_PROJECT_ID?.trim(),
  );
  return { Authorization: `Bearer ${sessionToken}` };
}

export interface EvalCallOptions {
  idempotencyKey?: string;
}

export async function evalDownload(ctx: RuntimeContext, path: string, output: string) {
  return evalDownloadFile({
    baseUrl: resolveEvalBaseUrl(ctx),
    headers: await resolveEvalHeaders(ctx),
    method: 'GET',
    path: `${EVAL_API_PREFIX}${path}`,
  }, output);
}

export async function evalApi(
  ctx: RuntimeContext,
  method: string,
  path: string,
  params?: Record<string, unknown>,
  body?: unknown,
  options: EvalCallOptions = {},
): Promise<any> {
  return evalRequest({
    baseUrl: resolveEvalBaseUrl(ctx),
    headers: await resolveEvalHeaders(ctx),
    method,
    path: `${EVAL_API_PREFIX}${path}`,
    params,
    body,
    idempotencyKey: options.idempotencyKey,
  });
}

export function evalDryRun(
  ctx: RuntimeContext,
  method: string,
  path: string,
  params?: Record<string, unknown>,
  body?: unknown,
  options: EvalCallOptions = {},
): DryRunResult {
  return {
    method,
    url: `${resolveEvalBaseUrl(ctx)}${EVAL_API_PREFIX}${path}`,
    params,
    body,
    ...(options.idempotencyKey ? { headers: { 'Idempotency-Key': options.idempotencyKey } } : {}),
  };
}

/** Common helper for commands that read a required resource id from --id. */
export function idFlag(desc = 'Resource UUID'): Flag {
  return { name: 'id', type: 'string', required: true, desc };
}

/** Common helper for mutating commands guarded by optimistic locking. */
export function lockVersionFlag(resource: string): Flag {
  return {
    name: 'lock-version',
    type: 'number',
    required: true,
    min: 0,
    desc: `Current ${resource} lock_version (optimistic lock); each successful mutation increments it`,
  };
}

/** Common helper for --id + --lock-version mutations on a single resource. */
export function idAndLockFlags(idDesc: string, resource: string): Flag[] {
  return [idFlag(idDesc), lockVersionFlag(resource)];
}
