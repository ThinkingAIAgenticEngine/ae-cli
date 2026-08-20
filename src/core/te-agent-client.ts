/**
 * te-agent main app HTTP client
 *
 * Auth header selection logic:
 *   1. Internal sandbox calls without a host override use X-Sandbox-Id / X-Sandbox-Secret-Key.
 *   2. Explicit-host CLI calls use the unified cli-token credential.
 *
 * Independent of src/core/client.ts (AE platform client). Supports ae-cli sync / model / agent commands.
 */

import { open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { tryLoadTeAgentSandboxCredentials, TeAgentCredentialsError } from './te-agent-credentials.js';
import { clearCliToken, getCliToken } from './cli-token.js';
import { getActiveHost } from './config.js';
import { PermissionError } from './errors.js';
import { internalCallSourceHeaders } from './internal-call-source.js';

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
  authKind: 'sandbox' | 'cli-token';
  tokenHost?: string;
}

type TeAgentHttpMethod = 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT';

// Default request timeouts: 30s for regular endpoints, relaxed to 120s for file uploads
const DEFAULT_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;
const DOWNLOAD_TIMEOUT_MS = 120_000;

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
      throw new TeAgentApiError(
        `Request timed out (${timeoutMs}ms) for ${safeRequestOrigin(url)}`,
        0,
        'TIMEOUT',
      );
    }
    throw networkRequestError(url, err);
  } finally {
    clearTimeout(timer);
  }
}

function safeRequestOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return 'the configured service';
  }
}

function networkRequestError(url: string, error: unknown): TeAgentApiError {
  const nestedCause = error && typeof error === 'object' && 'cause' in error
    ? (error as { cause?: unknown }).cause
    : undefined;
  const root = nestedCause ?? error;
  const detail = root && typeof root === 'object' ? root as {
    code?: unknown;
    address?: unknown;
    hostname?: unknown;
    port?: unknown;
  } : {};
  const code = typeof detail.code === 'string' ? detail.code : undefined;
  const address = typeof detail.address === 'string'
    ? detail.address
    : typeof detail.hostname === 'string'
      ? detail.hostname
      : undefined;
  const port = typeof detail.port === 'number' || typeof detail.port === 'string'
    ? String(detail.port)
    : undefined;
  const endpoint = address ? `${address}${port ? `:${port}` : ''}` : undefined;
  const cause = [code, endpoint].filter(Boolean).join(' ');
  const suffix = cause ? ` (${cause})` : '';
  return new TeAgentApiError(
    `Network request failed for ${safeRequestOrigin(url)}${suffix}`,
    0,
    'NETWORK_ERROR',
  );
}

/**
 * Resolves the te-claude base URL used by CLI-token requests.
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
 *   - Sandbox credentials complete and no explicit host -> X-Sandbox-* headers.
 *   - Otherwise -> the unified cli-token credential for the selected host.
 */
async function signRequest(
  method: TeAgentHttpMethod,
  path: string,
  hostOverride?: string,
  includeJsonContentType = true,
): Promise<SignedRequest> {
  const sandboxCred = tryLoadTeAgentSandboxCredentials();

  // --- Sandbox path: credentials complete ---
  if (!hostOverride && sandboxCred && sandboxCred.sandboxId && sandboxCred.sandboxSecretKey) {
    const headers: Record<string, string> = {
      'X-Sandbox-Id': sandboxCred.sandboxId,
      'X-Sandbox-Secret-Key': sandboxCred.sandboxSecretKey,
    };
    if (includeJsonContentType && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      headers['Content-Type'] = 'application/json';
    }
    return {
      url: `${sandboxCred.url.replace(/\/$/, '')}${path}`,
      headers,
      authKind: 'sandbox',
    };
  }

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
    includeJsonContentType && (method === 'POST' || method === 'PATCH' || method === 'PUT')
      ? { 'Content-Type': 'application/json' }
      : {};
  const cliToken = await getCliToken(hostForToken);

  return {
    url: `${baseUrl.replace(/\/$/, '')}${path}`,
    headers: {
      'cli-token': cliToken,
      ...internalCallSourceHeaders(),
      ...contentTypeHeader,
    },
    authKind: 'cli-token',
    tokenHost: hostForToken,
  };
}

interface SignedFetchOptions {
  method: TeAgentHttpMethod;
  path: string;
  body?: BodyInit;
  hostOverride?: string;
  includeJsonContentType?: boolean;
  timeoutMs?: number;
}

async function fetchSignedWithRetry(options: SignedFetchOptions): Promise<Response> {
  let signed = await signRequest(
    options.method,
    options.path,
    options.hostOverride,
    options.includeJsonContentType,
  );
  const request = (requestToSend: SignedRequest) => fetchWithTimeout(
    requestToSend.url,
    {
      method: options.method,
      headers: requestToSend.headers,
      body: options.body,
    },
    options.timeoutMs,
  );

  let response = await request(signed);
  if (response.status === 401 && signed.authKind === 'cli-token' && signed.tokenHost) {
    clearCliToken(signed.tokenHost);
    signed = await signRequest(
      options.method,
      options.path,
      options.hostOverride,
      options.includeJsonContentType,
    );
    response = await request(signed);
  }
  return response;
}

function errorDetails(parsed: any, defaultErrorPrefix: string, status: number): {
  message: string;
  code?: string;
  hint?: string;
} {
  const nested = parsed && typeof parsed === 'object' && parsed.error && typeof parsed.error === 'object'
    ? parsed.error
    : parsed;
  const message = typeof parsed?.error === 'string'
    ? parsed.error
    : typeof nested?.message === 'string'
      ? nested.message
      : typeof parsed?.message === 'string'
        ? parsed.message
        : typeof parsed?.return_message === 'string'
          ? parsed.return_message
          : `${defaultErrorPrefix} ${status}`;
  const code = typeof nested?.code === 'string'
    ? nested.code
    : typeof parsed?.code === 'string'
      ? parsed.code
      : undefined;
  const hint = typeof nested?.hint === 'string'
    ? nested.hint
    : typeof parsed?.hint === 'string'
      ? parsed.hint
      : undefined;
  return { message, code, hint };
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
    const details = errorDetails(parsed, defaultErrorPrefix, response.status);
    if (response.status === 403) {
      throw new PermissionError(details.message, details.code, details.hint);
    }
    if (response.status === 401) {
      throw new TeAgentApiError(
        'Session expired or unauthorized. Please run: ae-cli auth login',
        response.status,
        'auth_expired',
        parsed,
      );
    }
    throw new TeAgentApiError(details.message, response.status, details.code, parsed);
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
  const response = await fetchSignedWithRetry({
    method: 'POST',
    path,
    body: rawBody,
    hostOverride,
  });

  return parseResponse<T>(response, 'Main app returned');
}

/**
 * GET from the main app with automatic auth header injection. Returns parsed JSON.
 *
 * @param path Main app endpoint path (including query string), e.g. /api/sandbox/models?current=cuid
 */
export async function getFromMainApp<T = unknown>(
  path: string,
  hostOverride?: string,
): Promise<T> {
  const response = await fetchSignedWithRetry({
    method: 'GET',
    path,
    hostOverride,
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
  const response = await fetchSignedWithRetry({
    method: 'DELETE',
    path,
    hostOverride,
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
  const response = await fetchSignedWithRetry({
    method: 'PATCH',
    path,
    body: rawBody,
    hostOverride,
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
  const response = await fetchSignedWithRetry({
    method: 'PUT',
    path,
    body: rawBody,
    hostOverride,
  });

  return parseResponse<T>(response, 'Main app returned');
}

/**
 * GET raw binary content from the main app (used by Skill asset/reference/script read).
 * Returns the response body as a Buffer plus response metadata needed by callers.
 * Unlike getFromMainApp, this does NOT parse the response as JSON/text — binary content is preserved.
 */
export async function getBufferFromMainApp(
  path: string,
  hostOverride?: string,
): Promise<{ buffer: Buffer; fileName: string | null; contentType: string | null }> {
  const response = await fetchSignedWithRetry({
    method: 'GET',
    path,
    hostOverride,
  });

  if (!response.ok) {
    await parseResponse<never>(response, 'Main app returned');
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Extract filename from Content-Disposition: inline; filename*=UTF-8''<encoded>
  const cd = response.headers.get('Content-Disposition') || '';
  const match = cd.match(/filename\*=UTF-8''([^;]+)/);
  const fileName = match ? decodeURIComponent(match[1]) : null;
  const contentType = response.headers.get('Content-Type');

  return { buffer, fileName, contentType };
}

function responseFileName(response: Response): string | null {
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded.trim());
    } catch {
      return encoded.trim();
    }
  }
  return disposition.match(/filename="([^"]+)"/i)?.[1]
    ?? disposition.match(/filename=([^;]+)/i)?.[1]?.trim()
    ?? null;
}

async function* responseBodyChunks(
  body: globalThis.ReadableStream<Uint8Array>,
): AsyncGenerator<Uint8Array> {
  const reader = body.getReader();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) return;
      yield chunk.value;
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Stream a GET response directly to a caller-selected local file.
 * The target is created exclusively, never overwritten, and removed if any request or stream step fails.
 */
export async function downloadFromMainApp(
  requestPath: string,
  outputPath: string,
  hostOverride?: string,
): Promise<{ path: string; bytes: number; fileName: string | null; contentType: string | null }> {
  const absolutePath = path.resolve(outputPath);
  let fileHandle;
  let created = false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    try {
      fileHandle = await open(absolutePath, 'wx');
      created = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        throw new TeAgentApiError(
          `Output file already exists: ${absolutePath}`,
          0,
          'OUTPUT_EXISTS',
        );
      }
      throw new TeAgentApiError(
        `Unable to create output file: ${absolutePath}`,
        0,
        'OUTPUT_ERROR',
      );
    }

    let signed = await signRequest('GET', requestPath, hostOverride);
    let response: Response;
    const request = async (requestToSend: SignedRequest): Promise<Response> => {
      try {
        return await fetch(requestToSend.url, {
          method: 'GET',
          headers: requestToSend.headers,
          signal: controller.signal,
        });
      } catch (error) {
        if ((error as { name?: string })?.name === 'AbortError') {
          throw new TeAgentApiError(
            `Request timed out (${DOWNLOAD_TIMEOUT_MS}ms) for ${safeRequestOrigin(requestToSend.url)}`,
            0,
            'TIMEOUT',
          );
        }
        throw networkRequestError(requestToSend.url, error);
      }
    };

    response = await request(signed);
    if (response.status === 401 && signed.authKind === 'cli-token' && signed.tokenHost) {
      clearCliToken(signed.tokenHost);
      signed = await signRequest('GET', requestPath, hostOverride);
      response = await request(signed);
    }

    if (!response.ok) {
      await parseResponse<never>(response, 'Main app returned');
    }
    if (!response.body) {
      throw new TeAgentApiError('Main app returned an empty download stream', 0, 'EMPTY_BODY');
    }

    const output = fileHandle.createWriteStream();
    try {
      await pipeline(
        Readable.from(responseBodyChunks(response.body)),
        output,
      );
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') {
        throw new TeAgentApiError(
          `Request timed out (${DOWNLOAD_TIMEOUT_MS}ms): ${signed.url}`,
          0,
          'TIMEOUT',
        );
      }
      throw new TeAgentApiError(
        `Download failed: ${error instanceof Error ? error.message : String(error)}`,
        0,
        'DOWNLOAD_ERROR',
      );
    }

    return {
      path: absolutePath,
      bytes: output.bytesWritten,
      fileName: responseFileName(response),
      contentType: response.headers.get('Content-Type'),
    };
  } catch (error) {
    if (fileHandle) await fileHandle.close().catch(() => undefined);
    if (created) await unlink(absolutePath).catch(() => undefined);
    throw error;
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

/**
 * Upload multipart/form-data to the main app with automatic auth header injection.
 * Does not manually set Content-Type; lets fetch automatically add the boundary.
 */
export async function uploadToMainApp<T = unknown>(
  path: string,
  formData: FormData,
  hostOverride?: string,
): Promise<T> {
  const response = await fetchSignedWithRetry({
    method: 'POST',
    path,
    body: formData,
    hostOverride,
    includeJsonContentType: false,
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });

  return parseResponse<T>(response, 'Upload failed');
}

export { TeAgentCredentialsError };
