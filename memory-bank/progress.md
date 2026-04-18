# Progress

## 已具备

- **CLI**：`ae-cli` 多域命令（`meta`、`analysis`、`audience`、`operation`、`community`）、全局选项、`auth` / `config`、`api` 原始调用。
- **社区域**：`src/commands/community/` 下多条子命令（列表见 `community/index.ts` 导出数组）；MCP 映射注册 `community_content`、`community_analysis`、`community_hot`。
- **Skills**：`skills/te-shared`、`te-meta`、`te-analysis`、`te-audience`、`te-operation`、`te-community` 及大量 `references`。
- **构建**：`tsup` → `dist/`，`prepublishOnly` 触发 build。

## 待改进 / 已知不一致

- README 域名表与 Skills 数量与仓库现状 **不完全一致**（缺 `community`、Skills 写 5 实际 6）。
- `npm test` 较薄，深度回归依赖人工或外部自动化。

## 风险与依赖

- 调用真实 TE 环境需要有效 host 与 token；CI 若有集成测试需 mock 或隔离环境。

## 性能

- 暂无单独 `performance.md`；若后续有大数据量导出或轮询场景，再记录瓶颈与优化案例。
