# Agent Team CLI 开发文档

> 生成时间：2026-06-08（精简版）

---

## 一、概览

| 项目 | 值 |
|------|-----|
| CLI 服务名 | `team` |
| API Base | `/agent/api/external/team` |
| 鉴权 | 与现有命令一致（`Authorization: bearer <token>`） |
| 实现模式 | 直接 REST（同 `kb`，不走 MCP） |
| 核心命令数 | 13 条 |
| 按需命令数 | 4 条（标注 `[可选]`） |

### 精简原则

AI Agent 的核心诉求是「找到团队 → 启动任务 → 拿到结果」。管理类（版本历史、预检）、诊断类（流程图、白板）、人工干预类（暂停/恢复）命令对 Agent 价值低，通过 Web UI 操作更合适，因此删除。

---

## 二、需要修改的现有文件


### `src/index.ts`

在 `loadCommands()` 函数中新增一个 try 块（插在 teKb 之后）：

```typescript
try {
  const teTeam = await import('./commands/te-team/index.js');
  commands.push(...teTeam.default);
} catch {}
```

---

## 三、新增目录结构

```
src/commands/te-team/
├── index.ts
├── shared.ts
├── team/
│   ├── index.ts
│   ├── list-teams.ts         # +list
│   ├── create-team.ts        # +create
│   ├── update-team.ts        # +update
│   ├── delete-team.ts        # +delete
│   ├── ai-generate.ts        # +ai-generate
│   └── list-templates.ts     # +list-templates
└── run/
    ├── index.ts
    ├── start-run.ts          # +run-start
    ├── chat-run.ts           # +run-chat
    ├── cancel-run.ts         # +run-cancel
    ├── reply-run.ts          # +run-reply
    ├── get-result.ts         # +run-result
    ├── list-artifacts.ts     # +run-artifacts
    ├── watch-run.ts          # +run-watch
    ├── get-logs.ts           # +run-logs        [可选]
    ├── action-count.ts       # +run-action-count [可选]
    ├── task-board.ts         # +task-board       [可选]
    └── get-artifact.ts       # +run-artifact     [可选]

skills/ae-team/
├── SKILL.md
└── references/
    ├── list-teams.md
    ├── create-team.md
    ├── update-team.md
    ├── delete-team.md
    ├── ai-generate.md
    ├── list-templates.md
    ├── run-start.md
    ├── run-chat.md
    ├── run-cancel.md
    ├── run-reply.md
    ├── run-result.md
    └── run-artifacts.md
    └── run-watch.md
```

---

## 四、`shared.ts` 内容

```typescript
export const BASE_TEAM_PATH = '/agent/api/external/team/teams';
export const BASE_RUN_PATH  = '/agent/api/external/team/teamrun';
export const BASE_TPL_PATH  = '/agent/api/external/team/team-templates';
```

---

## 五、命令规格

### 5.1 Team 管理

#### `+list`

```
GET /agent/api/external/team/teams
```

| flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| 无 | — | — | 返回当前用户可见的所有 Team |

```bash
ae-cli team +list
```

---

#### `+create`

```
POST /agent/api/external/team/teams
```

| flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--name` | string | ✅ | Team 名称，1~100 字符 |
| `--config` | json | ✅ | TeamConfig 对象（见第六节） |
| `--description` | string | ❌ | 描述，最长 2000 字符 |
| `--scope` | string | ❌ | `personal`（默认）\| `company` |
| `--enabled` | boolean | ❌ | 是否启用，默认 true |

```bash
ae-cli team +create \
  --name "日报分析团队" \
  --config '{"version":1,"mode":"serial","steps":[{"id":"s1","name":"分析师","agentId":"xxx","prompt":"分析数据","role":"agent"}]}'
```

---

#### `+update`

```
PATCH /agent/api/external/team/teams/:id
```

| flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--id` | string | ✅ | Team ID |
| `--name` | string | ❌ | 新名称 |
| `--config` | json | ❌ | 新 TeamConfig |
| `--description` | string | ❌ | 新描述 |
| `--scope` | string | ❌ | `personal` \| `company` |
| `--enabled` | boolean | ❌ | 是否启用 |

```bash
ae-cli team +update --id team_abc --name "新名称"
```

---

#### `+delete`

```
DELETE /agent/api/external/team/teams/:id
```

| flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--id` | string | ✅ | Team ID |

响应 `{ "ok": true }`；存在运行中任务时返回 409。

```bash
ae-cli team +delete --id team_abc --yes
```

---

#### `+ai-generate`

```
POST /agent/api/external/team/teams/ai-generate
```

| flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--prompt` | string | ✅ | 团队目标描述，1~2000 字符 |
| `--model` | string | ❌ | 指定使用的模型 |

返回 `{ name, description, members[] }`，可作为 `+create --config` 的输入草稿。

```bash
ae-cli team +ai-generate --prompt "需要一个能分析用户留存并生成周报的团队"
```

---

#### `+list-templates`

```
GET /agent/api/external/team/team-templates
```

| flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--locale` | string | ❌ | `zh`（默认）\| `en` \| `ja` \| `ko` |

```bash
ae-cli team +list-templates
ae-cli team +list-templates --locale en
```

---

### 5.2 TeamRun 执行

#### `+run-start`

```
POST /agent/api/external/team/teamrun/start
```

| flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--team-id` | string | ✅ | Team ID |
| `--input` | string | ✅ | 任务输入，1~50000 字符 |
| `--conversation-id` | string | ❌ | 关联对话 ID |
| `--notification` | json | ❌ | 通知配置 `{"channels":["feishu"],"feishuChatId":"..."}` |
| `--save-to-kb-id` | string | ❌ | 完成后保存到知识库的 ID |
| `--project-ids` | json | ❌ | 关联项目 ID 列表 `["id1"]` |
| `--project-names` | json | ❌ | 关联项目名称列表 |
| `--space-ids` | json | ❌ | 关联空间 ID 列表 |
| `--space-names` | json | ❌ | 关联空间名称列表 |
| `--dw-space-codes` | json | ❌ | 关联数仓空间 Code 列表 |
| `--dw-space-names` | json | ❌ | 关联数仓空间名称列表 |

```bash
ae-cli team +run-start --team-id team_abc --input "分析上周用户留存情况，生成报告"
```

---

#### `+run-chat`

```
POST /agent/api/external/team/teamrun/chat
```

| flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--team-id` | string | ✅ | Team ID |
| `--input` | string | ✅ | 用户输入 |
| `--session-id` | string | ❌ | 多轮对话时传入已有 session ID |

若当前 session 有 `waiting_user` 状态的 run，自动 resume。

```bash
ae-cli team +run-chat --team-id team_abc --input "帮我分析最近的DAU趋势"
ae-cli team +run-chat --team-id team_abc --session-id sess_xyz --input "继续上次的分析"
```

---

#### `+run-cancel`

```
POST /agent/api/external/team/teamrun/:id/cancel
```

| flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--id` | string | ✅ | TeamRun ID |

```bash
ae-cli team +run-cancel --id run_abc
```

---

#### `+run-reply`

```
POST /agent/api/external/team/teamrun/:id/reply
```

| flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--id` | string | ✅ | TeamRun ID（须处于 `waiting_user` 状态） |
| `--input` | string | ✅ | 用户回复内容，1~50000 字符 |

```bash
ae-cli team +run-reply --id run_abc --input "请继续，使用方案A"
```

---

#### `+run-watch`

```
GET /agent/api/external/team/teamrun/stream/:id  (SSE)
```

| flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--id` | string | ✅ | TeamRun ID |
| `--after-log` | number | ❌ | 断线重连时传上次收到的最后一条 log timestamp |
| `--quiet` | boolean | ❌ | 静默 stderr 日志/状态输出，默认 false |

连接 SSE 流，阻塞直到终态或 `waiting_user`。自动重连（最多 10 次，间隔 2s），无需外部轮询。

**退出码：**

| 退出码 | 含义 | 后续操作 |
|--------|------|----------|
| `0` | `completed` / `partial_success` | 调用 `+run-artifacts` |
| `1` | `failed` / `cancelled` / `stale` / 连接失败 | 读 `errorMessage`，报告用户 |
| `2` | `waiting_user` | 读 stdout 中的 `pendingQuestion`，问用户，`+run-reply`，再 `+run-watch` |

stdout 始终输出完整 `TeamRunEntity`（标准 JSON envelope）。

```bash
ae-cli team +run-watch --id run_abc
ae-cli team +run-watch --id run_abc --quiet
```

---

#### `+run-result`

```
GET /agent/api/external/team/teamrun/:id/result
```

| flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--id` | string | ✅ | TeamRun ID |

返回完整执行结果（含所有 steps/events）。

```bash
ae-cli team +run-result --id run_abc
```

---

#### `+run-artifacts`

```
GET /agent/api/external/team/teamrun/:id/artifacts
```

| flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--id` | string | ✅ | TeamRun ID |
| `--artifact-type` | string | ❌ | 按产物类型过滤 |
| `--include-content` | boolean | ❌ | 是否包含完整内容，默认 false |

```bash
ae-cli team +run-artifacts --id run_abc --include-content true
```

---

### 5.3 按需命令（暂不实现）

| 命令 | 接口 | 说明 |
|------|------|------|
| `+run-logs` | `GET /teamrun/:id/logs` | 结构化日志，排障时有用 |
| `+run-action-count` | `GET /teamrun/action-required/count` | 待操作数量，sidebar 徽章场景 |
| `+task-board` | `GET /teams/task-board` | 任务看板汇总视图 |
| `+run-artifact` | `GET /teamrun/:id/artifacts/:artifactId` | 单个产物详情 |

---

## 六、TeamConfig 结构说明

```typescript
{
  version: 1,                    // 固定值
  mode: "serial" | "parallel" | "leader",
  steps: [                       // leader 模式至少 2 个 agent；serial/parallel 至少 1 个
    {
      id: string,                // 步骤 ID（唯一，max 100）
      name: string,              // 步骤名称（max 100）
      agentId: string,           // Agent ID（max 191）
      prompt: string,            // 步骤提示词（max 50000）
      role: "leader" | "agent" | "reviewer",  // 默认 agent
      retryLimit: 0~3,           // 重试次数，默认 2
      dependencies: string[],    // 依赖的步骤 ID 列表（前置步骤）
      nextSteps: [               // 条件分支（可选）
        { condition: "confidence >= 0.8", stepId: "step_next" }
      ],
      resourceOverride: {        // 资源覆盖（可选）
        mcpServerIds: string[],  // max 20
        skillIds: string[],      // max 20
        knowledgeBaseIds: string[], // max 10
        model: string | null
      },
      displayName?: string,
      scenarioPrompt?: string,
      note?: string,
      alias?: string,
      promptOverride?: string
    }
  ],
  output: {                      // 可选
    format: "markdown" | "json" | "xlsx" | "pptx" | "pdf" | "docx",
    formats: [...]               // 多格式输出
  },
  maxConcurrency: 1~10,          // 并发控制，默认 5
  leaderConfig: {                // 仅 mode: "leader" 时需要
    agentId: string,
    maxIterations: 1~20,         // 默认 10
    availableAgents: [
      { id, agentId?, name, description, capabilities }
    ]
  },
  notification: {                // 完成通知（可选）
    channels: ["feishu" | "lark" | "slack"],
    feishuChatId?: string,
    larkChatId?: string,
    slackChannelId?: string
  }
}
```

### 模式说明

| 模式 | 说明 | 约束 |
|------|------|------|
| `serial` | 串行执行，步骤按顺序依次运行 | steps >= 1 |
| `parallel` | 并行执行，步骤同时运行（受 maxConcurrency 控制） | steps >= 1 |
| `leader` | Leader 动态调度，由 leader agent 决定调用哪些 agent | steps >= 2（均为 agent 角色），需要 leaderConfig |

---

## 七、TeamRun 状态说明

| 状态 | 说明 |
|------|------|
| `pending` | 等待执行 |
| `planning` | 规划中（leader 模式） |
| `running` | 执行中 |
| `waiting_user` | 等待用户回复（`pendingQuestion` 字段含提问内容，用 `+run-reply` 继续） |
| `waiting_approval` | 等待审批 |
| `paused` | 已暂停 |
| `completed` | 已完成（终态） |
| `partial_success` | 部分成功（终态） |
| `failed` | 执行失败（终态） |
| `cancelled` | 已取消（终态） |
| `stale` | 超时失效（终态） |

---

## 八、典型工作流

### 工作流 A：直接启动已有 Team

```bash
# 1. 查看可用 Team
ae-cli team +list

# 2. 启动任务
ae-cli team +run-start --team-id team_abc --input "分析上周用户留存数据"

# 3. 流式等待结果（自动重连，无需轮询）
ae-cli team +run-watch --id run_xyz
# exit 0 → completed/partial_success → 查看产物
# exit 1 → failed/cancelled → 读 errorMessage，报告用户
# exit 2 → waiting_user → 读 pendingQuestion，问用户，回复后再 watch

# 3a. waiting_user 处理
ae-cli team +run-reply --id run_xyz --input "用户的回答" --yes
ae-cli team +run-watch --id run_xyz   # 继续等待，直到 exit 0/1

# 4. 查看产物
ae-cli team +run-artifacts --id run_xyz --include-content true
```

### 工作流 B：AI 生成 Team 后创建并运行

```bash
# 1. AI 生成配置草稿
ae-cli team +ai-generate --prompt "需要一个分析用户行为并自动生成留存报告的团队"

# 2. 基于草稿创建 Team
ae-cli team +create --name "留存分析团队" --config '{...}'

# 3. 启动任务
ae-cli team +run-start --team-id team_new --input "分析本月留存"
```

### 工作流 C：对话模式多轮交互

```bash
# 第一轮
ae-cli team +run-chat --team-id team_abc --input "帮我分析DAU趋势"
# 返回 session.id，run.id

# 如果 status = waiting_user，提交回复
ae-cli team +run-reply --id run_123 --input "请重点分析周末的下降原因"

# 第二轮继续对话
ae-cli team +run-chat --team-id team_abc --session-id sess_xyz --input "基于以上分析，给出优化建议"
```

### 工作流 D：从模板创建 Team

```bash
# 1. 浏览模板
ae-cli team +list-templates

# 2. 基于模板 config 创建 Team
ae-cli team +create --name "我的分析团队" --config '{模板中的 config}'
```

---

## 九、删除的接口及原因

| 接口 | 原因 |
|------|------|
| `GET /teams/:id`（delete-check） | 直接 delete 处理 409 响应即可，预检意义不大 |
| `GET /teams/:id/runs` | Agent 用 run-result 轮询单个结果即可 |
| `GET /teams/:id/versions` | 版本历史是 Web UI 功能，CLI/Agent 几乎不用 |
| `GET /teams/:id/versions/:versionNo` | 同上 |
| `POST /teamrun/debug` | 开发者调试用途，Agent 不需要 |
| `DELETE /teamrun/:id` | 运行记录软删除，管理类操作 |
| `POST /teamrun/:id/pause` | 人工干预场景，Agent 自动化流程里极少出现 |
| `POST /teamrun/:id/resume` | 同上 |
| `POST /teamrun/:id/retry` | 直接 `+run-start` 重新跑更清晰 |
| `GET /teamrun/:id/flow` | DAG 可视化，CLI 纯文本输出没有意义 |
| `GET /teamrun/:id/whiteboard` | 协作白板，人类用 Web 看更合适 |
| `GET /teamrun/:id/validations` | 验证结果已包含在 run-result 里 |
| `GET /teamrun/stream/:id` | 已实现为 `+run-watch`，见 5.2 节 |
| `GET /teamrun/:id/artifacts/:artifactId/download` | 二进制文件流，需要额外能力 |
