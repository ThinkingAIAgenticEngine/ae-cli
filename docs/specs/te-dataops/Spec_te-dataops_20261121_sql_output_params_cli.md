---
id: Spec_te-dataops_20261121_sql_output_params_cli
title: DataOps CLI 补齐 SQL 节点 OUT 输出参数、局部更新、DEV 读取与发布预览参数对比
modules: [te-dataops]
created: 2026-11-21
updated: 2026-11-21
related_documents:
  - skills/ae-dataops/SKILL.md
  - skills/ae-dataops/references/dataops-flow-create.md
  - docs/specs/te-dataops/Spec_te-dataops_20261121_python_node_cli.md
status: verified-e2e
risk_level: P1
---

# DataOps CLI 补齐 SQL 节点 OUT 输出参数、局部更新、DEV 读取与发布预览参数对比

## 背景

Gaia 平台已支持 `TRINO_SQL` 节点声明 `VARCHAR` `OUT` 输出参数并在运行期按查询首行列名/别名向下游传递，但 `ae-cli` 的 `dataops_flow +create_sql_task` / `+update_sql_task` 尚未暴露 `--outputParams`，`+update_sql_task` 仍强制必填 `--sql` 且无法通过空串清空 `--preSql`/`--postSql`，也缺少 DEV 只读命令 `+get_sql_task`。

## 目标

1. 为 `+create_sql_task` 与 `+update_sql_task` 补齐与 Python 节点完全一致的 `--outputParams`（抽取共享模块 `task-output-param-options.ts`）。
2. 将 `+update_sql_task` 的 `--sql` 放宽为可选局部更新，并支持 `--preSql ""` / `--postSql ""` 显式清空前后置 SQL 钩子。
3. 新增对称 DEV 只读命令 `dataops_flow +get_sql_task`（`risk: 'read'`，映射 `GET /api/cli/dataops/v1/gaia/workflow/sql-task-definition`）。
4. 同步更新 `skills/ae-dataops/SKILL.md` 与 `skills/ae-dataops/references/dataops-flow-create.md`，覆盖 SQL `OUT` 规则（含 `SELECT`/`WITH ... SELECT`、`LIMIT <= 10`、首行列名绑定、重名列取最右非空值、10 KiB 上限、仅改 remark 不升版）、`+get_sql_task`、钩子清空与 `+preview_release_flow` 任务级 `paramCompare`。

## 范围

- `src/commands/te-dataops/flow/task-output-param-options.ts`：抽取 SQL 与 Python 节点共用的 `--outputParams` 校验、`explicitString` 及标识校验辅助函数；`python-task-options.ts` 复用该模块。
- `src/commands/te-dataops/flow/create-sql-task.ts`：新增可选 `--outputParams` 及本地白名单校验。
- `src/commands/te-dataops/flow/update-sql-task.ts`：`--sql` 改为可选（要求至少传入一项可更新字段，显式空白 `--sql` 拒绝），新增可选 `--outputParams`（三态）与 `--preSql ""` / `--postSql ""` 显式清空透传。
- `src/commands/te-dataops/flow/get-sql-task.ts`：新增 DEV 只读查询命令并注册导出于 `flow/index.ts`。
- `src/commands/te-dataops/shared.ts`：注册 `flow_get_sql_task` 路由，在 `compactArgs` 为 `flow_update_sql_task` 放行 `preSql`/`postSql` 空串清空。
- `skills/ae-dataops/SKILL.md`、`skills/ae-dataops/references/dataops-flow-create.md` 与 `tests/dataops-flow-task-contract.test.ts`。

## 波及与兼容性结论（对照 `docs/compatibility-policy.md`）

- **旧调用兼容**：既有调用方在 `+create_sql_task` / `+update_sql_task` 必传 `--sql`、不传 `--outputParams` 的行为 100% 保持不变；`+update_sql_task` 省略 `--preSql` / `--postSql` 仍保留原值。
- **跨版本边界（未验证组合）**：新 CLI 在 `+update_sql_task` 省略 `--sql` 或传 `--outputParams` / `--preSql ""`、以及调用 `+get_sql_task` 时，需要配对已部署本次 `gaia` 变更的服务端；对未升级的旧版 `gaia` 调用上述新能力将返回参数错误或 404（未在旧版 `gaia` 现场实测）。
- **已发布 Skill 连续性**：不新增或重命名 Skill，不删改既有 reference 路径与锚点；在既有 `dataops-flow-create.md` Step 5、Quick Reference（含 `Risk` 列）、Parameter Notes 与 Transport Status 增量补充 SQL `OUT`、`+get_sql_task` 与 `paramCompare` 文档。

## 测试用例与验证

| 类型 | 场景与预期 | 状态 | 证据 |
| --- | --- | --- | --- |
| 契约单测 | `+get_sql_task` 注册/risk/GET dry-run/非法 ID 拦截；`+create_sql_task` `--outputParams` 正反向校验；`+update_sql_task` 省略 `--sql` 局部更新、`--preSql ""`/`--postSql ""`/`--outputParams '[]'` 清空、空更新与空白 `--sql` 拦截；Skill 文档断言 | passed | `tests/dataops-flow-task-contract.test.ts`（21/21 passed） |
| 全量工程与发布门禁 | `npx tsc --noEmit`、`npm run build`、`npm test`、全部 9 份 `tests/dataops-*.test.ts`、`npm run check:release` | passed | `tsc --noEmit` 0 错误、`npm run build` 通过、`npm test` 全绿、9 份 DataOps 测试共 111 项 0 失败、`npm run check:release` 6/6 checks 通过 |
| `ta1-60` 端到端联调 | 本地 `dist/index.js` 连接 `http://ta1-60:8996`（`cli` 空间）实测 DML `-42105` 拒绝、SQL `OUT` 创建、`+get_sql_task` 投影与非 SQL `-1003` 拦截、省略 `--sql` 清空 `preSql`/`postSql`/`outputParams` 及恢复、两轮 `+preview_release_flow` `paramCompare` 新旧对比与默认 Trino FTE（`retry_policy='TASK'`）PROD 跨 SQL/Python 节点运行传递 | passed | 流 `cli_sql_out_e2e_20261121092514`（`11675483576832`，关闭调度），预览 #1 `paramCompare.new=[sql_status:OUT,sql_val:OUT]`，预览 #2 `paramCompare.old=[sql_status,sql_val]` → `new=[sql_extra,sql_status,sql_val]`，清空 `preSql` 发布 `20261121_6` 后默认 Trino FTE PROD 实例 `795`（`executeId=121`）3 节点均 `SUCCESS`：`sql_producer(1224)` → `sql_consumer(1226)`（`echoed_val="hello_sql_out_v2"`）& `py_sql_consumer(1225)`（`py_received="hello_sql_out_v2|ok_v2"`） |

## 准出结论

- 阶段：E2E Verified
- 结论：通过（单测、门禁与 `ta1-60` 端到端实测全部通过）
- 验证人：Gemini
- 日期：2026-11-21
