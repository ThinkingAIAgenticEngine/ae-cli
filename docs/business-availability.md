# CLI 按业务显示命令与同步 Skill

日期：2026-10-22。公共实现基于 release/6.0，功能分支 feat/cli-business-skill-sync-6.0。

## 适用边界

业务命令过滤、执行前业务状态检查及按业务剪裁 Skills 仅适用于外部 Agent 使用的本机 CLI。TE Agent 内置沙箱保留完整命令、能力发现和全部 Skills，不根据这套本机业务缓存过滤或返回 `BUSINESS_NOT_ENABLED`；服务端的身份、权限和实际接口错误处理保持原样。

沙箱识别覆盖专用配置目录、标准运行时标记和旧的注入凭证回退，不能假设 SDK 总会转发同一环境变量。外部 Token 本身不表示沙箱：本机外部 Token 调用仍使用业务命令检查，但不管理宿主全局 Skills。内置沙箱不接管本机全局 Skill 目录；CLI 包内完整资源以及 TE Agent 既有的沙箱 Skill 预置、发现与更新链路不变。

## 契约和映射

后端 `/v1/ta/cli/config` 保留原 versions/features，新增可选 businesses 对象。6.0 识别 dataops、engage、agent、community；只接收布尔值。analysis 默认可用，不需要也不消费开关。缺字段、旧后端、非法值和请求失败均为未知，不能当成关闭。

命令映射在 `src/core/businesses.ts`；Skill 组件归属统一登记到 `src/core/skill-businesses.json`，运行时与门禁共用。data-integration 归分析；kb/team/agent/memory/automation/things/workspace/evaluation/sync/model/context 和 system 的 Agent 管理叶子归 agent。system 的分析叶子保留。未知新命令/Skill 在运行时默认保留兼容，不依名称前缀猜业务。

新增 `skills/*/SKILL.md` 必须按 frontmatter 中的实际 `name` 在上述 JSON 显式登记一个组件；分析 Skill 使用 `analysis`，跨组件的基础能力使用 `base`，二者仍始终可用。`npm run check:release` 和 `npm run self-check` 均全量校验组件覆盖，漏配、重复归属、未知组件或非法映射结构按 P1 阻断；`self-check --since` 不缩小这项检查。`.agents/skills` 中的研发维护 Skill 不在随包检查范围。未随当前发行包发布的历史或内部映射可以保留。新增组件还须同步 `OPTIONAL_BUSINESSES` 与门禁支持的组件枚举。

2026-10-23 确认的 Agent 规则：License 不存在 `te_agent_enabled`，不得将该字段作为开通条件。6.0 强制部署 Agent，且没有 `k8s_enabled` 配置，后端默认返回 `businesses.agent=true`；6.1 仅由现有 businessconf SDK 读取的 `k8s_enabled` 决定，沿用 SDK 默认值，明确 true/false 对应开启/关闭，状态服务返回 null 或读取异常才保持 unknown 并省略 `agent`。当前 SDK 缺少配置时默认 false，不将其改写为 unknown。CLI 只消费后端归一化结论，不读取 SDK、不组合 License，也不通过接口探活推断部署。

业务状态绑定规范化 Host 与 CLI Token 的 SHA-256 指纹，不保存明文 Token。执行状态有效期 10 分钟；刷新失败按未知放行业务接口判断，避免旧 false 永久阻断。帮助与安装读取该身份最后成功快照。切换身份不会沿用另一身份状态。

## 命令发现与执行

保留原命令注册、名称、别名和参数。根帮助、子帮助和 help 子命令使用相同过滤规则；帮助只读本地缓存，不访问网络、登录、自动更新或改 Skill 文件。capability list/search 同样按所属业务过滤；inspect/run/validate/dry-run 等显式操作在组件请求前检查。

只有新鲜且明确的 false 返回 `BUSINESS_NOT_ENABLED`（保留结构化错误与非零退出码）；这项调用行为变化是本需求明确授权的业务开通检查。unknown 仍交给原业务接口授权。`--no-update-check` 不绕过业务检查。基础 auth/config/capability/install/update/help 始终可达。

## 刷新与一套全局 Skill

登录完成、设备码恢复完成、set-token、auth use、活动环境切换后强制获取 config，再同步。只获取设备授权码时不触发。config/Skill 失败与认证结果分别报告，不回滚成功登录。

`ae-cli config refresh` 主动刷新当前活动环境并同步。显式 `--host` 刷新只更新该身份的业务缓存，即使 URL 与 active 相同也不改变全局 Skill。外部 Token 和沙箱调用不管理用户全局 Skill。普通 config show 与 help 不改文件。

首次安装、还没有成功业务快照时全量安装。之后 install/update/自动版本同步共用选择器：true 安装或更新；false 移除受管副本；unknown 保留已有副本且不补装未知业务。完整包内 `skills/` 始终保留，重新开通从包中恢复。全局集合跟随一个活动环境，客户已接受此限制。

旧安装首次迁移仅接管内容完整匹配已知包源的副本。升级先核对旧包快照；首次登录只能核对当前包快照。只迁移一次，同名不构成归属证明。账本已经存在时不会自动接管新出现的未知副本。修改、额外文件、链接和来源冲突保留并报告。

## 复用 Skills 工具与范围

生产依赖固定 skills@1.5.12，并校验其 cli.mjs SHA-256。受控适配器复用原 registry、installer 和 remover；AE 不维护第二份客户端目录表。只处理工具支持的全局目标，跳过只支持项目目录的客户端；子进程固定安全工作目录，删除精确到已检查目标。逐副本核对内容和结果，不以退出码 0 或同名聚合 list 当成功证据。

新副本只安装到上游 `getAgentBaseDir` 指定的规范目标。当前固定版本将 Codex、Cursor 与 universal 合并到共享 `.agents/skills`，Claude Code 使用独立的 `.claude/skills`。registry 里额外的旧目录仅用于识别、迁移、更新和移除已有副本，不因检测到客户端或空目录就新建副本。旧目录中的受管副本仍在业务开启时更新、关闭时移除；重新开通只恢复规范目标，不重新创建已删除的旧副本。内容归属、用户修改和链接保护不变。

业务快照、活动 generation、受管摘要账本和同步锁位于用户 `.ae-cli`。异步 config 返回前预留 generation，落盘与变更前再次核对当前 Host/身份，过期任务停止。文件锁串行化同步；用户项目、完整源目录和未知副本不属于清理范围。

旧的“本地失败后裸执行 GitHub 全量 add”被取消，因为该重试会绕开逐目标内容保护。安装/更新的命令、参数、报告顶层字段保留，source/attempts 如实报告已验证包源。失败修复后可重试，不依远端源覆盖冲突。

同步结果只影响后续客户端发现。请新开 Agent 会话；无法撤回本轮已加载名称、描述、正文。项目副本、未知工具和手动导入的内部库不保证自动清理。

## 6.1 合入规则

6.0 Agent 强制部署，后端默认返回 `agent=true`，不增加 Agent License 或 K8s 条件。6.1 Agent 可选部署：后端仅消费现有 businessconf SDK 的权威 `k8s_enabled` 三态结果，禁止用探活或 404 推断。此前将 Agent License 与部署状态合并的设计已由 2026-10-23 确认的规则取代。

6.1 额外增加 experiment：同时登记 businesses 枚举、experiment 命令/能力域与 ae-experiment、ae-experiment-design、ae-experiment-insight 三个 Skill。后端使用公司实验开关与有效期，客户端只消费归一化布尔结论。

先完成并验证 6.0，再从 release/6.1 建独立功能分支，merge 6.0 功能分支后提交专项适配；后续通用修复继续 6.0 → 6.1 合入，不整份覆盖差异文件。同步2仅为6.0环境；6.1本次不部署，由用户自行验证。

## 兼容与验证

旧客户端忽略新增 config 字段；新客户端对旧后端按 unknown 保留原展示和请求。已发布 Skill 名称、目录、职责和引用未改，包内资源未删除。过滤安装集合属于已授权行为；本地保护跳过会明确报告 partial，不能声称所有副本已精简。

专项入口：`npm run verify:businesses`、`npm run verify:business-skills`、`npm run verify:skill-businesses`、`npm run verify:install`、`npm run verify:version-sync`、`npm run verify:update-check`；另执行 build、npm test、config/auth/analysis-system/capability 兼容回归和文档校验。真实同步和破坏性边界测试使用隔离 HOME，避免改动开发者现用 Skill。

Windows 原生客户端由用户补测；6.1 环境由用户验证。测试文档须区分真实6.0服务端联调、模拟业务矩阵、单元测试和未执行项。

## 6.0 验证记录

2026-10-22（Asia/Shanghai）：后端提交 ca8dd6325655f0e82e170e529237144429a900cf 经 common-service-publish-pipeline 构建45494，以Java11部署同步2（环境1540），20:24:32构建成功。真实config返回 dataops/engage/community=true，agent缺字段保持unknown；analysis与experiment无返回。凭证校验正常，分析能力目录130项。这是规则调整前的历史响应，不代表当前 6.0 默认 `agent=true` 的验收结果。

真实服务端+隔离HOME的首轮联调验证了最新config同步success、未知Agent保留；显式 --host refresh 不改变context/ledger，原活动环境保留。首轮曾把registry旧目录也作为新安装目标，104份副本不是当前正确安装口径，后续已修正为上游规范目标并增加回归。没有改动开发者现用全局Skill或测试环境license。

另以本地HTTP服务驱动真实CLI和固定Skills工具，验证完整包的旧副本迁移、仅分析关闭组移除、数开重新开通恢复、unknown保留。关闭状态的服务器开关组合使用服务单测与该隔离矩阵，不能将同步2现有全开license当作关闭组实测证据。

定向校验：业务发现/登录刷新31例通过，受管Skill28例通过+1原生Windows跳过；安装30例通过+1原生Windows跳过，另入口/打包2例通过；自动同步29例及原版本测试通过。config命令18项、认证凭据套件、capability发现16项、跨源12项、分析system22项通过；build、npm test、TypeScript与diff检查通过。

独立review发现并修复：父级链接导致包源重叠、崩溃空锁与遗留reclaim、注入身份误同步全局、持久化新身份前未失效旧worker。真实完整包测试还发现大stdin请求EAGAIN/EPIPE，已使用异步UTF-8完整读取并保留超过128KiB的批量回归；规范目标修正后该回归使用386操作。修改或来源不明副本、cwd项目副本、链接依赖、权限失败、并发身份变化均有保护测试。

历史config测试的auth status/logout断言落后于本任务基线已有的多账号契约，已更新fixture断言，未改变既有认证输出语义。四份README新增用法含义一致，链接和公开源泄漏检查通过；其余历史章节数量差异未顺手重写。self-check无P1/P2，既有P3为缺少独立typecheck脚本（本任务已实际执行tsc）。

6.1仅本地分支适配和测试；本次不部署。Windows真实文件句柄锁、USERPROFILE无HOME、npm .cmd入口、客户端目录与junction边界留给用户补测。

公共复核修复：capability按ID的逻辑业务归属检查，`--domain`只决定路由。分析/metadata经其它route不能被该route业务license误拦，已关闭dataops也不能改route旁路。新增通用回归，6.0业务专项现32例。该修复从6.0功能分支merge回6.1，保留实验的独立业务与engage共享route。

规范目录修复：6.0业务专项32例、受管Skill专项30例通过+1原生Windows跳过；首次安装不创建Codex/Cursor旧目录，独立客户端沿用上游目标；已有旧副本迁移、更新、关闭删除与只恢复规范目录均通过。旧副本的修改保护、unknown保留、源码重叠、链接与逐副本失败回归保持通过。安装30例通过+1原生Windows跳过、入口/打包2例、自动同步29例及原版本测试通过，TypeScript检查通过。关闭业务的本地HTTP登录回归使用完整发行资源，并预置四类可选Skill的规范和旧目录代表副本；不声称每个完整Skill都经过旧副本登录迁移。

2026-10-23 补强 Agent 恢复回归：`tests/environment-refresh.test.ts` 使用隔离 HOME、本地 HTTP config 服务、真实 CLI 和固定 Skills 工具，先关闭 Agent 并移除完整组，再返回 `agent=true`。当前包的 14 个 Agent Skill、共 135 个源文件恢复到共享与 Claude Code 两个规范目标，逐文件核对内容；11 个 Agent 根命令域和 system 的 Agent 管理叶子重新可见，已移除的 Codex/Cursor 旧副本不重建。该用例验证客户端消费布尔状态后的恢复链路，不代替 6.0 默认开启或 6.1 businessconf SDK 状态来源的后端验证，也没有改动开发者的真实登录态或全局 Skill。

## 2026-10-23 内置沙箱边界补充

本轮已完成独立干净回归，业务套件的总数已包含新增10项沙箱用例，不重复累加：

| 版本 | 业务专项 | 受管 Skill 专项 | 安装与入口 |
|---|---|---|---|
| 6.0 | `verify:businesses` 42/42 | 38通过、1原生Windows跳过 | 安装30通过、1原生Windows跳过；入口2通过 |
| 6.1 | `verify:businesses` 43/43 | 39通过、1原生Windows跳过 | 安装30通过、1原生Windows跳过；入口2通过 |

两线 build、npm test、`tsc --noEmit`、README 1/1及diff检查通过。两线self-check均为P1=0、P2=0，既有P3是package缺少独立typecheck脚本，本轮已实际执行tsc。

三个沙箱上下文（标准运行时、仅专用配置目录、无标准标记的旧注入凭证回退）均使用完整包验证：6.0共26个Skill、6.1共29个Skill，源资源与两个发现副本的全部文件摘要，以及ledger/context，在config refresh和完整登录后均未变化。帮助和capability发现保持完整，显式执行进入原业务接口；403保持拒绝且不重试。本机外部Token对照仍保留业务过滤，不管理宿主全局Skills。

独立review未发现阻断项，已复核集中判断入口、旧凭证回退、短路顺序及无循环依赖。完整原始主证据为 `/tmp/ae-cli-sandbox-boundary-{6.0,6.1}-{businesses,types,build,test,install,skills}.log`；不修改套件原始日志，也不以前轮QA或agent单跑结果代替。

本轮未部署；这些是本地隔离环境与完整包回归，不代表实际Linux沙箱联调或原始制品生产脚本验证已完成。沙箱原有Skill预置与更新链路未改。
