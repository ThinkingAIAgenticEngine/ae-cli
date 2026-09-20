[中文版](./README.zh.md) | [English](./README.md)

# ae-cli

`ae-cli` 是 ThinkingAI AgenticEngine（AE）平台的命令行客户端，为 AI Agent 和人工操作提供稳定、结构化的接口，覆盖分析与项目配置、元数据、埋点、本地数据接入、运营、DataOps、知识库、Agent 资源、用户记忆及系统管理。

CLI 的核心设计包括：

- JSON 优先的输出，便于 Agent 读取和执行后续操作。
- 按 Host 隔离的认证与多环境配置。
- 常用工作流使用精选命令，长尾操作通过 Capability Gateway 动态发现。
- 明确的参数校验、dry-run 和高风险确认契约。
- CLI 与 Skills 按当前 AE 环境要求的精确版本同步。

## 环境要求

- Node.js 20 或更高版本。
- 安装 CLI 时能够访问 npm 仓库。
- 首次安装 Skills，或本地 Skills 来源不可用时，能够访问 GitHub。

## 安装

如果你希望由 Codex、Claude Code、Cursor 等 AI Agent 自动检查 Node.js、安装 CLI、完成登录并同步匹配版本，请让 Agent 阅读并执行 [AE CLI Installation and Upgrade](./cli-installation-guide.md)。

可直接复制给 Agent，并把 `<AE_HOST>` 替换为你的 AE 地址：

> 请阅读 https://raw.githubusercontent.com/ThinkingAIAgenticEngine/ae-cli/main/cli-installation-guide.md 并按说明帮我安装或升级 AE CLI。我的 AE 地址是 `<AE_HOST>`。只安装 AE CLI 和配套 Skills，不要修改当前项目；遇到登录授权或需要管理员权限时请暂停并提示我。

安装公开版 CLI 和 Agent Skills：

```bash
npm install -g @thinkingai/ae-cli
npx -y skills add ThinkingAIAgenticEngine/ae-cli -g -y
```

Skills 会帮助 Claude Code、Codex、Cursor 等编码 Agent 理解、发现并调用 `ae-cli`。

按业务分类交互安装可选的已准出场景 Skill：

```bash
npx skills@latest add ThinkingAIAgenticEngine/scenario-skills
```

指定版本或非交互安装方式请查看 [scenario-skills 仓库](https://github.com/ThinkingAIAgenticEngine/scenario-skills)。

登录 AE 环境：

```bash
ae-cli auth login --host https://your-ae-host.example.com
ae-cli auth status
```

请使用 AgenticEngine 管理员提供的 AE 地址。未配置 Host 时，`ae-cli` 会先引导已有客户向管理员获取地址；只有确认尚无 AgenticEngine 环境的用户，才会看到[申请试用](https://thinkingai.cn/request-demo)入口。

## 环境版本同步

每个 AE 环境都会返回其要求的精确 `aeCliVersion`。使用统一更新命令安装对应版本的 CLI 和 Skills：

```bash
ae-cli update
ae-cli update --dry-run
```

`ae-cli update` 安装当前 Host 要求的精确版本，不依赖 npm `latest`。更新时优先从已安装的 npm 包同步 Skills，本地来源失败后才回退到对应的 GitHub tag。

从 `6.0.37` 和 `6.1.9` 维护线开始，普通业务命令可以自动升级或降级到环境要求的版本。同步成功后，旧进程会返回 `AE_CLI_VERSION_SYNCED`；重新执行原命令，即可使用新的 CLI 和 Skills。安装失败会给出提示，但不会用安装输出污染业务命令的 JSON 结果。

常用控制方式：

```bash
# 更新到另一个已配置 Host 要求的版本
ae-cli update --host https://another-host.example.com

# 安装指定版本
ae-cli update --target 6.1.9

# 单次命令跳过兼容性检查
ae-cli --no-update-check capability list --domain analysis
```

## 快速开始

```bash
# 打开交互式环境管理器
ae-cli config

# 或使用非交互命令管理环境
ae-cli config list
ae-cli --format table config list
ae-cli config current
ae-cli config add https://your-ae-host.example.com --label production --use
ae-cli config use production

# 发现当前 Host 暴露的能力
ae-cli capability list --domain analysis
ae-cli capability search "dashboard list" --domain analysis
ae-cli capability inspect analysis.dashboard.list

# 校验、预览和执行
ae-cli capability validate analysis.dashboard.list --input '{"project_id":1}'
ae-cli capability dry-run analysis.dashboard.list --input '{"project_id":1}'
ae-cli capability run analysis.dashboard.list --input '{"project_id":1}'

# 筛选结构化输出
ae-cli capability list --domain analysis --jq '.data.capabilities[] | .id'
```

## 命令地图

下表逐项覆盖当前所有根命令。使用 `ae-cli --help` 查看根命令，使用 `ae-cli <命令> --help` 查看下一层资源或操作；层级命令可以继续追加 `--help`，例如 `ae-cli project member --help`。服务端动态能力通过 `ae-cli capability list|search|inspect` 发现。

<!-- root-command-surface:start -->
| 类别 | 根命令 | 用途 |
|---|---|---|
| 分析与项目 | `analysis` | 报告、看板、即席分析、下钻、详情、告警、标签和分群 |
| 分析与项目 | `analysis-meta` | 事件/属性目录、指标、虚拟元数据、埋点治理和项目分析配置 |
| 分析与项目 | `analysis-governance` | 数据资产搜索、血缘、影响分析、认证和治理 |
| 分析与项目 | `project` | 项目信息、成员、角色、权限、实体、时区和交接配置 |
| 分析与项目 | `metadata` | 基于 Capability Gateway 的数据表、属性及维度表绑定 |
| 分析与项目 | `personal-semantic-preference` | 当前用户按项目维护轻量个人语义偏好 |
| 分析与项目 | `project-semantic` | 导出用于知识库构建的项目资产包 |
| 数据与埋点 | `tracking` | 埋点方案、SDK 示例、检查、采集诊断、代码生成和内置 Wiki |
| 数据与埋点 | `data-integration` | 检查、规划、转换、上传、交接和复用本地 CSV/JSON/Excel 数据 |
| 社区洞察 | `community` | 社区帖子、评论、话题、情感、直播和报告工作流 |
| 运营 | `engage-flow` | 运营流程管理 |
| 运营 | `engage-task` | 运营任务及触达内容管理 |
| 运营 | `engage-setting` | 渠道、受众和运营设置 |
| 运营 | `engage-scene` | 运营场景和策略管理 |
| 运营 | `engage-activity` | 活动、专题及其任务管理 |
| 运营 | `engage-workbench` | 运营工作台和待办管理 |
| 运营 | `engage-query` | 运营查询、异步导出和产物管理 |
| DataOps | `dataops_repo` | 数仓和数据源管理 |
| DataOps | `dataops_datatable` | 数据表生命周期管理 |
| DataOps | `dataops_flow` | 开发流程、调度和补数作业管理 |
| DataOps | `dataops_ide` | IDE 查询及结果下载 |
| DataOps | `dataops_integration` | 数据集成任务管理 |
| DataOps | `dataops_operations` | 运维、监控和告警工作流 |
| Agent 平台 | `kb` | 知识库生命周期、LLM 问答及确定性的 index/grep/read 检索 |
| Agent 平台 | `agent` | Agent、审批、自动化、模型、MCP、Skills、附件、凭证和沙盒工具 |
| Agent 平台 | `context` | 读取当前 Agent Run 已授权的产品页面上下文 |
| Agent 平台 | `memory` | 用户记忆、Top-K 上下文写入和实际采用计数 |
| Agent 平台 | `team` | Agent Team 和 TeamRun 的执行、对话、结果及产物 |
| Agent 平台 | `system` | root/admin 的成员、沙盒、工具、模型、用量、配额和渠道管理 |
| 通用工具 | `capability` | 能力发现、Schema 查看、参数校验、dry-run 和通用执行 |
| 通用工具 | `auth` | 按 Host 登录、查看状态及管理同一 Host 的多个账号 |
| 通用工具 | `config` | 添加、切换、重命名和删除 Host 环境 |
| 通用工具 | `sync` | 在本地工作区与 Agent 应用之间推送或拉取 Skills 和 MCP |
| 通用工具 | `model` | 在 Agent 沙盒中查看并切换当前工作区模型 |
| 通用工具 | `update` | 将 CLI 和 Skills 同步到当前 Host 要求的版本 |
<!-- root-command-surface:end -->

## Capability Gateway

不需要独立精选命令的能力，应优先通过 Capability Gateway 调用：

```bash
ae-cli capability list --domain analysis --project-id 1
ae-cli capability search "report list" --domain analysis
ae-cli capability inspect analysis.report.list
ae-cli capability validate analysis.report.list --input input.json
ae-cli capability dry-run analysis.report.list --input input.json
ae-cli capability run analysis.report.list --input input.json
```

`--input` 支持内联 JSON、JSON 文件路径、`@<path>`，或通过 `-` 从 stdin 读取。

复杂嵌套参数尚在调整时使用 `validate`；需要确认最终风险等级、输出模式、取消能力或删除门禁时使用 `dry-run`。默认不要对同一份最终入参连续执行 `validate` 和 `dry-run`，因为 `dry-run` 已包含参数校验。

Gateway 命令遵循 [Capability 命令收录规则](docs/capability-command-admission.md)。常见工作流可以提供精选命令，长尾能力则保持动态发现。

`analysis user-tag create|update` 支持一次配置自动更新：传入 `--auto-refresh-schedule '{"frequency":"daily","time":"02:30"}'`（也支持每周、每月），或使用 `--auto-refresh-cron`。用 `--enable-auto-refresh false` 关闭自动更新。仅修改调度计划不触发即时重算；省略调度参数则保留原计划。详见[创建标签](skills/ae-analysis/references/user_tag_create.md)和[更新标签](skills/ae-analysis/references/user_tag_update.md)。

## 认证与多环境

凭证按 Host 独立存储，切换环境不会复用其他 Host 的 token。
在终端运行 `ae-cli config`，可以交互式添加、激活、重命名或删除环境。
运行 `ae-cli auth` 可以交互式选择当前 Host 的 active 账号；省略 `--account` 的 `ae-cli auth use` 也会打开同一个选择器。
脚本和 Agent 应使用非交互子命令：

```bash
ae-cli auth login --host https://host-a.example.com
ae-cli auth status --host https://host-a.example.com
# 少量需要同一 Host 多账号的场景
ae-cli auth login --host https://host-a.example.com --add
ae-cli auth list --host https://host-a.example.com
ae-cli auth use --host https://host-a.example.com --account <login-name-or-open-id>
ae-cli auth logout --host https://host-a.example.com
ae-cli auth logout --host https://host-a.example.com --all

ae-cli config list
ae-cli config current
ae-cli config add https://host-b.example.com --label staging
ae-cli config use staging
ae-cli config rename staging pre-production
ae-cli config remove pre-production --yes
```

`<env>` 可以是完整 URL 或唯一 label。交互管理器和 `config list` 都会明确标识 active 环境。当还存在其他环境时，不允许直接删除 active 环境；应先显式切换。`config set-host` 作为兼容命令继续保留，其语义是添加或更新 Host 并立即激活。

普通 `auth login` 保持一个 Host 一个账号的简单语义，并替换该 Host 已保存的账号；仅在需要时使用 `--add` 保留其他账号。`auth status` 只展示 CLI Token 状态；新版后端可同时返回账号和到期时间，旧版后端不支持 `/validate` 时仍按历史行为信任本地 CLI Token，且不会输出含 null 字段的 `account`。

新版 CLI 只持久化 CLI Token，不保存 access token 或 refresh token。多账号保存在加密的 V1 凭据文件中，同时维护旧文件格式的当前账号投影，保证 CLI 自动降级后仍可登录；再次升级时会合并旧 CLI 对投影的登录、切换或退出变更。

登录使用跨平台设备码流程。当前环境无法打开浏览器时，可使用 `--no-browser`。
试用引导仅在尚未配置 Host 时出现；已配置环境的正常命令和认证流程不会展示该提示。

## 输出与安全

命令返回稳定的输出信封：

```json
{
  "ok": true,
  "data": {},
  "_notice": {}
}
```

- 默认使用 `--format json`，推荐 Agent 使用。
- 支持的人工列表命令可使用 `--format table`。
- `--jq <expr>` 使用 jq 1.8 筛选业务结果，再输出统一信封。
- `--validate` 仅规范化 Capability Gateway 参数，不执行业务逻辑。
- `--dry-run` 预览操作，不执行业务逻辑。
- `--yes` 跳过明确标记为高风险写操作的交互确认。
- `_notice` 可以携带 Host 兼容性或更新提示，不改变成功的业务数据。

JSON 参数通常支持内联 JSON、`@file`、文件路径或通过 `-` 从 stdin 读取，具体以命令帮助为准。

## 知识库

管理服务端知识库生命周期：

```bash
ae-cli kb +new --scope company --name engineering-handbook --description "Team docs"
ae-cli kb +import --file ./knowledge-base.zip --name "Imported handbook"
ae-cli kb +import-status --request-id <requestId>
ae-cli kb +add --name engineering-handbook --scope company --files '["./docs/guide.md","https://example.com/page"]'
ae-cli kb +list-sources --name engineering-handbook --scope company
ae-cli kb +rm-source --name engineering-handbook --scope company --id <source-id>
# 兼容旧命令：无法取得来源 ID 时仍可使用精确展示名
ae-cli kb +rm-source --name engineering-handbook --scope company --display-name kb-1780046712-guide.md
ae-cli kb +schema --name engineering-handbook --scope company --model <model-ref>
ae-cli kb +compile --name engineering-handbook --scope company --model <model-ref>
ae-cli kb +status --name engineering-handbook --scope company
ae-cli kb +ask -q "如何配置沙盒？"
# 仅提交，后续轮询：
ae-cli kb +ask -q "另一个问题" --no-wait
ae-cli kb +ask-status --execution-id <id>
```

`kb +list-sources` 返回稳定的来源 `id`。请把精确的 `id` 复制到 `kb +rm-source`，不要根据文件名或 URL 猜测。`--display-name` 仅用于无法取得 ID 时的旧版兼容。

按名称管理知识库的命令都支持可选 `--scope personal|company`；省略时保留 personal 到 company 的旧查找顺序。Schema 与 Compile 优先使用 `ae-cli agent +list-models` 返回的模型记录 `id`；历史 `modelId` 和 `modelId::scope` 仍兼容，`displayName` 不是稳定引用。

`kb +import` 接受最大 50 MB 的编译后 Markdown ZIP，根目录必须包含 `index.md`，页面放在 `wiki/**/*.md`。命令立即返回 `{requestId, status: "queued"}`；通过 `ae-cli kb +import-status --request-id <requestId>` 查询 `queued`、`running`、`succeeded` 或 `failed`。导入成功后可执行列表、Index/Wiki、grep/read、Ask 和删除；个人只读快照不支持来源、Schema、用量、编译、成员/设置、所有权转移和公司发布。

外部 Agent 可以使用不依赖服务端 LLM 的确定性检索：

```bash
ae-cli kb +list
ae-cli kb +index --sources '[{"scope":"company","name":"engineering-handbook"}]'
ae-cli kb +grep -q "沙盒配置" --sources '[{"scope":"company","name":"engineering-handbook"}]' --paths '["wiki/sandbox.md"]'
ae-cli kb +read --source '{"scope":"company","name":"engineering-handbook"}' --path "wiki/sandbox.md" --limit 2000 --expand block
```

## Agent 与系统管理

`agent` 域管理当前用户可见的 Agent 资源：

```bash
ae-cli agent +list-agents
ae-cli agent +list-models
ae-cli agent +list-mcps
ae-cli agent +list-skills
ae-cli agent +list-automations
ae-cli agent +list-attachments
ae-cli agent approval-type list
ae-cli agent approval-request list --status pending
ae-cli agent approval-task list --status pending
ae-cli agent approval-effect list --status manual_required
```

通用审批命令使用 Agent 应用 `/agent` base path 下的版本化 CLI-token REST。提交类型专属的 snake_case payload 前，先用 `approval-type get` 获取契约。Effect 人工重试属于 `high-risk-write`，必须提供可审计理由并显式传入 `--yes`。写命令的 `--dry-run` 仅在本地预览请求，不验证服务端权限、实时状态或未来条件流转。

`system` 域调用管理接口 `/api/admin/**` 和版本化渠道接口 `/api/cli/channel/v1/**`，要求当前用户拥有 `root` 或 `agent_admin` 角色：

```bash
ae-cli system +list-members --status enabled
ae-cli system +list-sandboxes
ae-cli system +get-sandbox-config
ae-cli system +get-usage-summary --days 30 --refresh true
ae-cli system +export-usage --start-date 2026-07-01 --end-date 2026-07-31 --group-by user --output ./system-usage.csv
ae-cli system +list-quota-rules
ae-cli system +list-channels
ae-cli system channel routing get --endpoint-id <endpoint-id>
ae-cli --dry-run system +bind-feishu-users --channel-id <channel-id> --endpoint-id <endpoint-id> --bindings @bindings.json
ae-cli system +list-sandbox-tools
```

system 域现有 71 条命令，覆盖成员、沙箱、共享沙箱工具、模型与价格、用量下钻与 CSV 导出、成本控制、配额和渠道。渠道管理覆盖九类渠道、Endpoint 路由、WhatsApp Web 扫码关联，以及 1-100 人飞书批量绑定的逐项结果与公共/逐人默认 Agent 分配。CSV 导出必须显式指定本地路径，采用流式写入，不覆盖已有文件，失败时清理不完整文件。

最终权限、公司隔离和资源归属始终由服务端校验。“没有对应 CLI 命令”不是安全边界：拥有 Bash/网络能力的 Agent 仍可直接构造 HTTP 请求。遇到权限错误时不要重试或绕过，不要调用明确排除的其他系统成员删除或底层沙箱编排接口；所有管理员写操作都应先 dry-run 并取得用户明确确认。Skill、dry-run 和 CLI 确认提示只是防误操作措施，不能替代服务端鉴权；`--yes` 会跳过该提示。

## Agent Skills

npm 包内包含与公开仓库一致的 `skills/` 目录：

| Skill | 范围 |
|---|---|
| `ae-capability` | Capability 发现和通用调用 |
| `ae-analysis`、`ae-analysis-global` | 分析、受众、元数据、治理及多集群工作流 |
| `ae-metadata` | 基于 Capability Gateway 的元数据数据表操作 |
| `ae-engage` | 运营操作和工作流指南 |
| `ae-dataops` | 数仓、任务流、IDE、数据集成和运维 |
| `ae-community` | 社区分析和报告 |
| `ae-data-integration` | 本地 CSV/JSON/Excel 数据的检查、映射、转换、上传和可复用交接 |
| `ae-kb`、`ae-kb-discovery` | 知识库生命周期、问答、确定性检索及只读知识库发现 |
| `ae-agent`、`ae-system`、`ae-team` | Agent 资源与用户记忆（含 `memory +write-context`）、系统管理和 TeamRun 工作流 |
| `ae-generate-tracking-plan`、`ae-generate-tracking-code` | 埋点方案和埋点代码生成 |
| `ae-data-integration-helper` | SDK 和 LogBus2 集成指南 |

重新安装全部公开 Skills：

```bash
npx -y skills add ThinkingAIAgenticEngine/ae-cli -g -y
```

## 开发

```bash
git clone https://github.com/ThinkingAIAgenticEngine/ae-cli.git
cd ae-cli
npm install
npm run build
node dist/index.js --help
```

开发时直接从源码运行：

```bash
npm run dev -- --help
```

核心目录：

```text
src/
├── core/          # 认证、配置、客户端、兼容性和版本同步
├── framework/     # 命令注册、生命周期、输出和错误
└── commands/      # 业务域和 CLI 工具
skills/            # 随 npm 包发布的 Agent Skills
self-check/        # 发布和文档一致性检查
test/, tests/      # 命令、契约和回归测试
```

常用验证命令：

```bash
npm run build
npm test
npm run qa-changed
npm run self-check
npm run check:release
npm run verify:readme
npm run verify:auth-credentials
npm run verify:update-check
npm run verify:version-sync
```

## 更新日志

- [English changelog](./CHANGELOG.md)
- [中文更新日志](./CHANGELOG.zh-CN.md)

## 许可证

MIT
