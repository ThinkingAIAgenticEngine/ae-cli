# Project brief — ae-cli

## 定位

`ae-cli` 是面向 **ThinkingEngine（TE）** 分析平台的命令行工具，同时为人类用户与 AI Agent 设计：统一封装 TE 后台能力，通过域名（service）与子命令暴露，并配套可安装的 Agent Skills。

## 核心目标

- 提供可脚本化、可组合的 TE 数据与运营能力访问（元数据、分析 SQL/报表、人群、运营任务、社区等）。
- 支持多 TE Host：按 URL 隔离配置与 token，交互式 `config` 管理主机与登录状态。
- 输出可机器解析（默认 JSON）或可阅读（`--format table`），可选 `--jq` 过滤。
- 将命令契约同步到 `skills/` 下的多包 Skill，便于 Cursor / Claude Code 等调用。

## 范围边界

- 本仓库为 **Node.js + TypeScript** CLI，非 Java/Spring；与用户在其它项目中的 Java 规范无默认关联。
- 发布产物：`npm` 包 `@tant/ae-cli`，全局命令 `ae-cli`。

## 成功标准（维护视角）

- `npm run build` 可产出 `dist/`；本地开发可用 `tsx src/index.ts`。
- 新增子命令时同步更新对应 `skills/` 与（如适用）README 命令表。
