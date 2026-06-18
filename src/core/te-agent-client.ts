/**
 * te-agent 主应用 HTTP 客户端
 *
 * 与 src/core/client.ts（AE 平台 client）独立：鉴权用 X-Sandbox-Id + X-Sandbox-Secret-Key，host 来自
 * ~/.te-agent/credentials.json，不读 ~/.ae-cli/config.json。
 *
 * 支持 ae-cli sync / model 等命令。
 */

import { loadTeAgentCredentials, TeAgentCredentialsError } from './te-agent-credentials.js';

export class TeAgentApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'TeAgentApiError';
  }
}

interface SignedRequest {
  url: string;
  headers: Record<string, string>;
  rawBody: string;
}

// 默认请求超时：常规接口 30s，文件上传放宽到 120s
const DEFAULT_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;

/**
 * 带超时的 fetch 包装：超时后 abort 并抛 TeAgentApiError(code:TIMEOUT)，
 * 避免主应用响应慢或 TCP 半开时 CLI 无限挂起。
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new TeAgentApiError(`请求超时（${timeoutMs}ms）：${url}`, 0, 'TIMEOUT');
    }
    throw new TeAgentApiError(`网络请求失败：${err?.message ?? err}`, 0, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timer);
  }
}

function signRequest(method: 'GET' | 'POST' | 'DELETE' | 'PATCH', path: string, rawBody: string): SignedRequest {
  const cred = loadTeAgentCredentials();
  const { url: baseUrl, sandboxId, sandboxSecretKey } = cred.mainApp;

  const headers: Record<string, string> = {
    'X-Sandbox-Id': sandboxId,
    'X-Sandbox-Secret-Key': sandboxSecretKey,
  };
  if (method === 'POST' || method === 'PATCH') {
    headers['Content-Type'] = 'application/json';
  }

  return {
    url: `${baseUrl.replace(/\/$/, '')}${path}`,
    headers,
    rawBody,
  };
}

async function parseResponse<T>(response: Response, defaultErrorPrefix: string): Promise<T> {
  const text = await response.text();
  let parsed: any = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof parsed === 'object' && parsed && typeof parsed.error === 'string'
        ? parsed.error
        : `${defaultErrorPrefix} ${response.status}`;
    const code =
      typeof parsed === 'object' && parsed && typeof parsed.code === 'string'
        ? parsed.code
        : undefined;
    throw new TeAgentApiError(message, response.status, code, parsed);
  }

  return parsed as T;
}

/**
 * POST 到主应用，自动签名。返回解析后的 JSON。
 *
 * @param path 主应用接口路径，如 /api/sandbox/sync/push
 * @param body 请求体（任意 JSON-serializable 对象）
 */
export async function postToMainApp<T = unknown>(path: string, body: unknown): Promise<T> {
  const rawBody = JSON.stringify(body);
  const signed = signRequest('POST', path, rawBody);

  const response = await fetchWithTimeout(signed.url, {
    method: 'POST',
    headers: signed.headers,
    body: signed.rawBody,
  });

  return parseResponse<T>(response, '主应用返回');
}

/**
 * GET 主应用，自动注入沙箱内部鉴权头。返回解析后的 JSON。
 *
 * @param path 主应用接口路径（含 query string），如 /api/sandbox/models?current=cuid
 */
export async function getFromMainApp<T = unknown>(path: string): Promise<T> {
  const signed = signRequest('GET', path, '');

  const response = await fetchWithTimeout(signed.url, {
    method: 'GET',
    headers: signed.headers,
  });

  return parseResponse<T>(response, '主应用返回');
}

// --- 模型查询接口 ---

export interface SandboxModelSummary {
  id: string;
  name: string;
  scope: 'personal' | 'company' | 'system';
  baseUrl: string;
  modelId: string;
  isCurrent: boolean;
}

export interface SandboxModelSelectionResult {
  workspace: {
    id: string;
    path: string;
  };
  model: {
    id: string;
    name: string;
    modelId: string;
    scope: 'personal' | 'company' | 'system';
  };
}

export type SandboxSyncKind = 'skill' | 'mcp' | 'both';
export type SandboxResourceScope = 'personal' | 'company' | 'system';

export interface SandboxSyncPullCandidate {
  id: string;
  name: string;
  scope: SandboxResourceScope;
  selected: boolean;
  description?: string;
}

export interface SandboxSyncPullCandidates {
  workspace: {
    id: string;
    path: string;
  };
  mtime?: string;
  skills?: SandboxSyncPullCandidate[];
  mcp?: SandboxSyncPullCandidate[];
}

export interface SandboxSyncPullResult {
  workspace: {
    id: string;
    path: string;
  };
  mtime?: string;
  results: Array<{
    kind: 'skill' | 'mcp';
    id: string;
    name: string;
    scope: SandboxResourceScope;
    status: 'synced' | 'failed';
    message?: string;
  }>;
}

/**
 * 拉取沙箱当前用户可见的模型列表。
 *
 * @param currentModelId 当前 settings.json 顶层 model 命中的 Model.id（CUID），用于在响应里标记 isCurrent；可空
 */
export async function getSandboxModels(currentModelId?: string | null): Promise<SandboxModelSummary[]> {
  const qs = currentModelId ? `?current=${encodeURIComponent(currentModelId)}` : '';
  const data = await getFromMainApp<{ models: SandboxModelSummary[] }>(`/api/sandbox/models${qs}`);
  return Array.isArray(data?.models) ? data.models : [];
}

/**
 * 切换当前工作空间模型：主应用更新 Workspace.modelId，并重新生成 / 推送 settings.json。
 */
export async function postSandboxModelSelection(args: {
  workspacePath: string;
  modelId: string;
}): Promise<SandboxModelSelectionResult> {
  return postToMainApp<SandboxModelSelectionResult>('/api/sandbox/models/select', args);
}

export async function getSandboxSyncPullCandidates(args: {
  workspacePath: string;
  kind: SandboxSyncKind;
}): Promise<SandboxSyncPullCandidates> {
  const qs = new URLSearchParams({
    workspacePath: args.workspacePath,
    kind: args.kind,
  });
  return getFromMainApp<SandboxSyncPullCandidates>(
    `/api/sandbox/sync/pull/candidates?${qs.toString()}`,
  );
}

export async function postSandboxSyncPull(args: {
  workspacePath: string;
  kind: SandboxSyncKind;
  skills?: string[];
  mcp?: string[];
  ifUnmodifiedSince?: string;
}): Promise<SandboxSyncPullResult> {
  return postToMainApp<SandboxSyncPullResult>('/api/sandbox/sync/pull', {
    workspacePath: args.workspacePath,
    kind: args.kind,
    skills: args.skills,
    mcp: args.mcp,
    mode: 'merge',
    ifUnmodifiedSince: args.ifUnmodifiedSince,
  });
}

/**
 * DELETE 主应用资源，自动注入沙箱鉴权头。
 */
export async function deleteFromMainApp<T = unknown>(path: string): Promise<T> {
  const signed = signRequest('DELETE', path, '');

  const response = await fetchWithTimeout(signed.url, {
    method: 'DELETE',
    headers: signed.headers,
  });

  return parseResponse<T>(response, '主应用返回');
}

/**
 * PATCH 主应用资源，自动签名。
 */
export async function patchToMainApp<T = unknown>(path: string, body: unknown): Promise<T> {
  const rawBody = JSON.stringify(body);
  const signed = signRequest('PATCH', path, rawBody);

  const response = await fetchWithTimeout(signed.url, {
    method: 'PATCH',
    headers: signed.headers,
    body: signed.rawBody,
  });

  return parseResponse<T>(response, '主应用返回');
}

/**
 * multipart/form-data 上传到主应用，自动注入沙箱鉴权头。
 * 不手动设置 Content-Type，让 fetch 自动添加 boundary。
 */
export async function uploadToMainApp<T = unknown>(path: string, formData: FormData): Promise<T> {
  const cred = loadTeAgentCredentials();
  const baseUrl = cred.mainApp.url.replace(/\/$/, '');
  const url = `${baseUrl}${path}`;

  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'X-Sandbox-Id': cred.mainApp.sandboxId,
        'X-Sandbox-Secret-Key': cred.mainApp.sandboxSecretKey,
      },
      body: formData,
    },
    UPLOAD_TIMEOUT_MS,
  );

  return parseResponse<T>(response, '上传失败');
}

export { TeAgentCredentialsError };
