import {
  buildCapabilityGatewayUrl,
  callCapabilityApi,
  type CapabilityApiMethod,
  type CapabilityApiRequestOptions,
} from '../../core/capability-api.js';
import type { RuntimeContext } from '../../framework/types.js';
import { resolveTeClaudeBaseUrl } from '../../core/te-claude-base-url.js';

const APPROVAL_GATEWAY_DOMAIN = 'approval';

type ApprovalCliRequestOptions = Pick<CapabilityApiRequestOptions, 'retryOnUnauthorized'>;

export const resolveApprovalApiBaseUrl = resolveTeClaudeBaseUrl;

export function buildApprovalCliUrl(ctx: RuntimeContext, path: string): string {
  return buildCapabilityGatewayUrl(resolveApprovalApiBaseUrl(ctx.host()), APPROVAL_GATEWAY_DOMAIN, path);
}

export function requestApprovalCli<T>(
  ctx: RuntimeContext,
  method: CapabilityApiMethod,
  path: string,
  body?: unknown,
  options: ApprovalCliRequestOptions = {},
): Promise<T> {
  return callCapabilityApi(
    ctx.host(),
    APPROVAL_GATEWAY_DOMAIN,
    path,
    method,
    body as Record<string, unknown> | undefined,
    {
      apiBaseUrl: resolveApprovalApiBaseUrl(ctx.host()),
      ...options,
      retryOnInvalidTokenForbidden: false,
    },
  ) as Promise<T>;
}

export function getApprovalCli<T>(ctx: RuntimeContext, path: string): Promise<T> {
  return requestApprovalCli<T>(ctx, 'GET', path);
}

export function postApprovalCli<T>(
  ctx: RuntimeContext,
  path: string,
  body: unknown,
  options: ApprovalCliRequestOptions = {},
): Promise<T> {
  return requestApprovalCli<T>(ctx, 'POST', path, body, options);
}
