import type { RuntimeContext } from '../framework/types.js';
import { getMcpToken } from './mcp.js';
import { safeJsonParse } from './json-utils.js';

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
  input: string,
  init: RequestInit,
  mcpToken: string
): Promise<any> {
  const headers = new Headers(init.headers);
  headers.set('mcp-token', mcpToken);

  const resp = await fetch(input, { ...init, headers });
  return parseKbResponse(resp, await resp.text());
}

export async function kbApi(
  ctx: RuntimeContext,
  method: string,
  path: string,
  params: Record<string, any> = {},
  body?: any
): Promise<any> {
  const host = ctx.host();
  const mcpToken = await getMcpToken(host);

  const upperMethod = method.toUpperCase();
  return fetchWithMcpToken(buildUrl(host, path, params), {
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
  const mcpToken = await getMcpToken(host);

  return fetchWithMcpToken(buildUrl(host, path, params), {
    method: 'POST',
    body: form,
  }, mcpToken);
}
