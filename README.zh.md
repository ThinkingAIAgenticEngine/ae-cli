
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
# 首次运行 — 交互式主机配置 + 自动登录
ae-cli config
```

`config` 命令会打开一个交互式终端界面：
- 首次运行：提示您添加 AE 主机 URL 和标签，然后自动进行身份验证
- 后续运行：显示所有已配置的主机，可以切换、编辑、删除或添加新主机

```
AE Host Manager  (↑↓ 选择 · Enter 切换 · e 编辑标签 · d 删除 · a 添加 · q 退出)

❯ ● Production  https://ta.thinkingdata.cn  ✓
  ○ Staging     https://ta-staging.example.com:8080  ✗
  + Add new host...
```

选择主机后，ae-cli 会自动检查 token 是否有效。如果无效，会自动触发 `auth login`。

## 使用方法

```bash
# AE 元数据域（元数据和治理）
ae-cli analysis_meta +list_events --project_id 1

# 表格输出
ae-cli analysis_meta +list_events --project_id 1 --format table

# 原始 API 调用
ae-cli api GET /v1/ta/event/catalog/listEvent --params '{"projectId": 1}'
```

## 身份验证

每个 AE 主机 URL 维护独立的身份验证 token。

```bash
# 自动登录当前主机（macOS，从 Chrome 提取 token）
ae-cli auth login

# 手动设置 token
ae-cli auth set-token <your-token>

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
| `analysis_audience` | 10+ | 受众运营：分群、标签及其定义模型 |
| `analysis_meta` | 20+ | 元数据治理：事件/属性、指标、虚拟元数据、项目配置、埋点方案、标记时间、实体目录 |
| `engage` | 40+ | Hermes Engage MCP：渠道、任务、配置、流程、策略 |
| `dataops_repo` | 8 | 数仓仓库：空间、目录、模式、成员 |
| `dataops_datatable` | 10+ | 数据表：表创建、视图、批量操作、数据字典 |
| `dataops_flow` | 20+ | 任务流：流程创建、任务节点、调度、执行、监控 |
| `dataops_ide` | 10+ | IDE 查询：元数据浏览、SQL 执行、查询管理 |
| `dataops_integration` | 20+ | 数据集成：数据源管理、同步方案、数据同步 |
| `community` | 10+ | 社区分析：帖子搜索、情感分析、话题趋势、直播数据 |
| `analysis_common` | 2 | 跨模块通用约束：资源链接补全、项目 ID 门控 |
| `auth` / `config` | 2 | 身份验证和主机配置 |

### 全局选项

| 选项 | 描述 | 默认值 |
|---|---|---|
| `--host <url>` | 覆盖当前 AE 主机 URL | 从配置读取 |
| `--format <json\|table>` | 输出格式 | json |
| `--jq <expr>` | 过滤表达式 | - |
| `--dry-run` | 预览请求 | false |
| `--yes` | 跳过确认 | false |

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
- **仓库管理**：空间、目录、模式、成员
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
- **Node.js** 运行时（v18+）

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
    ├── te-audience/
    ├── te-meta/
    ├── te-engage/
    ├── te-dataops/
    ├── te-community/
    └── te-common/
```

## 验证脚本

```bash
npm run verify:analysis-tools
npm run verify:analysis-audience-tools
npm run verify:analysis-meta-tools
npm run verify:analysis-common-tools
```

## 许可证

MIT