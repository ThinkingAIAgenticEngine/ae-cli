---
id: Spec_te-dataops_20260922_instance_monitor_guidance
title: DataOps instance monitoring guidance and status help
modules: [te-dataops]
created: 2026-09-22
updated: 2026-09-22
related_documents:
  - skills/ae-dataops/SKILL.md
  - skills/ae-dataops/references/dataops-flow-monitor.md
  - src/commands/te-dataops/operations/search-flow-instances.ts
status: completed
risk_level: P2
---

# DataOps instance monitoring guidance and status help

## 背景

Agent 将流程摘要的 flowInstanceStatus 用于运维实例列表，jq 返回 null 后仍继续轮询。另发现帮助声明支持 WAITING 过滤，但后端将该值转换为字符串 null 查询；正常实例写入链路不单独产出等待态。

## 目标

明确各命令状态路径、异常状态停止条件及本次实例关联边界；CLI 帮助不再承诺 WAITING 筛选。

## 范围

仅修改 6.0 te-cli 的帮助字符串、ae-dataops Skill 与本 Spec。不修改参数校验、接口、调度状态转换、通用 jq 语义或用户测试记录；不安装、部署、提交、推送或同步 6.1。

后续用户明确授权：将上述四个文件提交并推送到当前 codex/dataops-google-sheets-integration-6.0 分支；其他范围不变。

6.1 后续授权：用户要求将已推送的 6.0 提交 517d1599 同步到 codex/dataops-google-sheets-integration-6.1，并在 ta1-61 回归。采用普通 merge，仅合入本次四文件增量，保留 6.1 独有版本与历史。构建本地候选 CLI，针对现有流程实例执行只读列表、详情、任务详情和 jq 路径回归；通过 SSH 独立核对环境。无后端制品变更，不部署、不新建或执行流程、不停止或删除资产，不更换全局安装。

## 期望行为

- 搜索帮助列出 RUNNING、SUCCESS、FAIL、READY_PAUSE、PAUSE、STOP，并明确 WAITING 筛选不受支持；请求参数透传行为不变。
- 文档区分摘要、实例列表、实例详情、任务详情状态路径，以及定义状态和调度状态；明确 --jq 的业务数据根与默认输出的 data 包装差异。
- 固定已确认的 flowInstanceId 进行有限轮询；历史成功不证明本次成功，未知或空状态先检查原始响应，不继续空转或重新提交。
- 保留任务状态、SQL 下载状态等其他语义的 WAITING，不全局替换。

## 波及

仅本地 6.0 帮助及 Skill。executeId 精确关联入口和 WAITING 参数校验仍不在本轮实现范围。

## 测试用例与验证

| 类型 | 场景与预期 | 结果 | 证据 |
| --- | --- | --- | --- |
| 基线 | 确认帮助错误声明 WAITING | passed | node --import tsx src/index.ts dataops_operations +search_flow_instances --help |
| 正向/异常 | 实际帮助修正；文档 jq 示例正确读取指定实例，缺失状态不等于运行中 | passed | 源码及 dist 帮助已检查；从文档提取 jq 表达式验证 RUNNING/SUCCESS/FAIL 和缺失状态四种响应 |
| 并发关联/重试 | 历史成功和本次运行并存时不串实例；未知状态不重提 | passed | 独立子代理只读更新后的 Skill：固定435、不采信434成功；空状态回读原始响应后报告不确定；不使用WAITING过滤。仅离线演练 |
| 构建/回归 | 构建、帮助冒烟、相关现有离线测试及 Skill 门禁 | passed | 命令和数量见下 |
| 通用 Skill 验证器 | quick_validate.py | blocked | 系统 Python 缺少 yaml；未安装依赖，仓库原生四项门禁通过 |
| 状态写入/幂等/数据一致性 | 无运行时行为或数据写入变更 | not-run | 不涉及 |

### 实际执行

- `node --import tsx src/index.ts dataops_operations +search_flow_instances --help` 与 `node dist/index.js dataops_operations +search_flow_instances --help`：均列出六个支持值并明确 WAITING filtering is not supported。
- `node --import tsx --input-type=module` 离线断言：实际帮助支持列表及限制提示通过；从 reference 提取的 jq 示例四种响应通过，保留 flowInstanceId=435；未发请求。
- `node --import tsx test/jq-output.test.mjs`：通过，既有缺失字段返回 null 语义不变。
- `npm run verify:dataops-flow-params`：19 params/overview、23 integration、20 flow task、9 backfill 全通过；runner variadic flags 验证通过。未修改旧测试断言。
- `npm run build`：成功；`npm test`：帮助、2 retired API、sandbox-tools、5 dependency hygiene、1 README surface 均通过。
- `node self-check/release-gate.mjs`：4/4；`node self-check/scan.mjs` 全量：P1/P2=0，仅既有无 typecheck 步骤的 P3 和两个 info。`--since HEAD` 不覆盖未提交改动，不能单独作为本轮扫描证据。
- `python3 /Users/felix/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/ae-dataops`：ModuleNotFoundError: yaml；未新增依赖或修改通用校验器。
- `git diff --check`：通过；运行时 buildArgs/execute、其他用途 WAITING、全局安装及 6.1 均未修改。

## 端到端测试

6.0 初轮文档与帮助修正未部署、未执行真实流程，仅验证本地帮助和离线 Skill 指引。后续 6.1 已授权回归的实际结果单独记录如下；真实 Agent 会话复测仍待用户使用更新后的本地 Skill/CLI。

### 6.1 同步与 ta1-61 针对性回归

- 同步前：6.1 HEAD=f7247bf8，工作区干净且与远端一致；6.0 仅新增 517d1599。普通 merge --no-ff --no-commit 无冲突。
- 预期：候选帮助不声明 WAITING 支持；真实同一实例在摘要、列表、详情、任务详情中的状态与字段路径匹配；错误字段投影产生 null 后改读原始结构，不重复提交。选择现有成功/失败实例（若可用）验证读取成功不等于任务成功。
- 本地构建、合同测试和 ta1-61 只读业务验证：passed，实际证据见下。状态转换及并发反例仅离线验证，不冒充线上新执行覆盖。
- 精确 host=http://ta1-61:8996 的 CLI 认证有效；本地6.1.24高于环境声明6.1.14，保留提示并使用本轮候选，不运行提示中的 ae-cli update。

实际验证（2026-09-22）：

- SSH 只读预检：hostname=wjd-20260818-02；gaia.service active；8996/v1/gaia/health、9011/health、8996/gaia/ 均 HTTP200。远端有 Node22.22.1、无现成 CLI；使用本地构建候选固定访问 ta1-61。未部署或重启服务，未改代理。
- `npm run build`、`npm run verify:dataops-flow-params`、`npm test`、`npm run check:release` 重跑通过。合同19 params/overview +23 integration +20 flow task +9 backfill；runner variadic flags通过。冒烟含2 retired API、sandbox-tools、5 dependency hygiene、1 README surface。仓库门禁4/4。
- `node --import tsx test/jq-output.test.mjs` 通过；全量 `node self-check/scan.mjs` 无P1/P2，仅既有无typecheck的P3与两个info。6.0/6.1三个帮助和Skill文件逐字一致，package仍为6.1.24。
- `node /private/tmp/cli61-monitor-0922.Skn75E/regression.mjs`：最终脚本11个只读业务请求全部断言通过；此前9请求初跑也通过，不当作额外独立用例。另只读发现空间及检查认证。
- 空间e2e_merge61_0920，流11009817761760、实例253、任务实例295：摘要flowInstanceStatus、列表status、详情flowInstance.status、任务status均为SUCCESS；原始JSON和文档jq示例一致。
- 错误列表投影flowInstanceStatus/flowScheduleStatus/historyCmd均为null，改用status/triggerType后得到SUCCESS/MANUAL；确认outer ok不能替代字段有效性与业务状态判定。SUCCESS筛选包含目标且返回实例均为SUCCESS。
- 同一流11009812522464的历史实例252与251分别精确回读，返回ID分别匹配且均SUCCESS；未用任一历史成功替代另一实例。
- FAIL筛选正常返回空列表，测试空间本次没有失败样本，因此未验证真实失败详情。未新建或执行流程、未制造RUNNING→SUCCESS/FAIL转换或并发；历史成功与当前运行并存的行为规则仍仅为离线验证。
- 证据保留在上述临时目录：regression.mjs、summary.json、help.txt及各阶段JSON；未包含凭据、未修改业务资产，业务写操作为0。

## 准出结论

- 阶段：集成。
- 结论：6.1合并、本地构建与合同测试、ta1-61针对性只读回归通过。通用Python Skill校验受依赖阻塞的6.0记录保留，6.1使用仓库原生门禁；不声明新流程执行或完整业务E2E通过。
- 剩余风险：文档不能修复服务端 WAITING 筛选，也不能提供 executeId 的精确实例关联。
- 后续验证：用户使用更新后的工作树 Skill/CLI 进行真实 Agent 会话复测；全局 CLI 尚未更新，不把本地构建成功等同于已安装版本变更。本轮未覆盖真实失败实例或新执行状态转换。
- 验证人：Codex。
- 日期：2026-09-22。
