# ae-tracking → ae-cli tracking 迁移说明

ae-tracking 的埋点方案能力已并入 **ae-cli**，命令前缀为 `ae-cli tracking`。

## 命令对照

| ae-tracking（旧） | ae-cli（新） |
|-------------------|--------------|
| `ae-tracking auth login` | `ae-cli auth login` |
| `ae-tracking plan draft` | `ae-cli tracking plan draft` |
| `ae-tracking plan upload` | `ae-cli tracking plan upload` |
| `ae-tracking plan fetch` | `ae-cli tracking plan fetch` |
| `ae-tracking plan delete` | `ae-cli tracking plan delete` |
| `ae-tracking debug device list` | `ae-cli tracking debug device list` |
| `ae-tracking wiki query` | `ae-cli tracking wiki query` |
| `ae-tracking init` | `ae-cli tracking init` |
| `ae-tracking lang set` | `ae-cli tracking lang set` |

## 路径变更

| 用途 | 旧路径 | 新路径 |
|------|--------|--------|
| 全局配置 | `~/.ae-tracking/` | `~/.ae-cli/`（与 ae-cli 共用） |
| 项目工作区 | `.ae-tracking/` | `.ae-cli/` |
| Wiki 软链 | `~/.ae-tracking/wiki` | `~/.ae-cli/wiki` |

## 语言 API

- **读取 AE 语言**：`GET /v1/ta/auto/config/getUserAutoConfig`（`TrackingClient.getServerLang()`）
- **切换 AE 语言**：`POST /v1/ta/auto/config/saveUserAutoConfig`，FormData 字段 `lang=zh_CN` 等
- 不再读写浏览器 `localStorage.umi_locale`

## HTTP 客户端

所有 AE tracking REST 调用封装在 [`src/core/tracking-client.ts`](../src/core/tracking-client.ts)，基于 `ae-cli auth` 的 token 与 [`src/core/client.ts`](../src/core/client.ts) 的 HTTP 工具。

## 与 analysis_meta MCP 的关系

- **xlsx 工作流**：`ae-cli tracking plan upload` → `excel-save`
- **结构化能力读写**：`ae-cli tracking plan get` / `ae-cli tracking plan save-items`

## 初始化 Skills

```bash
ae-cli tracking init
```

将软链 `skills/ae-generate-tracking-plan` 等三个 Skill 到 `~/.claude/skills/`。
