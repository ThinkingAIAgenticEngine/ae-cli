import fs from 'fs';
import path from 'path';
import { getToken } from './auth.js';
import { getActiveHost, getConfigDir } from './config.js';

const MCP_PROTOCOL_VERSION = '2025-11-25';
const JSONRPC_VERSION = '2.0';

export interface McpServerConfig {
  url: string;  // MCP 服务完整 URL，如 http://localhost:8901/mcp/community/http/content
}

/**
 * MCP 服务映射配置
 */
export interface McpServiceMapping {
  componentName: string;  // 服务组件名，如 community
  mappingPath: string;    // 映射路径，如 content
}

/**
 * service name -> MCP 映射配置
 * key: service name，value: { componentName, mappingPath }
 * 必须注册映射配置，未注册的 service 会抛出错误
 */
const serviceMappingMap = new Map<string, McpServiceMapping>();

// 注册 te_analysis 服务映射
registerMcpMapping('te_analysis', {
  componentName: 'analysis',
  mappingPath: 'analysis'
});

// 注册 te_analysis_extend 服务映射（te_analysis 域下的扩展工具路由使用）
registerMcpMapping('te_analysis_extend', {
  componentName: 'analysis',
  mappingPath: 'analysis-extend'
});

/**
 * 注册 service name 到 MCP 映射配置
 */
export function registerMcpMapping(serviceName: string, mapping: McpServiceMapping): void {
  serviceMappingMap.set(serviceName, mapping);
}

/**
 * 批量注册 service name 到 MCP 映射配置
 */
export function registerMcpMappings(mappings: Record<string, McpServiceMapping>): void {
  for (const [serviceName, mapping] of Object.entries(mappings)) {
    serviceMappingMap.set(serviceName, mapping);
  }
}

/**
 * 获取 service 对应的 MCP 映射配置
 * 未注册则抛出错误，必须先通过 registerMcpMapping 注册
 */
export function getMcpMapping(serviceName: string): McpServiceMapping {
  const mapping = serviceMappingMap.get(serviceName);
  if (!mapping) {
    throw new Error(`MCP mapping not found for service: '${serviceName}'. Please register it using registerMcpMapping() first.`);
  }
  return mapping;
}

/**
 * 构建 MCP 服务完整 URL
 * 格式: ${host}/mcp/${componentName}/http/${mappingPath}
 * 必须先注册映射配置，否则抛出错误
 */
export function buildMcpUrl(host: string, serviceName: string): string {
  const mapping = getMcpMapping(serviceName);
  const base = host.replace(/\/+$/, '');
  return `${base}/mcp/${mapping.componentName}/http/${mapping.mappingPath}`;
}

/**
 * 获取 MCP URL
 * 如果指定了 mcpUrlOverride，直接返回
 * 否则根据 host 和 serviceName 自动构建
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

const MCP_TOKEN_FILE = path.join(getConfigDir(), 'mcp-tokens.json');
const MCP_TOKEN_GENERATE_PATH = '/v1/ta/mcp/token/generate';

type McpTokenStore = Record<string, string>;

function loadMcpTokenStore(): McpTokenStore {
  try {
    if (fs.existsSync(MCP_TOKEN_FILE)) {
      return JSON.parse(fs.readFileSync(MCP_TOKEN_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveMcpTokenStore(store: McpTokenStore): void {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(MCP_TOKEN_FILE, JSON.stringify(store, null, 2));
}

/**
 * 通过 TE Token 调用 /v1/ta/mcp/token/generate 生成 MCP Token
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

  const data = await resp.json();

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
 * 获取 MCP Token
 * 优先从 ~/.ae-cli/mcp-token.json 缓存读取，不存在则调用接口生成并缓存
 */
async function getMcpToken(hostOverride?: string): Promise<string> {
  const hostUrl = hostOverride || getActiveHost();

  // 1. 从缓存文件读取
  const store = loadMcpTokenStore();
  if (store[hostUrl]) {
    return store[hostUrl];
  }

  // 2. 缓存不存在，调用接口生成
  const mcpToken = await generateMcpToken(hostUrl);

  // 3. 存储到缓存
  const updatedStore = { ...store, [hostUrl]: mcpToken };
  saveMcpTokenStore(updatedStore);

  return mcpToken;
}

/**
 * 清除指定 host 的 MCP Token 缓存
 */
export function clearMcpToken(hostUrl?: string): void {
  const store = loadMcpTokenStore();
  if (hostUrl) {
    delete store[hostUrl];
  } else {
    // 清除所有
    for (const key of Object.keys(store)) {
      delete store[key];
    }
  }
  saveMcpTokenStore(store);
}

/**
 * 发送 MCP HTTP 请求
 */
async function mcpRequest(
  url: string,
  method: string,
  params: any = {},
  hostOverride?: string
): Promise<any> {
  const token = await getMcpToken(hostOverride);
  const requestId = genRequestId();

  // 添加 _meta.progressToken 到 params
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
    'mcp-token': token
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`MCP HTTP error: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();

  // JSON-RPC 错误检查
  if (data.error) {
    throw new Error(`MCP error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  return data.result;
}

/**
 * 列出 MCP 服务器上的所有工具
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
 * 调用 MCP 工具
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

  const result = await mcpRequest(url, 'tools/call', params, hostOverride);

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
 * 解析 MCP 工具结果（尝试解析 JSON）
 */
export function parseMcpResult(result: McpToolResult): any {
  if (result.content.length > 0 && result.content[0].type === 'text') {
    const text = result.content[0].text || '';
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return result;
}
