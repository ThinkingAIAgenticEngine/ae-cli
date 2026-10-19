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

本轮文档与帮助修正不部署、不执行真实流程。验证本地帮助和离线 Skill 指引；真实 Agent 会话复测待用户使用更新后的本地 Skill/CLI，不声明线上 E2E 通过。

## 准出结论

- 阶段：Coding。
- 结论：本轮帮助与文档修正、本地构建及离线验证通过；通用 Python Skill 校验受依赖阻塞，以仓库原生门禁和离线行为复核补充，不声明线上 E2E 通过。
- 剩余风险：文档不能修复服务端 WAITING 筛选，也不能提供 executeId 的精确实例关联。
- 后续验证：用户使用更新后的工作树 Skill/CLI 进行真实 Agent 会话复测；全局 CLI 尚未更新，不把本地构建成功等同于已安装版本变更。
- 验证人：Codex。
- 日期：2026-09-22。
