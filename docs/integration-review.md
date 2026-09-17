# 集成分支自动审核接入指南

本指南说明如何为 te-cli 接入 PR-Agent、验证审核结果，以及排查没有评论或没有邮件的问题。

当前实现审核目标为 `integration/*` 的 MR 和直接向 `integration/*` 的 push。创建 MR 或更新其源分支时运行审核；MR 合并后产生的 integration push 只做来源识别，识别为已合并 MR 后立即结束，不调用模型、不发布评论或邮件，从而避免同一变更重复审核。

历史验证：此前通过 MR 流水线验证过模型调用、中文评论、文件定位和通知链路，收件人于 2026-09-07 确认收到邮件；[演示 MR !129 的中文结果](https://gitlab.thinkingdata.cn/te-ai/te-cli/-/merge_requests/129#note_81381) 成功指出 jq 多结果截断，耗时 1 分 47 秒。演示分支含故意缺陷，禁止合并。

首次成功记录：[Job #30101](https://gitlab.thinkingdata.cn/te-ai/te-cli/-/jobs/30101)，流水线 `#17581`，审核提交 `edca713a94b498b418f324b285824e923c74f3f7`。北京时间 2026-09-07 00:31:07 开始，00:40:01 完成，GitLab 显示总耗时 **8 分 55 秒**，排队 **3 秒**。从读取 MR 到开始发布前的审核与报告生成约 **8 分 48 秒**，评论发布约 **2 秒**。这是本次变更的实测数据，不代表所有 MR 的固定耗时。

[机器人评论](https://gitlab.thinkingdata.cn/te-ai/te-cli/-/merge_requests/126#note_81052) 已正确 `@desheng.liao`，绑定预期的 base/head SHA，结论为“未发现重大问题、未发现安全问题”，并识别到变更包含测试。模型采用 `deepseek-v4-pro`，输出预算 32K；此前 16K 请求因截断被拒绝发布。

2026-09-06 接入核对：te-cli 已启用实例 Runner，`#596 lab-docker` 在线，执行器为 `docker`，平台为 `amd64/linux`，标签为 `docker`，Protected 未勾选。本实现已使用该标签。ta-admin-manager 的 `#639` 同样是在线 Docker Runner，标签为 `pr-agent-docker`，但尚未分配给 te-cli。本次未修改任何 Runner 的全局配置或项目分配。

已创建 `te-cli-integration-review` 项目 Token（角色 `Reporter`，范围 `api`，有效期至 `2027-09-06`），并保存为 `GITLAB__PERSONAL_ACCESS_TOKEN` 项目变量：Masked、非 Protected、环境 `*`、不展开变量引用。`OPENAI__API_BASE` 和 `OPENAI__KEY` 均已保存为 Masked 项目变量；模型网关为 `http://10.206.32.57:3003/v1`，模型为 `deepseek-v4-pro`。另配置非密钥变量 `REVIEW_GITLAB_API_URL=http://10.206.35.91:8889/api/v4`，沿用系统 Skill 项目的内网 GitLab 入口；该 Runner 通过默认 HTTPS 入口请求 API 会超时。

## 一、本期审核范围

| 触发事件 | 审核内容 | 结果位置与提醒对象 |
| --- | --- | --- |
| 创建或更新目标为 `integration/*` 的 MR | 从 MR 差异基线到当前源分支 HEAD 的完整差异 | MR 评论，@MR 作者 |
| 直接向 `integration/*` push | 从 `CI_COMMIT_BEFORE_SHA` 到 `CI_COMMIT_SHA` 的完整差异 | HEAD 提交评论，@推送用户 |
| MR 合并产生的 `integration/*` push | 创建短流水线并识别为 `merged-mr` 后结束 | 不调用模型、不评论、不发邮件 |
| 无 MR 的功能分支 push | 不触发 | 无审核评论 |

例如，创建 `feat/new-command → integration/6.0-20260910` 的 MR 会触发，向该源分支追加提交会再次触发并审核更新后的完整 MR 差异。MR 合并后产生的 push 流水线会快速结束；开发者直接 push 到 `integration/6.0-20260910` 则正常审核。`integration/6.0-20260910 → release/6.0` 的 MR 目标不是 integration，也不触发。本期同样不审核 tag、定时流水线和手动 Run pipeline。

流水线入口允许两类事件：`CI_PIPELINE_SOURCE=merge_request_event` 且目标分支匹配 `integration/*`，或 `CI_PIPELINE_SOURCE=push` 且当前分支匹配 `integration/*`。GitLab 在创建 push pipeline 时没有提供“本次 push 是否由 MR 合并产生”的可靠预定义变量，因此合并来源只能在 Job 内通过 Commit API 查询。参考 [GitLab workflow 规则](https://docs.gitlab.com/ci/yaml/workflow/)和[预定义变量](https://docs.gitlab.com/ci/variables/predefined_variables/)。

规则适用于所有集成版本线。MR 审核基线使用 `CI_MERGE_REQUEST_DIFF_BASE_SHA`；merged-result 或 merge-train 流水线存在合成提交时，审核 HEAD 使用真实源分支 SHA。直接 push 使用实际 before..head；首次创建带版本号的 integration 分支时从对应 `release/x.y` 取基线，无版本号时需要 `REVIEW_BASE_REF`。

`master` 不参与审核基线、配置加载或上线流程。MR pipeline 使用源分支中的 CI 配置，因此旧功能分支若尚未包含本实现，需要先 rebase、merge 或 cherry-pick 相应配置。push 审核则要求被推送的 integration 分支本身保留 CI 和 `.ci/` 文件。

## 二、接入前准备

项目入口：[te-cli](https://gitlab.thinkingdata.cn/te-ai/te-cli)。先确认以下信息，已有配置可以复用。

| 需要确认的内容 | 当前实现要求 |
| --- | --- |
| 项目权限 | 能访问 Settings → CI/CD；添加项目变量需要 Maintainer 权限 |
| 首次接入目标 | 团队当前使用的一个 `integration/*` 分支 |
| Runner | 已确认 `#596 lab-docker`，使用 Docker executor，标签包含 `docker` |
| 容器镜像 | `docker-ta.thinkingdata.cn/te/pr-agent`，使用 `.gitlab-ci.yml` 中固定的 SHA-256 digest |
| GitLab 机器人凭证 | 能读取项目、MR、分支和提交关联，查询自身身份并创建 MR/提交评论的 API Token |
| 模型网关 | OpenAI 兼容的 API Base、API Key，以及获准使用的模型 |

如果由助手代配置，可以提供下面的信息；不知道的项目填“待检查”。密钥直接填入 GitLab Variables，或提供专门存放本次接入凭证的本机文件路径，不需要在聊天中粘贴密钥值。

```text
操作方式：助手代配置 / 我按步骤操作
已登录 GitLab 的浏览器：
项目角色：Maintainer / 其他 / 不确定
首次接入的目标集成分支：
现有 Runner 名称或标签：
GitLab 机器人变量：已有变量名 / 待创建
模型 API Base：
模型 Key：已有变量名 / 将直接填入 GitLab / 专用本机文件路径
模型名称：沿用 deepseek-v4-pro / 指定其他模型
```

## 三、按步骤接入

### 第 1 步：确认项目设置和目标分支

1. 打开 te-cli，进入 **Settings → CI/CD**。
2. 确认可以查看 **Runners**、**Variables**，并能新增项目变量。
3. 选定第一次接入和验证的目标集成分支。
4. 如果 **General pipelines** 配置了自定义 CI 配置路径，先确认其用途。本实现入口是仓库根目录的 `.gitlab-ci.yml`，不要直接覆盖其他有效流水线。

完成标志：确认项目是 `te-ai/te-cli`，具备配置权限，并已明确目标集成分支。无需修改默认分支。

### 第 2 步：检查 Runner 和镜像

1. 在 **Settings → CI/CD → Runners** 中查找本项目可用的在线 Runner。
2. 确认标签包含 `docker`，与当前 Job 一致。Job 按标签匹配，名称相似不代表可匹配。
3. 确认执行器是 Docker，能拉取内部镜像、访问 GitLab 和模型网关。私有镜像仓库认证及内部 CA 信任由 Runner 环境配置。
4. 确认 Runner 能承接功能分支指向集成分支的 MR 和 integration push；只允许受保护分支的 Runner 可能无法承接普通功能分支的 MR。

没有可用 Runner 时，为 te-cli 启用现有合适的 Runner，或由 Runner 管理员配置。不要只改标签就把 Shell Runner 当作 Docker Runner 使用。参考 [GitLab Runner 配置](https://docs.gitlab.com/ci/runners/configure_runners/)。

镜像需要包含 Python、Git、PR-Agent、PyYAML 和 TOML 解析库。本实现使用 `LocalGitProvider` 和 `PRReviewer`，显式解析 `.pr_agent.toml` 后逐项写入设置。内部镜像禁用了 Dynaconf 的默认 TOML 加载器，不能直接依赖 `get_settings().load_file()`，否则配置会被静默忽略。渲染子进程保留镜像的 `PYTHONPATH=/app`，只传递运行必需环境和模型凭证。

当前固定镜像 digest 为 `sha256:63009bc872a06bc9f485c5d905d02e570e67aa1ae010d00af3f600b0b8a4b2c2`。升级镜像后需要重新验证配置加载、完整差异检查和报告输出接口。审核容器不需要安装 te-cli 的 npm 依赖。

完成标志：Runner 在线、可用于本项目和预期 MR，镜像及网络条件具备。Job 一直 Pending 时优先检查这一步。

### 第 3 步：配置 CI/CD 变量

进入 **Settings → CI/CD → Variables**，先看项目变量及继承变量，再补缺失项。te-cli 属于 `te-ai` 组，不能因为 ta-admin-manager 所在的 `thinking-analytics` 组有变量，就认为 te-cli 也已继承。

| 变量名 | 必填 | 填写内容 |
| --- | --- | --- |
| `GITLAB__PERSONAL_ACCESS_TOKEN` | 是 | 本项目审核机器人的 API Token，需要 `api` 范围及读取项目/MR/提交关联、查询 `/user`、发布 MR/提交评论的权限 |
| `OPENAI__KEY` | 是 | 模型网关 API Key |
| `OPENAI__API_BASE` | 是 | OpenAI 兼容 API Base，按网关要求包含版本前缀，例如 `/v1`；不是网页地址，也不是完整的 `/chat/completions` 地址 |
| `REVIEW_BASE_REF` | 否 | 无版本号的 integration 分支首次 push 时使用的 release 分支，例如 `release/6.0` |
| `REVIEW_GITLAB_API_URL` | 否 | Runner 使用的内网 GitLab API 入口；默认使用 `CI_API_V4_URL`。当前沿用系统 Skill 项目的 `http://10.206.35.91:8889/api/v4` |

已有 `GITLAB_PERSONAL_ACCESS_TOKEN` 时脚本也能识别；同时存在时优先使用双下划线的规范变量名。

变量类型选择 **Variable**，环境范围设为 `*`；密钥开启 **Masked**，界面支持时可选 **Masked and hidden**，关闭变量引用展开。当前 Job 没有声明部署环境，不能把变量限定到某个部署环境。不要手动设置 `CI_COMMIT_SHA` 等 GitLab 预定义变量。参考 [GitLab CI/CD 变量](https://docs.gitlab.com/ci/variables/)。

**Protected 需结合 MR 和 push 两类规则设置。** integration push 可以使用该受保护分支可见的变量；普通 `feat/*` 通常不是受保护分支，仅保护 MR 目标集成分支，并不保证 MR 能拿到受保护变量。GitLab 新版本允许 MR 使用受保护变量和 Runner，但要求源、目标分支均受保护、同属一个项目、触发用户有目标分支权限，并启用对应设置；旧版本能力以实际实例为准。[官方说明](https://docs.gitlab.com/ci/pipelines/merge_request_pipelines/#control-access-to-protected-variables-and-runners)

要覆盖未受保护功能分支的 MR，需要为这类流水线提供获准使用的专用审核凭证；不要直接取消现有共享凭证的保护。如果团队要求密钥只用于受保护流水线，则需先调整分支或执行方案。Masked 只隐藏日志中的原值，不能阻止流水线脚本读取密钥。

模型名称在 `.pr_agent.toml` 的 `[config] model` 中，直接填写 `deepseek-v4-pro`，与发给网关的模型 ID 一致。适配器也兼容 `openai/` 前缀，会在发送请求时去掉该前缀。PR-Agent 负责差异处理、审核提示和报告生成，模型请求由 OpenAI 客户端直接发送，避免内部镜像的 LiteLLM 对自定义模型参数进行错误拦截。

`custom_model_max_tokens` 和 `max_model_tokens` 同时设为 `131072`，后者会限制前者，遗漏时可能仍被镜像默认的 32K 上限截断。网关上下文限制变化时，应同步调整两项；差异超限时会报错，不能将部分文件的审核当作完整报告。

请求采用 OpenAI 兼容调用方式：发送模型名称、system/user 消息、`temperature=0.1` 和 `reasoning_effort=low`，不关闭思考模式。PR-Agent 需要 YAML 格式的审核结果，因此不使用系统 Skill 的 JSON 输出格式参数。

DeepSeek 官方默认开启思考模式，强度为 `high`，实际行为还取决于内部网关配置；[官方说明](https://api-docs.deepseek.com/zh-cn/guides/thinking_mode/)。每次 MR 更新会审核当前完整 base..head 差异，直接 push 会审核完整 before..head 差异，而不是只审核最后一次提交。历史上首次成功的 MR 验证包含 11 个变更文件、1266 行新增内容，因此即使最终没有发现问题，仍需处理完整审核输入。

耗时排查：[Job #30104](https://gitlab.thinkingdata.cn/te-ai/te-cli/-/jobs/30104) 的输入为 37,432 token，模型请求耗时 548.37 秒，32,768 个输出 token 全部属于推理，正文字符数为 0，最终以 `finish_reason=length` 结束且未发布。这确认该次失败由推理用尽输出预算造成。当前将思考强度改为 `low`，以保留思考并降低耗尽预算的概率；具体耗时与效果仍以真实请求指标为准。网关排队时间没有单独指标，不能由这些数据直接推算。

输出上限 `review_max_output_tokens=32768`，单次调用超时 600 秒，渲染总时限 720 秒，Job 超时 15 分钟，不自动重试模型请求。模型返回 `finish_reason=length` 或正文为空时拒绝发布，避免将截断结果当作完整报告。更换模型或网关时，需重新验证参数支持、输入/输出预算与耗时；增加输出预算时还需协调模型、渲染和 Job 三层超时。

完成标志：三个必填变量对预期 MR 和 integration push 可用，机器人有查询提交关联及发布评论的权限，模型与网关匹配。

### 第 4 步：推送接入分支，验证 MR 审核

配置就绪后，在本次独立 worktree 中推送：

```sh
git push -u origin feat/integration-ai-review
```

1. 在 GitLab 创建 MR，源为 `feat/integration-ai-review`，目标为第 1 步选定的 `integration/*`。
2. MR 创建后进入 **Pipelines**，应出现 `integration-review` Job。单独 push 功能分支但尚未创建 MR 时，不产生流水线是预期行为。
3. 查看 MR 评论，核对机器人作者、被 @ 的 MR 作者、审核 SHA、差异基线和报告内容。
4. 下载 Job artifacts，检查 `.review/result.json` 的 `status=published`，并核对 `.review/report.md`。
5. 重试同一个 Job，应得到 `status=already-published`，评论不重复。重试可能再次调用模型，但不会重复发布相同范围。

不要用 **Run pipeline** 按钮代替这一步，它创建的 `web` 类型流水线不在本期范围内。`allow_failure: true` 使审核异常不阻断整条流水线，因此要查看具体 Job 和产物，不能只看 Pipeline 绿色。

完成标志：MR 有绑定正确 SHA 的真实审核报告，重试不会重复评论。

### 第 5 步：验证合并跳过与直接 push 审核

1. 按团队正常流程审核并合入接入 MR。
2. 合并产生的集成分支 push 会创建一个短 Pipeline，`.review/result.json` 应为 `status=merged-mr`，且没有模型调用、评论或邮件。
3. 直接向 `integration/*` push 应正常生成报告，并在本次 HEAD 提交下评论、@推送用户。
4. 对 merge commit、squash commit 和 fast-forward 后的源 HEAD，脚本分别用 `merge_commit_sha`、`squash_commit_sha` 和 MR `sha` 判断是否来自已合并 MR。
5. 按正常版本同步流程将配置保留在后续功能分支的共同基线和 integration 分支中。

GitLab 在 `workflow:rules` 阶段无法调用 API，因此无法可靠做到“合并 push 连 Pipeline 记录都不创建”并同时保留普通 integration push。当前方案把合并 push 的成本限制为启动容器和查询 GitLab，不调用模型。旧功能分支如果没有 CI 文件，需要先同步配置再更新 MR。

完成标志：MR 创建与更新会审核；合并后的 integration push 快速跳过；直接 integration push 正常审核。

### 第 6 步：验证邮件

脚本通过 **GitLab 评论 + @用户** 触发通知，不直接连接 SMTP。MR 审核提醒 MR 作者，直接 push 审核提醒 `GITLAB_USER_LOGIN` 对应的推送用户；识别为 `merged-mr` 的 push 不发布评论，因此不产生审核邮件。

审核正文使用仓库内的中文模板，包括标题、范围、结论、测试提示和文件定位；在实际模型请求的 system 消息中要求问题标题、问题描述和安全问题说明使用简体中文，代码标识符和 YAML 字段名保持原样。该要求优先于模板的英文示例和仓库源码语言约定。发布前还会检查这些说明是否包含中文；纯英文说明会让任务失败，不会作为审核评论发出。仅设置 PR-Agent 的 `response_language=zh-CN` 不足以翻译其内置英文标题，因此本实现从结构化审核结果生成中文正文，不额外调用模型翻译。GitLab 邮件中引用的审核评论随之变为中文；GitLab 自带的邮件页脚或操作链接文案由 GitLab 控制。

1. 在 te-cli 的个人项目通知设置中确认未选择 **Disabled**。可选择 **On mention** 接收 @提醒，并确认通知邮箱正确。
2. 使用审核机器人发布的新报告验证，在被 @ 用户的邮箱和垃圾箱检查邮件。
3. GitLab 有评论但没有邮件时，先检查个人/项目通知及邮箱验证状态，再由 GitLab 管理员确认实例邮件服务。

通知由 GitLab 管理，参考 [GitLab 通知邮件](https://docs.gitlab.com/user/profile/notifications/)。产物中的 `email_delivery=managed-by-gitlab-not-verified` 表示代码无法确认送达，Job 成功不能当作邮箱已收到的证据。

重复范围、空差异、过期流水线和模型失败不会产生新审核评论，因此不会新增一次评论通知。Pipeline 状态邮件属于独立机制，不等于邮件内自动包含审核报告。

完成标志：至少一位实际被 @ 的用户确认收到包含审核评论的邮件。

## 四、状态与排查

产物保留 30 天：`.review/report.md` 保存报告或错误/跳过说明；`.review/result.json` 保存状态、实际 SHA、事件和流水线 ID。

成功产物还包含 `review_seconds`（准备临时仓库至报告生成完成）和 `model` 指标：`model_seconds`（一次模型 HTTP 请求的总耗时）、`input_tokens`、`output_tokens`，以及网关提供时的 `reasoning_tokens`。`reasoning_chars` 与 `answer_chars` 只记录响应字段字符数，不保存或展示推理正文。请求耗时包含网关等待、模型生成及网络传输，不能直接等同于纯推理耗时。日志中的 `Model metrics` 可用于判断慢在模型请求还是本地准备；缺失 token 指标表示网关未提供，而不是零消耗。

| 现象或状态 | 含义与下一步 |
| --- | --- |
| 没有 Pipeline | 普通功能分支 push 属于预期；目标为 `integration/*` 的 MR 或 integration push 则检查相应分支是否包含 CI 文件、项目是否使用自定义 CI 路径，以及是否显式跳过了 CI |
| Job 一直 Pending | 检查 Runner 在线状态、项目可用性、标签和受保护资源限制 |
| 镜像拉取失败 | 检查内部仓库认证、网络、CA 和镜像是否存在 |
| 缺少变量或 Token | 检查变量名、类型、继承关系、环境范围和 Protected 限制 |
| `GitLab GET failed (transport, TimeoutError)` | 检查 Runner 到 GitLab API 的网络；当前环境使用 `REVIEW_GITLAB_API_URL` 内网入口，不能以网页可打开推断容器也可访问 |
| `PR-Agent failed` | 检查镜像接口、模型名、API Base、Key、网络及差异大小；超预算或模型异常不会当作审核通过 |
| `GitLab ... failed (401/403)` | 检查 Token 是否有效及机器人对本项目的 API/评论权限 |
| `published` | 已发布报告，仍需单独验证邮件送达 |
| `already-published` | 同一机器人已发布相同范围，跳过重复评论 |
| `merged-mr` | integration push 来自已合并 MR；跳过模型、评论和通知 |
| `stale` | MR 已关闭、改了目标分支、源分支 HEAD 或 integration 分支 HEAD 已更新；查看最新流水线 |
| `no-changes` | 基线与 HEAD 的文件树相同，无需调用模型 |
| `error` | 查看产物中的错误；已生成但发布失败的报告仍保留 |

AI 发现的问题仅供参考，不自动 approve、merge，也不构成强制门禁。运行或发布异常返回非零退出码，但本期设为 `allow_failure: true`。本次没有新增构建测试门禁，也没有修改 `qa-changed`。

## 五、实现与维护说明

| 文件 | 职责 |
| --- | --- |
| `.gitlab-ci.yml` | 事件选择、Runner、超时、产物及非阻断策略 |
| `.pr_agent.toml` | 模型和 CLI 专项审核要求 |
| `.ci/integration_review.py` | 固定审核范围、构造临时仓库、发布评论和保存产物 |
| `.ci/pr_agent_local.py` | 显式加载当前版本配置，用 PR-Agent 本地 provider 生成报告 |
| `.ci/review_messages.zh-CN.json` | 中文审核正文模板，与模型生成的问题描述分开维护 |

配置从当前检出的 `.pr_agent.toml` 显式加载，关闭远端仓库配置读取，因此不会读取 GitLab 默认分支上的配置。`AGENTS.md` 从固定基线 SHA 读取，作为审核上下文。CI 脚本与规则自身的变更仍需正常代码评审。

发现问题时，报告中的定位链接指向实际审核提交的文件及行号，不指向临时合成提交。

脚本先确认 MR 或 integration 分支仍指向待审 HEAD。对于 push，再查询 Commit API 关联的已合并 MR；当前 HEAD 等于匹配目标分支的 `merge_commit_sha`、`squash_commit_sha` 或 MR `sha` 时返回 `merged-mr`。其余情况才创建临时克隆。PR-Agent 本地 provider 用 merge-base 计算差异，因此临时克隆中会构造一个以 base 为父提交、以实际 head 文件树为内容的合成提交，确保强制 push 后的差异仍等于准确的 base..head 比较。合成提交不会推送，也不会写入用户原工作区。

PR-Agent 仅生成报告，关闭其 GitLab 发布功能；模型子进程不接收 GitLab Token 或 CI Job Token。空输出、格式错误、明确报告漏审文件、模型失败和超时均按错误处理。生成后，脚本通过机器人身份及事件/分支/base/head 标记去重，再校验 HEAD 并发布。发布失败时保留已生成的报告。

最后一次查询 HEAD 与发表评论之间仍存在非原子时间窗口，所以每条评论明确标注所审 SHA。MR 关联判断依赖 GitLab Commit API 返回的 MR 字段；如果实例对某种自定义合并方式不返回对应关联，该 push 会按普通直接 push 审核，安全侧表现是多审一次而不是漏审。仅更新 MR 目标分支 HEAD 不一定触发源分支 MR pipeline，本审核也不能证明全仓库已通过测试。

### 本地验证

离线测试使用真实临时 Git 历史和模拟 GitLab API，覆盖 MR 与 integration push 事件选择、完整差异、merged-result/merge-train 源 SHA、merge/squash/fast-forward 合并跳过、直接 push 评论、过期结果、评论分页去重及模型异常；渲染测试模拟 PR-Agent 输出，不调用模型。

```sh
python3 -m venv /tmp/te-cli-review-tests
/tmp/te-cli-review-tests/bin/python -m pip install PyYAML tomli
/tmp/te-cli-review-tests/bin/python test/integration-review.test.py
npm ci
npm run build
npm test
```

### 参考实现

- ta-admin-manager `release/6.0`、`5867421a`：参考 PR-Agent 镜像、Runner、模型配置及 AI 审核与确定性门禁分离的做法。
- te-claude `release/6.0`、`ef70eef5`：参考机器人身份、固定提交证据和过期保护。te-cli 对新范围发新评论，避免仅编辑旧评论导致缺少新评论通知。
- [te-system-skills `release/6.0`、`f9f40175`](https://gitlab.thinkingdata.cn/te-ai/te-system-skills/-/blob/f9f401757448ec2a53a48899f6ea510141dfbf4d/curator-skill/scripts/review.mjs)：参考 Curator 将审核/批准绑定到预期 SHA 并区分通知结果。其产品 MR 自动化包含批准/安排合并，场景流程通知 Skill Hub；这些动作不属于本次接入。已检查的 `release/6.0` 和 `release/6.1` CI 文件没有通用 PR-Agent 审核 Job。
- PR-Agent 官方：[本地 provider](https://github.com/The-PR-Agent/pr-agent/blob/main/pr_agent/git_providers/local_git_provider.py)、[配置加载](https://github.com/The-PR-Agent/pr-agent/blob/main/pr_agent/config_loader.py)。
- GitLab 官方：[Merge request notes API](https://docs.gitlab.com/api/notes/#create-new-merge-request-note)、[Commit API 的关联 MR 查询](https://docs.gitlab.com/api/commits/#list-merge-requests-associated-with-a-commit)和[提交评论 API](https://docs.gitlab.com/api/commits/#post-comment-to-commit)。
