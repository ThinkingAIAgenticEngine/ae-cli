# Active context

## 当前焦点（截至上次 Memory Bank 更新）

- 仓库已包含完整的 **`community` 域**（直播、话题、评论、风险内容、概览指标等）及对应 **`skills/te-community`**；用户近期在查看 `skills/te-community/references/`（如 `get_tag_trends.md`）。
- **README.md** 中「Commands / Domains」表格仍只列 `meta`、`analysis`、`audience`、`operation`，**未列出 `community`**；Skills 小节写「5 个包」，仓库内实际为 **6 个技能目录**（含 `te-community`）。文档与代码存在不一致，后续合并文档时可对齐。

## 建议的下一步（非强制）

- 更新 README：补充 `community` 域名、命令数量或说明，并将 Skills 数量改为 6（若 install 入口已包含 `te-community`）。
- 若有集成测试需求，可将 `npm test` 从仅 `--help` 扩展为关键命令快照或冒烟测试。

## 活跃决策

- Memory Bank 落盘于仓库根目录 `memory-bank/`，供跨会话恢复上下文；与 npm 发布包无耦合。
