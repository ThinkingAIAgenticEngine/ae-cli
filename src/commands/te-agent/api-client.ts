import {
  deleteFromMainApp,
  getBufferFromMainApp,
  getFromMainApp,
  patchToMainApp,
  postToMainApp,
  putToMainApp,
  uploadToMainApp,
} from '../../core/te-agent-client.js';
import type { RuntimeContext } from '../../framework/types.js';
import { resourcePackageJson, resourcePackageRaw } from '../../core/resource-package-client.js';
import { TeAgentApiError, type TeAgentHttpMethod } from '../../core/te-agent-client.js';

export { TeAgentApiError };

export function getAgentApi<T = unknown>(ctx: RuntimeContext, path: string): Promise<T> {
  return getFromMainApp<T>(path, ctx.host());
}

export function postAgentApi<T = unknown>(
  ctx: RuntimeContext,
  path: string,
  body: unknown,
): Promise<T> {
  return postToMainApp<T>(path, body, ctx.host());
}

export function patchAgentApi<T = unknown>(
  ctx: RuntimeContext,
  path: string,
  body: unknown,
): Promise<T> {
  return patchToMainApp<T>(path, body, ctx.host());
}

export function putAgentApi<T = unknown>(
  ctx: RuntimeContext,
  path: string,
  body: unknown,
): Promise<T> {
  return putToMainApp<T>(path, body, ctx.host());
}

export function deleteAgentApi<T = unknown>(ctx: RuntimeContext, path: string): Promise<T> {
  return deleteFromMainApp<T>(path, ctx.host());
}

export function uploadAgentApi<T = unknown>(
  ctx: RuntimeContext,
  path: string,
  formData: FormData,
): Promise<T> {
  return uploadToMainApp<T>(path, formData, ctx.host());
}

export function getAgentBuffer(
  ctx: RuntimeContext,
  path: string,
): Promise<{ buffer: Buffer; fileName: string | null; contentType: string | null }> {
  return getBufferFromMainApp(path, ctx.host());
}

export function requestResourcePackageApi<T = unknown>(
  ctx: RuntimeContext, method: TeAgentHttpMethod, path: string, body?: unknown,
): Promise<T> {
  return resourcePackageJson<T>({ host: ctx.host(), method, path, body });
}

export function requestResourcePackageRaw(
  ctx: RuntimeContext, method: TeAgentHttpMethod, path: string,
  options: { body?: BodyInit; headers?: HeadersInit; timeoutMs?: number } = {},
): Promise<Response> {
  return resourcePackageRaw({ host: ctx.host(), method, path, ...options });
}

export function isTransientResourcePackageError(error: unknown): boolean {
  return error instanceof TeAgentApiError &&
    (error.status === 0 || error.status === 429 || error.status >= 500);
}

export function resourcePackagePreflightChange(error: unknown): unknown | undefined {
  if (!(error instanceof TeAgentApiError) || error.code !== 'PREFLIGHT_CHANGED') return undefined;
  const body = error.body;
  if (!body || typeof body !== 'object' || !('preflight' in body)) return undefined;
  return body.preflight;
}
