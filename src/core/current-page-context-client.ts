import { getFromMainApp, TeAgentApiError } from './te-agent-client.js';
import { safeJsonParse } from './json-utils.js';

/** Only this command may reuse the runtime's narrowly scoped page MCP grant. */
export async function readCurrentPageContext(path: string): Promise<unknown> {
  const url = process.env.TE_AGENT_PAGE_CONTEXT_MCP_URL;
  const grant = process.env.TE_AGENT_PAGE_CONTEXT_TOKEN;
  // Keep the published transport for older sandbox versions. A rejected or
  // incomplete new binding must never fall back to broader credentials.
  if (url === undefined && grant === undefined) return getFromMainApp(path);
  let endpoint: URL;
  try {
    endpoint = new URL(url ?? '');
    if (!grant || !['http:', 'https:'].includes(endpoint.protocol)
      || endpoint.username || endpoint.password || endpoint.search || endpoint.hash
      || !endpoint.pathname.endsWith('/api/internal/dashboard-context/mcp')) throw new Error();
  } catch {
    throw new TeAgentApiError('Current page context Run binding is invalid.', 0, 'CURRENT_PAGE_CONTEXT_BINDING_INVALID');
  }
  let response: Response;
  try {
    response = await fetch(endpoint.toString(), {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'MCP-Protocol-Version': '2025-03-26',
        'X-TE-Page-Context-Token': grant!,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'read_current_page_context', arguments: {} } }),
    });
  } catch {
    // Do not include the URL, grant, headers, or low-level request object.
    throw new TeAgentApiError('Current page context MCP request failed.', 0, 'CURRENT_PAGE_CONTEXT_NETWORK_ERROR');
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new TeAgentApiError(`Current page context authorization/request failed (HTTP ${response.status}).`,
      response.status, 'CURRENT_PAGE_CONTEXT_UNAVAILABLE', undefined,
      response.status === 403 ? 'permission' : response.status === 401 ? 'auth' : 'api');
  }
  const reader = response.body?.getReader();
  if (!reader) throw invalidResponse();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4 * 1024 * 1024) throw invalidResponse();
      chunks.push(value);
    }
  } catch {
    await reader.cancel().catch(() => undefined);
    throw invalidResponse();
  } finally {
    reader.releaseLock();
  }
  let envelope: any;
  try { envelope = safeJsonParse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw invalidResponse(); }
  if (envelope?.error || envelope?.result?.isError) {
    throw new TeAgentApiError('Current page context is unavailable for this Run; authorization may have expired or been revoked.',
      403, 'CURRENT_PAGE_CONTEXT_UNAVAILABLE');
  }
  const content = envelope?.result?.content;
  if (envelope?.jsonrpc !== '2.0' || envelope.id !== 1 || !Array.isArray(content)
    || content.length !== 1 || content[0]?.type !== 'text') throw invalidResponse();
  try { return safeJsonParse(content[0].text); }
  catch { throw invalidResponse(); }
}

function invalidResponse() {
  return new TeAgentApiError('Invalid current page context MCP response.', 0, 'CURRENT_PAGE_CONTEXT_RESPONSE_INVALID');
}
