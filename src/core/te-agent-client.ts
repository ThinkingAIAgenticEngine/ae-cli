/**
 * te-agent main app HTTP client
 *
 * Auth header selection logic (priority high -> low):
 *   1. Sandbox credentials complete (url + sandboxId + sandboxSecretKey) -> X-Sandbox-Id / X-Sandbox-Secret-Key
 *   2. User access token present (secure-store)
 *      -> Authorization: bearer <accessToken>
 *   3. CLI token available (secure-store / cli-token.json) -> cli-token: <cliToken>
 *   4. Neither available -> throws TeAgentCredentialsError (with hint)
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
function teClaudeBaseFromActiveHost(hostOverride?: string): string | undefined {
  const override = hostOverride ? undefined : process.env.TE_CLAUDE_BASE_URL;
  if (override) return override.replace(/\/+$/, '');
  const h = hostOverride || getActiveHost();
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
 *   - User access token present -> Authorization: bearer <token>
 *   - CLI token available -> cli-token header (te-claude resolves via /internal/cli/user-info)
 *   - Neither available -> throws TeAgentCredentialsError (with hint)
 */
async function signRequest(
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT',
  path: string,
  rawBody: string,
  hostOverride?: string,
): Promise<SignedRequest> {
  const sandboxCred = tryLoadTeAgentSandboxCredentials();

  // --- Sandbox path: credentials complete ---
  if (!hostOverride && sandboxCred && sandboxCred.sandboxId && sandboxCred.sandboxSecretKey) {
    const headers: Record<string, string> = {
      'X-Sandbox-Id': sandboxCred.sandboxId,
      'X-Sandbox-Secret-Key': sandboxCred.sandboxSecretKey,
    };
    if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
      headers['Content-Type'] = 'application/json';
    }
    return {
      url: `${sandboxCred.url.replace(/\/$/, '')}${path}`,
      headers,
      rawBody,
    };
  }

  // --- User Bearer path: access token from device login (secure-store) ---
  const { getToken } = await import('./auth.js');
  const { getCliToken } = await import('./cli-token.js');

  // Determine base URL: prefer the sandbox url field (reuse even if sandbox Id/Key are missing but URL is present),
  // otherwise fall back to the ae-cli-configured activeHost (set by the user via `ae-cli config set-host`).
  const baseUrl = hostOverride
    ? teClaudeBaseFromActiveHost(hostOverride)
    : sandboxCred?.url || teClaudeBaseFromActiveHost();

  if (!baseUrl) {
    throw new TeAgentCredentialsError(
      'Cannot determine the te-claude service URL',
      'Run ae-cli config set-host <url> to configure the service URL, or execute inside a te-agent sandbox',
    );
  }
  const hostForToken = hostOverride || getActiveHost() || baseUrl;

  const contentTypeHeader: Record<string, string> =
    method === 'POST' || method === 'PATCH' || method === 'PUT' ? { 'Content-Type': 'application/json' } : {};

  let accessToken: string | null = null;
  try {
    accessToken = await getToken(hostForToken);
  } catch {
    accessToken = null;
  }

  if (accessToken) {
    return {
      url: `${baseUrl.replace(/\/$/, '')}${path}`,
      headers: {
        'Authorization': `bearer ${accessToken}`,
        ...contentTypeHeader,
      },
      rawBody,
    };
  }

  // --- CLI token path: no user access token; te-claude accepts cli-token header ---
  let cliToken: string | null = null;
  try {
    cliToken = await getCliToken(hostForToken);
  } catch {
    cliToken = null;
  }

  if (cliToken) {
    return {
      url: `${baseUrl.replace(/\/$/, '')}${path}`,
      headers: {
        'cli-token': cliToken,
        ...contentTypeHeader,
      },
      rawBody,
    };
  }

  throw new TeAgentCredentialsError(
    'No te-claude credentials available',
    'Run ae-cli auth login, or execute inside a te-agent sandbox',
  );
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
export async function postToMainApp<T = unknown>(
  path: string,
  body: unknown,
  hostOverride?: string,
): Promise<T> {
  const rawBody = JSON.stringify(body);
  const signed = await signRequest('POST', path, rawBody, hostOverride);

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
export async function getFromMainApp<T = unknown>(
  path: string,
  hostOverride?: string,
): Promise<T> {
  const signed = await signRequest('GET', path, '', hostOverride);

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
export async function deleteFromMainApp<T = unknown>(
  path: string,
  hostOverride?: string,
): Promise<T> {
  const signed = await signRequest('DELETE', path, '', hostOverride);

  const response = await fetchWithTimeout(signed.url, {
    method: 'DELETE',
    headers: signed.headers,
  });

  return parseResponse<T>(response, 'Main app returned');
}

/**
 * PATCH a main app resource with automatic signing.
 */
export async function patchToMainApp<T = unknown>(
  path: string,
  body: unknown,
  hostOverride?: string,
): Promise<T> {
  const rawBody = JSON.stringify(body);
  const signed = await signRequest('PATCH', path, rawBody, hostOverride);

  const response = await fetchWithTimeout(signed.url, {
    method: 'PATCH',
    headers: signed.headers,
    body: signed.rawBody,
  });

  return parseResponse<T>(response, 'Main app returned');
}

/**
 * PUT a main app resource with automatic signing (used by Skill content edit).
 */
export async function putToMainApp<T = unknown>(
  path: string,
  body: unknown,
  hostOverride?: string,
): Promise<T> {
  const rawBody = JSON.stringify(body);
  const signed = await signRequest('PUT', path, rawBody, hostOverride);

  const response = await fetchWithTimeout(signed.url, {
    method: 'PUT',
    headers: signed.headers,
    body: signed.rawBody,
  });

  return parseResponse<T>(response, 'Main app returned');
}

/**
 * GET raw binary content from the main app (used by Skill asset/reference/script read).
 * Returns the response body as a Buffer plus the filename extracted from Content-Disposition.
 * Unlike getFromMainApp, this does NOT parse the response as JSON/text — binary content is preserved.
 */
export async function getBufferFromMainApp(
  path: string,
  hostOverride?: string,
): Promise<{ buffer: Buffer; fileName: string | null }> {
  const signed = await signRequest('GET', path, '', hostOverride);

  const response = await fetchWithTimeout(signed.url, {
    method: 'GET',
    headers: signed.headers,
  });

  if (!response.ok) {
    // Reuse the error parsing logic from parseResponse for non-OK responses
    const text = await response.text();
    let parsed: any = undefined;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    if (response.status === 401) {
      throw new TeAgentApiError(
        'Session expired or unauthorized. Please run: ae-cli auth login',
        response.status,
        'auth_expired',
        parsed,
      );
    }
    const message =
      typeof parsed === 'object' && parsed && typeof parsed.error === 'string'
        ? parsed.error
        : `Main app returned ${response.status}`;
    const code =
      typeof parsed === 'object' && parsed && typeof parsed.code === 'string'
        ? parsed.code
        : undefined;
    throw new TeAgentApiError(message, response.status, code, parsed);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Extract filename from Content-Disposition: inline; filename*=UTF-8''<encoded>
  const cd = response.headers.get('Content-Disposition') || '';
  const match = cd.match(/filename\*=UTF-8''([^;]+)/);
  const fileName = match ? decodeURIComponent(match[1]) : null;

  return { buffer, fileName };
}

/**
 * Upload multipart/form-data to the main app with automatic auth header injection (sandbox or user Bearer).
 * Does not manually set Content-Type; lets fetch automatically add the boundary.
 */
export async function uploadToMainApp<T = unknown>(
  path: string,
  formData: FormData,
  hostOverride?: string,
): Promise<T> {
  // Reuse signRequest decision logic, but do not set Content-Type for uploads (fetch adds boundary automatically)
  const sandboxCred = tryLoadTeAgentSandboxCredentials();

  let baseUrl: string;
  let authHeaders: Record<string, string>;

  if (!hostOverride && sandboxCred && sandboxCred.sandboxId && sandboxCred.sandboxSecretKey) {
    // Sandbox path
    baseUrl = sandboxCred.url.replace(/\/$/, '');
    authHeaders = {
      'X-Sandbox-Id': sandboxCred.sandboxId,
      'X-Sandbox-Secret-Key': sandboxCred.sandboxSecretKey,
    };
  } else {
    // User Bearer / CLI token path
    const { getToken } = await import('./auth.js');
    const { getCliToken } = await import('./cli-token.js');
    baseUrl = (
      hostOverride
        ? teClaudeBaseFromActiveHost(hostOverride)
        : sandboxCred?.url || teClaudeBaseFromActiveHost()
    )?.replace(/\/$/, '') || '';
    if (!baseUrl) {
      throw new TeAgentCredentialsError(
        'Cannot determine the te-claude service URL',
        'Run ae-cli config set-host <url> to configure the service URL, or execute inside a te-agent sandbox',
      );
    }
    const hostForToken = hostOverride || getActiveHost() || baseUrl;
    let accessToken: string | null = null;
    try {
      accessToken = await getToken(hostForToken);
    } catch {
      accessToken = null;
    }
    if (accessToken) {
      authHeaders = { 'Authorization': `bearer ${accessToken}` };
    } else {
      let cliToken: string | null = null;
      try {
        cliToken = await getCliToken(hostForToken);
      } catch {
        cliToken = null;
      }
      if (!cliToken) {
        throw new TeAgentCredentialsError(
          'No te-claude credentials available',
          'Run ae-cli auth login, or execute inside a te-agent sandbox',
        );
      }
      authHeaders = { 'cli-token': cliToken };
    }
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
