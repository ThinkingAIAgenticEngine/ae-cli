import fs from 'fs';
import { getActiveHost } from './config.js';
import { getCliToken, clearCliToken } from './cli-token.js';
import { safeJsonParse } from './json-utils.js';
import { logger } from './logger.js';
import { PermissionError } from './errors.js';

/** Extract a human-readable permission message from a 403 response body, with a sensible fallback (F-018). */
async function permissionMessage(resp: Response): Promise<string> {
  const text = await resp.text().catch(() => '');
  try {
    const d: any = safeJsonParse(text);
    const msg = d && (d.error?.message || (typeof d.error === 'string' ? d.error : undefined) || d.message);
    if (msg && typeof msg === 'string') return msg;
  } catch { /* non-JSON body */ }
  return 'Permission denied for this resource (HTTP 403)';
}

function isInvalidCliTokenMessage(message: string): boolean {
  return /\b(cli[-_\s]?token|token)\b.*\binvalid\b/i.test(message)
    || /\binvalid\b.*\b(cli[-_\s]?token|token)\b/i.test(message);
}

const MCP_PROTOCOL_VERSION = '2025-11-25';
const JSONRPC_VERSION = '2.0';

export interface McpServerConfig {
  url: string;  // Full MCP service URL, e.g. http://localhost:8901/mcp/community/http/content
}

/**
 * MCP service mapping configuration
 */
export interface McpServiceMapping {
  componentName: string;  // Service component name, e.g. community
  mappingPath: string;    // Mapping path, e.g. content
}

/**
 * service name -> MCP mapping configuration
 * key: service name, value: { componentName, mappingPath }
 * Mapping configuration must be registered; unregistered services will throw an error
 */
const serviceMappingMap = new Map<string, McpServiceMapping>();

/**
 * Register a service name to MCP mapping configuration
 */
export function registerMcpMapping(serviceName: string, mapping: McpServiceMapping): void {
  serviceMappingMap.set(serviceName, mapping);
}

/**
 * Batch-register service names to MCP mapping configurations
 */
export function registerMcpMappings(mappings: Record<string, McpServiceMapping>): void {
  for (const [serviceName, mapping] of Object.entries(mappings)) {
    serviceMappingMap.set(serviceName, mapping);
  }
}

/**
 * Get the MCP mapping configuration for a service
 * Throws if not registered; must be registered first via registerMcpMapping
 */
export function getMcpMapping(serviceName: string): McpServiceMapping {
  const mapping = serviceMappingMap.get(serviceName);
  if (!mapping) {
    throw new Error(`MCP mapping not found for service: '${serviceName}'. Please register it using registerMcpMapping() first.`);
  }
  return mapping;
}

/**
 * Build the full MCP service URL
 * Format: ${host}/mcp/${componentName}/http/${mappingPath}
 * Mapping configuration must be registered first; otherwise throws an error
 */
export function buildMcpUrl(host: string, serviceName: string): string {
  const mapping = getMcpMapping(serviceName);
  const base = host.replace(/\/+$/, '');
  return `${base}/mcp/${mapping.componentName}/http/${mapping.mappingPath}`;
}

/**
 * Resolve the MCP URL
 * If mcpUrlOverride is specified, return it directly;
 * otherwise build automatically from host and serviceName
 */
export function resolveMcpUrl(mcpUrlOverride: string | undefined, host: string, serviceName: string): string {
  if (mcpUrlOverride) {
    return mcpUrlOverride;
  }
  return buildMcpUrl(host, serviceName);
}

export interface McpToolInfo {
  serverName: string;
  name: string;
  description: string;
  arguments: McpToolArgument[];
}

export interface McpToolArgument {
  name: string;
  description: string;
  primaryType: string;
  required: boolean;
  schema: string;
}

export interface McpToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

let requestIdCounter = 1;

function genRequestId(): number {
  return requestIdCounter++;
}

/**
 * Build the auth header set sent on every MCP JSON-RPC request.
 * Only `cli-token` is sent: the backend McpAuthHandlerInterceptor validates CLI tokens when this
 * header is present alone. Sending the same value in `mcp-token` as well currently breaks auth
 * (interceptor skips the cli branch and rejects non-mcp_ prefixes with HTTP 500).
 */
function buildAuthHeaders(cliToken: string): Record<string, string> {
  return {
    'cli-token': cliToken,
  };
}

/**
 * Send an MCP HTTP request
 */
async function mcpRequest(
  url: string,
  method: string,
  params: any = {},
  hostOverride?: string
): Promise<any> {
  const hostUrl = hostOverride || getActiveHost();
  const token = await getCliToken(hostUrl);
  const requestId = genRequestId();

  // Add _meta.progressToken to params
  const paramsWithMeta = {
    ...params,
    _meta: { progressToken: requestId },
  };

  const body = {
    jsonrpc: JSONRPC_VERSION,
    id: requestId,
    method,
    params: paramsWithMeta,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'mcp-protocol-version': MCP_PROTOCOL_VERSION,
    
    ...buildAuthHeaders(token),
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    let permissionMsg: string | undefined;
    if (resp.status === 403) {
      permissionMsg = await permissionMessage(resp);
      if (!isInvalidCliTokenMessage(permissionMsg)) {
        // F-018: 403 = authenticated-but-forbidden (permission/scope), NOT a token issue.
        throw new PermissionError(permissionMsg);
      }
    }
    // 401, or 403 with an explicit invalid CLI token message: clear cache and retry once.
    if (resp.status === 401 || (resp.status === 403 && permissionMsg)) {
      logger.warn(`MCP request failed (${resp.status === 403 ? permissionMsg : 'HTTP 401'}) for ${hostUrl}, refreshing CLI token`);
      clearCliToken(hostUrl);
      const newToken = await getCliToken(hostUrl);

      logger.info(`CLI token refreshed for ${hostUrl}`);
      process.stderr.write(`[ae-cli] CLI token refreshed for ${hostUrl}\n`);

      Object.assign(headers, buildAuthHeaders(newToken));
      const retryResp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      // F-018: a 403 after re-mint is a genuine permission denial, not a token problem.
      if (retryResp.status === 403) {
        throw new PermissionError(await permissionMessage(retryResp));
      }
      if (!retryResp.ok) {
        throw new Error(`MCP HTTP error: ${retryResp.status} ${retryResp.statusText}`);
      }
      const retryData = safeJsonParse(await retryResp.text());
      if (retryData.error) {
        throw new Error(`MCP error: ${retryData.error.message || JSON.stringify(retryData.error)}`);
      }
      return retryData.result;
    }
    throw new Error(`MCP HTTP error: ${resp.status} ${resp.statusText}`);
  }

  const data = safeJsonParse(await resp.text());

  // JSON-RPC error check
  if (data.error) {
    throw new Error(`MCP error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  return data.result;
}

/**
 * List all tools on the MCP server
 */
export async function listMcpTools(
  url: string,
  hostOverride?: string
): Promise<McpToolInfo[]> {
  const result = await mcpRequest(url, 'tools/list', {}, hostOverride);

  return result.tools.map((tool: any) => ({
    name: tool.name,
    description: tool.description || '',
    arguments: Object.entries(tool.inputSchema?.properties || {}).map(([name, schema]) => ({
      name,
      description: (schema as any).description || '',
      primaryType: (schema as any).type || 'string',
      required: tool.inputSchema?.required?.includes(name) || false,
      schema: JSON.stringify(schema),
    })),
  }));
}

/**
 * Call an MCP tool
 */
export async function callMcpTool(
  url: string,
  toolName: string,
  args: Record<string, any> = {},
  hostOverride?: string
): Promise<McpToolResult> {
  const params = {
    name: toolName,
    arguments: args,
  };

  logger.info(`MCP tool call: ${toolName}`);
  const result = await mcpRequest(url, 'tools/call', params, hostOverride);

  if (result.isError) {
    logger.warn(`MCP tool call failed: ${toolName}`);
  }

  return {
    content: result.content.map((item: any) => {
      if (item.type === 'text') {
        return { type: 'text', text: item.text };
      } else if (item.type === 'image') {
        return { type: 'image', data: item.data, mimeType: item.mimeType };
      } else {
        return { type: 'resource', ...item };
      }
    }),
    isError: result.isError,
  };
}

/**
 * Parse an MCP tool result (attempts JSON parsing)
 */
export function parseMcpResult(result: McpToolResult): any {
  if (result.isError) {
    const firstText = result.content.find((item) => item.type === 'text')?.text || '';
    let errorMessage = firstText.trim() || 'MCP tool call failed';
    try {
      const parsed = safeJsonParse(firstText);
      errorMessage = mcpResultErrorMessage(parsed) || errorMessage;
    } catch {
      // Plain-text MCP errors are already suitable for the CLI error envelope.
    }
    throwMcpError(errorMessage);
  }
  if (result.content.length > 0 && result.content[0].type === 'text') {
    const text = result.content[0].text || '';
    let parsed: any;
    try {
      parsed = safeJsonParse(text);
    } catch {
      return text;
    }
    // F-021: a tool result that is purely a business error envelope ({error:"..."} or
    // {error:{code,message}}) with no success indicator is a failure, not data — surface it.
    const errMsg = mcpResultErrorMessage(parsed);
    if (errMsg !== null) {
      throwMcpError(errMsg);
    }
    return parsed;
  }
  return result;
}

/** Returns a failure message if `parsed` is a pure error envelope, else null (F-021). */
function mcpResultErrorMessage(parsed: any): string | null {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  if (parsed.success === true || parsed.ok === true) return null;
  const explicitlyFailed = parsed.success === false || parsed.ok === false;
  const e = parsed.error;
  if (typeof e === 'string' && e.trim()) return e;
  if (e && typeof e === 'object') {
    const msg = (typeof e.message === 'string' && e.message) || undefined;
    const code = (typeof e.code === 'string' && e.code) || undefined;
    if (msg && code) return `${code}: ${msg}`;
    if (msg || code) return (msg || code) as string;
  }
  if (explicitlyFailed) {
    const msg = typeof parsed.message === 'string' && parsed.message.trim()
      ? parsed.message.trim()
      : undefined;
    const codeValue = parsed.errorCode ?? parsed.error_code ?? parsed.code;
    const code = typeof codeValue === 'string' && codeValue.trim()
      ? codeValue.trim()
      : undefined;
    if (msg && code) return `${code}: ${msg}`;
    return msg || code || 'MCP tool call failed';
  }
  return null;
}

function throwMcpError(message: string): never {
  if (/no_auth|auth_error|permission|forbidden|unauthor|\u65e0\u6743/i.test(message)) {
    throw new PermissionError(message);
  }
  throw new Error(message);
}
