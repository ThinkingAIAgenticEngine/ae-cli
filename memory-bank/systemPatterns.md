# System patterns

## CLI 架构

- **入口**：`src/index.ts` 使用 Commander 建根命令，注册全局选项（`--host`、`--mcp-url`、`--format`、`--jq`、`--dry-run`、`--yes`）。
- **域加载**：`loadCommands()` 动态 `import` 各 `src/commands/<domain>/index.js`，聚合为 `Command[]`；失败时静默跳过（空 `catch`）。
- **注册**：`framework/register.ts` 按 `Command.service` 分组，为每个 service 创建/复用一级子命令，再注册二级子命令与 `option`，`action` 委托 `framework/runner.ts`。
- **命令定义**：每个文件导出符合 `framework/types.ts` 的 `Command`（`service`、`command`、`description`、`flags`、`run` 等），由域 `index` 汇总。

## 横切能力

- **配置与鉴权**：`core/config.ts`、`core/auth.ts`；`commands/auth.ts`、`commands/config.ts` 单独注册到根 program。
- **HTTP**：`core/client.ts` 等综合调用 TE API（具体以各命令实现为准）。
- **原始 API**：`api/raw.ts` 提供贴近 REST 的 `ae-cli api` 能力。
- **MCP**：`core/mcp.ts` 用于注册与 MCP 后端的映射；`community` 等在 `index` 中调用 `registerMcpMappings`（如 `community_content` / `community_analysis` / `community_hot`）。

## Skills 布局

- 每个 skill 包：`skills/<name>/SKILL.md` + `references/*.md`（单命令深度说明）。
- 与代码域对应关系示例：`te-meta` ↔ `meta`，`te-analysis` ↔ `analysis`，`te-audience` ↔ `audience`，`te-operation` ↔ `operation`，`te-community` ↔ `community`，`te-shared` 为共享前置。

## 命名与扩展

- 新增域：新增 `src/commands/<domain>/index.ts` 并在 `src/index.ts` 的 `loadCommands` 中加入 import。
- 新增子命令：在域目录新增实现文件，由域 `index` 加入 `commands` 数组；若对 Agent 暴露，补充 `skills/` reference。
