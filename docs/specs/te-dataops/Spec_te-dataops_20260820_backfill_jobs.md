---
id: Spec_te-dataops_20260820_backfill_jobs
title: DataOps CLI 补数作业命令
modules: [te-dataops]
created: 2026-08-20
updated: 2026-08-28
related_documents: []
status: passed
risk_level: P1
---

# DataOps CLI 补数作业命令

## 背景

产品和 Gaia 已有持久化补数作业能力，`te-cli` 当前只有按单个 `baseDate` 执行 PROD 流的命令，无法创建和管理补数作业。`ae-dataops` Skill 宣称支持 backfill management，但命令表、路由和参考文档均未提供对应能力。

## 目标

在现有 `dataops_operations` 域中补齐查询可补数 PROD 流、创建和编辑草稿、删除允许状态的作业、显式运行、查询作业/计划、终止和整作业重跑命令，并沿用现有 DataOps CLI token、请求、错误和 dry-run 机制。

## 范围

- 提供 `+list_backfill_flows`、`+create_backfill_job`、`+update_backfill_job`、`+delete_backfill_job`、`+run_backfill_job`、`+search_backfill_jobs`、`+get_backfill_job_detail`、`+stop_backfill_job`、`+rerun_backfill_job`。
- 命令注册在既有 `dataops_operations`，不新增只有一个实现的 service 或 transport 抽象。
- 创建和编辑始终提交补数日期范围；手动选择模式另提交该范围内的 JSON 日期子集。创建只产生草稿，不自动运行，编辑提交完整草稿配置。
- 查询详情聚合作业信息与计划；终止和重跑均显式调用服务端。
- 更新 `ae-dataops` Skill 的命令索引、路由，并新增独立的补数参考文档。
- 不包含失败计划重跑、客户端轮询和客户端循环单日执行。

## 期望行为

- 所有命令使用现有 `callDataopsApi` 和 `buildDataopsApiDryRun`，请求路径位于 `/api/cli/dataops/v1/gaia/operations/backfill/**`；不得直接新增 `fetch`。
- `spaceCode` 为所有命令必填；作业操作使用正整数 `jobId`。列表筛选和分页只暴露服务端已支持的字段。
- 创建要求 `flowCode`、`jobName`、`startDate` 和 `endDate`。按步长模式可选 `step`/`unit`；手动选择模式必须另提供非空 JSON 字符串数组 `completeDates`，且每个日期都位于开始和结束日期构成的闭区间内。编辑额外要求正整数 `jobId`，并提交与创建相同的完整业务配置，不提供局部 patch 或客户端隐式查询合并。
- 创建默认 `jobType=TASK_ALL`、`failureStrategy=END`、`parallel=true`、`reverse=false`、`step=1`、`unit=DAY`；单位只允许 DAY/WEEK/MONTH，非 `TASK_ALL` 类型要求正整数 `startNode`。布尔默认值必须由请求构建逻辑显式保证，不能依赖当前命令注册器会忽略的 boolean metadata default。
- CLI 在发请求前拒绝缺失或反向日期范围、步长小于 1、空/重复/非法或越界的 JSON 日期数组、非法枚举和非正安全整数 ID；服务端仍以相同规则作为最终信任边界。
- `+create_backfill_job` 与 `+run_backfill_job` 分离；不会因创建成功自动发第二个请求。
- 每个命令提供可检查的 dry-run；GET 参数进入查询串，POST 参数进入 JSON body，未提供的可选值不传输。
- 查询命令标记为只读，创建/编辑/运行/重跑标记为写；删除和终止按仓库规则标记为 `high-risk-write` 并走既有确认机制。
- `+delete_backfill_job` 只提交 `spaceCode + jobId`，由 Gaia 强制 `DRAFT/FAIL/SUCCESS` 状态与逻辑删除语义；`+rerun_backfill_job` 仍为整作业重跑，由 Gaia 强制只接受 `FAIL/STOP`。CLI 不预查状态，也不新增失败计划重跑命令。
- 401 只按既有 transport 刷新一次 token，403 不重试；CLI 不自动重试任何业务写请求。
- 该组直连 REST 命令暂记为 Transitional：归属模块为 Gaia operations，传输为 DataOps CLI REST，共享 transport 为 `src/commands/te-dataops/shared.ts`；目标是迁移到 Capability Gateway，复核日期为 2026-11-20，退出条件是 Gaia 暴露等价 capability 且命令契约测试迁移完成。

## 波及

- `src/commands/te-dataops/operations`：在既有七个薄命令上增加草稿编辑和删除并注册。
- `src/commands/te-dataops/shared.ts`：在既有路由表增加两个工具。
- `skills/ae-dataops`：修正文档漂移并增加 `references/dataops-backfill.md`。
- Gaia/DataOps 网关：必须提供与命令路径和字段一致的后端契约。
- 不增加 npm 依赖，不改变其他 DataOps 域和现有单日执行命令。

## 测试用例与验证

| 类型 | 场景与预期 | 结果 | 证据 |
| --- | --- | --- | --- |
| 正向 | 九个命令均注册，编辑和删除 dry-run 的 method、URL 与完整 body 符合后端契约 | passed | `tests/dataops-backfill-contract.test.ts` 精确断言九命令注册/risk、update/delete POST URL 与 body |
| 反向 | 创建或编辑缺失范围、非法枚举及编辑/删除非正整数 ID 在请求前失败 | passed | 聚焦契约复用 create 完整校验，并覆盖 create/update 缺失范围及 update/delete 非法 ID；必填 flag 沿用 runner 既有校验 |
| 边界 | step=0、空日期数组、重复/非法/越界日期、反向范围分别拒绝；分页 flag 固定为 1..100 | passed | 聚焦契约测试覆盖范围、日期子集、步长和分页 metadata contract |
| 异常 | 401 只刷新一次、403 不重试、业务错误沿用共享 transport 语义 | passed | `tests/dataops-integration.test.ts`：23/23 passed |
| 状态转换 | 创建、编辑、删除、运行是独立命令；删除和整作业重跑不在客户端猜测状态 | passed | 九条独立 command/tool route；update/delete 分别单次调用共享 transport，无状态预查 |
| 幂等/重试 | 写命令不增加自动重试或客户端幂等键 | passed | 九个命令仅单次调用既有 `callDataopsApi`；未新增轮询、锁或重试代码 |
| 并发 | CLI 无共享可变作业状态，不增加本地锁；并发状态冲突由 Gaia 判定 | not-run | CLI 层不适用并发状态测试；由 Gaia 状态转换测试和联调验证 |
| 数据一致性 | 编辑和删除同时发送 `spaceCode` 和 `jobId`；编辑完整发送草稿业务配置，不提供只凭 ID 或局部 patch 的路径 | passed | update body 复用 create builder 并追加 `jobId`；delete body 精确等于 `{spaceCode, jobId}` |

## 本地验证证据

- 2026-08-28 扩展状态：`+update_backfill_job` 与 `+delete_backfill_job` 已实现并通过本地契约验证；以下 2026-08-26 结果仅作为既有七命令基线，当前九命令 E2E 证据记录在后文。

- TDD RED：`node --import /Users/felix/app/WebstormProjects/te-cli/node_modules/tsx/dist/loader.mjs tests/dataops-backfill-contract.test.ts` 在实现前因缺少 `create-backfill-job.js` 退出 1。
- TDD GREEN：同一聚焦测试最终 `7 passed, 0 failed`。
- 2026-08-28 update RED：`node --import ./node_modules/tsx/dist/loader.mjs tests/dataops-backfill-contract.test.ts` 因缺少 `update-backfill-job.js` 退出 1；实现共享完整草稿 builder/validation、route 与注册后转绿。
- 2026-08-28 delete RED：同一聚焦测试因缺少 `delete-backfill-job.js` 退出 1；实现 scoped body、high-risk route 与注册后转绿；最终 `9 passed, 0 failed`。
- 2026-08-28 日期契约 TDD：修复前，合法的“显式范围 + 手动日期子集”被旧互斥校验拒绝，且缺少范围的手动请求仍按旧契约通过；改为始终要求 `startDate/endDate` 并校验 `completeDates` 为闭区间子集后，`node --import tsx tests/dataops-backfill-contract.test.ts` 为 9/9 passed。
- 2026-08-28 聚焦类型检查：`node_modules/.bin/tsc --noEmit --module NodeNext --moduleResolution NodeNext --target ES2022 --strict --skipLibCheck --types node src/commands/te-dataops/shared.ts src/commands/te-dataops/operations/backfill-options.ts src/commands/te-dataops/operations/list-backfill-flows.ts src/commands/te-dataops/operations/create-backfill-job.ts src/commands/te-dataops/operations/update-backfill-job.ts src/commands/te-dataops/operations/delete-backfill-job.ts src/commands/te-dataops/operations/run-backfill-job.ts src/commands/te-dataops/operations/search-backfill-jobs.ts src/commands/te-dataops/operations/get-backfill-job-detail.ts src/commands/te-dataops/operations/stop-backfill-job.ts src/commands/te-dataops/operations/rerun-backfill-job.ts src/commands/te-dataops/operations/index.ts tests/dataops-backfill-contract.test.ts`，退出 0。
- 变更文件类型检查：`node_modules/.bin/tsc --noEmit --module NodeNext --moduleResolution NodeNext --target ES2022 --strict --skipLibCheck --types node src/commands/te-dataops/shared.ts src/commands/te-dataops/operations/backfill-options.ts src/commands/te-dataops/operations/list-backfill-flows.ts src/commands/te-dataops/operations/create-backfill-job.ts src/commands/te-dataops/operations/run-backfill-job.ts src/commands/te-dataops/operations/search-backfill-jobs.ts src/commands/te-dataops/operations/get-backfill-job-detail.ts src/commands/te-dataops/operations/stop-backfill-job.ts src/commands/te-dataops/operations/rerun-backfill-job.ts src/commands/te-dataops/operations/index.ts tests/dataops-backfill-contract.test.ts`，退出 0。
- 构建：`npm run build` 成功。
- 仓库冒烟：`npm test` 成功，包括 retired-api 2/2 与 sandbox-tools functional tests。
- 共享 DataOps transport 回归：`tests/dataops-integration.test.ts` 为 23/23 passed。
- Skill 发布门禁：`node self-check/release-gate.mjs` 的 3 项检查全部通过。
- 差异格式：`git diff --check` 通过；新文件无行尾空白。

## 端到端测试

- 场景：连接部署了新 Gaia 接口的 DataOps 环境，按“候选流查询 → 创建草稿 → 完整编辑 → 查询确认 → 删除专用作业”验证草稿管理；另按“创建 → 运行 → 查询详情/计划 → 终止 → 从 `STOP` 或 `FAIL` 整作业重跑”执行生命周期命令链。
- 影响：会创建并执行真实补数作业，只能在专用测试空间和测试流上验证。
- 涉及的组件和外部依赖：te-cli 构建产物、CLI token、DataOps 网关、Gaia、调度执行链路和具备权限的测试账号。
- 预期断言：编辑保持同一作业 ID 并完整替换配置；删除需要显式确认且删除后常规查询不可见；创建后为草稿且无计划；运行后生成输入日期对应计划；`STOP/FAIL` 可整作业重跑而 `SUCCESS` 被拒绝；跨空间请求被拒绝。
- 2026-08-26 环境进度：Gaia 新 Jar 已部署到 ta1-60，真实健康接口返回 HTTP 200 / `"alive"`；补数内部路由和 DataOps 网关路由均已到达 CLI 认证边界，无 token 时返回 HTTP 403 / `return_code=-1006`。
- 2026-08-26 候选流与草稿证据：本机实际通过 `node dist/index.js ... dataops_operations` 调用 DataOps CLI。`+list_backfill_flows --spaceCode test` 返回 2 条 `canRun=true, hasSt=false` 的 PROD 候选流；选择单任务、无未发布变更的 `ods->dwd rolelogin`（flowCode `10701553446400`）。`+create_backfill_job` 以 `completeDates=["2026-08-25"]` 创建 jobId `1`，动作返回 `SUCCESS`；紧接着 `+get_backfill_job_detail` 返回 `jobStatus=DRAFT`、`plans=[]`、`planCount=0`。
- 2026-08-26 运行与查询证据：`+run_backfill_job` 返回动作 `SUCCESS/result=true`；`+search_backfill_jobs` 查到同一 jobId `1`、`SUCCESS`、`planNum=1`、`successNum=1`；`+get_backfill_job_detail` 返回计划 `bd=2026-08-25`、`status=SUCCESS` 和实例 `161`。
- 2026-08-26 终止与重跑证据：首轮执行过快直接成功，因此先调用 `+rerun_backfill_job` 再立即以 `--yes +stop_backfill_job` 终止；详情查询确认作业 `STOP`、计划 `CANCEL`。随后从 `STOP` 再调用 `+rerun_backfill_job`，详情查询先观测到作业/计划 `RUNNING`、新实例 `162`，再观测到作业/计划 `SUCCESS`。最终搜索结果为 `percent=100`、`planNum=1`、`successNum=1`，无运行中负载。
- 2026-08-26 隔离与资产证据：以 `default` Space 调用 `+get_backfill_job_detail --jobId 1` 返回 `Backfill job does not exist (code: -31500)`。按用户要求保留 `test` Space 的 jobId `1`、计划及实例 `161/162`，未执行删除。
- 2026-08-28 说明：既有 E2E 曾从 `SUCCESS` 发起重跑；新范围要求与页面对齐并拒绝该状态，因此该结果不能作为收紧后状态门禁的通过证据。
- 2026-08-28 部署与认证证据：当前 Gaia Jar SHA-256 `43bcea6176c2240f21f0fb9c29ef469d9beb6d3b1d79c342c67e82afd0f7c629` 已部署到 ta1-60；指定域名 `/v1/gaia/health` 返回 HTTP 200 / `"alive"`。本机 `auth status` 对该精确域名返回 `authenticated=true`、`source=secure-store`、`hasCliToken=true`，随后所有 E2E 均使用本地 `dist/index.js` 和该域名。
- 2026-08-28 Service API 拆分部署证据：Gaia 重新部署 Jar SHA-256 为 `847dd9e49c70be4b2a97dada80a1f5e9b905b6a827d44e82f3c5d1417f9241e2`，上一版 `43bcea6176c2240f21f0fb9c29ef469d9beb6d3b1d79c342c67e82afd0f7c629` 保留在 `/data/home/ta/gaia_ta/ta-gaia.jar.pre-service-split-20260828-140407`；指定域名与 ta1-60 本机健康接口均最终返回 HTTP 200 / `"alive"`。
- 2026-08-28 编辑、删除与隔离证据：`+list_backfill_flows --spaceCode test` 返回 3 条 `canRun=true` 候选流。以 flowCode `10701553446400` 创建 DRAFT jobId `5` 后，`+update_backfill_job` 在同一 ID 上完整替换名称、失败策略、并行配置和基线日期；详情返回新配置、DRAFT、`plans=[]`。以 `default` Space 查询返回 `-31500`。`--yes +delete_backfill_job` 成功后，详情和重复删除均返回 `-31500`；以被删名称成功创建 jobId `6`，证明逻辑删除释放名称。
- 2026-08-28 状态门禁证据：jobId `6` 显式运行后成为 SUCCESS，计划和实例 `178` 均成功；对该作业执行编辑和整作业重跑均返回 `-31509`。另创建 28 个计划的 jobId `7`，运行后终止为 STOP；从 STOP 调用 `+rerun_backfill_job` 成功，随后的详情快照为 RUNNING、26 个 WAITING、1 个 SUBMITTED、1 个 RUNNING，覆盖整作业全部计划；再次终止后稳定为 STOP，尝试删除 STOP 作业返回 `-31509`。
- 2026-08-28 Service API 拆分 E2E：使用当前本地 `dist/index.js` 创建 jobId `8`，再通过 `+update_backfill_job` 将同一 ID 完整替换为名称 `CLI E2E service split edited 20260828-1412`、失败策略 `CONTINUE`、`parallel=false`、基线日期 `[2026-08-20, 2026-08-21]`；详情返回 DRAFT、`plans=[]`、`planCount=0`。
- 2026-08-28 日期契约 E2E：本地 CLI 分别拒绝缺少 `startDate/endDate` 的手动请求和范围 `2026-08-20..2026-08-21` 内选择 `2026-08-22` 的越界请求。部署新 Gaia 后，通过 `+update_backfill_job` 将保留的 jobId `8` 原不合理范围 `2026-08-28..2026-08-28` 纠正为 `2026-08-20..2026-08-21`，所选日期 `[2026-08-20, 2026-08-21]` 不变；详情返回 `step=1/unit=DAY`、DRAFT、`plans=[]`、`planCount=0`。te-gaia 编辑弹窗实际显示同一范围和两个日期标签，保存按钮可用，未再次保存、运行或删除。
- 2026-08-28 资产证据：既有 jobId `1` 至 `4` 未修改；jobId `5` 和 `11` 只执行被测的 Gaia 逻辑删除，历史按服务端语义保留；jobId `6` 保留为 SUCCESS，jobId `7` 保留为 STOP，jobId `8` 仅纠正日期范围并保留为 DRAFT，jobId `9` 保留为 SUCCESS，jobId `10` 保留为 STOP，未执行其他测试清理。
- 当前状态：passed；九命令本地门禁、日期子集契约、重新部署后的真实 E2E 和 te-gaia 页面回填均已通过。`FAIL` 允许重跑由 Gaia 共享服务测试覆盖，本次远端正向 E2E 使用同为允许状态的 `STOP`。

## 准出结论

- 阶段：集成
- 结论：通过；九命令契约、手动日期范围子集校验、构建、冒烟、DataOps transport 回归、Skill 发布门禁和 ta1-60 真实生命周期/页面 E2E 均完成。
- 剩余风险：CLI 不预查或重试并发状态冲突，由 Gaia 的条件更新返回最终结果；其他历史不合理草稿未自动迁移；Gaia 与 Base Server 仍无跨系统 exactly-once 保证。
- 后续验证：无本次范围内必需项；如后续引入失败计划级重跑，应另行设计命令和服务端契约。
- 验证人：Codex（本地与 ta1-60 集成环境）。
- 日期：2026-08-28
