import {
  buildCapabilityGatewayUrl,
  callCapabilityApi,
  type CapabilityApiMethod,
  type CapabilityApiRequestOptions,
} from '../../core/capability-api.js';
import type { RuntimeContext } from '../../framework/types.js';

const MEMORY_GATEWAY_DOMAIN = 'memory';
const DEFAULT_TE_CLAUDE_BASE_PATH = '/agent';

export const MEMORY_BASE_PATH = 'memories';
export const MEMORY_DEFAULTS_PATH = `${MEMORY_BASE_PATH}/defaults`;

type MemoryCliRequestOptions = Pick<CapabilityApiRequestOptions, 'retryOnUnauthorized'>;

function normalizeBasePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') return '';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

export function resolveMemoryApiBaseUrl(host: string): string {
  const base = host.replace(/\/+$/, '');
  const basePath = normalizeBasePath(
    process.env.TE_CLAUDE_BASE_PATH ?? process.env.AE_API_PREFIX ?? DEFAULT_TE_CLAUDE_BASE_PATH,
  );
  return basePath && !base.endsWith(basePath) ? `${base}${basePath}` : base;
}

export function buildMemoryCliUrl(ctx: RuntimeContext, path: string): string {
  return buildCapabilityGatewayUrl(resolveMemoryApiBaseUrl(ctx.host()), MEMORY_GATEWAY_DOMAIN, path);
}

export function requestMemoryCli<T>(
  ctx: RuntimeContext,
  method: CapabilityApiMethod,
  path: string,
  body?: unknown,
  options: MemoryCliRequestOptions = {},
): Promise<T> {
  return callCapabilityApi(
    ctx.host(),
    MEMORY_GATEWAY_DOMAIN,
    path,
    method,
    body as Record<string, unknown> | undefined,
    { apiBaseUrl: resolveMemoryApiBaseUrl(ctx.host()), ...options },
  ) as Promise<T>;
}

export function getMemoryCli<T>(ctx: RuntimeContext, path: string): Promise<T> {
  return requestMemoryCli<T>(ctx, 'GET', path);
}

export function postMemoryCli<T>(
  ctx: RuntimeContext,
  path: string,
  body: unknown,
  options: MemoryCliRequestOptions = {},
): Promise<T> {
  return requestMemoryCli<T>(ctx, 'POST', path, body, options);
}

export function patchMemoryCli<T>(
  ctx: RuntimeContext,
  path: string,
  body: unknown,
): Promise<T> {
  return requestMemoryCli<T>(ctx, 'PATCH', path, body);
}

export function putMemoryCli<T>(
  ctx: RuntimeContext,
  path: string,
  body: unknown,
): Promise<T> {
  return requestMemoryCli<T>(ctx, 'PUT', path, body);
}

export function deleteMemoryCli<T>(ctx: RuntimeContext, path: string): Promise<T> {
  return requestMemoryCli<T>(ctx, 'DELETE', path);
}
