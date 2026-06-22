# te-cli 协同开发指南（CLAUDE.md / AGENTS.md）

> 本指南由 `CLAUDE.md` 与 `AGENTS.md` 两份**逐字一致**的副本组成：`CLAUDE.md` 供 Claude Code 读取，`AGENTS.md` 供 Codex 及其他 AI agent 读取。**改动任意一份后必须同步另一份**，并运行 `npm run check:agents-docs` 校验一致性。

## 1. 项目简介 · 谁在用这个 CLI

`@tant/ae-cli`（命令 `ae-cli`）是 ThinkingAI AE 平台的命令行工具，TypeScript / ESM，Node ≥ 18。

**主要使用者既是团队成员，也是 AI agent**（Claude Code、Codex、Cursor 等）。由此引出两条贯穿全文的约束：

- 你写的每条**输出与错误信息都会被 agent 解析**，并据此决定下一步动作。
- 所以输出要结构化、错误要可读可定位（见 §4）。

## 2. 行为准则（先读这一节）

源自 Andrej Karpathy 对 LLM 编码陷阱的观察，在本仓库落地为四条：

1. **先想后写**。新增命令 / flag 前，先确认真实 API path 与请求体——**不要猜**；对照对应 skill 的 reference。出现多种解释时摆出来让人选，不要默默挑一个。
2. **简洁优先**。一个命令就是一个声明式 `Command` 对象 + `execute`。不加没人要的 flag、抽象或兜底逻辑。能 50 行别写 200 行。
3. **外科手术式改动**。照搬现有命令文件的写法，不顺手重构相邻 domain、不改无关格式。只清理你自己改动产生的孤儿代码；发现无关死代码就指出来，别删。
4. **目标驱动**。每次改动先定义可验证的完成标准（见 §7），然后循环到验证通过。

## 3. 构建 · 运行 · 测试

| 命令 | 用途 | 提 PR 前 |
| --- | --- | --- |
| `npm run build` | tsup 打包到 `dist/` | ✅ 必跑 |
| `npm run dev` / `npx tsx src/index.ts` | 本地运行（免构建） | — |
| `npm test` | 冒烟（执行 `--help`） | ✅ 必跑 |
| `npm run verify:*` | 各 domain 工具校验脚本 | 改到对应 domain 时跑 |
| `npm run self-check` | 校验新合入的 CLI 功能合理性 | 建议 |
| `npm run check:agents-docs` | 校验 CLAUDE.md / AGENTS.md 一致 | ✅ 改本文件时必跑 |

本地起步：`npm install` → `npx tsx src/index.ts --help`。

## 4. 代码与架构范式

### 语言：代码与 CLI 输出统一英文（硬约束）

CLI 同时面向团队成员与 AI agent，**源码内容与所有用户可见输出统一使用英文，不得出现中文或其他自然语言**：

- **代码内容**：字符串字面量（含错误 `message` / `hint`、`desc`、提示文案）与注释，全部英文。
- **CLI 输出**：所有用户可见输出——`--help`、flag `desc`、进度 / 告警（stderr）、错误 envelope 的 `message` / `hint`——全部英文。
- **不翻译 / 不改动**：标识符、JSON 键、命令名、flag 名、字符串插值的变量、URL path、技术词。
- **唯一例外**：真实业务数据本身（如 AE 事件名 `登录` / `支付`）按原样保留——翻译会破坏功能与校验。

不在此约束内：本指南（`CLAUDE.md` / `AGENTS.md`）与提交信息（见 §6）仍用中文。

### 源码布局

| 路径 | 职责 |
| --- | --- |
| `src/core/` | auth、config、client、mcp、mcp-access（鉴权 / 配置 / HTTP / MCP token） |
| `src/framework/` | types、register、runner、output（命令框架核心） |
| `src/api/` | 原始 API 访问（`api` 命令） |
| `src/commands/<domain>/` | 各业务域命令（te-analysis、te-kb、te-engage…） |
| `skills/` | 给 AI agent 的 skill 包（与命令同步维护） |
| `self-check/` | 自检脚本 |
| `tests/`、`test/` | 测试 |
| `scripts/` | 校验 / 工具脚本 |

### Command 对象模式

每个命令是一个 `Command` 对象（定义见 `src/framework/types.ts`）：

```
{ service, command, description, flags[], risk, validate?, dryRun?, execute }
```

- `command` 用 `+` 前缀，如 `+query`、`+list_events`。
- 命令文件放在 `src/commands/<domain>/<cmd>.ts`，并在该 domain 的 `index.ts` 里登记到命令数组 + 具名导出。

### 一切走 RuntimeContext

命令体内**不要裸用 `fetch` / `process.stdout`**，统一通过 `ctx`：

- 取参：`ctx.str(name)` / `ctx.num` / `ctx.bool` / `ctx.json`
- 发请求：`ctx.api(method, path, params, body)`（KB external 接口用 `kbApi`，见下）
- 上下文：`ctx.host()` / `ctx.token()` / `ctx.service()`
- 输出：`ctx.out(data)`

### flag / risk / dry-run 约定

- 每个 flag **必须带 `desc`**（会被 agent 读），类型 ∈ `string | number | boolean | json`。
- 写操作（增删改）标 `risk: 'write'`——触发二次确认，除非用户带 `--yes`；只读标 `risk: 'read'`。
- 尽量实现 `dryRun(ctx)`，返回 `{ method, url, params, body }`，让 `--dry-run` 能在不真正请求的情况下预览。

### 输出与错误

- 输出 envelope：`{ ok, data, error: { type, code, message, hint } }`，`type ∈ auth | api | validation | config`。
- **JSON 走 stdout，进度 / 告警走 stderr**（用 logger 或 `process.stderr.write`）。

### 鉴权

- token 按 host 维度存储（per-host）。
- KB external 接口走 `kbApi`（`src/core/mcp-access.ts`），自带 `mcp-token` 头与 fallback；**用现成 helper，别手搓鉴权**。

### skills 同步

命令对 agent 暴露的能力发生变化时，要同步更新 `skills/` 下对应的 skill 包；`self-check` 用于校验新合入功能。

## 5. 新增一个命令（标准流程）

以现有 `src/commands/te-kb/query.ts` 为模板：

1. 新建 `src/commands/<domain>/<cmd>.ts`，导出一个 `Command` 对象。
2. 在该 domain 的 `index.ts` 命令数组 + 具名导出里登记。
3. 若是新 domain，在 `src/index.ts` 注册。
4. `--dry-run` 自检请求是否符合预期。
5. `npm run build` + 对应 `npm run verify:*`。
6. 若命令对 agent 暴露，同步更新对应 skill 包。

## 6. 提交 · 分支 · PR 约定

- **提交信息**：`type: 中文描述`，`type ∈ feat | fix | docs | refactor | chore | …`。例：`feat: 新增 kb 导出命令`、`fix: 去掉不用的方法`。
- **分支**：
  - `feat/*` 特性、`integration/*` 集成、`release/*` 发布、`master` 主干。
  - 个人分支建议 `feat/<name>-dev`，基于最新 `integration/*` 拉取。
- **提 PR / MR 前**：`npm run build` 通过 + 相关 `verify:*` 通过 +（改过本文件时）`npm run check:agents-docs` 通过。
- **禁止**提交 token / 密钥。

## 7. 安全红线 · 完成标准

- 不提交任何 token / 密钥（token 仅本地按 host 存储；注意 `config.yaml` 等含敏感信息的文件）。
- 一次改动的**完成标准**模板：
  - `npm run build` 绿
  - `npm test` 冒烟通过
  - 相关 `npm run verify:*` 通过
  - `--dry-run` 预览的请求符合预期
  - （改过本文件）`npm run check:agents-docs` 通过
