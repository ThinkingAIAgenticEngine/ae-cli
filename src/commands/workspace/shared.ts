import { CliValidationError } from '../../core/errors.js';
import type { RuntimeContext } from '../../framework/types.js';
import {
  buildWorkspaceCliUrl,
  deleteWorkspaceApi,
  getWorkspaceApi,
  patchWorkspaceApi,
  postWorkspaceApi,
  putWorkspaceApi,
} from './client.js';
import {
  previewWorkspaceResourcePath,
  resolveWorkspaceTarget,
  workspaceResourcePath,
  workspaceTargetPath,
} from './target.js';

export const WORKSPACE_SERVICE = 'workspace';

export function optional(ctx: RuntimeContext, name: string): string | undefined {
  const value = ctx.str(name).trim();
  return value || undefined;
}

export function queryPath(
  base: string,
  values: Record<string, string | number | boolean | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function assertOneOf(
  flag: string,
  value: string | undefined,
  allowed: readonly string[],
): void {
  if (value && !allowed.includes(value)) {
    throw new CliValidationError(`--${flag} must be one of: ${allowed.join(', ')}`);
  }
}

export function targetDryRun(
  ctx: RuntimeContext,
  method: string,
  suffix: string,
  body?: unknown,
) {
  return {
    method,
    url: buildWorkspaceCliUrl(ctx, previewWorkspaceResourcePath(ctx, suffix)),
    params: { target_url: buildWorkspaceCliUrl(ctx, workspaceTargetPath(ctx)) },
    ...(body === undefined ? {} : { body }),
  };
}

export async function targetCall<T>(
  ctx: RuntimeContext,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  suffix: string,
  body?: unknown,
): Promise<T> {
  const target = await resolveWorkspaceTarget(ctx);
  const path = workspaceResourcePath(target.agentSpaceId, suffix);
  if (method === 'GET') return getWorkspaceApi<T>(ctx, path);
  if (method === 'POST') return postWorkspaceApi<T>(ctx, path, body ?? {});
  if (method === 'PATCH') return patchWorkspaceApi<T>(ctx, path, body ?? {});
  if (method === 'PUT') return putWorkspaceApi<T>(ctx, path, body ?? {});
  return deleteWorkspaceApi<T>(ctx, path);
}
