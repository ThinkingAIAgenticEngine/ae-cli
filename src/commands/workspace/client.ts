import type { RuntimeContext } from '../../framework/types.js';
import { isApiErrorType } from '../../core/errors.js';
import { createTeAgentApiError, TeAgentApiError } from '../../core/te-agent-client.js';
import {
  deleteAgentApi,
  getAgentApi,
  patchAgentApi,
  postAgentApi,
  putAgentApi,
  uploadAgentApi,
} from '../te-agent/api-client.js';

const DEFAULT_TE_CLAUDE_BASE_PATH = '/agent';
export const WORKSPACE_CLI_BASE_PATH = '/api/cli/workspace/v1';

function normalizeBasePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') return '';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

export function resolveWorkspaceApiBaseUrl(host: string): string {
  const base = host.replace(/\/+$/, '');
  const basePath = normalizeBasePath(
    process.env.TE_CLAUDE_BASE_PATH ?? process.env.AE_API_PREFIX ?? DEFAULT_TE_CLAUDE_BASE_PATH,
  );
  return basePath && !base.endsWith(basePath) ? `${base}${basePath}` : base;
}

export function buildWorkspaceCliUrl(ctx: RuntimeContext, path: string): string {
  return `${resolveWorkspaceApiBaseUrl(ctx.host())}${path}`;
}

function unwrapWorkspaceResponse<T>(response: unknown): T {
  if (response && typeof response === 'object' && !Array.isArray(response)) {
    const envelope = response as { ok?: boolean; data?: unknown; error?: { type?: unknown; code?: unknown; message?: unknown } };
    if (envelope.ok === true) return envelope.data as T;
    if (envelope.ok === false) {
      const error = envelope.error;
      if (error && isApiErrorType(error.type) && typeof error.code === 'string' && error.code.trim()
        && typeof error.message === 'string' && error.message.trim()) {
        throw createTeAgentApiError(response, 200, 'Workspace API request failed');
      }
      throw new TeAgentApiError('The Workspace API returned an invalid error response.', 200, 'WORKSPACE_INVALID_RESPONSE');
    }
  }
  return response as T;
}

export async function getWorkspaceApi<T>(ctx: RuntimeContext, path: string): Promise<T> {
  return unwrapWorkspaceResponse<T>(await getAgentApi(ctx, path));
}

export async function postWorkspaceApi<T>(
  ctx: RuntimeContext,
  path: string,
  body: unknown,
): Promise<T> {
  return unwrapWorkspaceResponse<T>(await postAgentApi(ctx, path, body));
}

export async function patchWorkspaceApi<T>(
  ctx: RuntimeContext,
  path: string,
  body: unknown,
): Promise<T> {
  return unwrapWorkspaceResponse<T>(await patchAgentApi(ctx, path, body));
}

export async function putWorkspaceApi<T>(
  ctx: RuntimeContext,
  path: string,
  body: unknown,
): Promise<T> {
  return unwrapWorkspaceResponse<T>(await putAgentApi(ctx, path, body));
}

export async function deleteWorkspaceApi<T>(ctx: RuntimeContext, path: string): Promise<T> {
  return unwrapWorkspaceResponse<T>(await deleteAgentApi(ctx, path));
}

export async function uploadWorkspaceApi<T>(
  ctx: RuntimeContext,
  path: string,
  formData: FormData,
): Promise<T> {
  return unwrapWorkspaceResponse<T>(await uploadAgentApi(ctx, path, formData));
}
