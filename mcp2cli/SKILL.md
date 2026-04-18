---
name: mcp2cli
description: 将 MCP 服务接入 ae-cli 工具的指南。当用户提到 MCP 服务接入、注册 MCP 映射、构建 MCP URL、调用 MCP 工具、或需要将新的 MCP 服务集成到 CLI 工具时，使用此 skill。TRIGGER when: 用户询问如何接入 MCP、MCP URL 拼接规则、MCP Token 认证、listMcpTools/callMcpTool 等函数使用方式。
---

# MCP 服务接入 ae-cli 指南

本文档说明如何将新的 MCP 服务接入到 ae-cli 工具中。

## URL 构建规则

MCP 服务 URL 的标准格式：

```
${HOST}/mcp/${componentName}/http/${mappingPath}
```

**示例**：
- HOST: `http://10.206.16.32:8993`
- componentName: `community`
- mappingPath: `content`
- 最终 URL: `http://10.206.16.32:8993/mcp/community/http/content`

## 映射配置注册

### 接口定义

```typescript
interface McpServiceMapping {
  componentName: string;  // 服务组件名，如 community
  mappingPath: string;    // 映射路径，如 content
}
```

### 注册方式

**方式一：单个注册**

```typescript
import { registerMcpMapping } from './core/mcp.js';

registerMcpMapping('community_content', {
  componentName: 'community',
  mappingPath: 'content'
});
```

**方式二：批量注册**

```typescript
import { registerMcpMappings } from './core/mcp.js';

registerMcpMappings({
  'community_content': { componentName: 'community', mappingPath: 'content' },
  'user_profile': { componentName: 'user', mappingPath: 'profile' },
  'order_service': { componentName: 'order', mappingPath: 'service' }
});
```

### 映射注册要求

**必须注册映射配置**，未注册的 service 会抛出错误，除非使用mcp_url参数指定mcp全路径。

```typescript
// 错误示例：未注册映射直接调用会报错
buildMcpUrl('http://host', 'unregistered_service')
// Error: MCP mapping not found for service: 'unregistered_service'.
// Please register it using registerMcpMapping() first.
```

## URL 解析优先级

`resolveMcpUrl()` 函数按以下优先级解析 URL：

| 优先级 | 条件 | 行为 |
|--------|------|------|
| 1 | 指定了 `mcpUrlOverride` | 直接返回用户指定的完整 URL |
| 2 | 已注册映射配置 | 使用 `${host}/mcp/${componentName}/http/${mappingPath}` |
| 3 | 未注册映射 | 抛出错误：必须先注册映射配置 |

```typescript
// 优先级示例 - 指定 mcpUrlOverride（直接使用）
resolveMcpUrl('http://custom.url/mcp/path', 'http://host', 'service')
// → http://custom.url/mcp/path

// 优先级示例 - 已注册映射（自动构建）
resolveMcpUrl(undefined, 'http://host', 'community_content')
// → http://host/mcp/community/http/content

// 优先级示例 - 未注册映射（抛出错误）
resolveMcpUrl(undefined, 'http://host', 'unknown_service')
// → Error: MCP mapping not found for service: 'unknown_service'
```

## 认证机制

### MCP Token 获取流程

1. 使用 TE Token 调用 `/v1/ta/mcp/token/generate` 接口
2. 获取返回的 `userSecret` 作为 MCP Token
3. Token 缓存至 `~/.ae-cli/mcp-tokens.json`（按 host 存储）

### 请求认证头

所有 MCP 请求携带以下认证头：

```
mcp-protocol-version: 2025-11-05
mcp-token: ${生成的 MCP Token}
```

## 核心函数 API

### URL 构建

```typescript
buildMcpUrl(host: string, serviceName: string): string
resolveMcpUrl(mcpUrlOverride: string | undefined, host: string, serviceName: string): string
getMcpMapping(serviceName: string): McpServiceMapping  // 未注册会抛出错误
```

### 工具操作

```typescript
// 列出 MCP 服务的所有工具
listMcpTools(url: string, hostOverride?: string): Promise<McpToolInfo[]>

// 调用指定工具
callMcpTool(url: string, toolName: string, args: Record<string, any>, hostOverride?: string): Promise<McpToolResult>

// 解析工具结果（尝试 JSON 解析）
parseMcpResult(result: McpToolResult): any
```

### Token 管理

```typescript
// 清除指定 host 的 MCP Token 缓存
clearMcpToken(hostUrl?: string): void
```

## 新服务接入步骤

1. **确认服务信息**：获取 serviceName、componentName、mappingPath
2. **注册映射配置**：在应用启动时调用 `registerMcpMapping()` 或 `registerMcpMappings()`（**必须**）
3. **调用工具**：
   ```typescript
   const url = resolveMcpUrl(undefined, getActiveHost(), serviceName);
   const tools = await listMcpTools(url);
   const result = await callMcpTool(url, 'tool_name', { arg1: 'value' });
   const data = parseMcpResult(result);
   ```

## 数据结构

### McpToolInfo

```typescript
interface McpToolInfo {
  serverName: string;
  name: string;
  description: string;
  arguments: McpToolArgument[];
}

interface McpToolArgument {
  name: string;
  description: string;
  primaryType: string;
  required: boolean;
  schema: string;  // JSON Schema 字符串
}
```

### McpToolResult

```typescript
interface McpToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}
```