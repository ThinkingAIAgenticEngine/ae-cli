import type { RuntimeContext } from '../framework/types.js';
import { loadMcpTokenStore } from './mcp.js';
import { forceMigrateFromFallback } from './config.js';
import { safeJsonParse } from './json-utils.js';
import { logger } from './logger.js';

function buildUrl(host: string, path: string, params: Record<string, any> = {}): string {
  const base = host.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${base}${p}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function getMcpTokenForHost(host: string): string | undefined {
  const store = loadMcpTokenStore();
  const normalizedHost = host.replace(/\/+$/, '');
  if (store[host]) return store[host];
  if (store[normalizedHost]) return store[normalizedHost];

  for (const [key, token] of Object.entries(store)) {
    if (key.replace(/\/+$/, '') === normalizedHost) {
      return token;
    }
  }

  return undefined;
}

function getTokenFromStore(store: Record<string, string>, host: string): string | undefined {
  const normalizedHost = host.replace(/\/+$/, '');
  if (store[host]) return store[host];
  if (store[normalizedHost]) return store[normalizedHost];

  for (const [key, token] of Object.entries(store)) {
    if (key.replace(/\/+$/, '') === normalizedHost) {
      return token;
    }
  }

  return undefined;
}

function refreshMcpTokenFromFallback(host: string): string | undefined {
  logger.warn(`KB MCP request failed for ${host}, trying fallback`);
  const migrated = forceMigrateFromFallback();
  const token = migrated ? getTokenFromStore(migrated, host) : undefined;

  if (token) {
    logger.info(`KB MCP token refreshed from fallback for ${host}`);
    process.stderr.write(`[ae-cli] MCP token refreshed from fallback for ${host}\n`);
  }

  return token;
}

function isMcpAuthFailure(resp: Response, data: any): boolean {
  return !resp.ok || data.return_code === -1001;
}

function parseKbResponse(resp: Response, text: string): any {
  if (resp.status === 401 || resp.status === 403) {
    throw new Error(`KB MCP token auth failed: HTTP ${resp.status} ${resp.statusText}`);
  }

  const data = safeJsonParse(text);

  if (data.return_code === -1001) {
    throw new Error(`KB MCP token auth failed: ${data.return_message || 'unauthorized'} (code: ${data.return_code})`);
  }

  if (data.return_code !== 0 && data.return_code !== undefined) {
    throw new Error(`AE API error: ${data.return_message || 'unknown'} (code: ${data.return_code})`);
  }

  return data.data !== undefined ? data.data : data;
}

async function fetchWithMcpToken(
  host: string,
  input: string,
  init: RequestInit,
  mcpToken: string
): Promise<any> {
  const headers = new Headers(init.headers);
  headers.set('mcp-token', mcpToken);

  const resp = await fetch(input, { ...init, headers });
  const text = await resp.text();

  if (!resp.ok) {
    const refreshedToken = refreshMcpTokenFromFallback(host);
    if (refreshedToken) {
      headers.set('mcp-token', refreshedToken);
      const retryResp = await fetch(input, { ...init, headers });
      return parseKbResponse(retryResp, await retryResp.text());
    }

    return parseKbResponse(resp, text);
  }

  const data = safeJsonParse(text);

  if (isMcpAuthFailure(resp, data)) {
    const refreshedToken = refreshMcpTokenFromFallback(host);
    if (refreshedToken) {
      headers.set('mcp-token', refreshedToken);
      const retryResp = await fetch(input, { ...init, headers });
      return parseKbResponse(retryResp, await retryResp.text());
    }
  }

  return parseKbResponse(resp, text);
}

export async function kbApi(
  ctx: RuntimeContext,
  method: string,
  path: string,
  params: Record<string, any> = {},
  body?: any
): Promise<any> {
  const host = ctx.host();
  const mcpToken = getMcpTokenForHost(host);

  if (!mcpToken) {
    return ctx.api(method, path, params, body);
  }

  const upperMethod = method.toUpperCase();
  return fetchWithMcpToken(host, buildUrl(host, path, params), {
    method: upperMethod,
    headers: {
      'Content-Type': 'application/json',
    },
    body: upperMethod === 'GET' ? undefined : JSON.stringify(body ?? {}),
  }, mcpToken);
}

export async function kbUpload(
  ctx: RuntimeContext,
  path: string,
  form: FormData,
  params: Record<string, any> = {}
): Promise<any> {
  const host = ctx.host();
  const mcpToken = getMcpTokenForHost(host);

  if (!mcpToken) {
    const { httpUpload } = await import('./client.js');
    return httpUpload(path, form, params, host);
  }

  return fetchWithMcpToken(host, buildUrl(host, path, params), {
    method: 'POST',
    body: form,
  }, mcpToken);
}
