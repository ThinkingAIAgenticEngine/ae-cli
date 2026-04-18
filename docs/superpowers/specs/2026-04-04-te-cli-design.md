# ae-cli Design Spec

## Overview

将现有的 MCP TE Server v2（Node.js MCP 服务器，30 个工具）重构为 CLI 工具 `ae-cli`，供 AI Agent 和人类用户使用。同时生成配套的 skill 文档包，让 Agent 能够理解和调用 CLI 命令。

**参考架构**: [lark-cli](https://github.com/larksuite/cli) 的声明式命令框架 + skill 文档模式
**复用代码**: [mcp-te-server-v2](http://10.27.249.150:8888/te-ai/ae-cli.git) 的 API 调用层、认证逻辑、WebSocket 查询

## Key Decisions

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 语言 | Node.js / TypeScript | 最大化复用现有 MCP server 代码 |
| 命令层级 | 两层：Shortcuts + Raw API | TE 无标准 OpenAPI spec，中间 service 层意义不大 |
| 认证 | osascript + 手动 + 环境变量组合 | macOS 顺畅体验 + 跨平台/CI 兼容 |
| Skill 划分 | 4 域 + shared | 与代码分组自然对齐，粒度适中 |
| 输出格式 | JSON + Table + jq | Agent 用 JSON，人类用 Table，jq 灵活过滤 |
| 命令名 | ae-cli | 与 lark-cli 风格一致 |

---

## 1. Project Structure

```
ae-cli/
├── src/
│   ├── index.ts                    # CLI 入口，注册所有命令
│   ├── framework/                  # 声明式命令框架
│   │   ├── types.ts                # Command, Flag, RuntimeContext 类型定义
│   │   ├── runner.ts               # 执行管线
│   │   ├── register.ts             # 命令注册：Command[] → Commander.js 子命令
│   │   └── output.ts               # 输出格式化：JSON / Table / jq
│   ├── core/                       # 基础设施（从 MCP server 复用改造）
│   │   ├── auth.ts                 # 认证
│   │   ├── client.ts               # HTTP + WebSocket 客户端
│   │   └── config.ts               # 配置管理
│   ├── commands/                   # 声明式命令定义（按域分组）
│   │   ├── meta/                   # 元数据域（7 个命令）
│   │   ├── analysis/               # 分析域（10 个命令）
│   │   ├── audience/               # 受众域（6 个命令）
│   │   └── operation/              # 运营域（11 个命令）
│   └── api/                        # Raw API 兜底命令
│       └── raw.ts                  # ae-cli api <METHOD> <PATH> [--params] [--data]
├── skills/                         # AI Agent Skill 文档包
│   ├── te-shared/SKILL.md
│   ├── te-meta/SKILL.md + references/
│   ├── te-analysis/SKILL.md + references/
│   ├── te-audience/SKILL.md + references/
│   └── te-operation/SKILL.md + references/
├── bin/
│   └── ae-cli.js                   # shebang 入口 (#!/usr/bin/env node)
├── package.json
├── tsconfig.json
└── README.md
```

**设计要点**：
- Commander.js 作为 CLI 框架，但命令定义是声明式的，通过 `register.ts` 转换
- `framework/` 约 400-500 行，是整个 CLI 的骨架
- `commands/` 每个域一个目录，每个文件导出一个 `Command` 对象

---

## 2. Declarative Command Type System

### Core Types

```typescript
// framework/types.ts

interface Flag {
  name: string;              // --project-id
  type: "string" | "number" | "boolean" | "json";
  required?: boolean;
  default?: any;
  desc: string;
  alias?: string;            // 短名，如 -p
}

interface Command {
  service: string;           // meta | analysis | audience | operation
  command: string;           // 带 + 前缀：+list-events
  description: string;
  flags: Flag[];
  risk: "read" | "write";   // write 类需确认

  validate?: (ctx: RuntimeContext) => void;
  dryRun?: (ctx: RuntimeContext) => DryRunResult;
  execute: (ctx: RuntimeContext) => Promise<any>;
}

interface RuntimeContext {
  // Flag 访问
  str(name: string): string;
  num(name: string): number;
  bool(name: string): boolean;
  json(name: string): any;

  // API 调用
  api(method: string, path: string, params?: Record<string, any>, data?: any): Promise<any>;
  wsQuery(projectId: number, payload: any): Promise<any>;

  // 认证
  token(): Promise<string>;
  host(): string;

  // 输出
  out(data: any): void;
}

interface DryRunResult {
  method: string;
  url: string;
  params?: any;
  body?: any;
}
```

### Global Flags

所有命令自动继承：
- `--host <host>` — TE 实例地址，默认从配置读取
- `--format <json|table>` — 输出格式，默认 json
- `--jq <expr>` — jq 过滤表达式
- `--dry-run` — 只显示请求详情，不执行
- `--yes` — 跳过 write 操作确认

### Execution Pipeline

```
解析全局 flags + 命令 flags
  → 解析 host（--host > config > 默认值 ta.thinkingdata.cn）
  → 构建 RuntimeContext
  → flag 类型校验 + required 检查
  → command.validate?.(ctx)
  → if --dry-run: 输出 command.dryRun(ctx) 并退出
  → if risk === "write" && !--yes: 提示确认
  → result = await command.execute(ctx)
  → ctx.out(result)  // format + jq
```

---

## 3. Authentication & Config

### Config File: `~/.ae-cli/config.json`

```json
{
  "defaultHost": "ta.thinkingdata.cn",
  "hosts": {
    "ta.thinkingdata.cn": { "label": "生产环境" },
    "ta-staging.example.com": { "label": "测试环境" }
  }
}
```

### Token Cache: `~/.ae-cli/tokens.json`

```json
{
  "ta.thinkingdata.cn": {
    "token": "xxx",
    "updatedAt": "2026-04-04T00:00:00Z"
  }
}
```

Token TTL: 20 小时（与 MCP server 一致），过期自动清除。

### Auth Resolution Priority

```
1. 环境变量 TE_TOKEN（最高优先，适合 CI）
2. tokens.json 缓存（未过期）
3. osascript 自动提取（仅 macOS）
4. 失败 → 提示 ae-cli auth login 或 ae-cli auth set-token
```

### Auth Commands

| 命令 | 说明 |
|------|------|
| `ae-cli auth login` | macOS 自动从 Chrome 提取 token；非 macOS 提示手动操作 |
| `ae-cli auth set-token <token>` | 手动设置当前 host 的 token |
| `ae-cli auth status` | 显示认证状态 |
| `ae-cli auth logout` | 清除当前 host 的 token |

### Config Commands

| 命令 | 说明 |
|------|------|
| `ae-cli config init` | 交互式初始化配置 |
| `ae-cli config show` | 显示当前配置 |
| `ae-cli config set <key> <value>` | 设置配置项 |

---

## 4. Command Catalog

### meta 域（7 commands）

| CLI 命令 | 原 MCP 工具 | 说明 |
|----------|------------|------|
| `ae-cli meta +list-events` | `te_list_events` | 获取项目事件目录 |
| `ae-cli meta +load-event-props` | `te_load_event_props` | 加载事件可筛选属性 |
| `ae-cli meta +load-measure-props` | `te_load_measure_props` | 加载事件可度量属性 |
| `ae-cli meta +list-entities` | `te_list_entities` | 列出分析实体 |
| `ae-cli meta +list-metrics` | `te_list_metrics` | 列出预定义指标 |
| `ae-cli meta +list-tables` | `te_list_tables` | 列出 SQL 可查询表 |
| `ae-cli meta +get-table-columns` | `te_get_table_columns` | 获取表字段定义 |

### analysis 域（10 commands）

| CLI 命令 | 原 MCP 工具 | 说明 |
|----------|------------|------|
| `ae-cli analysis +list-reports` | `te_list_reports` | 列出报告 |
| `ae-cli analysis +get-report` | `te_get_report` | 获取报告定义 |
| `ae-cli analysis +save-report` | `te_save_report` | 创建/更新报告 |
| `ae-cli analysis +list-dashboards` | `te_list_dashboards` | 列出仪表盘 |
| `ae-cli analysis +get-dashboard` | `te_get_dashboard` | 获取仪表盘详情 |
| `ae-cli analysis +create-dashboard` | `te_create_dashboard` | 创建仪表盘 |
| `ae-cli analysis +update-dashboard` | `te_update_dashboard` | 更新仪表盘 |
| `ae-cli analysis +list-dashboard-reports` | `te_list_dashboard_reports` | 列出仪表盘内报告 |
| `ae-cli analysis +query-report-data` | `te_query_report_data` | 查询报告数据 (WebSocket) |
| `ae-cli analysis +query-sql` | `te_query_sql` | 执行 SQL 查询 (WebSocket) |

### audience 域（6 commands）

| CLI 命令 | 原 MCP 工具 | 说明 |
|----------|------------|------|
| `ae-cli audience +list-tags` | `te_list_tags` | 列出用户标签 |
| `ae-cli audience +get-tag` | `te_get_tag` | 获取标签详情 |
| `ae-cli audience +list-clusters` | `te_list_clusters` | 列出用户分群 |
| `ae-cli audience +predict-cluster-count` | `te_predict_cluster_count` | 预估分群人数 |
| `ae-cli audience +list-audience-events` | `te_list_audience_events` | 列出受众可用事件 |
| `ae-cli audience +load-audience-props` | `te_load_audience_props` | 加载受众属性 |

### operation 域（11 commands）

| CLI 命令 | 原 MCP 工具 | 说明 |
|----------|------------|------|
| `ae-cli operation +create-task` | `te_create_task` | 创建运营任务 |
| `ae-cli operation +list-tasks` | `te_list_tasks` | 列出运营任务 |
| `ae-cli operation +get-task-stats` | `te_get_task_stats` | 获取任务统计 |
| `ae-cli operation +save-flow` | `te_save_flow` | 创建/更新流程画布 |
| `ae-cli operation +list-flows` | `te_list_flows` | 列出流程画布 |
| `ae-cli operation +get-flow` | `te_get_flow` | 获取流程详情 |
| `ae-cli operation +list-channels` | `te_list_channels` | 列出推送通道 |
| `ae-cli operation +get-channel` | `te_get_channel` | 获取通道详情 |
| `ae-cli operation +get-space-tree` | `te_get_space_tree` | 获取空间导航树 |
| `ae-cli operation +get-timezone` | `te_get_timezone` | 获取项目时区 |
| `ae-cli operation +list-mark-times` | `te_list_mark_times` | 列出日期标注 |

### Raw API

```bash
ae-cli api GET /v1/ta/event/catalog/listEvent --params '{"projectId": 1}'
ae-cli api POST /v1/hermes/flow/save --data '{"projectId": 1, ...}'
```

**总计**: 34 shortcuts + raw API + 4 auth commands + 3 config commands

---

## 5. Output & Error Handling

### Output Formats

**JSON**（默认）：
```json
{
  "ok": true,
  "data": { ... }
}
```

**Table**（`--format table`）：
- 自动检测数组字段渲染为表格
- 检测优先级：已知字段名（`items`, `events`, `reports`, `dashboards`, `tags`, `clusters`, `flows`, `tasks`, `channels`, `nodes`）→ 第一个数组字段 → 数据本身为数组
- 使用 `cli-table3` 渲染，列宽自适应终端

**jq**（`--jq <expr>`）：
- 在 format 渲染前应用 jq 过滤
- 使用 `jq-web`（pure WASM，无需系统 jq 依赖）或轻量 JS 实现如 `@prantlf/jsonpath`；优先选择零系统依赖的方案

### Error Handling

统一错误输出到 stderr：

```json
{
  "ok": false,
  "error": {
    "type": "auth | api | validation | config",
    "code": -1001,
    "message": "Token expired",
    "hint": "Run: ae-cli auth login"
  }
}
```

| 类型 | 场景 | hint |
|------|------|------|
| `auth` | token 过期/无效/未登录 | `Run: ae-cli auth login` |
| `api` | TE API 返回错误 | 显示 TE 原始错误信息 |
| `validation` | flag 缺失/类型错误 | `Missing required flag: --project-id` |
| `config` | 配置未初始化 | `Run: ae-cli config init` |

退出码：成功 `0`，错误 `1`。

---

## 6. Skill Documentation Packages

### Structure

```
skills/
├── te-shared/
│   └── SKILL.md              # 认证、配置、全局 flags、错误处理
├── te-meta/
│   ├── SKILL.md              # 域概述 + 使用场景
│   └── references/           # 每个命令一个 reference 文档
├── te-analysis/
│   ├── SKILL.md
│   └── references/
├── te-audience/
│   ├── SKILL.md
│   └── references/
└── te-operation/
    ├── SKILL.md
    └── references/
```

### SKILL.md Format

```yaml
---
name: te-analysis
version: 1.0.0
description: "TE 分析查询：报告管理、仪表盘管理、SQL 查询、报告数据查询"
metadata:
  requires:
    bins: ["ae-cli"]
  cliHelp: "ae-cli analysis --help"
---
```

内容包含：域概述、核心场景、常用示例、前置条件指向 `te-shared`。

### Reference Doc Format

每个 reference 文档包含：
- 命令描述
- 映射的 CLI 命令
- Flags 表格（名称、类型、必填、说明）
- 安全约束（write 类操作提示）
- 可直接执行的完整示例

### Alignment with lark-cli Skills

- SKILL.md frontmatter 声明 `requires.bins: ["ae-cli"]`
- 每个 reference 对应一个 `+shortcut` 命令
- 文档包含安全约束提示
- 所有示例为完整可执行命令
