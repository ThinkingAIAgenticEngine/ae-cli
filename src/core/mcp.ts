import fs from 'fs';
import { getToken } from './auth.js';
import { getAnalysisMappingPathForClusterMode } from './cluster-info.js';
import { getActiveHost, getFallbackMcpToken } from './config.js';
import { loadMcpToken as loadSecureMcpToken } from './secure-store.js';
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

// Register analysis service mapping (mappingPath resolved dynamically in getMcpMapping)
registerMcpMapping('analysis', {
  componentName: 'analysis',
  mappingPath: 'analysis',
});

// Register te_analysis_extend service mapping (used by extended tool routing under the analysis domain)
registerMcpMapping('te_analysis_extend', {
  componentName: 'analysis',
  mappingPath: 'analysis-extend'
});

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
  if (serviceName === 'analysis') {
    return { ...mapping, mappingPath: getAnalysisMappingPathForClusterMode() };
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

const MCP_TOKEN_GENERATE_PATH = '/v1/ta/mcp/token/generate';

/**
 * In-process MCP token cache (host -> token)
 * Valid only within the current process lifetime; never written to disk.
 */
const _mcpTokenCache = new Map<string, string>();

/**
 * Mint an MCP token on-demand by calling /v1/ta/mcp/token/generate with the AE token.
 * Result is cached in process memory to avoid repeated minting within the same CLI invocation.
 */
async function generateMcpToken(hostUrl: string): Promise<string> {
  const teToken = await getToken(hostUrl);
  const base = hostUrl.replace(/\/+$/, '');
  const url = `${base}${MCP_TOKEN_GENERATE_PATH}`;

  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `bearer ${teToken}`,
    },
  });

  if (!resp.ok) {
    throw new Error(`MCP token generate HTTP error: ${resp.status} ${resp.statusText}`);
  }

  const data = safeJsonParse(await resp.text());

  if (data.return_code !== 0) {
    throw new Error(`MCP token generate error: ${data.return_message || 'unknown'} (code: ${data.return_code})`);
  }

  const mcpToken = data.data?.userSecret;
  if (!mcpToken) {
    throw new Error('MCP token generate error: empty userSecret in response');
  }

  return mcpToken;
}

/**
 * Get MCP token (in-process cache; never written to disk).
 * Repeated calls within the same process hit the in-memory cache to avoid redundant minting.
 * mcpToken is no longer written to ~/.ae-cli/mcp-tokens.json.
 */
export async function getMcpToken(hostOverride?: string): Promise<string> {
  const hostUrl = hostOverride || getActiveHost();

  // 1. Check in-process cache
  const cached = _mcpTokenCache.get(hostUrl);
  if (cached) {
    return cached;
  }

  // 2. Persisted long-lived MCP token from secure-store (written by device login).
  // Prefer login credentials for the active host over a sandbox-injected fallback token
  // provisioned for a different URL (common when ~/.ae-config/mcp-token.json coexists with remote auth).
  const storedToken = loadSecureMcpToken(hostUrl);
  if (storedToken) {
    _mcpTokenCache.set(hostUrl, storedToken);
    logger.info(`Using persisted MCP token (secure-store) for ${hostUrl}`);
    return storedToken;
  }

  // 3. Sandbox path — a pre-provisioned mcp-token may be injected via the legacy fallback file.
  // Inside a sandbox there is no user access token to mint with, so this MUST be consulted
  // before attempting to mint. In personal/local environments the fallback file is absent,
  // so this is skipped and we fall through below.
  const fallbackToken = getFallbackMcpToken(hostUrl);
  if (fallbackToken) {
    _mcpTokenCache.set(hostUrl, fallbackToken);
    logger.info(`Using sandbox-provisioned MCP token (fallback file) for ${hostUrl}`);
    return fallbackToken;
  }

  // 4. Cache miss, no persisted token, no fallback — mint via the API (requires a user access token)
  logger.info(`Generating MCP token for ${hostUrl}`);
  const mcpToken = await generateMcpToken(hostUrl);

  // 5. Cache in memory only; do not write to disk
  _mcpTokenCache.set(hostUrl, mcpToken);
  logger.info(`MCP token generated and in-process cached for ${hostUrl}`);

  return mcpToken;
}

/**
 * Clear the in-process MCP token cache.
 * Note: mcp-tokens.json is deprecated and no longer written; this function only clears the in-memory cache.
 */
export function clearMcpToken(hostUrl?: string): void {
  if (hostUrl) {
    _mcpTokenCache.delete(hostUrl);
  } else {
    _mcpTokenCache.clear();
  }
}

/**
 * Manually set an MCP token (writes to in-process cache).
 * Note: no longer written to disk; valid only within the current process.
 */
export function setMcpTokenManual(token: string, hostUrl: string): void {
  _mcpTokenCache.set(hostUrl, token);
  logger.info(`MCP token manually set (in-process) for ${hostUrl}`);
}

/**
 * Return the in-process MCP token cache (read-only display, e.g. for auth status).
 * Compatibility shim: previously returned the on-disk store; now returns the in-memory Map as a Record.
 */
export function loadMcpTokenStore(): Record<string, string> {
  return Object.fromEntries(_mcpTokenCache.entries());
}

/**
 * Validate whether an MCP token is valid
 * Tested by calling the tools/list method
 */
export async function validateMcpToken(token: string, hostUrl: string): Promise<boolean> {
  const mapping = getMcpMapping('analysis');
  const base = hostUrl.replace(/\/+$/, '');
  const url = `${base}/mcp/${mapping.componentName}/http/${mapping.mappingPath}`;
  const requestId = 1;

  const body = {
    jsonrpc: JSONRPC_VERSION,
    id: requestId,
    method: 'tools/list',
    params: { _meta: { progressToken: requestId } },
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'mcp-protocol-version': MCP_PROTOCOL_VERSION,
    'mcp-token': token,
    
  };

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      return false;
    }

    const data = safeJsonParse(await resp.text());
    // A JSON-RPC error indicates the token is invalid
    if (data.error) {
      return false;
    }

    // A tools list in the result indicates success
    return data.result?.tools !== undefined;
  } catch {
    return false;
  }
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
  const token = await getMcpToken(hostUrl);
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
    'mcp-token': token,
    
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    // F-018: 403 = authenticated-but-forbidden (permission/scope), NOT a token issue — do NOT re-mint/retry.
    if (resp.status === 403) {
      throw new PermissionError(await permissionMessage(resp));
    }
    // 401 = token expired/invalid: clear cache, re-mint (or re-read sandbox fallback), retry once.
    if (resp.status === 401) {
      logger.warn(`MCP request failed (HTTP 401) for ${hostUrl}, re-minting token`);
      _mcpTokenCache.delete(hostUrl);
      // Also try the legacy fallback file (may still be present in sandbox environments).
      // The persisted secure-store token is intentionally NOT consulted here: it is the token
      // that just failed, so we re-read the (possibly refreshed) sandbox file or re-mint.
      const fallbackToken = getFallbackMcpToken(hostUrl);
      const newToken = fallbackToken ?? await generateMcpToken(hostUrl);
      _mcpTokenCache.set(hostUrl, newToken);

      logger.info(`MCP token re-minted for ${hostUrl}`);
      process.stderr.write(`[ae-cli] MCP token re-minted for ${hostUrl}\n`);

      headers['mcp-token'] = newToken;
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
      if (/no_auth|auth_error|permission|forbidden|unauthor|\u65e0\u6743/i.test(errMsg)) {
        throw new PermissionError(errMsg);
      }
      throw new Error(errMsg);
    }
    return parsed;
  }
  return result;
}

/** Returns a failure message if `parsed` is a pure error envelope, else null (F-021). */
function mcpResultErrorMessage(parsed: any): string | null {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  if (parsed.success === true || parsed.ok === true) return null;
  const e = parsed.error;
  if (typeof e === 'string' && e.trim()) return e;
  if (e && typeof e === 'object') {
    const msg = (typeof e.message === 'string' && e.message) || undefined;
    const code = (typeof e.code === 'string' && e.code) || undefined;
    if (msg && code) return `${code}: ${msg}`;
    if (msg || code) return (msg || code) as string;
  }
  return null;
}
