
[中文版](./README.zh.md) | [English](./README.md)

# ae-cli

ThinkingAI AgenticEngine (AE) 平台的 CLI 工具。专为 AI Agent 和人类用户设计。

## 安装

**第一步：安装 ae-cli**

```bash
npm install -g @thinkingai/ae-cli
```

**第二步：安装 AI Agent Skills**

```bash
npx skills add ThinkingAIAgenticEngine/ae-cli -g -y
```

这将安装 4 个技能包到您的 AI 编程助手（Claude Code、Trae、Cursor 等）中，使助手能够理解并调用 ae-cli 命令。

更新方式：

```bash
npm cache clean --force && npm install -g @thinkingai/ae-cli
npx skills add ThinkingAIAgenticEngine/ae-cli -g -y
```

## 快速开始

```bash
ae-cli auth login --host xxxxx
```

## 使用方法

```bash
# AE 元数据域（元数据和治理）
ae-cli analysis_meta +list_events --project_id 1

# 表格输出
ae-cli analysis_meta +list_events --project_id 1 --format table

# 原始 API 调用
ae-cli api GET /v1/ta/event/catalog/listEvent --params '{"projectId": 1}'

# 知识库（新建 → 上传 → 编译 → 查询）
ae-cli kb +new --scope company --name engineering-handbook --description "Team docs"
ae-cli kb +add --name engineering-handbook --files '["./docs/guide.md","https://example.com/page"]'
ae-cli kb +schema --name engineering-handbook
ae-cli kb +compile --name engineering-handbook
ae-cli kb +query -q "如何配置 sandbox 容器？" \
  --sources '[{"scope":"company","name":"engineering-handbook"}]'

# 面向外部 agent 的检索原语（读 index → grep 定位 → read 翻页）
ae-cli kb +index --sources '[{"scope":"company","name":"engineering-handbook"}]'
ae-cli kb +grep -q "sandbox 配置" \
  --sources '[{"scope":"company","name":"engineering-handbook"}]'
ae-cli kb +read --source '{"scope":"company","name":"engineering-handbook"}' \
  --path "wiki/sandbox.md"
```

## 身份验证

每个 AE 主机 URL 维护独立的身份验证 token。

```bash
# 设备码登录（跨平台）
ae-cli auth login

# 检查状态
ae-cli auth status

# 登出
ae-cli auth logout
```

## 命令

### 域

| 域 | 命令数 | 描述 |
|---|---|---|
| `analysis` | 30+ | 分析工作流：告警、报表、仪表板、即时分析/下钻、实体/事件详情、分析模型 |
| `analysis_meta` | 20+ | 元数据治理：事件/属性、指标、虚拟元数据、项目配置、埋点方案、标记时间、实体目录 |
| `engage` | 40+ | Hermes Engage MCP：渠道、任务、配置、流程、策略 |
| `dataops_repo` | 1 | DataOps 仓库辅助：空间发现 |
| `dataops_datatable` | 5 | 数据表：表/视图创建、发布、详情、数据字典 |
| `dataops_flow` | 15 | 任务流：流程创建、任务节点、调度、执行、监控、发布预览 |
| `dataops_operations` | 4 | 运维：工作流实例搜索、实例详情、任务日志、停止执行 |
| `dataops_ide` | 9 | IDE 查询：元数据浏览、SQL 执行、查询管理 |
| `dataops_integration` | 19 | 数据集成：数据源管理、同步方案、数据同步 |
| `community` | 10+ | 社区分析：帖子搜索、情感分析、话题趋势、直播数据 |
| `analysis_common` | 2 | 跨模块通用约束：资源链接补全、项目 ID 门控 |
| `agent` | 15 | Agent 平台资源管理：模型、MCP 服务、Skill、附件库的增删查和启停 |
| `team` | 14 | AI Agent Team：团队管理（列表/创建/更新/删除/AI生成/模板/项目）和 TeamRun 执行（启动/监听/对话/回复/取消/结果/产物） |
| `kb` | 10 | 知识库生命周期：查询 / 新建 / 添加源（md/目录/url）/ schema / 编译 / 删除源 / 删除；检索原语：index / grep / read |
| `auth` / `config` | 2 | 身份验证和主机配置 |

### kb（知识库）

知识库生命周期（`+new` → `+add` → `+schema` → `+compile` → `+status` → `+query`）：

- **新建** (`+new`)：`--scope personal|company`，`--name`，可选 `--description`、`--tags`、`--project-id`、`--project-name`
- **上传源** (`+add`)：`--name`，`--files` JSON 数组（`.md` 文件、目录非递归扫描、或 http(s) URL 自动转 Markdown）
- **生成 schema** (`+schema`)：`--name`，可选 `--force`、`--model`
- **编译** (`+compile`)：`--name`，`--mode incremental|full`（默认 incremental）
- **查询状态** (`+status`)：`--name`
- **查询** (`+query`)：`--query` / `-q`，`--sources` JSON 引用，如 `[{"scope":"company","name":"engineering-handbook"}]`
- **删除源** (`+rm-source`)：`--name`，`--display-name`
- **删除知识库** (`+remove`)：`--name`

面向外部 agent 的检索原语（`+index` → `+grep` → `+read`）；均为确定性文件检索端点、服务端零 LLM 调用，让 agent（Claude Code / Codex / Cursor）像翻代码库一样探索知识库：

- **索引** (`+index`)：可选 `--sources` JSON 引用（省略则列出全部可访问知识库），可选 `--locale`。返回每个知识库的元信息及其 `index.md` 导航地图。
- **检索** (`+grep`)：`--query` / `-q`，可选 `--sources`、`--top-k`（1-50，默认 10）、`--locale`。返回命中行的路径、行号、面包屑与上下文片段。
- **读取** (`+read`)：`--source` JSON 引用（精确指向一个知识库），`--path`（相对知识库根目录的页面路径），可选 `--offset` / `--limit`（行窗口）、`--locale`。返回页面全文或行窗口。

### 全局选项

| 选项 | 描述 | 默认值 |
|---|---|---|
| `--host <url>` | 覆盖当前 AE 主机 URL | 从配置读取 |
| `--format <json\|table>` | 输出格式 | json |
| `--jq <expr>` | jq 1.8 表达式（jq-wasm），作用于命令业务结果，再包进输出信封 | - |
| `--validate` | 改对参数：仅能力网关 `/validate`（精选网关命令）。勿与 `--dry-run` 同用 | false |
| `--dry-run` | 确认可以跑：能力网关 `/dry-run`（或其它传输的请求预览）。勿与 `--validate` 同用 | false |
| `--yes` | 跳过高风险写操作确认 | false |
| `--no-update-check` | 跳过 ae-cli 新版本检查 | false |

## Skills

`skills/` 目录包含 4 个 AI Agent 技能包：

| Skill | 描述 |
|---|---|
| `ae-analysis` | 统一分析技能：analysis + audience + metadata + 通用约束（项目门控/资源链接） |
| `ae-engage` | Hermes Engage MCP：渠道、任务、配置、流程、策略 |
| `ae-dataops` | 数仓管理、任务流、IDE 查询、数据集成、运维管理 |
| `ae-community` | 社区分析：帖子、评论、话题、直播 |

安装方式：

```bash
npx skills add ThinkingAIAgenticEngine/ae-cli -g -y
```

## Skill 详情

### ae-analysis

统一的 AE 分析能力：
- **分析**：告警、报表、仪表板、即时分析/下钻、实体/事件详情、分析模型
- **受众**：分群和标签生命周期管理，以及定义模型工具
- **元数据**：事件/属性、指标、虚拟元数据、项目配置、埋点方案、标记时间
- **通用约束**：强制的项目 ID 门控和写入后资源链接补全

### engage

Hermes Engage MCP 能力：
- **渠道**：渠道管理、配置渠道、审批、白名单
- **任务**：任务列表、详情、数据/指标概览、实验报告
- **配置**：配置项、策略、对比、触发/分析报告
- **流程**：流程创建、节点配置、报告、验证

### ae-dataops

数仓管理：
- **仓库辅助**：空间发现
- **数据表**：表创建、视图、批量操作、数据字典
- **任务流**：流程创建、任务节点、调度、执行、监控
- **IDE 查询**：元数据浏览、SQL 执行、查询管理
- **数据集成**：数据源管理、同步方案、数据同步

### ae-community

社区社媒分析：
- **帖子**：搜索、详情、语料标签
- **评论**：情感分析、标签分析、摘要
- **话题**：热门话题、趋势、每日摘要
- **直播**：直播间、场次、分析、指标
- **渠道信息**：渠道概览指标

## 架构

ae-cli 基于：
- **TypeScript**（约 8000 行代码）
- **Commander.js** 作为 CLI 框架
- **WebSocket** 用于 MCP 服务器集成
- **Node.js** 运行时（v20+）

项目结构：
```
src/
├── core/          # 核心模块：auth, config, client, mcp
├── framework/     # 框架：types, register, runner, output
├── api/           # 原始 API 访问
└── commands/      # 领域特定命令
    ├── auth.ts
    ├── config.ts
    ├── te-analysis/
    ├── te-meta/
    ├── te-engage/
    ├── te-dataops/
    ├── te-community/
    ├── te-common/
    └── te-kb/
```

## 验证脚本

```bash
npm run verify:analysis-tools
npm run verify:analysis-meta-tools
npm run verify:analysis-common-tools
```

## 许可证

MIT
