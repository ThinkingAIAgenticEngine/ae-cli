# analysis 域接入 analysis-extend 工具实施计划（对齐校验版）

## Summary

- 新增 28 个 extend 工具，CLI 入口仍在 `analysis` 域。
- 原 `analysis` 的 38 个工具保持不变（仍走 `analysis`）。
- 新增 28 个工具全部走 `analysis-extend`。
- 实现与验收以“计划清单 == 实际命令”作为硬校验标准。

## Public Interface / Routing

- CLI 域不变：`ae-cli analysis +<tool_name>`。
- 新增内部 MCP 映射（仅用于路由）：
  - `te_analysis_extend -> componentName: analysis, mappingPath: analysis-extend`
- `createMcpCommand` 增加可选 `mcpService`（默认 `analysis`）：
  - 旧 38 工具：不传，走 `analysis`
  - 新 28 工具：传 `mcpService: te_analysis_extend`，走 `analysis-extend`

## Implementation Changes

- 修改：
  - `src/core/mcp.ts`：注册 `te_analysis_extend` 映射。
  - `src/commands/te-analysis/shared.ts`：支持命令级路由分流（`mcpService`）。
  - `src/commands/te-analysis/index.ts`：汇总新增分组命令。
- 目录精简：不新增大批子目录，28 个命令并入现有分组目录：
  - `meta`（alert/metadata/virtual-meta/metric）
  - `dashboard`（dashboard-note/public-access）
  - `model`（model-assist）
  - `project`（tracking/mark-time）
  - `cluster`（refresh_cluster）
  - `tag`（refresh_tag）

## 对齐校验（核心要求）

- 在 `docs/te-analysis-extend/expected-tools.txt` 维护基准名单（28 行，一行一个工具名，不带 `+`）。
- 校验必须同时满足：
  1. 基准名单与代码中标记 `mcpService: te_analysis_extend` 的命令集合双向全等（无缺失、无多余）。
  2. `ae-cli analysis --help` 能看到这 28 个命令，且名称逐项一致。
  3. 新增命令 `--dry-run` URL 为 `/mcp/analysis/http/analysis-extend`。
  4. 旧命令抽样 `--dry-run` URL 仍为 `/mcp/analysis/http/analysis`。
- 自动校验脚本：`scripts/verify-te-analysis-extend-tools.mjs`。

## 验收标准

- `analysis` 总命令数为 66（38 + 28）。
- `npm run verify:te-analysis-extend-tools` 通过。
- `npm run build` 通过。
