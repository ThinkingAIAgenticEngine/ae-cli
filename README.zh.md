[中文版](./README.zh.md) | [English](./README.md)

# ae-cli

`ae-cli` 是 ThinkingAI AgenticEngine（AE）平台的命令行客户端，为 AI Agent 和人工操作提供稳定、结构化的接口，覆盖分析、元数据、埋点、运营、DataOps、知识库、Agent 资源及系统管理。

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

## 命令范围

运行 `ae-cli --help` 或 `ae-cli <command> --help` 获取权威命令清单。

| 命令或业务域 | 用途 |
|---|---|
| `analysis` | 报告、看板、即席分析、下钻、详情、告警和分析模型 |
| `analysis-meta` | 事件/属性元数据、指标、虚拟元数据、埋点治理和项目配置 |
| `analysis-governance` | 资产搜索、血缘、影响分析和治理操作 |
| `metadata` | 基于 Capability Gateway 的数据表和属性操作 |
| `tracking` | 埋点方案生命周期、SDK 示例、检查、采集诊断、代码生成和内置 Wiki |
| `engage-flow`、`engage-task`、`engage-setting`、`engage-scene`、`engage-activity`、`engage-workbench` | 运营流程、任务、设置、策略、活动和工作台 |
| `community` | 社区帖子、评论、话题、情感、直播和报告工作流 |
| `dataops_repo`、`dataops_datatable`、`dataops_flow`、`dataops_ide`、`dataops_integration`、`dataops_operations` | 数仓、数据表、任务流、IDE、数据集成和运维工作流 |
| `kb` | 知识库生命周期、LLM 查询及确定性的 index/grep/read 检索 |
| `agent` | Agent、自动化、模型、MCP、Skills、附件、凭证和沙盒工具 |
| `system` | root/admin 的成员、沙盒、共享工具、模型、用量、配额和 IM 渠道管理 |
| `team` | Agent Team 生命周期，以及 TeamRun 执行、对话、结果和产物 |
| `capability` | 能力发现、Schema 查看、参数校验、dry-run 和通用执行 |
| `auth`、`config` | 按 Host 隔离的认证和多环境配置 |
| `api` | 用于诊断或过渡场景的原始认证 HTTP 请求 |
| `sync` | 在本地工作区与 Agent 应用之间推送或拉取 Skills 和 MCP |
| `model` | 在 Agent 沙盒中切换当前工作区模型 |
| `update` | 将 CLI 和 Skills 同步到当前 Host 要求的版本 |

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

## 认证与多环境

凭证按 Host 独立存储，切换环境不会复用其他 Host 的 token。
在终端运行 `ae-cli config`，可以交互式添加、激活、重命名或删除环境。
脚本和 Agent 应使用非交互子命令：

```bash
ae-cli auth login --host https://host-a.example.com
ae-cli auth status --host https://host-a.example.com
ae-cli auth logout --host https://host-a.example.com

ae-cli config list
ae-cli config current
ae-cli config add https://host-b.example.com --label staging
ae-cli config use staging
ae-cli config rename staging pre-production
ae-cli config remove pre-production --yes
```

`<env>` 可以是完整 URL 或唯一 label。交互管理器和 `config list` 都会明确标识 active 环境。当还存在其他环境时，不允许直接删除 active 环境；应先显式切换。`config set-host` 作为兼容命令继续保留，其语义是添加或更新 Host 并立即激活。

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
ae-cli kb +add --name engineering-handbook --files '["./docs/guide.md","https://example.com/page"]'
ae-cli kb +schema --name engineering-handbook
ae-cli kb +compile --name engineering-handbook
ae-cli kb +status --name engineering-handbook
ae-cli kb +query -q "如何配置沙盒？" --top-k 10
```

外部 Agent 可以使用不依赖服务端 LLM 的确定性检索：

```bash
ae-cli kb +list
ae-cli kb +index --sources '[{"scope":"company","name":"engineering-handbook"}]'
ae-cli kb +grep -q "沙盒配置" --sources '[{"scope":"company","name":"engineering-handbook"}]'
ae-cli kb +read --source '{"scope":"company","name":"engineering-handbook"}' --path "wiki/sandbox.md"
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
```

`system` 域调用管理接口 `/api/admin/**`，要求当前用户拥有 `root` 或 `agent_admin` 角色：

```bash
ae-cli system +list-members --status enabled
ae-cli system +list-sandboxes
ae-cli system +get-usage-summary --days 30
ae-cli system +list-quota-rules
ae-cli system +list-channels
```

最终权限始终由服务端校验。遇到权限错误时不要重试或绕过。

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
| `ae-kb` | 知识库生命周期和检索 |
| `ae-agent`、`ae-system`、`ae-team` | Agent 资源、系统管理和 TeamRun 工作流 |
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
├── api/           # 原始认证 API 访问
└── commands/      # 业务域和 CLI 工具
skills/            # 随 npm 包发布的 Agent Skills
self-check/        # 发布和文档一致性检查
test/, tests/      # 命令、契约和回归测试
```

常用验证命令：

```bash
npm run build
npm run qa-changed
npm run self-check
npm run check:release
npm run verify:update-check
npm run verify:version-sync
```

## 更新日志

- [English changelog](./CHANGELOG.md)
- [中文更新日志](./CHANGELOG.zh-CN.md)

## 许可证

MIT
