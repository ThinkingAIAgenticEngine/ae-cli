# te-claude MR 与 integration 审核机制调研

调研时间：2026-09-06。事实基线：`origin/release/6.0`，完整 SHA `ef70eef5604b2421bf46e902f6fdd89df4981e3e`；工作区 HEAD 与该 SHA 一致。本次只阅读源码与规则，未执行评论发布、安全扫描、CI 或 GitLab 写操作，未查询服务端保护分支、合并要求、变量、Runner、外部 Webhook 与实际流水线设置。

## 核心结论

te-claude 已实现 **MR 自动质量检查和固定评论汇总**；仓库内 CI 没有调用 AI 通用语义代码审核。AI Standards + Spec 双轴 Review 位于本地 Agent Skill 交付流程。`integration/*` 作为 MR 目标受覆盖，但该分支 push、合入后分支状态均不触发独立流水线。把这些机制整体称为“integration 自动 AI 审核”会扩大实际覆盖范围。依据：[CI 入口与排除规则 L5–19](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/.gitlab-ci.yml#L5)、[CI Job L129–379](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/.gitlab-ci.yml#L129)、[双轴 Review Skill L6–26、63–83](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/.claude/skills/ae-code-review/SKILL.md#L6)。

## 1. 触发与合并结果覆盖

| 场景 | 当前仓库配置 |
| --- | --- |
| 任意来源分支 → `release/*` 的 MR | 运行 MR 质量流水线，包含 build |
| 任意来源分支 → `integration/*` 的 MR | 运行 MR 质量流水线，不运行 build |
| MR 目标不是上述两类分支 | workflow 排除 |
| push 到 feature、integration、release（含合入产生的 push） | workflow 排除 |
| schedule | 仅 `SCHEDULE_TASK=create-integration-branch`；执行建集成分支脚本，不是审核 |

来源：[workflow L11–19](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/.gitlab-ci.yml#L11)、[schedule L46–67](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/.gitlab-ci.yml#L46)、[build L321–343](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/.gitlab-ci.yml#L321)。

源码区分 MR source SHA 与 pipeline commit：MR 描述/测试确认绑定 `CI_MERGE_REQUEST_SOURCE_BRANCH_SHA || CI_COMMIT_SHA`，安全扫描产物绑定实际 `CI_COMMIT_SHA`，因此汇总层考虑了二者不同的情况；这不能证明 GitLab 已启用 merged-results pipeline 或 merge train，也不能证明 integration 最新合并态已验证。目标分支 HEAD 更新本身不在 stale 校验条件中。来源：[上下文 SHA L99–117、176–204](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/quality-ci-summary.js#L99)、[安全报告 SHA L268–272](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/lib/quality-ci-summary.js#L268)、[MR stale 条件 L59–69](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/lib/gitlab-quality-evidence.js#L59)。

## 2. 自动检查具体做什么

- **impact-analysis**：`impact-report.js --from-diff` 获取文件列表，调用 madge 依赖图、关联测试和错误记忆；风险是依赖数/错误记忆条数阈值，没有 LLM 判断。只统计 `src/**/*.ts,tsx`，排除测试与 `.d.ts`。该 Job 仅生成 artifact，当前固定评论由 quality-summary 统一写入。来源：[CI L132–146](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/.gitlab-ci.yml#L132)、[分析实现 L252–270](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/lib/impact-analyzer.js#L252)、[文件过滤 L3–12](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/lib/changed-source-files.js#L3)。
- **security-observe**：路径、增删行和正则规则识别 database、permission、sandbox、tool-mcp、secret、quality-governance 风险；实际红线 findings 来自数据库、Sandbox、secret 扫描。输出 R1/R2/R3 与真实 findings，不能视为完整权限/并发/业务语义审查。来源：[安全领域 L8–15](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/lib/quality-security.js#L8)、[风险与 findings L634–706](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/lib/quality-security.js#L634)。
- **quality-summary**：从当前 pipeline 的 GitLab Jobs API 分页取真实状态，按 job name 选最新重试，读取安全/影响面/覆盖率 artifact，并核验 MR 描述和 R3 测试人员评论；没有再运行测试，也没有启动 AI review。来源：[Jobs 获取 L51–96](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/quality-ci-summary.js#L51)、[摘要输入 L156–205](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/quality-ci-summary.js#L156)、[检查清单 L268–315](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/lib/quality-ci-summary.js#L268)。
- **R3 专项确认**：API 校验 `QUALITY_TESTER_USERNAMES` 中作者，要求 `<!-- quality-test-confirmation:pass commit=<当前 SHA> -->`；同一条通用确认被用于所有适用专项的 PASS，不是 CI 分别执行 Agent Eval、权限隔离和 Sandbox Trace。来源：[身份与 marker L88–136](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/lib/gitlab-quality-evidence.js#L88)、[专项证据复用 L133–188](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/lib/quality-ci-summary.js#L133)。

本地 `/ae-code-review` 审 staged diff 或固定点到 HEAD 的已提交变更，分别由 Standards 和 Spec 子 Agent 审核；项目规则要求实现结束、提交前执行。`quality-flow-gate` 明确复用既有双轴 Review，缺少当前 commit Review 事实只列 WARNING，不开启第二轮通用审核；CI YAML 没有运行 `quality:gate`。来源：[本地交付规则 L11–13](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/.claude/rules/quality.md#L11)、[双轴调用 L63–83](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/.claude/skills/ae-code-review/SKILL.md#L63)、[Review 复用 L25–27](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/.claude/skills/quality-flow-gate/SKILL.md#L25)。

## 3. 失败 Job、合入建议与真正合并门禁

| 层次 | 当前行为 |
| --- | --- |
| 普通失败 Job | prepare-system-skills、validate（typecheck + structure）、test（全量 coverage）、release 目标 build；自动命中的 migration-replay |
| 观察 Job | impact-analysis、security-observe、lint-observe、quality-summary 均 `allow_failure: true` |
| security-observe 双重观察 | `--advisory` 下有红线和扫描异常也不设置非零退出码，报告分别保留 FAIL 或由汇总标记未验证 |
| coverage | 增量覆盖率统计命令 `|| true`，低于参考线只是 warning；不能当作增量覆盖率阈值门禁 |
| migration 特例 | migration/schema 变化自动执行；仅 CI 配置变化为可选 manual、allow_failure |
| quality-summary | `OBSERVE_ONLY` 固定值；READY、NOT_READY、NOT_VERIFIED、STALE 是建议，不设置新 Required Job |

来源：[CI L148–215](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/.gitlab-ci.yml#L148)、[migration/test L278–319](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/.gitlab-ci.yml#L278)、[summary L345–379](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/.gitlab-ci.yml#L345)、[advisory 退出行为 L52–76](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/quality-security-scan.js#L52)、[OBSERVE_ONLY L361–368](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/lib/quality-ci-summary.js#L361)。

CI 注释明确假定“受保护分支只通过 MR 合入，无需额外触发分支 push”。源码只能证明某些 Job 失败会让流水线失败；**保护分支是否禁止直接 push、是否要求成功 pipeline 才能合并、是否启用审批规则均需服务端配置确认**。同样，Token 可读 Jobs/MR/notes、写评论及查询 `/user`、授权测试人名单、Runner 内网 API 可达性都是部署前提，不能由变量名存在推定已满足。来源：[保护分支假定 L126–131、内网 API L41–44](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/.gitlab-ci.yml#L126)、[Token 与身份查询 L34–48、90–107](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/post-mr-comment.js#L34)。

## 4. diff、过期结果与评论幂等

1. **完整 MR 基线**：security Job 必须有 `CI_MERGE_REQUEST_DIFF_BASE_SHA`，本地对象不存在时 fetch；扫描使用 `baseRef...HEAD` 并记录 HEAD。impact 优先读取实时 MR `/changes` 文件列表，降级为 diff-base（无则 HEAD~1）到 HEAD；读取异常吞掉并返回空列表，还会生成“无变更文件”。impact API 路径未核对返回 SHA/截断标记，因此它不具备安全报告同等的固定 diff 保证。来源：[security 基线 L163–174](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/.gitlab-ci.yml#L163)、[Git diff L816–860](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/lib/quality-security.js#L816)、[impact fallback L22–71](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/impact-report.js#L22)。
2. **新提交使旧证据失效**：GitLab MR `sha !== currentCommit` 立即标 stale；测试确认 marker 精确绑定该 commit。摘要将此状态变成 STALE；安全 artifact 的 commit 则必须匹配 pipeline commit。来源：[MR stale L59–69](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/lib/gitlab-quality-evidence.js#L59)、[摘要优先级 L26–33](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/lib/quality-readiness.js#L26)、[artifact 校验 L86–112](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/lib/quality-ci-summary.js#L86)。
3. **固定单条评论**：使用 `quality-flow-summary` marker；分页查找时同时校验当前 Token 作者 ID；存在则 PUT，否则 POST；分页查询失败/超限直接停止，避免查找失败造成重复发布。来源：[发布器 L60–151](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/post-mr-comment.js#L60)、[marker 作者校验与分页 L53–90](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/lib/mr-comment.js#L53)。
4. **旧流水线不能正常覆盖新结论**：CI `resource_group` 按 MR 串行化；发布前重读当前 MR HEAD，要求报告 SHA 一致；只接受 `source=ci` 且有 pipeline ID；同一 SHA 拒绝较小 pipeline ID。MR 失败不自动取消其余 jobs，summary `when: always` 尽量收集失败结果；新提交可取消旧 interruptible jobs。来源：[CI L5–23、345–379](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/.gitlab-ci.yml#L5)、[发布前 HEAD L68–108](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/post-mr-comment.js#L68)、[替换条件 L29–50](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/lib/mr-comment.js#L29)。

上述并非服务端原子 compare-and-swap：重读 HEAD 与最终写 note 之间仍有窗口；且目标 HEAD 不参与版本绑定。因此可借鉴防旧结果设计，但不宜声称它证明“最新目标合并态已经审核”。这个限制来自以上实际比较字段与分离的 GET/PUT 请求。

## 5. 给 te-cli 的复用建议（建议，不是现有实现）

- **先复用 CI 骨架和证据层**：MR 目标规则、基础验证 jobs、`when: always` 汇总、真实 Jobs/artifact 来源、状态区分、source/pipeline SHA 分离、固定 marker + 作者身份 + pipeline 顺序 + resource_group。对应实现见上文第 1、3、4 节。
- **单独接入 AI 审核执行器**：若目标是无人值守的 MR 代码语义审查，需要新 job/服务实际调用审核 Agent，固定 diff 和规则版本，输出 findings 与机器状态；仅复制 impact/security/summary 或安装 ae-code-review Skill 不会产生此能力。可复用双轴思路和 Finding 契约，但应适配 CLI 命令兼容、输出/退出码、认证、路由、Skill 与文档一致性。契约来源：[review criteria L5–20](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/.claude/references/code-review-criteria.md#L5)。
- **显式决定 integration 覆盖目标**：如要求审核已集成组合状态，应另行增加 integration push 检查，或验证服务端 merged-results/merge-train 方案；不能照抄当前“只审 MR、不跑 push”的假定后宣称已覆盖。报告应记录 source SHA、target SHA、diff base 与实际被测 commit。
- **不要直接复制业务实现**：Next.js build、Prisma/MySQL migration、Sandbox/Agent 专项、路径分类、madge tsconfig 和错误记忆规则与 te-claude 耦合；te-cli 应重建适用检查。也不要照搬 impact 的 `src/**/*.ts,tsx` 限定、API/diff 失败→空报告、未显式固定依赖工具版本等降级行为。来源：[impact 过滤](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/lib/changed-source-files.js#L3)、[npx madge 与降级 L23–48](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/ef70eef5604b2421bf46e902f6fdd89df4981e3e/scripts/lib/impact-analyzer.js#L23)。
- **观察策略与强制策略分开落地**：可先观察 AI findings，再按可靠性启用合并门禁；技术失败、无 diff、输出不可解析必须保留未验证状态。禁止直接把 `OBSERVE_ONLY` 评论当审核通过；强制合并约束和 CI 脚本/Token 的可信来源需要另外配置并验证。依据为上文第 3 节的当前边界。

验证边界：本报告为固定 commit 的静态配置与调用链分析；没有声称任何动态测试通过，也不能排除仓库之外的独立 GitLab 审核服务。
