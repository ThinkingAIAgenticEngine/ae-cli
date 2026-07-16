# DataOps CLI 下载统一鉴权修复方案

## 背景

`dataops_repo +list_spaces` 与 `dataops_ide +get_sql_query_status` 的状态查询都已经迁移到 DataOps CLI gateway，并使用 `cli-token` 请求头。

但是，当 `+get_sql_query_status` 返回 `SUCCESS` 且用户传入 `--downloadTo` 时，te-cli 会额外请求旧接口 `/v1/gaia/task/async/download`，并从本地 secure-store 读取用户 `accessToken` 放入 query string。只有沙箱注入 `cli-token.json`、没有用户 access token 的服务器环境因此无法下载。

本次修复目标是让 SQL 查询结果的状态查询与文件下载都只使用 `cli-token`，同时补齐下载任务归属校验。

## 分支

- te-cli：`codex/fix-dataops-download-cli-token`，基于 `origin/release/6.0`。
- Gaia：`codex/fix-dataops-cli-download-endpoint`，基于 `origin/release/6.0`。

## 已确认方案

### 路由与参数

te-cli 请求：

```text
GET /api/cli/dataops/v1/gaia/ide/sql-query-download?spaceCode=<spaceCode>&taskId=<taskId>
cli-token: <cliToken>
```

Nginx 去掉 `dataops` 路由段后，Gaia 收到：

```text
GET /api/cli/v1/gaia/ide/sql-query-download?spaceCode=<spaceCode>&taskId=<taskId>
```

沿用状态响应已有的 `downloadParams.spaceCode` 与 `downloadParams.taskId`，不增加新 flag，也不改变 `+get_sql_query_status` 的用户参数。

### Gaia 处理链

1. `/api/cli/**` 继续由 `CliAuthHandlerInterceptor` 校验 `cli-token` 并注入当前用户。
2. `IdeMcpController` 新增只读二进制下载 endpoint。
3. controller 调用 `McpControllerAuthHelper.requireSpaceAuth(spaceCode)`，确认当前用户可以访问该空间。
4. `AsyncTaskService` 使用 `spaceCode + openId + taskId` 查询下载任务；找不到时按任务不存在处理，不再只按 `taskId` 主键取文件。
5. 复用现有 HDFS 路径、文件名、响应头与流式输出逻辑。

旧 `/v1/gaia/task/async/download` 路径保留，避免改变前端路由；其服务调用同步使用已经传入的 `spaceCode/openId` 做任务过滤。

状态响应中的 `downloadApi` 更新为新的外部 gateway 路径：

```text
/api/cli/dataops/v1/gaia/ide/sql-query-download
```

### te-cli 处理链

1. 状态查询仍使用现有 `callDataopsApi()`。
2. 仅当状态为 `SUCCESS` 或兼容值 `async_ok` 且传入 `--downloadTo` 时发起二进制下载。
3. 下载请求使用 `getCliToken(host)`，发送 `cli-token`、`Accept: */*` 与 `X-Source: ae-cli`，不调用 `ctx.token()`，不发送 `Authorization`，不在 URL 中放 token。
4. `401` 清理 CLI token 后重取并重试一次；`403` 抛出 `PermissionError`，不重新登录；其他非 2xx 返回 API 错误。
5. 下载成功后继续按现有行为创建目标目录、写入 zip，并在结果中增加 `localFile`。

## 测试设计

### te-cli

- 先修复 `tests/dataops-integration.test.ts` 中已失效的 `clearToken/saveToken` 导入，使既有测试恢复可运行；只替换为当前 secure-store API，不改原测试意图。
- 新增回归测试：仅提供 CLI token，令 `ctx.token()` 一旦被调用就失败；状态返回 `SUCCESS` 后仍应成功下载并写入文件。
- 断言第二次请求：
  - 命中 `/api/cli/dataops/v1/gaia/ide/sql-query-download`；
  - query 只有 `spaceCode/taskId`；
  - header 包含 `cli-token`，不包含 `Authorization`；
  - 写入字节与响应一致。
- 验证 focused test、`npm test`、`npm run build`。

### Gaia

- 新增 controller 单测，验证下载 endpoint 必须先取得空间授权，再把 `spaceCode/openId/taskId` 传给下载服务。
- 新增服务单测，验证下载任务按 `spaceCode + openId + taskId` 查询，而不是按 `taskId` 单独查询。
- 验证聚焦测试及 `mvn -pl gaia-start -am -DskipTests compile`。

## 错误与安全边界

- 新接口不接受 access token，不在 URL、日志或响应中返回任何凭证。
- 新接口同时校验登录身份、空间访问权和任务归属。
- 未完成的任务仍由状态查询阻止自动下载；下载接口本身只负责鉴权后输出已经存在的文件。
- te-cli 本地目标路径不会发送给 Gaia。

## 不在本次范围

- 不迁移其他 `/v1/gaia/**` 前端接口。
- 不修改 MCP `/mcp/**` 鉴权。
- 不引入预签名 URL、artifact 生命周期或新的下载任务模型。
- 不改变 SQL 提交、轮询和取消命令的公共参数。

## 完成标准

- 只有 sandbox `cli-token.json`、没有 access token 时，`+get_sql_query_status --downloadTo` 可完成下载。
- 状态查询和下载都只使用 `cli-token`。
- 其他用户或其他空间的 `taskId` 不能被下载。
- te-cli focused test、冒烟和 build 通过。
- Gaia 新增测试与 `gaia-start` reactor compile 通过。
