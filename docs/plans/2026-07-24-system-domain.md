---
topic: system-domain
date: 2026-07-24
base_branch: release/6.0
delivery_branch: feat/cli-system-domain
source_api_repository: /Users/yangxu/Documents/te-claude
source_api_branch: release/6.0
status: confirmed
---

# te-cli system 域实施计划

## 1. 目标

在 `te-cli` 新增顶层 `system` 域，覆盖 te-agent 系统管理后台的首批主要能力，让 AI Agent 和管理员能够通过结构化 CLI 管理成员、沙箱、模型、用量、成本与渠道。

权限边界保持在 te-agent 服务端：所有纳入的命令只调用已有 `/api/admin/**` 接口，由 `requireAdminAuth()` 同时校验会话角色和数据库角色，仅允许 `root` 或 `agent_admin`；普通 `member` 返回 403。CLI 只负责准确表达请求、风险和错误，不复制一套可绕过的本地权限判断。

## 2. 范围

### 2.1 首批命令（37 个）

| 模块 | 命令 |
| --- | --- |
| 成员（6） | `+list-member-candidates`、`+list-members`、`+add-members`、`+set-member-status`、`+set-member-role`、`+remove-member` |
| 沙箱（10） | `+list-sandboxes`、`+batch-create-sandboxes`、`+update-sandbox`、`+set-sandbox-enabled`、`+start-sandbox`、`+stop-sandbox`、`+list-sandbox-users`、`+bind-sandbox-user`、`+unbind-sandbox-user`、`+remove-sandbox` |
| 模型（7） | `+list-system-models`、`+set-system-model-enabled`、`+list-company-models`、`+set-company-model-enabled`、`+get-default-models`、`+set-default-model`、`+clear-default-model` |
| 用量（2） | `+get-usage-summary`、`+get-usage-details` |
| 成本（8） | `+get-cost-summary`、`+get-balance-alert`、`+set-balance-alert`、`+list-quota-rules`、`+create-quota-rule`、`+update-quota-rule`、`+remove-quota-rule`、`+bind-quota-rule-user` |
| 渠道（4） | `+list-channels`、`+create-channel`、`+update-channel`、`+remove-channel` |

### 2.2 明确不做

- 不修改 te-agent 现有 API、数据库 Schema 或权限模型；te-agent 仓库仅作为接口事实来源。
- 不支持已废弃的 `/api/admin/feishu-channels/**`。
- 首批不纳入后台补数、CSV/XLSX 导出、组合筛选、单成员用量详情、系统模型价格快照、模型同步策略、余额与超限用户等次要/派生能力。
- 不为 system 域新建 Capability Gateway；当前后端尚无等价 system capability。
- 不增加趋势图、复杂筛选、本地缓存或批量编排。

## 3. API 事实与关键决策

### 3.1 API 与鉴权

- API 来源固定为 te-agent `release/6.0` 的 `src/app/api/admin/**`。
- 所有首批命令调用已使用 `requireAdminAuth()` 的接口。
- `requireAdminAuth()` 接受 cookie/Bearer 会话，先判断 `agentRole`，再读取数据库复核用户存在、启用状态和 `agentRole`。
- CLI 复用 `src/core/te-agent-client.ts`：本地 `ae-cli auth login` 后使用 Bearer access token；403 原样作为权限错误返回，不重试、不重新 mint。
- 管理能力不使用沙箱身份头。首批 system 域面向已完成 `ae-cli auth login` 的 `root` / `agent_admin`。
- system 请求显式把 `ctx.host()` 传给主应用客户端，确保命令级 `--host` 不会被静默忽略；主应用客户端只增加可选 host 参数，现有调用保持默认行为。

### 3.2 命令形态

- 遵循现有 te-agent 域风格：`ae-cli system +<command> [flags]`。
- 简单字段使用强类型 flag；嵌套结构使用语义化 JSON flag（如 `--members`、`--rule`、`--config`），并在本地校验对象/数组形态。
- JSON 输入同时支持内联 JSON 与 `@file`；渠道密钥优先通过权限受控的本地文件传入，避免明文进入 shell 历史。
- 所有命令实现本地 `dryRun()`，只展示 method、URL、query 和 body，不执行请求。
- 删除成员、沙箱、配额规则和渠道标记为 `high-risk-write`；其他修改为 `write`，查询为 `read`。
- 渠道凭证 flag 标记 `sensitive`，dry-run 对 `appSecret`、`botToken`、`appToken`、`clientSecret` 做脱敏。

### 3.3 Capability 收录状态

system 域采用 Transitional L2：

- 维护模块：te-agent `src/app/api/admin/**`，CLI `src/commands/te-system/**`。
- 迁移目标：未来由 system Capability Gateway 提供等价 schema、risk、auth 与 execute/dry-run。
- 复审日期：2026-10-24。
- 退出条件：Gateway 覆盖同等能力且权限/错误/输出契约稳定后，逐项迁移到 `createCapabilityCommand`；无额外类型、安全或编排价值的命令退回动态 capability 入口。

## 4. 修改文件

| 文件 | 修改 |
| --- | --- |
| `src/commands/te-system/shared.ts` | 管理 API 请求、query/body 校验、脱敏等共享最小工具 |
| `src/commands/te-system/{members,sandboxes,models,usage,cost-control,channels}.ts` | 37 个命令定义 |
| `src/commands/te-system/index.ts` | 命令聚合与 Transitional 说明 |
| `src/core/te-agent-client.ts` | 为主应用请求增加可选 host override，保证 system 命令的 `--host` 生效 |
| `src/index.ts` | 注册 `system` 域 |
| `skills/ae-system/SKILL.md` | Agent 使用约束、权限、命令与参数说明 |
| `scripts/verify-system-tools.mjs` | 注册、数量、risk、help、代表性 dry-run 与敏感字段脱敏校验 |
| `tests/system-domain.test.ts` | 命令清单、路径、风险、JSON `@file` 与 host 透传契约 |
| `tests/te-agent-credentials.test.ts` | 主应用客户端 host override 向后兼容回归 |
| `package.json` | 增加 `verify:system-tools` |
| `self-check/scan.mjs` | `te-system → ae-system` 映射，并声明分组文档策略 |
| `README.md`、`README.zh.md` | 增量补充 system 域与权限说明 |
| `docs/plans/2026-07-24-system-domain.md` | 本计划及评审记录 |

## 5. 实施顺序

1. 为主应用客户端增加可选 host override；建立 system 共享请求/校验工具，确保 URL 编码、JSON/`@file` 形态检查和敏感字段脱敏可复用。
2. 按成员 → 沙箱 → 模型 → 用量 → 成本 → 渠道顺序实现命令，逐项对照 te-agent Zod Schema 和 HTTP method/path。
3. 注册顶层域，补齐 `ae-system` Skill、README 和 Transitional 记录。
4. 增加 system 专项验证脚本，覆盖全部命令注册与代表性请求。
5. 运行专项验证、全量测试、self-check 和 build；按 merge-base 做代码审查。

## 6. 兼容与回滚

- 只新增顶层域和文档，不修改现有命令、输出 envelope 或通用鉴权行为，向后兼容。
- API 仍由 te-agent 服务端完成公司隔离、资源归属与权限校验。
- 若需要回滚，可整体移除 `te-system` 注册、命令目录、Skill 与文档，不涉及数据回滚。
- 上游某个 admin API 不可用时只影响对应命令；CLI 应返回明确的 HTTP/API 错误，不做静默降级。

## 7. 验收追踪

| 验收 ID | 验收标准 | 实现步骤 | 验证方式 |
| --- | --- | --- | --- |
| AC-01 | `ae-cli system --help` 展示全部 37 个命令 | 1-3 | `npm run verify:system-tools` |
| AC-02 | 六个主要模块均能生成与 te-agent 一致的 method/path/query/body，命令级 `--host` 指向正确主应用 | 1-2 | 代表性 `--dry-run` + 源码契约测试 |
| AC-03 | 所有命令只调用 `/api/admin/**`，普通成员由服务端拒绝 | 1-2 | 静态路径检查；核对 te-agent `requireAdminAuth()`；403 不重试行为回归 |
| AC-04 | `root` 与 `agent_admin` 共享系统管理能力，不使用 `isRoot` 作为唯一角色判断 | 2-3 | Skill/帮助文案审查；te-agent 权限实现证据 |
| AC-05 | 删除操作触发 high-risk 二次确认，其他写操作不误触发 | 2、4 | `npm run verify:system-tools` |
| AC-06 | 渠道密钥支持 `@file` 输入，且不出现在 CLI 日志和 dry-run 输出 | 1、2、4 | 敏感 flag、`@file` 与脱敏专项测试 |
| AC-07 | Agent 能从 Skill 得到准确参数与权限限制，不猜 API | 3-4 | `npm run self-check`、`npm run check:release` |
| AC-08 | 现有 CLI 行为无回归 | 5 | `npm test`、`npm run build` |

## 8. Plan Review 修订记录

2026-07-24 完成 Complex 五维评审：

- 架构：直接复用既有 `/api/admin/**`，不新造 Gateway 或复制服务端权限逻辑；命令按六个模块拆分并共享最小请求工具。发现原计划未明确命令级 `--host` 透传，已增加主应用客户端可选 host override 与回归测试。
- 安全：确认首批 endpoint 均使用 `requireAdminAuth()`，并排除未鉴权的渠道配置状态接口；删除操作统一 `high-risk-write`。发现渠道 JSON 可能进入 shell 历史，已增加 `@file` 输入、sensitive flag 和 dry-run 脱敏要求。
- 性能：每个命令只发起一次对应 API 请求，不在 CLI 侧展开 N+1 或并发批处理；批量成员/沙箱逻辑继续由服务端控制配额和顺序。
- 测试：在 help/数量检查之外，增加命令清单、全部路径 `/api/admin/**`、risk、host override、403 分类、JSON `@file` 与敏感字段脱敏契约；仍按 Complex 要求执行全量测试与 build。
- 产品/体验：37 个命令覆盖六个系统管理主模块，同时把补数、导出、趋势和复杂筛选留在首批范围外；帮助与 Skill 明确仅 `root` / `agent_admin`、需要先 `auth login`，普通成员不建议重试登录。

评审结论：无未处理阻断项；计划已按上述问题修订，等待用户确认后进入 Branch/Implement。
