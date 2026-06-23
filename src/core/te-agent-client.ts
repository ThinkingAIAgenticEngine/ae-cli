/**
 * te-agent main app HTTP client
 *
 * Auth header selection logic (priority high -> low):
 *   1. Sandbox credentials complete (url + sandboxId + sandboxSecretKey) -> X-Sandbox-Id / X-Sandbox-Secret-Key
 *   2. Sandbox credentials missing but user access token present (TE_TOKEN / tokens.json / secure-store)
 *      -> Authorization: bearer <accessToken>; URL from sandbox url (if TE_CLAUDE_BASE_URL is configured)
 *        or falls back to ae-cli activeHost (written by `ae-cli config set-host`)
 *   3. Neither available -> throws TeAgentCredentialsError (with hint)
 *
 * Independent of src/core/client.ts (AE platform client). Supports ae-cli sync / model / agent commands.
 */

import { tryLoadTeAgentSandboxCredentials, loadTeAgentCredentials, TeAgentCredentialsError } from './te-agent-credentials.js';
import { getActiveHost } from './config.js';

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

// Default request timeouts: 30s for regular endpoints, relaxed to 120s for file uploads
const DEFAULT_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;

/**
 * Fetch wrapper with timeout: aborts and throws TeAgentApiError(code:TIMEOUT) on timeout,
 * preventing the CLI from hanging indefinitely when the main app is slow or the TCP connection is half-open.
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
      throw new TeAgentApiError(`Request timed out (${timeoutMs}ms): ${url}`, 0, 'TIMEOUT');
    }
    throw new TeAgentApiError(`Network request failed: ${err?.message ?? err}`, 0, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolves the te-claude base URL (used as fallback for the user Bearer path).
 * Priority: TE_CLAUDE_BASE_URL (full override) > activeHost + te-claude base path (default /agent).
 * Consistent with device-code login: bare activeHost points to the root analytics platform SPA; te-claude lives under the /agent basePath.
 */
function teClaudeBaseFromActiveHost(): string | undefined {
  const override = process.env.TE_CLAUDE_BASE_URL;
  if (override) return override.replace(/\/+$/, '');
  const h = getActiveHost();
  if (!h) return undefined;
  const base = h.replace(/\/+$/, '');
  const bp = process.env.TE_CLAUDE_BASE_PATH || '/agent';
  return base.endsWith(bp) ? base : base + bp;
}

/**
 * Builds a signed request (including auth headers + URL).
 *
 * Auth header selection logic:
 *   - Sandbox credentials complete -> X-Sandbox-Id / X-Sandbox-Secret-Key (preserves the in-sandbox path)
 *   - Sandbox credentials missing but user token present -> Authorization: bearer <token> (out-of-sandbox path)
 *   - Neither available -> throws TeAgentCredentialsError (with hint)
 */
async function signRequest(method: 'GET' | 'POST' | 'DELETE' | 'PATCH', path: string, rawBody: string): Promise<SignedRequest> {
  const sandboxCred = tryLoadTeAgentSandboxCredentials();

  // --- Sandbox path: credentials complete ---
  if (sandboxCred && sandboxCred.sandboxId && sandboxCred.sandboxSecretKey) {
    const headers: Record<string, string> = {
      'X-Sandbox-Id': sandboxCred.sandboxId,
      'X-Sandbox-Secret-Key': sandboxCred.sandboxSecretKey,
    };
    if (method === 'POST' || method === 'PATCH') {
      headers['Content-Type'] = 'application/json';
    }
    return {
      url: `${sandboxCred.url.replace(/\/$/, '')}${path}`,
      headers,
      rawBody,
    };
  }

  // --- User Bearer path: sandbox credentials missing but user token present ---
  // Dynamic import to avoid circular dependency (auth.ts -> config.ts already exists; load only when needed)
  const { getToken } = await import('./auth.js');

  // Determine base URL: prefer the sandbox url field (reuse even if sandbox Id/Key are missing but URL is present),
  // otherwise fall back to the ae-cli-configured activeHost (set by the user via `ae-cli config set-host`).
  const baseUrl = sandboxCred?.url || teClaudeBaseFromActiveHost();

  if (!baseUrl) {
    throw new TeAgentCredentialsError(
      'Cannot determine the te-claude service URL',
      'Run ae-cli config set-host <url> to configure the service URL, or execute inside a te-agent sandbox',
    );
  }

  // Note: the API URL uses baseUrl (including /agent), but the token is retrieved under the bare activeHost —
  // tokens are stored under the bare host at login time, and the refresh endpoint is at root /v1 (not under /agent).
  const accessToken = await getToken(getActiveHost() || baseUrl);
  const headers: Record<string, string> = {
    'Authorization': `bearer ${accessToken}`,
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
    if (response.status === 401) {
      // F-010: session expired. The access token slides server-side on use, so a dead one is only
      // discovered here via a 401 (lazy). Surface a clean re-login hint instead of a raw status.
      // F-016: 403 is NOT handled here — it means authenticated-but-forbidden (e.g. deleting a
      // company/system resource). Let it fall through to surface the server's permission message.
      throw new TeAgentApiError(
        `Session expired or unauthorized. Please run: ae-cli auth login`,
        response.status,
        'auth_expired',
        parsed,
      );
    }
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
 * POST to the main app with automatic signing. Returns parsed JSON.
 *
 * @param path Main app endpoint path, e.g. /api/sandbox/sync/push
 * @param body Request body (any JSON-serializable object)
 */
export async function postToMainApp<T = unknown>(path: string, body: unknown): Promise<T> {
  const rawBody = JSON.stringify(body);
  const signed = await signRequest('POST', path, rawBody);

  const response = await fetchWithTimeout(signed.url, {
    method: 'POST',
    headers: signed.headers,
    body: signed.rawBody,
  });

  return parseResponse<T>(response, 'Main app returned');
}

/**
 * GET from the main app with automatic sandbox auth header injection. Returns parsed JSON.
 *
 * @param path Main app endpoint path (including query string), e.g. /api/sandbox/models?current=cuid
 */
export async function getFromMainApp<T = unknown>(path: string): Promise<T> {
  const signed = await signRequest('GET', path, '');

  const response = await fetchWithTimeout(signed.url, {
    method: 'GET',
    headers: signed.headers,
  });

  return parseResponse<T>(response, 'Main app returned');
}

// --- Model query endpoints ---

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
 * Fetches the list of models visible to the current sandbox user.
 *
 * @param currentModelId The Model.id (CUID) matched by the top-level model in settings.json, used to mark isCurrent in the response; may be null
 */
export async function getSandboxModels(currentModelId?: string | null): Promise<SandboxModelSummary[]> {
  const qs = currentModelId ? `?current=${encodeURIComponent(currentModelId)}` : '';
  const data = await getFromMainApp<{ models: SandboxModelSummary[] }>(`/api/sandbox/models${qs}`);
  return Array.isArray(data?.models) ? data.models : [];
}

/**
 * Switches the current workspace model: the main app updates Workspace.modelId and regenerates / pushes settings.json.
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
}): Promise<SandboxSyncPullResult> {
  return postToMainApp<SandboxSyncPullResult>('/api/sandbox/sync/pull', {
    workspacePath: args.workspacePath,
    kind: args.kind,
    skills: args.skills,
    mcp: args.mcp,
    mode: 'merge',
  });
}

/**
 * DELETE a main app resource with automatic sandbox auth header injection.
 */
export async function deleteFromMainApp<T = unknown>(path: string): Promise<T> {
  const signed = await signRequest('DELETE', path, '');

  const response = await fetchWithTimeout(signed.url, {
    method: 'DELETE',
    headers: signed.headers,
  });

  return parseResponse<T>(response, 'Main app returned');
}

/**
 * PATCH a main app resource with automatic signing.
 */
export async function patchToMainApp<T = unknown>(path: string, body: unknown): Promise<T> {
  const rawBody = JSON.stringify(body);
  const signed = await signRequest('PATCH', path, rawBody);

  const response = await fetchWithTimeout(signed.url, {
    method: 'PATCH',
    headers: signed.headers,
    body: signed.rawBody,
  });

  return parseResponse<T>(response, 'Main app returned');
}

/**
 * Upload multipart/form-data to the main app with automatic auth header injection (sandbox or user Bearer).
 * Does not manually set Content-Type; lets fetch automatically add the boundary.
 */
export async function uploadToMainApp<T = unknown>(path: string, formData: FormData): Promise<T> {
  // Reuse signRequest decision logic, but do not set Content-Type for uploads (fetch adds boundary automatically)
  const sandboxCred = tryLoadTeAgentSandboxCredentials();

  let baseUrl: string;
  let authHeaders: Record<string, string>;

  if (sandboxCred && sandboxCred.sandboxId && sandboxCred.sandboxSecretKey) {
    // Sandbox path
    baseUrl = sandboxCred.url.replace(/\/$/, '');
    authHeaders = {
      'X-Sandbox-Id': sandboxCred.sandboxId,
      'X-Sandbox-Secret-Key': sandboxCred.sandboxSecretKey,
    };
  } else {
    // User Bearer path
    const { getToken } = await import('./auth.js');
    baseUrl = (sandboxCred?.url || teClaudeBaseFromActiveHost() || '').replace(/\/$/, '');
    if (!baseUrl) {
      throw new TeAgentCredentialsError(
        'Cannot determine the te-claude service URL',
        'Run ae-cli config set-host <url> to configure the service URL, or execute inside a te-agent sandbox',
      );
    }
    // Token is retrieved under the bare activeHost (see signRequest comment)
    const accessToken = await getToken(getActiveHost() || baseUrl);
    authHeaders = { 'Authorization': `bearer ${accessToken}` };
  }

  const response = await fetchWithTimeout(
    `${baseUrl}${path}`,
    {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    },
    UPLOAD_TIMEOUT_MS,
  );

  return parseResponse<T>(response, 'Upload failed');
}

export { TeAgentCredentialsError };
