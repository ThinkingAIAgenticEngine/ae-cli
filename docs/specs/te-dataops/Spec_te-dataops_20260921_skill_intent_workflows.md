---
id: Spec_te-dataops_20260921_skill_intent_workflows
title: DataOps Skill intent workflows and completion checks
modules: [te-dataops]
created: 2026-09-21
updated: 2026-09-22
related_documents:
  - skills/ae-dataops/SKILL.md
  - skills/ae-dataops/references/dataops-integration.md
  - skills/ae-dataops/references/dataops-flow-create.md
  - skills/ae-dataops/references/dataops-flow-monitor.md
  - skills/ae-dataops/references/dataops-backfill.md
  - skills/ae-dataops/references/dataops-query.md
status: completed
risk_level: P2
---

# DataOps Skill intent workflows and completion checks

## 背景

用户确认审核后的分阶段建议。本轮先落实文档修正和意图闭环；此前已确认的生命周期命令改名、索引收敛及未提交内容保持不变。

## 目标

Agent 能从用户目标选择已有能力，使用真实参数，区分提交、执行和完成；遇到当前 CLI 无法满足的目标时明确停止，而不是扩大操作范围或猜测缺失配置。

## 范围

同步更新 6.0、6.1 te-cli 的 ae-dataops 入口及已有 reference，不增加独立 command index、独立 Skill、依赖或通用编排框架。不修改 CLI 运行时、HTTP 合同或后端，不安装系统 Skill，不提交、推送、部署或操作线上资产。

2026-09-22 后续授权：6.0 已提交并推送；其 ta1-60 受影响路径回归保留在合入提交 `b569de4f` 的生命周期 Spec。当前用户另行授权合并到 6.1、完成 ta1-61 回归后提交推送。本地核对及合并证据由同目录生命周期 Spec 承接，不同步系统已安装 Skill，也不将 6.0 结果当作 6.1 通过。

## 期望行为

- 入口用一张「用户意图 / 命令分组 / reference / 完成边界」导航表，保留六个命令分组的职责映射和空间发现入口，不恢复重复总览或独立索引；将场景专属参数留在对应文档，保留空间、环境、精确身份与授权边界。
- 明确 outer ok 与业务结果不同；局部请求预览不代表服务端校验，异步受理不代表完成。只读查询到失败状态本身不等于查询失败。
- 修正 MySQL 创建模板、query 模式与 database 规则、实例搜索关键字、任务状态枚举和 Quartz 工作日 CRON；不猜测 companyId 或使用样例资源值执行。
- 定时同步意图串联同步方案、集成节点、调度、发布和 PROD 回读；用户只要上线时不得手动执行验证。
- 历史失败节点重跑不能被整流执行或补数替代；先区分历史实例、业务日期和授权范围。
- 查询任务拒绝时不进入轮询；结果下载后按用户需要读取真实内容再回答，不把任务 ID 当作查询结果；有限等待后报告原句柄，不重复提交。
- 读取同步详情目前只有摘要，不能从摘要安全重建完整配置；说明当前缺口，不宣称本轮已修复。预置仓数据库发现缺少 bizClassify 的限制同样保留并说明。
- 保留普通删除仅回收、彻删需新确认、字段仅 DEV 且禁止分区变更等已冻结规则。

## 波及

仅 te-cli 文档及本 Spec；两个分支同一 Skill 内容。Gaia 代码仅作为合同核对证据，不在本轮修改。

后续独立改进（未实施）：(1) 同步详情提供可无损回写的完整配置；(2) 按命令合同统一 SQL 拒绝、发布失败等写操作错误语义；(3) 预置仓发现参数补齐。既有日志、类型检查等已接受问题不在此范围。

## 测试用例与验证

| 类型 | 场景与预期 | 结果 | 证据 |
| --- | --- | --- | --- |
| 正向 | 字段类型与说明一起改，只 DEV 不发布；普通删除只回收 | passed | 独立离线意图演练 1、4；先预览及读回，不发布、不彻删 |
| 跨域 | MySQL 每日定时同步，只上线不手动跑；核对 PROD 可见配置后结束 | passed | 演练 3；保留创建/发布证据，明确 PROD 概览不提供 syncId |
| 反向/边界 | 只重跑失败节点不替换为整流；摘要配置不足不冒险更新 | passed | 演练 2、7；报告现有能力缺口，未生成扩大范围的执行动作 |
| 异常/状态 | 发布 CHECK_FAILED、SQL REJECTED、只受理未完成时正确停止/追踪 | passed | 演练 5、8、11；内层失败不继续，DRAFT 仅按同一 jobId 读回，不运行 |
| 查询结果 | 读取 ZIP 聚合值；没有内容不猜测；等待超时保留句柄 | passed | 演练 6、9、10；实际读取合成 ZIP 得到 37；无字节不能确认值；812/RUNNING 不重提、不取消 |
| 静态 | 已有命令/参数、链接、风险表、两版文档一致 | passed | 每版 76 命令、97 shell 示例参数、31 链接、12 JSON 模板；四项 release gate；目录一致，diff --check 通过 |
| 回归 | 现有生命周期、flow params/task、backfill、integration 文档合同断言 | passed | 两版相同结果，具体命令与数量见下；本轮未修改测试断言 |
| 幂等/并发 | 不改运行时状态转换或锁，无新增并发行为 | not-run | 不涉及；文档禁止重复提交和扩大重试范围 |
| 通用 Skill 验证器 | quick_validate.py | blocked | 系统 Python 缺少 yaml，未安装依赖；使用仓库 frontmatter/risk 等四项门禁及专用静态检查作为替代 |

### 实际执行与证据

6.0、6.1 在各自配对 te-cli 工作树执行，日志目录为 `/private/tmp/dataops-skill-intents-0921.M5NToV/`，文件前缀分别为 `60-`、`61-`。

- `npm run verify:dataops-entity-lifecycle`：23 lifecycle/surface + 9 field mutation + 23 integration 全通过，另有 6 组风险示例验证；见 `*-lifecycle.log`。
- `npm run verify:dataops-flow-params`：19 flow params/overview + 23 integration + 20 flow task + 9 backfill 全通过，runner variadic flags 验证通过；见 `*-flow.log`。两个 verify 脚本均包含 integration，数量不可简单当成独立用例相加。
- `npm run check:release`：4/4；`node self-check/scan.mjs --json`：P1/P2 为 0，仅既有缺少 typecheck 步骤的 P3 和两个 info；见 `*-release.log`、`*-scan.json`。通用扫描豁免 DataOps 逐命令文档检查，不能单独作为覆盖证明。
- `node --import tsx /private/tmp/dataops-skill-intents-0921.M5NToV/check-skill.mjs <repo>`：两版完整注册命令、文档示例 flag、内部链接/锚点和 JSON 模板检查通过；见 `*-doc-static.json`。
- `npm run build` 成功；`npm test` 的 CLI help、2 retired API、sandbox-tools、5 dependency hygiene、1 README surface 均通过；见 `*-build.log`、`*-test.log`。
- `git diff --check` 两版通过；`diff -qr <6.0>/skills/ae-dataops <6.1>/skills/ae-dataops` 无差异。
- 独立 forward-test 以空上下文子代理只读 Skill/reference 和固定样例，共 11 个场景；第 9 场景只读合成 `probe-result.zip` 得到计数 37，不是线上查询结果。其余是命令计划/停止条件验证，不是 API E2E。
- `python3 .../skill-creator/scripts/quick_validate.py skills/ae-dataops`：`ModuleNotFoundError: No module named 'yaml'`，见 `skill-creator-validation.log`。没有为文档校验增加依赖。

### 2026-09-22 导航表补充验证

用户确认保留一张合并导航表。本次仅在入口补充命令分组列、空间发现行及已有流执行/任务管理意图，不新增运行时能力或独立 command index。

- 两版重跑 `npm run check:release`（4/4）、`node self-check/scan.mjs --json`（无 P1/P2，仅既有 P3）、上节同一 `check-skill.mjs`（76 命令、97 示例、32 链接、12 JSON 模板），均通过。
- 独立只读复核确认六个已注册命令组与意图/reference 匹配，不包含已移除的命令组；两版 Skill 目录一致，`git diff --check` 通过。
- 日志：`/private/tmp/dataops-skill-routing-0922.yVVb8r/` 下 `60-/61-release.log`、`60-/61-scan.json`、`60-/61-static.json`。通用 `quick_validate.py` 仍因缺少 PyYAML 受阻，见 `quick-validate.log`，未新增依赖。
- 本次只改导航映射，未重跑构建、运行时合同测试或线上 E2E；上节结果是 09-21 的验证，不作为本次重跑结果。未提交、推送或同步本机已安装 Skill。

### 核对证据

审查以配对 6.0 源码为准：IntegrationMcpController 的 mcpSyncDetail 仅投影摘要；McpDataSourceComponentRegistry 的 MySQL 模板要求 jdbcUrl/database；OmFlowInsSearchMapper 不匹配 flowCode；McpFlowReleaseService 可返回 FAILED/CHECK_FAILED；McpIdeExecuteServiceV2 可返回 REJECTED。两版 SyncSolutionDO 均在创建时按空间生成 gatewayConfig，更新时保留或生成，所以去掉客户端猜测内部租户值的文档要求，不改后端。WorkflowMcpController 的 PROD taskSummaries 不提供任务 SQL/syncId，文档明确独立回读边界。Skill 两版本内容一致，不以此推断两个线上部署状态一致。

## 端到端测试

真实 ta1-60/ta1-61 E2E 为 blocked：本轮仅文档优化，不部署或操作真实资产。以现有离线合同测试和独立意图演练作为本阶段验证；不将模拟响应当作线上成功。后续能力改进另行确认范围及真实测试资产。

## 首阶段准出结论（历史记录）

- 阶段：Coding。
- 结论：本轮文档优化及本地验证通过；通用 Python 验证器受依赖阻塞，仓库原生门禁和静态检查作为替代，不宣称真实 E2E 通过。
- 剩余风险：文档不能修复三个接口能力缺口，也不能保证所有 Agent 的行为；通用 Spec 校验 require_id 仍按用户已有豁免处理。
- 后续验证：三个能力缺口另行确认实现及 E2E 范围；本轮不修改业务逻辑、不同步已安装系统 Skill、不提交推送或部署。
- 验证人：Codex。
- 日期：2026-09-22。
