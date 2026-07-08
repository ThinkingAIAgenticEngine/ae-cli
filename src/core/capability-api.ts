/**
 * capability-api.ts — REST transport for capability-gateway commands.
 *
 * CLI calls `/api/cli/<domain>/v1/...`; nginx strips the domain segment and forwards to the
 * backing service at `/api/cli/v1/...`. Auth uses the `cli-token` header (same as MCP transport).
 */

import { getCliToken, clearCliToken } from './cli-token.js';
import { safeJsonParse } from './json-utils.js';
import { logger } from './logger.js';
import { PermissionError } from './errors.js';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

export type CapabilityApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export class CapabilityGatewayError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'CapabilityGatewayError';
  }
}

/** Build `/api/cli/<domain>/v1/<pathAfterV1>` with optional query params. */
export function buildCapabilityGatewayUrl(
  host: string,
  domain: string,
  pathAfterV1: string,
  queryParams: Record<string, any> = {},
): string {
  const base = host.replace(/\/+$/, '');
  const cleanDomain = domain.replace(/^\/+|\/+$/g, '');
  const cleanPath = pathAfterV1.replace(/^\/+|\/+$/g, '');
  const url = new URL(`${base}/api/cli/${cleanDomain}/v1/${cleanPath}`);
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

function parseCapabilityResponse(text: string): any {
  if (!text) return undefined;
  try {
    return safeJsonParse(text);
  } catch {
    return text;
  }
}

function unwrapCapabilityEnvelope(body: any): any {
  if (body == null) {
    throw new CapabilityGatewayError('Empty capability gateway response');
  }
  if (typeof body.ok === 'boolean') {
    if (body.ok) {
      return body.data;
    }
    const err = body.error ?? {};
    const message = err.message || err.code || 'Capability gateway request failed';
    throw new CapabilityGatewayError(message, err.code, err.http_status ?? err.httpStatus);
  }
  return body;
}

async function requestOnce(
  url: string,
  method: CapabilityApiMethod,
  token: string,
  body: any,
): Promise<Response> {
  const headers: Record<string, string> = {
    'cli-token': token,
    'Accept': 'application/json',
    
  };
  const init: RequestInit = { method, headers };
  if (body !== undefined && method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  return fetch(url, init);
}

async function requestMultipartOnce(url: string, token: string, form: FormData): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      'cli-token': token,
      'Accept': 'application/json',
      
    },
    body: form,
  });
}

async function callGateway(
  host: string,
  domain: string,
  pathAfterV1: string,
  method: CapabilityApiMethod,
  body?: any,
): Promise<any> {
  const url = buildCapabilityGatewayUrl(host, domain, pathAfterV1);
  const token = await getCliToken(host);

  let resp = await requestOnce(url, method, token, body);

  if (resp.status === 403) {
    throw new PermissionError(await permissionMessage(resp));
  }

  if (resp.status === 401) {
    logger.warn(`Capability gateway request failed (HTTP 401) for ${host}, refreshing CLI token`);
    clearCliToken(host);
    const newToken = await getCliToken(host);
    process.stderr.write(`[ae-cli] CLI token refreshed for ${host}\n`);

    resp = await requestOnce(url, method, newToken, body);
    if (resp.status === 403) {
      throw new PermissionError(await permissionMessage(resp));
    }
    if (!resp.ok) {
      throw new Error(`Capability gateway HTTP error: ${resp.status} ${resp.statusText}`);
    }
  } else if (!resp.ok) {
    throw new Error(`Capability gateway HTTP error: ${resp.status} ${resp.statusText}`);
  }

  return unwrapCapabilityEnvelope(parseCapabilityResponse(await resp.text()));
}

export async function listCapabilities(host: string, domain: string): Promise<any> {
  return callGateway(host, domain, 'capabilities', 'GET');
}

export async function inspectCapability(host: string, domain: string, capabilityId: string): Promise<any> {
  return callGateway(host, domain, `capabilities/${capabilityId}`, 'GET');
}

export async function executeCapability(
  host: string,
  domain: string,
  capabilityId: string,
  input: Record<string, unknown> = {},
): Promise<any> {
  return callGateway(host, domain, `capabilities/${capabilityId}/execute`, 'POST', { input });
}

export async function dryRunCapability(
  host: string,
  domain: string,
  capabilityId: string,
  input: Record<string, unknown> = {},
): Promise<any> {
  return callGateway(host, domain, `capabilities/${capabilityId}/dry-run`, 'POST', { input });
}

export async function uploadInputFile(
  host: string,
  domain: string,
  projectId: number,
  purpose: string,
  filePath: string,
): Promise<any> {
  const fileBytes = await readFile(filePath);
  return uploadInputFileBytes(host, domain, projectId, purpose, fileBytes, basename(filePath));
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
  let resp = await requestMultipartOnce(url, token, form);

  if (resp.status === 403) {
    throw new PermissionError(await permissionMessage(resp));
  }

  if (resp.status === 401) {
    logger.warn(`Capability gateway request failed (HTTP 401) for ${host}, refreshing CLI token`);
    clearCliToken(host);
    const newToken = await getCliToken(host);
    process.stderr.write(`[ae-cli] CLI token refreshed for ${host}\n`);
    resp = await requestMultipartOnce(url, newToken, form);
    if (resp.status === 403) {
      throw new PermissionError(await permissionMessage(resp));
    }
    if (!resp.ok) {
      throw new Error(`Capability gateway HTTP error: ${resp.status} ${resp.statusText}`);
    }
  } else if (!resp.ok) {
    throw new Error(`Capability gateway HTTP error: ${resp.status} ${resp.statusText}`);
  }

  return unwrapCapabilityEnvelope(parseCapabilityResponse(await resp.text()));
}

/**
 * Generic capability-gateway call. GET sends `params` as query string; POST sends JSON body.
 * @deprecated Prefer listCapabilities / inspectCapability / executeCapability / dryRunCapability.
 */
export async function callCapabilityApi(
  host: string,
  domain: string,
  action: string,
  method: CapabilityApiMethod = 'POST',
  params: Record<string, any> = {},
): Promise<any> {
  const isGet = method === 'GET';
  if (isGet) {
    return callGateway(host, domain, action.replace(/^\/+|\/+$/g, ''), 'GET');
  }
  return callGateway(host, domain, action.replace(/^\/+|\/+$/g, ''), method, params);
}
