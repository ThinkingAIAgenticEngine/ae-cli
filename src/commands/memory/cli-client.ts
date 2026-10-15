import type { RuntimeContext } from '../../framework/types.js';
import { getAgentApi, patchAgentApi, postAgentApi } from '../te-agent/api-client.js';

const DEFAULT_TE_CLAUDE_BASE_PATH = '/agent';
export const MEMORY_CLI_BASE_PATH = '/api/cli/memory/v2';

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
  return `${resolveMemoryApiBaseUrl(ctx.host())}${MEMORY_CLI_BASE_PATH}/${path.replace(/^\/+/, '')}`;
}

function unwrapMemoryResponse<T>(response: unknown): T {
  if (response && typeof response === 'object' && !Array.isArray(response)) {
    const envelope = response as { ok?: boolean; data?: unknown; error?: { message?: string } };
    if (envelope.ok === true) return envelope.data as T;
    if (envelope.ok === false) throw new Error(envelope.error?.message || 'Memory API request failed');
  }
  return response as T;
}

export async function getMemoryCli<T>(ctx: RuntimeContext, path: string): Promise<T> {
  return unwrapMemoryResponse<T>(
    await getAgentApi(ctx, `${MEMORY_CLI_BASE_PATH}/${path.replace(/^\/+/, '')}`),
  );
}

export async function postMemoryCli<T>(ctx: RuntimeContext, path: string, body: unknown): Promise<T> {
  return unwrapMemoryResponse<T>(
    await postAgentApi(ctx, `${MEMORY_CLI_BASE_PATH}/${path.replace(/^\/+/, '')}`, body),
  );
}

export async function patchMemoryCli<T>(ctx: RuntimeContext, path: string, body: unknown): Promise<T> {
  return unwrapMemoryResponse<T>(
    await patchAgentApi(ctx, `${MEMORY_CLI_BASE_PATH}/${path.replace(/^\/+/, '')}`, body),
  );
}
