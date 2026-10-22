import { fetchSigned, parseResponse, type TeAgentHttpMethod } from './te-agent-client.js';
import { clearCliTokenCache } from './cli-token.js';

function checkPath(path: string): void {
  if (!path.startsWith('/api/resource-packages/')) {
    throw new TypeError('Resource package requests must use /api/resource-packages/');
  }
}

async function fetchResourcePackage(input: {
  host: string; method: TeAgentHttpMethod; path: string;
  body?: BodyInit; headers?: HeadersInit; timeoutMs?: number; includeJsonContentType: boolean;
}): Promise<Response> {
  const request = () => fetchSigned({ ...input, hostOverride: input.host });
  let response = await request();
  if (response.status === 401) {
    await response.body?.cancel();
    clearCliTokenCache(input.host);
    response = await request();
  }
  return response;
}

export async function resourcePackageJson<T>(input: {
  host: string; method: TeAgentHttpMethod; path: string; body?: unknown;
}): Promise<T> {
  checkPath(input.path);
  const response = await fetchResourcePackage({
    method: input.method, path: input.path, host: input.host, includeJsonContentType: true,
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  });
  return parseResponse<T>(response, 'Resource package service returned');
}

export async function resourcePackageRaw(input: {
  host: string; method: TeAgentHttpMethod; path: string;
  body?: BodyInit; headers?: HeadersInit; timeoutMs?: number;
}): Promise<Response> {
  checkPath(input.path);
  const response = await fetchResourcePackage({
    ...input, includeJsonContentType: false,
  });
  if (!response.ok) await parseResponse<never>(response, 'Resource package service returned');
  return response;
}
