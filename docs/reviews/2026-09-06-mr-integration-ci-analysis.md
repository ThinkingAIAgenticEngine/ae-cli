# te-cli MR 与 integration 分支审核接入分析

分析日期：2026-09-06。范围为四个仓库已 fetch 的 `origin/release/6.0`；读取指定提交的文件，没有切换当前工作分支或修改实现。

实施范围更新（2026-09-08）：用户明确本期只审核 `integration/*` 的 push，包括 MR 合并后的集成分支更新；创建或更新 MR 不触发。实现位于基于 release/6.0 的独立 worktree 和新分支，`master` 不参与配置加载。本文保留原始调研及历史候选建议，实际接入以 [integration-review.md](../integration-review.md) 为准；两份调研已迁入 `feat/integration-ai-review`。

## 结论

te-cli 已有测试、自检和发布校验，缺少将它们接入 MR 的仓库内 CI 编排，也没有仓库内自动 AI Review。三个参考项目各有所长：

- **ta-admin-manager**：确定性测试阻断 Pipeline，PR-Agent 做通用 Review 和专项分析；最适合借鉴整体分工。
- **ta-common-service**：自研 Claude Agent SDK，分别审查 diff 和仓库上下文，审查不通过直接使 Pipeline 失败；适合参考语义审核的实现。
- **te-claude**：测试、静态扫描、影响分析和质量汇总体系完善；适合复用结果反馈和过期保护，其当前 CI 没有自动运行 LLM 语义代码审核。

三个参考项目的这些 CI Job 都以 MR 为主，没有独立审核 integration 合入后的分支 HEAD。必须区分“目标为 integration 的 MR”“integration 合入 release 的 MR”和“integration 合并后的代码状态”。

本报告确认的是仓库配置和脚本行为。GitLab 项目侧自定义 CI 路径、外部 webhook、受保护分支、人工 approval 和“Pipeline 成功才可合并”等设置未查询，因此不能把“仓库没有配置”扩大为“服务器绝无外部审核”，也不能把 Job 失败直接等同于禁止合并。

## 固定分析基线

| 仓库 | release/6.0 提交 | 提交日期 |
| --- | --- | --- |
| te-cli | `369905920ea9dd69df81223d1de93e2332dcb661` | 2026-09-03 |
| ta-common-service | `664d52f4570a03d1223cda2019d0ec63bebe09de` | 2026-09-03 |
| te-claude | `ef70eef5604b2421bf46e902f6fdd89df4981e3e` | 2026-09-04 |
| ta-admin-manager | `5867421ab95c6439a50769cdee215e9f802fcac9` | 2026-09-03 |

以下源码链接固定到上述提交，避免工作分支和后续变更干扰结论。

## 1. te-cli 的现状和实际缺口

基线树中没有 `.gitlab-ci.yml`、`.ci/`、`.gitlab/`、`.github/`；有以下可复用入口：

| 入口 | 实际行为 | 接入限制 |
| --- | --- | --- |
| `npm run build` | tsup 打包并复制 tracking assets | 不能据此认为独立 TypeScript 类型检查已经运行 |
| `npm test` | CLI help、retired API、sandbox tools、dependency hygiene | 不是全部业务域回归；比 AGENTS.md 中“仅冒烟”的描述更丰富 |
| `npm run qa-changed` | build + test + 根据工作区文件选择专项 verify | 没有 MR base/head 输入，不能直接当 MR 增量校验器 |
| `scripts/qa-full.mjs` | 固定列表的 build/test/部分 verify/self-check | package.json 未注册它提示的 `qa:full` 命令，列表也未覆盖所有 verify |
| `npm run self-check` | 命令注册、skill 配对等规则扫描，存在 P1 时退出 1 | 需要在 CI 明确调用，并先核对当前基线问题 |
| `npm run check:release` | skill-frontmatter、skill-risk-examples、skill-preset-mcp | 当前由 `prepublishOnly` 调用，无法代替合入前审核 |

依据：[package.json:18](https://gitlab.thinkingdata.cn/te-ai/te-cli/-/blob/369905920ea9dd69df81223d1de93e2332dcb661/package.json#L18)、[release-gate.mjs:25](https://gitlab.thinkingdata.cn/te-ai/te-cli/-/blob/369905920ea9dd69df81223d1de93e2332dcb661/self-check/release-gate.mjs#L25)、[qa-full.mjs:5](https://gitlab.thinkingdata.cn/te-ai/te-cli/-/blob/369905920ea9dd69df81223d1de93e2332dcb661/scripts/qa-full.mjs#L5)。

### qa-changed 有两个必须先修正的问题

1. **识别范围错误**：只执行 `git diff --name-only HEAD` 和 `git ls-files --others --exclude-standard`。CI checkout 一般没有未提交文件，即使 MR 改了业务域，也只运行默认 build/test。应增加明确的 base/head 输入，MR 对比完整变更范围，不能仅看最近一次提交；Git 读取失败也不应返回空变更并静默退化。[qa-changed.mjs:13](https://gitlab.thinkingdata.cn/te-ai/te-cli/-/blob/369905920ea9dd69df81223d1de93e2332dcb661/scripts/qa-changed.mjs#L13)
2. **业务域映射不完整**：匹配 `src/commands/agent/`、`src/commands/team/`，实际是 `te-agent/`、`te-team/`；metadata、memory、te-system、te-kb 等已有专项入口也未完整纳入。共享 core/framework 变更目前不会展开所有受影响域，不能以“增量脚本绿了”代表相关回归齐全。[qa-changed.mjs:74](https://gitlab.thinkingdata.cn/te-ai/te-cli/-/blob/369905920ea9dd69df81223d1de93e2332dcb661/scripts/qa-changed.mjs#L74)

## 2. ta-common-service：自研 Claude 双路审查，失败阻断 Pipeline

链路：`merge_request_event` 且目标匹配 `integration/*` → `claude-code-review` → `.ci/code-review.py` → 并行 Diff Review / Context Review → 创建或更新 MR 汇总评论 → 按审查结论返回退出码。

- `.gitlab-ci.yml` 指定 `code` Runner，Python 3.10 绝对路径，预装 `claude-agent-sdk`，Job 总超时 15 分钟。compile Job 当前整段被注释；本 CI 入口实际只做 AI Review。[CI:1](https://gitlab.thinkingdata.cn/thinking-analytics/ta-common-service/-/blob/664d52f4570a03d1223cda2019d0ec63bebe09de/.gitlab-ci.yml#L1)
- GitLab API 拉取 MR `/changes`，拼接完整返回 diff 并提取新增行；最多 100 个文件、300,000 字符，超限失败。Diff 审查不开放工具；Context 审查只开放 `Read/Glob/Grep`，限定工作区源码。两路分别超时 300/600 秒。[编排:328](https://gitlab.thinkingdata.cn/thinking-analytics/ta-common-service/-/blob/664d52f4570a03d1223cda2019d0ec63bebe09de/.ci/code-review.py#L328)、[模型调用:604](https://gitlab.thinkingdata.cn/thinking-analytics/ta-common-service/-/blob/664d52f4570a03d1223cda2019d0ec63bebe09de/.ci/code-review.py#L604)
- Diff 规则针对凭证泄露、吞异常、明确空指针路径；Context 规则针对可信身份、项目隔离、事务/锁/幂等、调用方语义兼容。[diff-rules](https://gitlab.thinkingdata.cn/thinking-analytics/ta-common-service/-/blob/664d52f4570a03d1223cda2019d0ec63bebe09de/.ci/diff-rules.txt)、[context-rules](https://gitlab.thinkingdata.cn/thinking-analytics/ta-common-service/-/blob/664d52f4570a03d1223cda2019d0ec63bebe09de/.ci/context-rules.txt)
- 模型返回 JSON，最终使用 `satisfied` 决定规则是否通过；任一规则不满足或任一路审查失败均退出 1。CI 没有 `allow_failure: true`。评论通过固定 marker 找到并更新，附提交 SHA、时间、位置、证据、原因和修复建议。[结果与评论:230](https://gitlab.thinkingdata.cn/thinking-analytics/ta-common-service/-/blob/664d52f4570a03d1223cda2019d0ec63bebe09de/.ci/code-review.py#L230)、[退出码:469](https://gitlab.thinkingdata.cn/thinking-analytics/ta-common-service/-/blob/664d52f4570a03d1223cda2019d0ec63bebe09de/.ci/code-review.py#L469)
- 人工配置变量是 `CLAUDE_API_BASE_URL`、`CLAUDE_API_KEY`、`CLAUDE_MODEL`、`GITLAB_REVIEW_TOKEN`；其余项目/MR/提交信息来自 CI。[环境变量:28](https://gitlab.thinkingdata.cn/thinking-analytics/ta-common-service/-/blob/664d52f4570a03d1223cda2019d0ec63bebe09de/.ci/code-review.py#L28)

可借鉴双路分工和明确失败状态，但不宜原样复制：

- Context 文件白名单只有 Java/Kotlin/Groovy/XML 和 pom.xml，无法读取 te-cli 的 TS/MJS/JSON/Markdown；规则中的 Java 服务端方法同样要换成 CLI 契约。[白名单:726](https://gitlab.thinkingdata.cn/thinking-analytics/ta-common-service/-/blob/664d52f4570a03d1223cda2019d0ec63bebe09de/.ci/code-review.py#L726)
- `/changes` 获取的是调用时的 MR 数据，代码没有对齐其 head 与当前 checkout，也没有在写评论前检查 MR 是否已有新提交；仅有 marker，缺少并发写入和过期结果保护。Notes 仅取一页 100 条，已有 marker 不在该页时可能新增重复评论。[GitLabClient:480](https://gitlab.thinkingdata.cn/thinking-analytics/ta-common-service/-/blob/664d52f4570a03d1223cda2019d0ec63bebe09de/.ci/code-review.py#L480)
- 它向 SDK 提供 JSON Schema，但本地 parser 只检查 `results` 是数组，不复核规则完整性和引用行号；测试明确保留了不检查 diff location 的行为。做硬门禁前应有服务端可执行的结果校验，而不能将 schema 提示等同于本地验真。[parser:216](https://gitlab.thinkingdata.cn/thinking-analytics/ta-common-service/-/blob/664d52f4570a03d1223cda2019d0ec63bebe09de/.ci/code-review.py#L216)、[相关测试:184](https://gitlab.thinkingdata.cn/thinking-analytics/ta-common-service/-/blob/664d52f4570a03d1223cda2019d0ec63bebe09de/.ci/tests/test_code_review.py#L184)

## 3. ta-admin-manager：PR-Agent + 专项 Ask + 独立确定性门禁

目标分支覆盖 `release/*`、`integration/*`、`integration_*` 和 `sprint_dev`，事件均为 MR。三组任务在 test stage 运行：[CI:1](https://gitlab.thinkingdata.cn/thinking-analytics/ta-admin-manager/-/blob/5867421ab95c6439a50769cdee215e9f802fcac9/.gitlab-ci.yml#L1)

1. `base_unit_test`：`admin-manager-base` Runner 执行 `mvn clean test`，失败使 Pipeline 失败。
2. `pr_agent_review`：内部 `te/pr-agent:latest` 镜像、`pr-agent-docker` Runner，依次执行 AI 打标、确定性标签同步、按最终标签专项 Ask、一次通用 `review`。子步骤失败仍继续后续步骤，最后汇总退出码；整个 Job 设置 `allow_failure: true`，属于非阻断 AI 反馈。
3. migration 文件变化时，独立 Flyway Job 在临时 MySQL 5.7 / 8.4 中执行全部 migration 和 validate。由 CI 路径规则直接触发，失败使 Pipeline 失败，不依赖 AI 标签。

AI 规则在 `.pr_agent.toml`：模型配置为 `openai/glm-5.2`，中文输出；通用 Review 聚焦当前 MR 引入的高置信缺陷，要求文件行号、失败场景和修复方向。按仓库配置说明，PR-Agent 从**默认分支**读配置，并从 **MR 目标分支**读 `AGENTS.md`。实际镜像行为和 GitLab 默认分支本次未做运行时核验，接入时应验证这两个配置来源。[配置:1](https://gitlab.thinkingdata.cn/thinking-analytics/ta-admin-manager/-/blob/5867421ab95c6439a50769cdee215e9f802fcac9/.pr_agent.toml#L1)

专项链路的核心是“确定性识别影响，AI 分析风险”：

- `generate_labels.sh` 先执行 PR-Agent `generate_labels`；Stable Upversion matcher 对 `CI_MERGE_REQUEST_DIFF_BASE_SHA..CI_COMMIT_SHA` 做本地分析，产出版本、步骤、调用路径和修改节点。[generate_labels:37](https://gitlab.thinkingdata.cn/thinking-analytics/ta-admin-manager/-/blob/5867421ab95c6439a50769cdee215e9f802fcac9/ci/pr-agent/generate_labels.sh#L37)
- GitLab 标签客户端只增删 matcher 自己负责的标签，并重新读取最终标签。matcher 失败时跳过同步，避免把“无法判断”误当成“无影响”而删除标签。[同步:140](https://gitlab.thinkingdata.cn/thinking-analytics/ta-admin-manager/-/blob/5867421ab95c6439a50769cdee215e9f802fcac9/ci/gitlab/gitlab_mr_labels.py#L140)
- `ask_by_labels.sh` 根据最终标签快照执行 Flyway / Stable Upversion Ask；后者附 matcher JSON，规则禁止 AI 发明调用关系。CI 再统一执行一次通用 Review。[Ask 路由:58](https://gitlab.thinkingdata.cn/thinking-analytics/ta-admin-manager/-/blob/5867421ab95c6439a50769cdee215e9f802fcac9/ci/pr-agent/ask_by_labels.sh#L58)

te-cli 可以复用通用 Review 接法和专项分工，但 Flyway/Java 升级 matcher 是 admin 专属实现，不应搬入 CLI。标签客户端识别 `GITLAB__PERSONAL_ACCESS_TOKEN` / `GITLAB_PERSONAL_ACCESS_TOKEN`；模型网关、镜像权限和 Runner 可用性需按实际部署核对。[标签凭证入口:21](https://gitlab.thinkingdata.cn/thinking-analytics/ta-admin-manager/-/blob/5867421ab95c6439a50769cdee215e9f802fcac9/ci/gitlab/gitlab_mr_labels.py#L21)

## 4. te-claude：质量自动化完整，CI 未接入 AI 语义 Review

workflow 只放行目标为 `release/*` / `integration/*` 的 MR，以及显式声明创建 integration 分支的 schedule；明确排除 push。定时创建集成分支不等于审核集成分支。[workflow:5](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/.gitlab-ci.yml#L5)

- **失败 Job**：validate 执行类型和结构检查；test 执行完整测试与覆盖率；build 只对目标为 release 的 MR 执行；migration/schema 变化时执行真实 MySQL 回放。
- **观察 Job**：impact-analysis、security-observe、lint-observe、quality-summary 都是 `allow_failure: true`；增量覆盖率也不拦截发布。
- impact、安全扫描、summary 是确定性脚本与已有证据汇总；本地 `/ae-code-review` 的 Standards/Spec 双轴语义 Review 没有被当前 YAML 调用，不能将质量汇总评论视为 AI 已审过代码。

值得复用的是汇总机制：失败后仍执行 report、按 MR 使用 `resource_group` 串行写入、更新同一 marker 评论、传 `--expected-head` 检查源分支 SHA，并通过 Pipeline ID 防止旧结果覆盖新结果。[quality-summary:345](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/.gitlab-ci.yml#L345)、[评论发布器:68](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/post-mr-comment.js#L68)

该保护只绑定源分支 HEAD，未绑定目标分支 HEAD；读取 MR 与更新评论之间仍有时间窗口。impact 脚本还有读取失败降级为空变更的行为，不适合直接拿来做硬门禁。迁移应提取独立的评论/状态保护能力；不能直接移植 Next.js、Prisma、系统 skills 准备和对应 Job 名称假设。更细的源码追踪见 [te-claude 专项调研](2026-09-06-te-claude-mr-integration-ci-audit.md)。

## 5. integration 覆盖边界

| 事件 | common | admin | te-claude | te-cli |
| --- | --- | --- | --- | --- |
| feature → integration 的 MR | Claude 审查 | 单测 + PR-Agent + 适用 Flyway | 类型/结构/测试 + 观察报告 | 仓库未配置 |
| integration → release/6.0 的 MR | 当前 CI 不匹配 | 同上 | 同上，并运行 build | 仓库未配置 |
| integration 合并后或直接 push | 当前审核 Job 不匹配 | 当前审核 Job 不匹配 | workflow 明确拒绝 | 仓库未配置 |
| 多个 MR 合并后的相互影响 | 无独立分支审核配置 | 无独立分支审核配置 | 无独立分支审核配置 | 仓库未配置 |

MR 测试是否运行在 GitLab 生成的合并结果上，取决于项目侧 merged-results 等配置，本次没有验证。即使各 MR 的源分支测试通过，也不能直接推导多个 MR 合并后的 integration HEAD 已验证。

## 6. 建议的 te-cli 接入方案

建议采用 **admin 的确定性门禁与 AI Review 分工 + te-claude 的可靠汇总**，先接通最小闭环，再按需要引入 common 的上下文审查。

### 触发与审核范围

| 阶段 | 建议触发 | 检查内容与差异范围 |
| --- | --- | --- |
| MR 合入前 | 目标为 `release/6.0` 或 `integration/6.0-*` | 完整 MR diff，build/test/规则校验、相关域回归、AI Review；绑定本次源 SHA 与目标基线 |
| integration 合并后 | push 到 `integration/6.0-*` | 对当前集成 HEAD 执行确定性回归，验证组合结果；差异可以用于选择测试，但不能把只检查最新 commit 当作整支检查 |
| integration 发布前总审 | integration → release/6.0 的 MR | 基于固定 release/6.0 基线与 integration HEAD 审核全部未发布改动，检查跨 MR 契约和组合影响 |

如还需要独立于发布 MR 的整支 AI 总审，可增加显式手动入口，输出 artifact 或 commit 级结果。PR-Agent 当前以 MR URL 为入口，没有 MR 上下文时不能直接把分支名传给 `review`；这时才考虑改造 common 的本地 diff 输入。6.1 分支必须映射 release/6.1，不能混用 6.0 基线。

### 最小实现范围

1. 新增 `.gitlab-ci.yml`，定义 6.0 MR 与 integration push 规则、Node 运行环境、依赖缓存和报告产物。Node 版本需兼顾项目声明的 Node ≥20 支持范围。
2. 修正 `scripts/qa-changed.mjs` 的 base/head、Git 错误处理、业务域路径与公共模块展开规则；整理 `qa-full.mjs` 和 package scripts，确保测试清单覆盖当前 verify。先验证专项脚本是否需要外部服务，避免直接把所有脚本放进离线 CI。
3. MR 中将 build、默认 test、适用业务域回归设为确定性门禁；接入 check:release、agents-docs、self-check 时先核验 release 基线。独立 typecheck 先评估当前基线，再决定上线方式。
4. 复用 PR-Agent 通用 `review`，增加 te-cli 规则。初期 AI 为观察型，稳定后再将有明确定义和可校验输出的规则升级为阻断项；模型不可用、审查不完整和发现代码缺陷应分别呈现。
5. 汇总记录 source/base SHA、Pipeline、Job、测试结果和 AI 结果，失败仍产出，MR 评论幂等且拒绝过期覆盖。integration push 的结果写 artifact/分支对应状态，不能假设存在 MR IID。
6. 在实际 GitLab 项目中核实 CI 配置入口、Runner/镜像、模型和 GitLab 凭证、受保护分支及合并策略。审核规则应来自受信任基线，避免单个 MR 通过修改自身规则绕过审核。

### te-cli 的审核重点

- **CLI 契约**：命令注册、flag、必填参数、risk / dry-run / validate 与服务端能力一致，退出码和错误 envelope 正确。
- **鉴权与数据边界**：token 复用、401/403 语义、host/项目上下文，稳定 ingestion data-plane 不附带 AE 凭证。
- **输出行为**：stdout/stderr 分工、JSON 格式、分页/流式下载、敏感信息脱敏、jq 和大整数语义。
- **Agent 可用性**：command 与 skill/reference 同步，帮助文案与真实参数一致，AGENTS/CLAUDE 同步。
- **跨 MR 影响**：共享 client/framework 改动是否破坏其他业务域，依赖与打包资源是否完整，6.0 版本线契约是否保持。

规则优先从当前 [AGENTS.md](https://gitlab.thinkingdata.cn/te-ai/te-cli/-/blob/369905920ea9dd69df81223d1de93e2332dcb661/AGENTS.md) 与已有回归测试提取，可确定执行的约束放测试，依赖代码理解的缺陷交给 AI。

## 7. 本次验证与限制

- 四仓库均 fetch `release/6.0`，使用 `git show` / `git ls-tree` 检查固定提交。
- 在临时 Git 仓库运行 release 版 `qa-changed --list`：未提交的 analysis 变更选择 build、test、7 个 analysis verify；提交同一变更后只剩 build/test，而 base..head 仍含该变更。另复现 te-agent 路径变更未选中 agent verify。
- 在临时目录运行 common 原有审查单测：41 项中 40 项通过，1 项因本机未安装 `claude_agent_sdk` 报错；这是本地依赖限制，未将其归为业务失败，也没有宣称整套测试通过。
- 未调用真实模型或发布 MR 评论，未运行产品全量构建/回归；未查询远端 Pipeline 历史、项目合并设置或内部 PR-Agent 镜像实现。
- 交付为分析文档；未新增 CI、修改审核实现、提交或推送代码。
