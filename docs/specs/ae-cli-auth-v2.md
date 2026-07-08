# Spec: ae-cli 鉴权 v2（split-flow 登录 + 长效凭证 + 老服务端兼容）

> 面向 te-cli/te-claude 协作开发者。承接 v1 设备码登录重构。
> 完整设计/计划见测试侧文档：`docs/design/2026-06-22-ae-cli-auth-v2.md`、`docs/plans/2026-06-22-ae-cli-auth-v2-plan.md`（test-ae-agent repo）。

## 背景（Why）

v1 让设备码登录跨平台跑通，但暴露三个问题：

1. **agent 无法在对话内自助登录**：`auth login` 阻塞轮询，AI agent（Claude/Codex）在自己的 shell 里跑会卡死，只能把命令甩给用户手动执行。
2. **凭证不够长效**：CLI 持久化的是 8h 滑动的 access token，而真正长效的 mcpToken（服务端 `expire_time=NULL`，非过期）没被落盘。
3. **老服务端不兼容**：服务端无 `/api/auth/device/*` 端点时，`auth login` 报错困惑（`invalid JSON` / 原始 HTML / 轮询到超时）。

## 目标（What）

- agent 能驱动 split-flow 登录：发起 → 把授权 URL 给用户 → 用户浏览器点一次 → agent 续完。人只点链接。
- 恢复「长期免登」：持久化非过期 mcpToken 作主凭证，access 按需派生。
- 老服务端优雅降级：识别端点缺失，fail-fast，指向 `set-token` 兜底。

## 安全边界

- 不在输出/日志写完整 token（沿用 v1：仅打印前 8 位、URL 不带 query 入日志）。
- 设备码遵循 RFC 8628（device_code 5min TTL、interval、slow_down）。
- 保留 `auth set-token` / `TE_TOKEN` 逃生口。
- 沙箱 `.ae-config/cli-token.json` 注入机制 must-preserve（见 design §4）：`getCliToken` 在 secure-store 之后、mint 之前读取该文件。

## 实现状态

### ✅ Task 1 — split-flow 登录 + 老服务端识别（本次）

**新增命令形态（`ae-cli auth login`）：**

| 用法 | 行为 |
|---|---|
| `auth login` | 全流程（authorize + 阻塞轮询），行为不变 |
| `auth login --no-wait` | 只 authorize，立即输出 JSON（device_code/user_code/verification_url/interval/expires_in/next），**不轮询** |
| `auth login --device-code <code>` | 用该 code 续轮询直到授权并保存（split-flow 第二段） |

**Split-flow（agent 用）：**
1. agent 跑 `auth login --no-wait` → 拿 `verification_url` + `device_code`；
2. agent 把 URL 发用户、结束本轮；
3. 用户浏览器授权；
4. 用户回「好了」→ agent 跑 `auth login --device-code <code>` 续完。

**老服务端识别（F-012）：** authorize/poll 响应若 HTTP 404 ‖ `Content-Type: text/html` ‖ body 以 `<!doctype html`/`<html` 开头（即便 200）→ 抛 `DeviceFlowUnsupportedError`，输出英文 message + hint（指向 `auth set-token` / 升级服务端）；poll 循环把该情况当致命、立即 abort，不再重试到超时。

**改动文件：** `src/core/device-auth.ts`（拆出 `pollDeviceFlow`/`buildVerificationUrl`、加 `DeviceFlowUnsupportedError` + `looksLikeMissingEndpoint`、`authorizeDevice` 读 text 一次后判 HTML/404）、`src/commands/auth.ts`（login 三分支 + 抽 `persistDeviceTokens`/`loginSummary`）、`tests/device-auth.test.ts`（+6 用例）。

### ✅ Task 2 — `config set-host` 非交互命令 + 沙箱 fallback 去耦（本次）

- **`ae-cli config set-host <url> [--label <label>]`**：非交互写 activeHost（host 不在列表则自动 add，去掉「必须先存在」的硬抛）。全代码库 `config set-host` 悬空提示统一补 `<url>`（命令现已存在）。
- **沙箱 fallback 去耦**：`getFallbackCliToken(hostUrl)` 从 `.ae-config/cli-token.json` 读取——精确 host 命中优先；否则当文件仅一条目时取它（覆盖 activeHost 为空/不匹配场景）。`getCliToken` 在 mint 前走该 fallback。
- **改动文件**：`src/commands/config.ts`（set-host 子命令）、`src/core/config.ts`（`getFallbackMcpToken`）、`src/core/mcp.ts`（两处 fallback 调用）、`src/commands/auth.ts`/`src/core/auth.ts`/`src/api/raw.ts`（提示补 `<url>`）。

### ✅ Task 3 — 持久化 mcpToken 作主凭证 + 去客户端虚构过期（本次）

- **持久化 mcpToken**：`TokenPayload` 加 `mcpToken?`，登录时落盘（AES 0600，secure-store）；`loadMcpToken(host)` 读取；access-token refresh 时**保留** mcpToken。
- **`getMcpToken` 优先级**：内存 → `.ae-config` 沙箱 fallback（保留）→ **secure-store 持久 mcpToken（新）** → 用 access mint。mcp-token 路径（analysis/team 等）因此跨会话免重 mint（mcpToken 服务端非过期 = 长期免登的载体）。
- **去客户端虚构过期（懒发现）**：`getValidAccessToken` 在「过静态期 + 无 refresh token」时**返回存的 token 而非抛错**——`accessExpiresAt` 是登录时的静态快照，而服务端是**滑动窗口（每次使用自动续 8h）**，静态时间不代表真实有效性；交给服务端裁判（真死才 401）。这样**活跃使用 bearer 命令的人，token 跟着服务端滑动、实际永不重登**。
- **bearer 路径 401 → 干净重登**：`client.ts`（`ae-cli api` 等 REST）真 401/403 抛 `SecureStoreAuthError`（`raw.ts` 映射成 `error.type=auth`，触发 ae-shared auth-gate）；`te-agent-client` 401/403 抛「Session expired … run auth login」。
- **`auth status` 诚实化**：有凭证即 `authenticated:true`；`accessExpiresAt` 标为 advisory（服务端滑动，CLI 无法精确知），附 `hasMcpToken` / `pastStaticExpiry`。
- **改动文件**：`src/core/secure-store.ts`（`mcpToken` 字段 + `loadMcpToken` + refresh 保留 + 懒返回）、`src/core/mcp.ts`（secure-store 档）、`src/core/client.ts`（401→SecureStoreAuthError）、`src/api/raw.ts`（映射 auth）、`src/core/te-agent-client.ts`（401 重登提示）、`src/commands/auth.ts`（登录落 mcpToken + status 诚实化）、`src/core/auth.ts`（去 `TOKEN_TTL_MS`）。
- **设备码 access 的 1y clamp/default 保留**：现已不据它主动判死（懒发现），故无害；不再处理。

### ✅ Task 4 — `skills/ae-shared` + 各 skill 引用（本次）

- 新建 `skills/ae-shared/SKILL.md`（英文，对齐 ae-* 风格）：host 初始化（`config set-host`）、认证（auth-gate 懒检测 / **split-flow 四步 + 「发 URL 后结束本轮」铁律** / set-token+TE_TOKEN 兜底 / 老服务端处理）、全局规则（参数 + 错误 envelope `type` 分支 + 安全）、update notice。
- **全 7 个 skill 顶部引用** `../ae-shared/SKILL.md`；删除 `ae-analysis`/`community`/`dataops` 的「self-contained / 不要用 shared skill」声明（与 shared 模型矛盾）+ ae-community frontmatter 的 `(self-contained)`。
- `ae-engage/references/*.md`（42 个）已有的 `../../ae-shared/SKILL.md` 悬空引用**现全部解析**（文件已建）。
- 各 skill 既有「Global AE CLI Rules」块暂保留（不矛盾、为渐进），canonical 源现为 ae-shared；后续可删冗余块。

### ❌ Task 5 — 不做（2026-06-22 决定）

原计划：后端暴露 `mcpToken→access` 交换，让 bearer 路径完全免登。**取消**——服务端 access token 本就是滑动窗口（每次使用自动续 8h），Task 3 的懒发现已让活跃用户的 bearer 路径跟随滑动、实际永不重登；mcp-token 路径由持久 mcpToken 永久免登。Task 5 只剩"登录后 >8h 完全不碰 bearer 命令再来一条"这一窄场景的一次重登，收益不抵后端改动成本。如该场景将来成为真实痛点再重启。

---

## 验收标准（可验证）

Task 1：
- [x] 确定性：`tests/device-auth.test.ts` 22 passed（含 split-flow resume、404/HTML→unsupported、buildVerificationUrl）。
- [x] `npm run build` 绿；`ae-cli auth login --help` 显示 `--no-wait` / `--device-code`。
- [x] 真实测试环境 `auth login --no-wait` 即时返回真实 device_code + verification_url（无阻塞）。
- [x] 端到端 split-flow（人浏览器授权）：`--no-wait` → 授权 → `--device-code` 一次轮询即 approved、落 token + mcpToken，`auth status` 确认 secure-store 新 expiresAt（2026-06-22 实测通过）。
- [x] 老服务端**真实实测**（2026-06-22，`https://web-ta-demo.thinkingdata.cn`）：authorize 返回 HTTP 200 + `text/html`（SPA index.html）→ `auth login --no-wait` 与全量 `auth login` 均秒级 fail-fast、exit 1、结构化 `{type:auth, "...does not support device code login...", hint: set-token/升级}`，无 `invalid JSON`/无轮询；活跃 inner-audit 会话不受影响。

Task 2：
- [x] 确定性：`mcp-no-disk.test.ts` 14 passed（含 getFallbackMcpToken 精确 / 单条目 / 无文件）。
- [x] 真实环境 `config set-host <url> --label <l>` 幂等可用、config 未被破坏；`config set-host --help` 显示命令。

Task 3：
- [x] 确定性：`secure-store.test.ts` 15 passed（mcpToken roundtrip / loadMcpToken / refresh 保留 / **过静态期无 refresh→懒返回不抛**）。
- [x] `getMcpToken` 优先级新增 secure-store 档于 `.ae-config` 之后（沙箱 fallback 不被绕过，单测覆盖）。
- [x] 懒发现：`getValidAccessToken` 过静态期且无 refresh 时返回存的 token（不抛）；bearer 真 401 → `SecureStoreAuthError`/重登提示；build 绿、device-auth 22 / mcp-no-disk 14 无回归。
- [x] 端到端（2026-06-22 实测）：Task 3 代码后重新登录 → `loadMcpToken` 确认加密文件含 mcpToken（`mcp_Me97…`）→ 新进程 `analysis_common +list_projects` 返回真实项目，日志 `Using persisted MCP token (secure-store)`（未 mint）。

Task 4：
- [x] `skills/ae-shared/SKILL.md` 已建；全 7 skill 引用、self-contained 声明已除；42 个 ae-engage 悬空引用全部解析。
- [x] `npm run build` 绿；`npm run self-check` P1=0/P2=0（剩余 P3 均为既有、与本次无关）；相对链接全部解析通过。

F-013（`set-token` 失效，测 F-012 兜底时挖出）：
- [x] `validateToken` 改 form-urlencoded body（服务端 `/v1/oauth/checkToken` 用 `@RequestParam`；JSON body 在新旧服务端都 -1008「参数为空」→ set-token 拒绝合法 token）。token 不进 URL（保留防日志泄漏）。
- [x] curl 实测：form-encoded dummy → 服务端 `-1001`（参数收到）而非 `-1008`；`mcp-no-disk` 14 passed（log-redaction 用例同步更新）。
- [x] **e2e（老服务端 web-ta-demo + 真实 token）**：set-token 保存成功 → `auth status` authenticated → `analysis_common +list_projects` 返回真实项目（bearer mint + mcp 调用两路径皆通）。"设备码 fail-fast → 转 set-token → 正常使用"全链路坐实。

F-014（`team +list-projects` base-path bug，测 set-token e2e 时挖出）：
- [x] 全量调研（grep 所有 `kbApi`/`kbUpload` 调用点 + 路径常量）：te-kb 全部、te-team 其余命令均已含 `/agent`；**仅 `team +list-projects` 的 `OAUTH_CHECK_PATH` 漏了 `/agent` 前缀** → 打裸 host `/api/oauth/check` → 404 SPA HTML → `Unexpected '<'`（新旧服务端皆然，非老服务端功能缺失）。
- [x] 修复：`shared.ts` `export API_PREFIX`；`list-projects.ts` `OAUTH_CHECK_PATH = \`${API_PREFIX}/api/oauth/check\``。dry-run URL → `/agent/api/oauth/check`。
- [x] 新旧服务端 real 实测：返回真实项目（inner-audit CRM… / web-ta-demo 公司_项目2_DEMO…），不再 `Unexpected '<'`；build 绿；其它 team 命令 URL 不变。

## 关联 repo

te-cli（本次）；te-claude（设备码后端，已 v1 落地）。~~ta-common-service~~ 无需改动（Task 5 取消）。
