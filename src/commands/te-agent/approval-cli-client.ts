import {
  buildCapabilityGatewayUrl,
  callCapabilityApi,
  type CapabilityApiMethod,
  type CapabilityApiRequestOptions,
} from '../../core/capability-api.js';
import type { RuntimeContext } from '../../framework/types.js';

const APPROVAL_GATEWAY_DOMAIN = 'approval';
const DEFAULT_TE_CLAUDE_BASE_PATH = '/agent';

type ApprovalCliRequestOptions = Pick<CapabilityApiRequestOptions, 'retryOnUnauthorized'>;

function normalizeBasePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') return '';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

export function resolveApprovalApiBaseUrl(host: string): string {
  const base = host.replace(/\/+$/, '');
  const basePath = normalizeBasePath(
    process.env.TE_CLAUDE_BASE_PATH ?? process.env.AE_API_PREFIX ?? DEFAULT_TE_CLAUDE_BASE_PATH,
  );
  return basePath && !base.endsWith(basePath) ? `${base}${basePath}` : base;
}

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
