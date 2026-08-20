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
