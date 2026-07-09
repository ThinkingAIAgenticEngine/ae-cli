# DataOps CLI Token 鉴权改造方案

## 背景

当前 `ae-cli` 的 DataOps 命令会调用 Gaia 的 REST 接口，路径在 `/v1/gaia/mcp/api/**` 下，请求头使用 `Authorization: bearer <accessToken>`。

目标是让 DataOps 对齐现有 metadata 命令的 CLI token 模式：

- 只使用 `cli-token` 作为请求凭证。
- 请求走 CLI gateway 路径。
- 前端 `/v1/gaia/**` 鉴权和 MCP `/mcp/**` 鉴权保持独立。

## 已确认决策

### Gateway 与后端路径

`ae-cli` 发送 DataOps 请求到：

```text
/api/cli/dataops/v1/gaia/<domain>/...
```

Nginx 转发配置：

```nginx
location ^~ /api/cli/dataops/ {
    proxy_pass http://gaia/api/cli/;
}
```

Gaia 实际收到的路径：

```text
/api/cli/v1/gaia/<domain>/...
```

Gaia controller 根路径为：

```java
@RequestMapping("/api/cli/v1/gaia/datatable")
@RequestMapping("/api/cli/v1/gaia/workflow")
@RequestMapping("/api/cli/v1/gaia/operations")
@RequestMapping("/api/cli/v1/gaia/integration")
@RequestMapping("/api/cli/v1/gaia/ide")
@RequestMapping("/api/cli/v1/gaia/repo")
```

`ae-cli` DataOps 路径映射里不需要保留旧的 `/v1/gaia/mcp/api/**` CLI REST 路径。

### 鉴权行为

DataOps 需要对齐 `metadata event get` 的行为：

- `401`：清理本地缓存的 CLI token，重新 mint/get 一个新的 CLI token，然后重试一次。
- `403`：抛出权限错误，不清理 token，不重试。
- 其他非 2xx 响应：透出 HTTP/API 错误。

本次范围不改 td-auth starter。`CliAuthHandlerInterceptor` 当前的状态码行为保持不变。

### Gaia 拦截器边界

Gaia 只把 `CliAuthHandlerInterceptor` 注册到：

```text
/api/cli/**
```

现有鉴权边界保持不变：

- 前端/API 路径 `/v1/gaia/**` 继续使用现有 DW auth 流程。
- MCP 路径 `/mcp/**` 继续使用 `McpAuthHandlerInterceptor`。

## 改造范围

### te-cli

更新 `src/commands/te-dataops/shared.ts`：

- 用 `getCliToken()` 替换 access-token 鉴权。
- 发送 `cli-token` 请求头，不再发送 `Authorization`。
- 将所有 `/v1/gaia/mcp/api/**` 路径替换为 `/api/cli/dataops/v1/gaia/**`。
- `401` 和 `403` 处理对齐 capability/metadata。
- dry-run 输出对齐新的 gateway URL。

### Gaia

更新 `gaia-start/src/main/java/cn/thinkingdata/gaia/config/WebAppConfig.java`：

- 注入 `CliAuthHandlerInterceptor`。
- 将它注册到 `/api/cli/**`。

更新现有 DataOps REST controller：

- 将 class-level mapping 从 `/v1/gaia/mcp/api/<domain>` 改为 `/api/cli/v1/gaia/<domain>`。
- 复用现有 controller method 和 service 逻辑。

## 不在本次范围

- 不重做 DataOps capability gateway。
- 不把 DataOps 命令改写成 MCP 协议。
- 不改前端鉴权。
- 不改 td-auth starter 行为。
- 不为旧 DataOps CLI 路径保留兼容分支。

## 验证方式

最小验证项：

- `ae-cli metadata event get --project-id 1 --event-name login` 行为保持不变。
- 一个 DataOps 读命令的 dry-run 展示 `/api/cli/dataops/v1/gaia/...`。
- 一个 DataOps 写命令的 dry-run 展示 `/api/cli/dataops/v1/gaia/...`。
- DataOps 运行时请求发送 `cli-token`，不发送 `Authorization`。
- Gaia `/api/cli/v1/gaia/...` 请求命中 `CliAuthHandlerInterceptor`。
- Gaia `/v1/gaia/**` 和 `/mcp/**` 鉴权路径不变。
