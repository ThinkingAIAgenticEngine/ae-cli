# 设计文档：te-cli 的 CLAUDE.md / AGENTS.md 协同开发指南

- 日期：2026-06-16
- 状态：已通过设计评审，待 spec 评审
- 作者：周津（carzonsxian）

## 1. 目标

为 te-cli（`@tant/ae-cli`）仓库生成一份面向**团队成员 + AI agent 协同开发**的工程指南，落地为两份内容逐字一致的文件：

- `CLAUDE.md` —— 供 Claude Code 读取
- `AGENTS.md` —— 供 Codex 及其他 agent 读取

内容基于 karpathy-guidelines 的行为规范（源自 [Andrej Karpathy 对 LLM 编码陷阱的观察](https://x.com/karpathy/status/2015883857489522876)），叠加 te-cli 项目自身的**开发范式约束**，并借鉴 [lark-cli AGENTS.md](https://github.com/larksuite/cli/blob/main/AGENTS.md) 的操作化框架（"AI agent 是主要使用者"）。

### 已确认的关键决策

| 决策点 | 选择 | 说明 |
|--------|------|------|
| 语言 | 中文为主 | 标题/正文中文，命令、代码、标识符保留英文 |
| 双文件形式 | 两份独立真实文件 | `CLAUDE.md` 与 `AGENTS.md` 逐字一致；不用软链/import |
| 防漂移 | 同步校验脚本 | `scripts/check-agents-docs-sync.mjs` + `npm run check:agents-docs` |
| 文档深度 | 融合式工程手册 | karpathy 准则 + 项目范式 + 操作规范，约 3–4 页 |

## 2. 非目标（YAGNI）

- 不写成 6+ 页的完整贡献者大全（每个 domain 细节、完整测试策略、troubleshooting）。
- 不改动现有命令、框架或 skills 代码。
- 不引入软链接或 `@import` 机制（团队跨平台风险 / 依赖特定工具特性）。
- 不替代 `README.md`/`README.zh.md`（面向使用者）；本文件面向开发者/agent。

## 3. 文件落位

```
te-cli/
├── CLAUDE.md                          # 新增，正文
├── AGENTS.md                          # 新增，与 CLAUDE.md 逐字一致
├── scripts/
│   └── check-agents-docs-sync.mjs     # 新增，diff 两份文件
└── package.json                       # 修改，新增 "check:agents-docs" 脚本
```

## 4. 文档结构（七节）

### ① 项目简介 · 谁在用这个 CLI
- 一句话定位：`@tant/ae-cli`，TypeScript/ESM，Node ≥18，服务 AE 平台。
- 关键框定（借鉴 lark-cli）：**主要使用者既是团队成员也是 AI agent（Claude / Codex / Cursor 等）**；因此每条输出与错误信息都会被 agent 解析后用于决定下一步——这条约束第 ④ 节的输出/错误规范。

### ② 行为准则（karpathy 四条，结合本仓库给例子）
- **先想后写**：新增命令/flag 前先确认真实 API path 与 payload，不靠猜；对照对应 skill 的 reference。出现多种解释时摆出来，不要默默选一个。
- **简洁优先**：命令是一个声明式 `Command` 对象 + `execute`，不加没要求的 flag/抽象/兜底。
- **外科手术式改动**：照搬现有命令文件风格，不顺手重构相邻 domain，只清理自己改动产生的孤儿代码。
- **目标驱动**：每次改动定义可验证的完成标准（见第 ⑦ 节）。

### ③ 构建 · 运行 · 测试
| 命令 | 用途 | 提 PR 前 |
|------|------|----------|
| `npm run build` | tsup 打包到 `dist/` | 必跑 |
| `npm run dev` / `npx tsx src/index.ts` | 本地运行 | - |
| `npm test` | 冒烟（`--help`） | 必跑 |
| `npm run verify:*` | 各 domain 工具校验 | 改到对应 domain 时跑 |
| `npm run self-check` | 校验新合入的 CLI 功能 | 建议 |
| `npm run check:agents-docs` | 校验两份 agent 文档一致 | 必跑 |

### ④ 代码与架构范式
- **源码布局速查表**：`src/core`(auth/config/client/mcp/mcp-access)、`src/framework`(types/register/runner/output)、`src/api`、`src/commands/<domain>/`、`skills/`、`self-check/`、`tests/`+`test/`、`scripts/`。
- **Command 对象模式**：`{ service, command('+xxx'), description, flags[], risk, validate?, dryRun?, execute }`。
- **一切走 RuntimeContext**：`ctx.str/num/bool/json` 取参、`ctx.api()` 发请求、`ctx.out()` 输出——**禁止裸用 `fetch` / `process.stdout`**。
- **flag 规范**：必须带 `desc`（会被 agent 读）；写操作标 `risk:'write'`（触发确认，除非 `--yes`）；尽量提供 `dryRun` 返回 `{ method, url, params, body }`。
- **输出 envelope**：`{ ok, data, error:{ type, code, message, hint } }`；JSON 走 stdout，进度/告警走 stderr。
- **鉴权**：per-host token；KB external 接口走 `kbApi`（mcp-token，自带 fallback），用现成 helper，不要手搓鉴权。
- **skills 同步**：命令变化要同步 `skills/` 包；`self-check` 用于校验新合入功能。

### ⑤ 新增命令的标准流程（手把手 recipe）
1. 新建 `src/commands/<domain>/<cmd>.ts`，导出一个 `Command` 对象。
2. 在该 domain 的 `index.ts` 的命令数组 + 具名导出里登记。
3. 必要时在 `src/index.ts` 注册新 domain。
4. `--dry-run` 自检请求是否符合预期。
5. 跑 `npm run build` + 对应 `verify:*`。
6. 同步更新对应 skill 包（若该命令对 agent 暴露）。

### ⑥ 提交 · 分支 · PR 约定
- **提交信息**：`type: 中文描述`，type ∈ `feat/fix/docs/refactor/chore/...`，与仓库现有风格一致（如 `feat: 修改版本号`、`fix: 去掉不用的方法`）。
- **分支**：`feat/*`（特性）、`integration/*`（集成）、`release/*`、`master`；个人分支建议 `feat/<name>-dev`，基于最新 `integration/*` 拉取。
- **PR/MR 前**：构建通过 + 必跑校验 + `npm run check:agents-docs`。
- **禁止**提交 token / 密钥。

### ⑦ 安全红线 · 可验证完成标准
- 不提交 token/密钥（token 仅本地按 host 存储；留意 `config.yaml`）。
- 完成标准模板：`npm run build` 绿 + `npm test` 冒烟通过 + 相关 `verify:*` 通过 + `--dry-run` 请求符合预期 + （改文档时）`npm run check:agents-docs` 通过。

## 5. 同步校验脚本设计

`scripts/check-agents-docs-sync.mjs`：

- 读取仓库根 `CLAUDE.md` 与 `AGENTS.md`，逐字节比较。
- 一致 → 退出码 0，打印 `✓ CLAUDE.md 与 AGENTS.md 一致`。
- 不一致 → 退出码 1，打印差异提示（首个不同的行号），引导运行同步。
- 无第三方依赖，纯 Node `fs`，ESM（与项目 `"type":"module"` 一致）。

`package.json` 新增：
```json
"check:agents-docs": "node scripts/check-agents-docs-sync.mjs"
```

## 6. 验收标准

- [ ] 仓库根存在 `CLAUDE.md` 与 `AGENTS.md`，内容逐字一致。
- [ ] 文档为中文为主，含上述七节，覆盖 karpathy 四准则 + 项目范式约束。
- [ ] 文中引用的命令/路径/约定与仓库现状一致（`npm run build`、源码布局、Command 模式、提交/分支风格等）。
- [ ] `scripts/check-agents-docs-sync.mjs` 存在，`npm run check:agents-docs` 在两份一致时退出 0、不一致时退出 1。
- [ ] `package.json` 含 `check:agents-docs` 脚本。

## 7. 风险与缓解

| 风险 | 缓解 |
|------|------|
| 两份文件漂移 | `check:agents-docs` 校验，纳入提 PR 前必跑清单 |
| 文档与代码实际约定脱节 | 文中约定均取自当前仓库现状；后续约定变更时同步本文件 |
| 篇幅膨胀失去可读性 | 锁定七节结构，新增内容优先进 README 或 skill reference |
