# DataOps IDE 查询结果流式下载

## 背景

Gaia 将解除 CLI 查询结果对 IDE 预览 `LIMIT 1000` 的误用，单个下载结果可能增长到平台下载上限。`release/6.0` 的 ae-cli 6.0.42 基线中，`+get_sql_query_status --downloadTo` 仍使用 `arrayBuffer()` 把整个 ZIP 读入 Node 堆后再写文件，无法安全承接放大的结果。

对应 Gaia 方案：`docs/specs/gaia-mcp/Spec_gaia-mcp_20260814_ide_sql_query_download.md`（Gaia 仓库）。

## 范围

- 保持现有 DataOps 下载 URL、参数、`cli-token` 请求头、401 单次刷新、403 权限错误和其他 HTTP 错误语义。
- 将成功响应流写入目标文件同目录的唯一 `.part` 文件，只在流完整写入后替换目标文件。
- 下载失败时删除本次 `.part` 文件并保留已有目标文件。
- `+get_sql_query_status` 继续返回绝对路径 `localFile`。
- 更新 DataOps SQL 查询命令帮助和 skill reference，说明结果受平台上限约束，不承诺无限或全量导出。

## 非目标

- 不新增命令、flag、`--force`、分页、断点续传、批量导出或新的通用下载框架。
- 不修改服务端任务、远端 HDFS 临时数据或下载鉴权契约。
- 不在本次 Coding 中猜测或修改包版本。

## 兼容契约

- 新 CLI 兼容旧 Gaia；旧 Gaia 返回的小结果同样通过流式路径保存。
- 新 Gaia 放大结果前，必须先发布或同步发布包含本变更的 CLI。
- 最低兼容版本待发布流程分配实际包版本后回填；它是首个包含本流式实现、通过聚焦测试、构建和 release gate 且已实际发布的 `@tant/ae-cli` 版本。
- 实际发布承接人在集成和交付前回填。

## 测试与门禁

- 通过 `getSqlQueryStatus.execute()` 验证多块响应逐块落盘，且不调用 `arrayBuffer()`。
- 验证成功替换已有目标；中途断流、无响应体、401/403、其他非 2xx 和本地发布失败不发布不完整目标且不残留 `.part`。
- 验证下载 URL、查询参数、`cli-token`、`X-Source` 与 `localFile` 保持不变。
- 运行 `npx tsx tests/dataops-integration.test.ts`、`npm run build`、`npm test`、`npm run self-check`、`npm run check:release` 与 `git diff --check`。

## 当前状态

- 阶段：本地 Coding 与验证完成；集成交付 blocked。
- 聚焦验证：变更迁移到 `release/6.0@751392b5`（包版本 6.0.42）后，`/Users/felix/app/WebstormProjects/te-cli/node_modules/.bin/tsx tests/dataops-integration.test.ts` 为 23 passed、0 failed。
- 构建与冒烟：`npm run build`、`npm test` 均通过；构建产物中的两条 DataOps IDE help 已核对。
- 发布自检：`npm run self-check` 为 P1=0、P2=0、P3=3、info=2；`npm run check:release` 为 3/3。
- 静态检查：`git diff --check HEAD` 无输出；本地验证使用的未跟踪 `node_modules` 软链接已移除，原依赖目录保持不变。
- 真实兼容 E2E：2026-08-17 使用当时基于 6.0.41 的流式下载工作树经 SSH 隧道连接 ta1 旧 Gaia，完成空间发现、Trino submit/status/download。下载返回绝对 `localFile`，ZIP 可解压且无 `.part` 残留；CSV 为表头 `n` 加 1000 行唯一数据，范围 1..1000。提交响应没有 `downloadRowLimit`，部署 Manifest 为 `codex/dataops-list-spaces-capability@49f2b42`，因此该结果只证明新 CLI + 旧 Gaia 的兼容和真实文件链路，不证明解除 1000。
- 目标 E2E：2026-08-17 使用当时基于 6.0.41 的流式下载工作树连接 ta1 新 Gaia，任务 2 返回 `downloadRowLimit=5000000` 并成功。流式下载返回绝对 `localFile`，ZIP 可解压且无 `.part` 残留；唯一 CSV 为表头 `n` 加 1500 行唯一数据，范围 1..1500，ZIP SHA-256 为 `c95b22d9fd3207bc7d9da1ec3f3a8a9bdee01be3f5ab4c4c5c6e864ff9bf348e`。
- StarRocks 目标 E2E：2026-08-18 使用同一 CLI 与 Gaia 测试 JAR 连接 `10.82.6.107`，任务 3 返回 `downloadRowLimit=5000000` 并成功。流式 ZIP 可解压且无 `.part` 残留；唯一 CSV 为表头 `n` 加 1500 行唯一数据，范围 1..1500，ZIP SHA-256 为 `7583f83aae65a4419ff7395f29fd8d8e14b2d5f8cf6db94cd741b9858a0d6564`。
- 发布门禁：新 CLI + 新 Gaia 的 Trino 与 StarRocks 目标 E2E 已通过；实际承接人与最低兼容版本仍待回填，其余兼容组合及大文件资源观察按 Gaia Spec 记录。
