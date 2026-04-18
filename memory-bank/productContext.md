# Product context

## 解决的问题

- TE Web 控制台不适合批量、自动化、管线内调用；分析师与 Agent 需要 **稳定 CLI 接口** 与 **可发现的使用说明**（Skills + references）。
- 多环境（生产/预发）切换与鉴权易出错；需要 **按 host 持久化 token** 与 **显式覆盖**（`--host`）。

## 预期工作方式

1. 首次使用：`ae-cli config` 配置 host，必要时 `ae-cli auth login`（如 macOS 从 Chrome 取 token）或 `auth set-token`。
2. 日常调用：`ae-cli <domain> <subcommand> [flags]`，必要时加 `--project-id` / 业务参数（因命令而异）。
3. AI 侧：安装 Skills 后，模型根据 `skills/*/SKILL.md` 与 `references/*.md` 拼出正确命令与参数格式。

## 体验目标

- 命令分层清晰：**domain（service）→ 子命令**，与代码中 `src/commands/<domain>/` 一致。
- 写操作需有意识确认（`--yes` 跳过），`--dry-run` 便于排错。
- 社区类能力（`community`）参数约定（如逗号分隔列表）在 `te-community` Skill 中集中说明。
