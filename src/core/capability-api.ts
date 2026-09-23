/**
 * capability-api.ts — REST transport for capability-gateway commands.
 *
 * CLI calls `/api/cli/<domain>/v1/...`; nginx strips the domain segment and forwards to the
 * backing service at `/api/cli/v1/...`. Auth uses the `cli-token` header (same as MCP transport).
 */

import { clearCliTokenCache, getCliToken } from './cli-token.js';
import { safeJsonParse } from './json-utils.js';
import { PermissionError } from './errors.js';
import { SecureStoreAuthError } from './secure-store.js';
import { internalCallSourceHeaders } from './internal-call-source.js';
import {
  cliAgentContextHeaders,
  readCliAgentContext,
  withCliAgentContextBody,
} from './cli-agent-context.js';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

export type CapabilityApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type CapabilityApiRequestOptions = {
  /** Actual service base URL when it differs from the host used to obtain the CLI token. */
  apiBaseUrl?: string;
  /** @deprecated Retained for source compatibility. Unauthorized requests are never retried. */
  retryOnUnauthorized?: boolean;
  /** @deprecated Invalid CLI tokens are never retried; false preserves 403 permission classification. */
  retryOnInvalidTokenForbidden?: boolean;
};

export interface CapabilityGatewaySuccess<T = any> {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
}

export class CapabilityGatewayError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly httpStatus?: number,
    readonly hint?: string,
    readonly meta?: Record<string, unknown>,
    readonly type: 'api' | 'validation' = 'api',
  ) {
    super(message);
    this.name = 'CapabilityGatewayError';
  }
}

/** Build `/api/cli/<domain>/v1/<pathAfterV1>` or root `/api/cli/v1/<pathAfterV1>` with optional query params. */
export function buildCapabilityGatewayUrl(
  host: string,
  domain: string,
  pathAfterV1: string,
  queryParams: Record<string, any> = {},
): string {
  const base = host.replace(/\/+$/, '');
  const cleanDomain = domain.replace(/^\/+|\/+$/g, '');
  const cleanPath = pathAfterV1.replace(/^\/+|\/+$/g, '');
  const gatewayPrefix = cleanDomain === '' ? '/api/cli/v1' : `/api/cli/${cleanDomain}/v1`;
  const url = new URL(`${base}${gatewayPrefix}/${cleanPath}`);
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * @deprecated Prefer `buildCapabilityGatewayUrl`. Kept for older call sites/tests that passed a
 * single action segment; maps to `v1/<action>`.
 */
export function buildApiUrl(
  host: string,
  domain: string,
  action: string,
  queryParams: Record<string, any> = {},
): string {
  return buildCapabilityGatewayUrl(host, domain, action.replace(/^\/+|\/+$/g, ''), queryParams);
}

async function permissionMessage(resp: Response): Promise<string> {
  const text = await resp.text().catch(() => '');
  try {
    const d: any = safeJsonParse(text);
    const msg = d && (d.error?.message || (typeof d.error === 'string' ? d.error : undefined) || d.message);
    if (msg && typeof msg === 'string') return msg;
  } catch { /* non-JSON body */ }
  return 'Permission denied for this resource (HTTP 403)';
}

async function permissionError(resp: Response): Promise<PermissionError> {
  const codeResponse = resp.clone();
  const message = await permissionMessage(resp);
  const body = safeJsonParse(await codeResponse.text());
  const error = isRecord(body?.error) ? body.error : undefined;
  const code = nonEmptyString(error?.code) ?? nonEmptyString(body?.code);
  return new PermissionError(message, code);
}

function isInvalidCliTokenMessage(message: string): boolean {
  return /\byour token is invalid\b/i.test(message)
    || /\bcli[-_\s]?token\b.*\binvalid\b/i.test(message)
    || /\binvalid\b.*\bcli[-_\s]?token\b/i.test(message);
}

function parseCapabilityResponse(text: string): any {
  if (!text) return undefined;
  try {
    return safeJsonParse(text);
  } catch {
    return text;
  }
}

function parseCapabilityEnvelope(body: any): CapabilityGatewaySuccess {
  if (body == null) {
    throw new CapabilityGatewayError('Empty capability gateway response');
  }
  if (typeof body.ok === 'boolean') {
    if (body.ok) {
      return {
        ok: true,
        data: body.data,
        ...(isRecord(body.meta) ? { meta: body.meta } : {}),
      };
    }
    const err = body.error ?? {};
    const code = nonEmptyString(err.code);
    const message = nonEmptyString(err.message) ?? code ?? 'Capability gateway request failed';
    const hint = nonEmptyString(err.hint);
    throw new CapabilityGatewayError(
      message,
      code,
      err.http_status ?? err.httpStatus,
      hint,
      isRecord(body.meta) ? body.meta : undefined,
      err.type === 'validation' ? 'validation' : 'api',
    );
  }
  return { ok: true, data: body };
}

function unwrapCapabilityEnvelope(body: any): any {
  return parseCapabilityEnvelope(body).data;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function buildCapabilityHttpError(resp: Response, body: any): CapabilityGatewayError {
  const fallback = `Capability gateway HTTP error: ${resp.status} ${resp.statusText}`.trim();

  if (body && typeof body === 'object') {
    const err = body.error ?? body.data?.error ?? body;
    const code = nonEmptyString(err.code) ?? nonEmptyString(err.errorCode) ?? nonEmptyString(body.code);
    const message = nonEmptyString(err.message) ?? nonEmptyString(body.message);
    const hint = nonEmptyString(err.hint) ?? nonEmptyString(body.hint);
    const details = [code, message, hint ? `Hint: ${hint}` : undefined].filter(Boolean);

    if (details.length > 0) {
      return new CapabilityGatewayError(
        message ?? fallback,
        code,
        resp.status,
        hint,
        isRecord(body.meta) ? body.meta : undefined,
        err.type === 'validation' ? 'validation' : 'api',
      );
    }
  }

  if (typeof body === 'string' && body.trim()) {
    return new CapabilityGatewayError(`${fallback}: ${body.slice(0, 500)}`, undefined, resp.status);
  }

  return new CapabilityGatewayError(fallback, undefined, resp.status);
}

async function throwCapabilityHttpError(resp: Response): Promise<never> {
  const body = parseCapabilityResponse(await resp.text());
  const error = buildCapabilityHttpError(resp, body);
  if (resp.status === 401) {
    throw new SecureStoreAuthError(
      `${error.message}. The stored CLI token is invalid or expired; run: ae-cli auth login`,
    );
  }
  throw error;
}

async function requestOnce(
  url: string,
  method: CapabilityApiMethod,
  token: string,
  body: any,
  accept = 'application/json',
): Promise<Response> {
  const agentContext = readCliAgentContext();
  const headers: Record<string, string> = {
    'cli-token': token,
    'Accept': accept,
    ...internalCallSourceHeaders(),
    ...cliAgentContextHeaders(agentContext),
  };
  const init: RequestInit = { method, headers };
  if (body !== undefined && method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(withCliAgentContextBody(body, agentContext));
  }
  return fetch(url, init);
}

async function requestMultipartOnce(url: string, token: string, form: FormData): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      'cli-token': token,
      'Accept': 'application/json',
      ...internalCallSourceHeaders(),
    },
    body: form,
  });
}

async function requestDownloadOnce(url: string, token: string): Promise<Response> {
  return fetch(url, {
    method: 'GET',
    headers: {
      'cli-token': token,
      'Accept': '*/*',
      ...internalCallSourceHeaders(),
    },
  });
}

async function callGateway(
  host: string,
  domain: string,
  pathAfterV1: string,
  method: CapabilityApiMethod,
  body?: any,
  queryParams: Record<string, any> = {},
  options: CapabilityApiRequestOptions = {},
): Promise<any> {
  return (await callGatewayWithEnvelope(host, domain, pathAfterV1, method, body, queryParams, options)).data;
}

async function callGatewayWithEnvelope(
  host: string,
  domain: string,
  pathAfterV1: string,
  method: CapabilityApiMethod,
  body?: any,
  queryParams: Record<string, any> = {},
  options: CapabilityApiRequestOptions = {},
): Promise<CapabilityGatewaySuccess> {
  const url = buildCapabilityGatewayUrl(options.apiBaseUrl ?? host, domain, pathAfterV1, queryParams);
  const token = await getCliToken(host);

  let resp = await requestOnce(url, method, token, body);
  // Explicit opt-in only: reread host-scoped credentials once without minting or deleting them.
  if (resp.status === 401 && options.retryOnUnauthorized === true) {
    await resp.body?.cancel();
    clearCliTokenCache(host);
    resp = await requestOnce(url, method, await getCliToken(host), body);
  }
  if (resp.status === 403) {
    const error = await permissionError(resp);
    if (options.retryOnInvalidTokenForbidden !== false && isInvalidCliTokenMessage(error.message)) {
      throw new SecureStoreAuthError(
        `${error.message} Run: ae-cli auth login`,
      );
    }
    throw error;
  }
  if (!resp.ok) {
    await throwCapabilityHttpError(resp);
  }

  return parseCapabilityEnvelope(parseCapabilityResponse(await resp.text()));
}

export async function fetchCapabilityGateway(
  host: string,
  domain: string,
  pathAfterV1: string,
  method: CapabilityApiMethod = 'GET',
  body?: any,
  accept = 'application/json',
): Promise<Response> {
  const url = buildCapabilityGatewayUrl(host, domain, pathAfterV1);
  const token = await getCliToken(host);

  const resp = await requestOnce(url, method, token, body, accept);

  if (resp.status === 403) {
    const error = await permissionError(resp);
    if (isInvalidCliTokenMessage(error.message)) {
      throw new SecureStoreAuthError(`${error.message} Run: ae-cli auth login`);
    }
    throw error;
  }
  if (!resp.ok) {
    await throwCapabilityHttpError(resp);
  }

  return resp;
}

export async function requestCapabilityGateway(
  host: string,
  domain: string,
  pathAfterV1: string,
  method: CapabilityApiMethod = 'GET',
  body?: any,
): Promise<any> {
  const resp = await fetchCapabilityGateway(host, domain, pathAfterV1, method, body);
  return unwrapCapabilityEnvelope(parseCapabilityResponse(await resp.text()));
}

export async function requestCapabilityGatewayWithEnvelope(
  host: string,
  domain: string,
  pathAfterV1: string,
  method: CapabilityApiMethod = 'GET',
  body?: any,
): Promise<CapabilityGatewaySuccess> {
  const resp = await fetchCapabilityGateway(host, domain, pathAfterV1, method, body);
  return parseCapabilityEnvelope(parseCapabilityResponse(await resp.text()));
}

export async function listCapabilities(host: string, domain: string, projectId?: number): Promise<any> {
  return callGateway(host, domain, 'capabilities', 'GET', undefined, { project_id: projectId });
}

export async function listCapabilitiesWithEnvelope(host: string, domain: string, projectId?: number): Promise<CapabilityGatewaySuccess> {
  return callGatewayWithEnvelope(host, domain, 'capabilities', 'GET', undefined, { project_id: projectId });
}

export async function inspectCapabilityWithEnvelope(
  host: string,
  domain: string,
  capabilityId: string,
  projectId?: number,
): Promise<CapabilityGatewaySuccess> {
  return callGatewayWithEnvelope(host, domain, `capabilities/${capabilityId}`, 'GET', undefined, { project_id: projectId });
}

export async function inspectCapability(
  host: string,
  domain: string,
  capabilityId: string,
  projectId?: number,
): Promise<any> {
  return callGateway(
    host,
    domain,
    `capabilities/${capabilityId}`,
    'GET',
    undefined,
    { project_id: projectId },
  );
}

export async function executeCapability(
  host: string,
  domain: string,
  capabilityId: string,
  input: Record<string, unknown> = {},
): Promise<any> {
  return callGateway(host, domain, `capabilities/${capabilityId}/execute`, 'POST', { input });
}

export async function executeCapabilityWithEnvelope(
  host: string,
  domain: string,
  capabilityId: string,
  input: Record<string, unknown> = {},
): Promise<CapabilityGatewaySuccess> {
  return callGatewayWithEnvelope(host, domain, `capabilities/${capabilityId}/execute`, 'POST', { input });
}

export async function dryRunCapability(
  host: string,
  domain: string,
  capabilityId: string,
  input: Record<string, unknown> = {},
): Promise<any> {
  return callGateway(host, domain, `capabilities/${capabilityId}/dry-run`, 'POST', { input });
}

export async function dryRunCapabilityWithEnvelope(
  host: string,
  domain: string,
  capabilityId: string,
  input: Record<string, unknown> = {},
): Promise<CapabilityGatewaySuccess> {
  return callGatewayWithEnvelope(host, domain, `capabilities/${capabilityId}/dry-run`, 'POST', { input });
}

export async function validateCapabilityWithEnvelope(
  host: string,
  domain: string,
  capabilityId: string,
  input: Record<string, unknown> = {},
): Promise<CapabilityGatewaySuccess> {
  return callGatewayWithEnvelope(host, domain, `capabilities/${capabilityId}/validate`, 'POST', { input });
}

/**
 * Parameter-focused pre-check: validates/normalizes input shape without executing business logic.
 * Prefer this when iterating on complex payloads (nested objects, QP, share payloads).
 * Unlike dry-run, the successful response is centered on `valid` + `normalized_input`
 * (no risk / output_mode / supports_cancel preview). Server still authenticates the caller.
 */
export async function validateCapability(
  host: string,
  domain: string,
  capabilityId: string,
  input: Record<string, unknown> = {},
): Promise<any> {
  return callGateway(host, domain, `capabilities/${capabilityId}/validate`, 'POST', { input });
}

export async function uploadInputFile(
  host: string,
  domain: string,
  projectId: number,
  purpose: string,
  filePath: string,
): Promise<any> {
  const fileBytes = await readFile(filePath);
  const filename = basename(filePath);
  return uploadInputFileBytes(host, domain, projectId, purpose, fileBytes, filename,
    inputFileContentType(filename));
}

function inputFileContentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.csv')) return 'text/csv';
  if (lower.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.txt')) return 'text/plain';
  return 'application/octet-stream';
}

export async function uploadInputFileBytes(
  host: string,
  domain: string,
  projectId: number,
  purpose: string,
  bytes: Uint8Array | ArrayBuffer,
  filename: string,
  contentType = 'application/octet-stream',
): Promise<any> {
  const url = buildCapabilityGatewayUrl(host, domain, 'input-files');
  const fileBuffer = bytes instanceof ArrayBuffer ? bytes : bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const form = new FormData();
  form.append('project_id', String(projectId));
  form.append('purpose', purpose);
  form.append('file', new Blob([fileBuffer], { type: contentType }), filename);

  const token = await getCliToken(host);
  const resp = await requestMultipartOnce(url, token, form);

  if (resp.status === 403) {
    const error = await permissionError(resp);
    if (isInvalidCliTokenMessage(error.message)) {
      throw new SecureStoreAuthError(`${error.message} Run: ae-cli auth login`);
    }
    throw error;
  }
  if (!resp.ok) {
    await throwCapabilityHttpError(resp);
  }

  return unwrapCapabilityEnvelope(parseCapabilityResponse(await resp.text()));
}

export interface CapabilityArtifactDownload {
  bytes: Buffer;
  contentType?: string;
  contentDisposition?: string;
}

export async function downloadCapabilityArtifact(
  host: string,
  domain: string,
  runId: string,
  artifactId: string,
): Promise<CapabilityArtifactDownload> {
  const url = buildCapabilityGatewayUrl(
    host,
    domain,
    `runs/${encodeURIComponent(runId)}/artifacts/${encodeURIComponent(artifactId)}/download`,
  );
  const token = await getCliToken(host);
  const resp = await requestDownloadOnce(url, token);

  if (resp.status === 403) {
    const error = await permissionError(resp);
    if (isInvalidCliTokenMessage(error.message)) {
      throw new SecureStoreAuthError(`${error.message} Run: ae-cli auth login`);
    }
    throw error;
  }
  if (!resp.ok) {
    await throwCapabilityHttpError(resp);
  }

  return {
    bytes: Buffer.from(await resp.arrayBuffer()),
    contentType: resp.headers.get('content-type') ?? undefined,
    contentDisposition: resp.headers.get('content-disposition') ?? undefined,
  };
}

/**
 * Generic capability-gateway call. GET sends `params` as query string; POST sends JSON body.
 * @deprecated Prefer listCapabilities / inspectCapability / executeCapability / dryRunCapability / validateCapability.
 */
export async function callCapabilityApi(
  host: string,
  domain: string,
  action: string,
  method: CapabilityApiMethod = 'POST',
  params: Record<string, any> = {},
  options: CapabilityApiRequestOptions = {},
): Promise<any> {
  const isGet = method === 'GET';
  if (isGet) {
    return callGateway(host, domain, action.replace(/^\/+|\/+$/g, ''), 'GET', undefined, {}, options);
  }
  return callGateway(host, domain, action.replace(/^\/+|\/+$/g, ''), method, params, {}, options);
}
