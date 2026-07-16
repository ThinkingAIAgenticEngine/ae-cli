# Spec: ae-cli 错误语义化 + flag 必填性（F-017/F-018/F-019）

> 面向 te-cli 协作者。承接 F-016（HTTP 层 401/403 分流，已合并）；本轮把同语义延伸到 MCP/runner 层，并修 flag 必填性。
> 完整设计/计划见测试侧：`docs/plans/2026-06-22-ae-cli-error-semantics-and-flags-plan.md`（test-ae-agent）。

## 背景

- **F-018**：走 `mcp.ts` mcpRequest 的命令对 HTTP 403 当 token 失效（白白 re-mint+retry），再被 `runner.ts` 按 message 含 "403"/"token" 误标 `type:auth` + 提示重登；而账号其实已登录、只是无权。
- **F-019**：走 `mcp-access.ts` kbApi 的命令在服务端返回 `200 + {error:"..."}`（业务失败）时被包成 `ok:true`（失败显示成功）。
- **F-017**：`dataops_ide` 等命令把 desc 声明了默认值的 flag 标成 `required:true`，agent 被一连串 `Missing required flag` 卡住。

## 改动

### 结构化错误分类（F-018）
- `framework/types.ts` + `framework/output.ts`：error type 增加 **`permission`**。
- 新增 `core/errors.ts` 的 **`PermissionError`**（403/权限语义）。
- `framework/runner.ts`：catch **改按 `instanceof` 分类**（弃 message 子串）：
  - `PermissionError` → `type:permission`（不提示重登）
  - `SecureStoreAuthError` → `auth` + 重登
  - `TeAgentApiError` → status 403→permission / 401→auth / 其它→api
  - `TeAgentCredentialsError` → config + hint
  - 兜底 `looksLikeAuthFailure(message)`（窄：401/-1001/invalid access token/session expired/登录/ae-cli auth login；**排除 403/forbidden/permission**）→ auth；否则 api。

### MCP 层 403 / 业务错误（F-018 / F-019）
- `core/mcp.ts` mcpRequest：**403 不再 re-mint/retry**，抛 `PermissionError`（透传服务端消息）；401 保留 re-mint+retry（retry 仍 403 也抛 PermissionError）。
- `core/mcp-access.ts` parseKbResponse：403 → `PermissionError`；401 保留；**新增**：`200 + {error:string}`（无 return_code/success）→ 抛错（`ok:false` 透传消息）。

### flag 必填性（F-017）
- `commands/te-dataops/ide/*.ts`：把 desc 声明了默认值的 flag 改 `required:false` + `Flag.default`（框架已支持）：`connType→'SPACE'`、`repoCode→'te_etl'`、`engineType→'TASK_ENGINE_TRINO'`、`pageNum→1`、`pageSize→100`；`list-tables isView`→`required:false`（不设 default，省略即 `Boolean(undefined)=false`）。共 23 flag / 9 文件。
- **保持 required**：`spaceCode`/`catalog`/`schema`/`tableName`（无文档默认值）；`execute-sql repoCode`（desc 无默认）；`get-table-detail isView`（desc 是"auto-detect if not provided"，需 execute 条件省略，留作单独处理）。

## 验收

- [x] `npm run build` 绿；`self-check` P1=0/P2=0；单测全过（新增 `tests/error-classify.test.ts` 9、`tests/resource-url.test.ts` 6；secure-store 15 / device-auth 22 / mcp-no-disk 14 / te-agent-credentials 10）。
- [x] **F-017 e2e**（inner-audit）：`dataops_ide +list_tables --spaceCode default --catalog hive --schema datamap` 不再报 `Missing required flag`，直达服务端（connType/repoCode/isView/pageNum/pageSize 套默认）。
- [x] **F-018/F-019 e2e（2026-06-23，无权账号复验通过）**：元数据列表与旧报表数据查询命令均返回 `{ok:false, type:"permission", message:"Your token does not have permission to access this project…"}`（无重登误导、透传服务端消息）；`team +delete --id 1 --yes` → `{ok:false, type:"api", message:"Team 不存在或无权删除"}`（之前是 `ok:true`）。

## 关联

findings F-016（已修，基线）、F-017、F-018、F-019。备注：`parseMcpResult`（mcp.ts 工具结果路径）也存在「业务 `{error}` 被包成 ok:true」（如 dataops `DATA_AUTH_SCHEMA_NO_AUTH`），shape 与 kbApi 不同（error 为对象），属 F-019 同族、本轮未扩；如需统一可后续处理。
