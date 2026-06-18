# Agent Team 接口文档

> 生成时间：2026-06-08（CLI 精简版，依据 dev-plan.md 更新）
>
> 本文档仅保留 CLI 实现或按需实现的接口，共 16 个（12 核心 + 4 可选）。
> 未实现接口（14 个）请见[附录](#附录未在-cli-中实现的接口)。

---

## 概览

| 项目 | 值 |
|------|-----|
| CLI 服务名 | `team` |
| API Base | `/agent/api/external/team` |
| 鉴权 | `Authorization: bearer <token>` |
| 核心接口 | 12 个 |
| 可选接口 | 4 个（标注 `[可选]`） |
| 未实现接口 | 14 个（见附录） |

**精简原则：** AI Agent 的核心诉求是「找到团队 → 启动任务 → 拿到结果」。管理类（版本历史、预检）、诊断类（流程图、白板）、人工干预类（暂停/恢复）接口对 Agent 价值低，通过 Web UI 操作更合适，因此不在 CLI 中实现。

---

## 目录

- [一、Team 管理](#一team-管理)
  - [GET /agent/api/external/team/teams — 获取 Team 列表](#get-agentapiexternalteamteams)
  - [POST /agent/api/external/team/teams — 创建 Team](#post-agentapiexternalteamteams)
  - [PATCH /agent/api/external/team/teams/:id — 更新 Team](#patch-agentapiexternalteamteamsid)
  - [DELETE /agent/api/external/team/teams/:id — 删除 Team](#delete-agentapiexternalteamteamsid)
  - [POST /agent/api/external/team/teams/ai-generate — AI 生成 Team 配置](#post-agentapiexternalteamteamsai-generate)
  - [GET /agent/api/external/team/teams/task-board — 任务看板 \[可选\]](#get-agentapiexternalteamteamstask-board-可选)
- [二、TeamRun 任务执行](#二teamrun-任务执行)
  - [POST /agent/api/external/team/teamrun/start — 启动 TeamRun](#post-agentapiexternalteamteamrunstart)
  - [POST /agent/api/external/team/teamrun/chat — 对话模式启动](#post-agentapiexternalteamteamrunchat)
  - [POST /agent/api/external/team/teamrun/:id/cancel — 取消 TeamRun](#post-agentapiexternalteamteamrunidcancel)
  - [POST /agent/api/external/team/teamrun/:id/reply — 提交用户回复](#post-agentapiexternalteamteamrunidreply)
  - [GET /agent/api/external/team/teamrun/:id/result — 获取执行结果](#get-agentapiexternalteamteamrunidresult)
  - [GET /agent/api/external/team/teamrun/:id/artifacts — 获取产物列表](#get-agentapiexternalteamteamrunidartifacts)
  - [GET /agent/api/external/team/teamrun/:id/artifacts/:artifactId — 获取产物详情 \[可选\]](#get-agentapiexternalteamteamrunidartifactsartifactid-可选)
  - [GET /agent/api/external/team/teamrun/:id/logs — 获取日志 \[可选\]](#get-agentapiexternalteamteamrunidlogs-可选)
  - [GET /agent/api/external/team/teamrun/action-required/count — 待操作数量 \[可选\]](#get-agentapiexternalteamteamrunaction-requiredcount-可选)
- [三、Team 模板](#三team-模板)
  - [GET /agent/api/external/team/team-templates — 获取模板列表](#get-agentapiexternalteamteam-templates)
- [四、通用类型说明](#四通用类型说明)
- [附录：未在 CLI 中实现的接口](#附录未在-cli-中实现的接口)

---

## 一、Team 管理

### GET /agent/api/external/team/teams

获取当前用户可见的所有 Team 列表（含个人 Team 和有权访问的公司 Team）。

**CLI 命令：** `ae-cli team +list`

**请求参数：** 无（依赖 Bearer Token 鉴权）

**响应：**

```json
{
  "items": [TeamEntity]
}
```

---

### POST /agent/api/external/team/teams

创建新的 Agent Team。

**CLI 命令：** `ae-cli team +create`

**请求 Body（JSON）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | Team 名称，1~100 字符 |
| `description` | string \| null | ❌ | Team 描述，最长 2000 字符 |
| `scope` | `"personal"` \| `"company"` | ❌ | 可见范围，默认 `"personal"` |
| `enabled` | boolean | ❌ | 是否启用，默认 true |
| `config` | TeamConfig | ✅ | Team 执行配置（见[通用类型说明](#四通用类型说明)） |

**响应：** `TeamEntity`，状态码 `201`

**错误码：**

| 状态码 | 说明 |
|--------|------|
| 409 | 同名 Team 已存在，响应体含 `code: "NAME_EXISTS"` |
| 403 | 无权创建公司级 Team |

---

### PATCH /agent/api/external/team/teams/:id

更新 Team 基本信息或配置（PATCH 语义，仅传入字段生效）。配置变更时会自动创建新的 TeamVersion 快照。

**CLI 命令：** `ae-cli team +update --id <id>`

**路径参数：**

| 参数 | 说明 |
|------|------|
| `id` | Team ID |

**请求 Body（JSON，所有字段均为可选）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | Team 名称 |
| `description` | string \| null | Team 描述 |
| `scope` | `"personal"` \| `"company"` | 可见范围 |
| `enabled` | boolean | 是否启用 |
| `config` | TeamConfig | Team 执行配置（整体替换） |

**响应：** 更新后的 `TeamEntity`

---

### DELETE /agent/api/external/team/teams/:id

软删除 Team。存在活跃定时任务或正在运行的 TeamRun 时拒绝删除。

**CLI 命令：** `ae-cli team +delete --id <id>`

**路径参数：**

| 参数 | 说明 |
|------|------|
| `id` | Team ID |

**响应：**

```json
{ "ok": true }
```

**错误码：**

| 状态码 | 说明 |
|--------|------|
| 409 | 存在阻塞删除的依赖（`blockReason: "ACTIVE_SCHEDULED_TASKS"` 或 `"RUNNING_TASKS"`） |

---

### POST /agent/api/external/team/teams/ai-generate

根据用户描述，AI 自动从可用 Agent 中挑选成员、分配角色，生成 Team 配置草稿。

**CLI 命令：** `ae-cli team +ai-generate`

**请求 Body（JSON）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `prompt` | string | ✅ | 团队目标描述，1~2000 字符 |
| `model` | string | ❌ | 指定使用的模型，省略则使用系统默认 |

**响应：**

```json
{
  "name": "AI 生成的团队名称",
  "description": "团队描述",
  "members": [
    {
      "agentId": "string",
      "name": "string",
      "role": "leader | agent",
      "note": "string",
      "scenarioPrompt": "string"
    }
  ]
}
```

---

### GET /agent/api/external/team/teams/task-board `[可选]`

> 本接口按需实现，不属于核心交付范围。

获取任务看板数据，用于首页汇总展示（运行中、定时任务、近期任务）。

**CLI 命令（按需）：** `ae-cli team +task-board`

**请求参数：** 无

**响应：**

```json
{
  "runningRuns": [TeamTaskBoardItem],
  "scheduledTasks": [TeamTaskBoardItem],
  "recentRuns": [TeamTaskBoardItem]
}
```

| 字段 | 说明 |
|------|------|
| `runningRuns` | 当前运行中的 TeamRun，最多 50 条 |
| `scheduledTasks` | 正在执行的定时任务 |
| `recentRuns` | 7 天内的近期运行记录，最多 100 条 |

每个 `TeamTaskBoardItem` 含：`id`、`kind`、`detailType`、`detailId`、`teamId`、`teamName`、`taskName`、`creatorName`、`scopeItems`、`status`、`triggerType`、`isScheduledRun`、时间戳、`cronExpression`

---

## 二、TeamRun 任务执行

### POST /agent/api/external/team/teamrun/start

以非对话模式启动一个 TeamRun，同时创建对应的 Conversation。

**CLI 命令：** `ae-cli team +run-start`

**请求 Body（JSON）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `teamId` | string | ✅ | Team ID |
| `input` | string | ✅ | 任务输入，1~50000 字符 |
| `conversationId` | string | ❌ | 关联的对话 ID |
| `notification` | object | ❌ | 完成通知配置（见下） |
| `saveToKnowledgeBaseId` | string | ❌ | 完成后保存结果的知识库 ID |
| `projectIds` | string[] | ❌ | 关联项目 ID 列表 |
| `projectNames` | string[] | ❌ | 关联项目名称列表 |
| `spaceIds` | string[] | ❌ | 关联空间 ID 列表 |
| `spaceNames` | string[] | ❌ | 关联空间名称列表 |
| `dwSpaceCodes` | string[] | ❌ | 关联数据仓库空间 Code 列表 |
| `dwSpaceNames` | string[] | ❌ | 关联数据仓库空间名称列表 |

`notification` 结构：

```json
{
  "channels": ["feishu" | "lark" | "slack"],
  "feishuChatId": "string",
  "larkChatId": "string",
  "slackChannelId": "string"
}
```

> **注意：** CLI flag `--save-to-kb-id` 对应请求体字段 `saveToKnowledgeBaseId`。

**响应：** `TeamRunEntity`，状态码 `201`

---

### POST /agent/api/external/team/teamrun/chat

以对话模式启动或继续 TeamRun，支持多轮对话。若当前会话存在处于 `waiting_user` 状态的 run，则自动 resume。

**CLI 命令：** `ae-cli team +run-chat`

**请求 Body（JSON）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `teamId` | string | ✅ | Team ID |
| `sessionId` | string | ❌ | 现有会话 ID，多轮对话时传入 |
| `input` | string | ✅ | 用户输入，1~50000 字符 |

**响应（新建 run）：** 状态码 `201`

```json
{
  "item": TeamRunEntity,
  "session": ConversationSummary
}
```

**响应（resume 已有 run）：** 状态码 `200`

```json
{
  "resumed": true,
  "item": TeamRunEntity,
  "session": ConversationSummary
}
```

---

### POST /agent/api/external/team/teamrun/:id/cancel

取消正在运行的 TeamRun。

**CLI 命令：** `ae-cli team +run-cancel --id <id>`

**路径参数：**

| 参数 | 说明 |
|------|------|
| `id` | TeamRun ID |

**请求 Body：** 无

**响应：**

```json
{
  "ok": true,
  "cancelled": true
}
```

---

### POST /agent/api/external/team/teamrun/:id/reply

向处于 `waiting_user` 状态的 TeamRun 提交用户回复，继续执行。

**CLI 命令：** `ae-cli team +run-reply --id <id>`

**路径参数：**

| 参数 | 说明 |
|------|------|
| `id` | TeamRun ID |

**请求 Body（JSON）：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `input` | string | ✅ | 用户回复内容，1~50000 字符 |

**响应：**

```json
{
  "ok": true,
  "item": TeamRunEntity
}
```

`item.status` 为 `"running"`。

**错误码：**

| 状态码 | 说明 |
|--------|------|
| 409 | 当前 TeamRun 状态不是 `waiting_user` |

---

### GET /agent/api/external/team/teamrun/:id/result

获取 TeamRun 的完整执行结果，包含所有 steps 和 contexts。用于轮询 run 状态直至终态。

**CLI 命令：** `ae-cli team +run-result --id <id>`

**路径参数：**

| 参数 | 说明 |
|------|------|
| `id` | TeamRun ID |

**响应：** 完整版 `TeamRunEntity`（含所有 steps/events）

终态（停止轮询）：`completed`、`failed`、`cancelled`

---

### GET /agent/api/external/team/teamrun/:id/artifacts

获取 TeamRun 执行过程中产生的所有 Artifact 列表（按 stageOrder/createdAt 排序）。

**CLI 命令：** `ae-cli team +run-artifacts --id <id>`

**路径参数：**

| 参数 | 说明 |
|------|------|
| `id` | TeamRun ID |

**Query 参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `artifactType` | string | ❌ | 按产物类型过滤 |
| `includeContent` | `"true"` | ❌ | 是否包含产物完整内容，默认不含 |

**响应：**

```json
{
  "items": [TeamRunArtifactEntity]
}
```

---

### GET /agent/api/external/team/teamrun/:id/artifacts/:artifactId `[可选]`

> 本接口按需实现，不属于核心交付范围。

获取单个 Artifact 的详细信息（默认包含内容）。

**CLI 命令（按需）：** `ae-cli team +run-artifact --id <id> --artifact-id <artifactId>`

**路径参数：**

| 参数 | 说明 |
|------|------|
| `id` | TeamRun ID |
| `artifactId` | Artifact ID |

**Query 参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `includeContent` | `"false"` | ❌ | 传 `"false"` 时排除内容字段 |

**响应：**

```json
{
  "item": TeamRunArtifactEntity
}
```

---

### GET /agent/api/external/team/teamrun/:id/logs `[可选]`

> 本接口按需实现，不属于核心交付范围。适用于排障场景。

获取 TeamRun 的结构化日志列表。

**CLI 命令（按需）：** `ae-cli team +run-logs --id <id>`

**路径参数：**

| 参数 | 说明 |
|------|------|
| `id` | TeamRun ID |

**响应：**

```json
{
  "logs": [
    {
      "stepId": "string",
      "type": "string",
      "content": "string",
      "timestamp": 1700000000000
    }
  ]
}
```

---

### GET /agent/api/external/team/teamrun/action-required/count `[可选]`

> 本接口按需实现，不属于核心交付范围。适用于 Sidebar 徽章展示场景（建议约 30 秒轮询一次）。

获取当前用户需要操作的 TeamRun 数量。

**CLI 命令（按需）：** `ae-cli team +run-action-count`

**请求参数：** 无

**响应：**

```json
{
  "count": 3,
  "teamIds": ["team_id_1", "team_id_2"]
}
```

| 字段 | 说明 |
|------|------|
| `count` | 处于 `waiting_user` 或 `waiting_approval` 状态的 TeamRun 数量 |
| `teamIds` | 涉及的 Team ID 列表（去重） |

---

## 三、Team 模板

### GET /agent/api/external/team/team-templates

获取系统预设的 Agent Team 模板列表。

**CLI 命令：** `ae-cli team +list-templates`

**Query 参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `locale` | `"zh"` \| `"en"` \| `"ja"` \| `"ko"` | ❌ | 语言，也可从 cookie `agent_locale` 读取，默认 `"zh"` |

**响应：** `TeamTemplateEntity[]`

每个模板含：`id`、`name`、`icon`、`bg`、`desc`、`tags`、`config`、`members`（成员含 `role`/`description`/`color`/`model`/`mcps`/`skills`/`knowledgeBases`）

---

## 四、通用类型说明

### TeamConfig

Team 执行配置，完整字段结构：

```typescript
{
  version: 1,                    // 固定值
  mode: "serial" | "parallel" | "leader",
  steps: [
    {
      id: string,                // 步骤 ID（唯一，max 100）
      name: string,              // 步骤名称（max 100）
      agentId: string,           // Agent ID（max 191）
      prompt: string,            // 步骤提示词（max 50000）
      role: "leader" | "agent" | "reviewer",  // 默认 agent
      retryLimit: 0~3,           // 重试次数，默认 2
      dependencies: string[],    // 依赖的步骤 ID 列表
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
    formats: [...]
  },
  maxConcurrency: 1~10,          // 并发控制，默认 5
  leaderConfig: {                // 仅 mode: "leader" 时必填
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

**执行模式说明：**

| 模式 | 说明 | 约束 |
|------|------|------|
| `serial` | 串行执行，步骤按顺序依次运行 | steps >= 1 |
| `parallel` | 并行执行，步骤同时运行（受 maxConcurrency 控制） | steps >= 1 |
| `leader` | Leader 动态调度，由 leader agent 决定调用哪些 agent | steps >= 2（均为 agent 角色），需要 leaderConfig |

### TeamRunEntity 状态值

| 状态 | 说明 |
|------|------|
| `pending` | 等待执行 |
| `running` | 执行中 |
| `waiting_user` | 等待用户回复（使用 `+run-reply` 继续） |
| `waiting_approval` | 等待审批 |
| `paused` | 已暂停 |
| `completed` | 已完成（终态） |
| `failed` | 执行失败（终态） |
| `cancelled` | 已取消（终态） |

---

## 附录：未在 CLI 中实现的接口

以下接口对 Agent 自动化流程价值较低，通过 Web UI 操作更合适，因此在 CLI 中不实现。

| 接口 | 说明 | 不实现原因 |
|------|------|----------|
| `GET /agent/api/external/team/teams/:id`（删除预检） | 查询 Team 的依赖情况 | 直接 delete 处理 409 响应即可，预检意义不大 |
| `GET /agent/api/external/team/teams/:id/runs` | 分页获取 Team 下所有 TeamRun | Agent 用 `+run-result` 轮询单个结果即可 |
| `GET /agent/api/external/team/teams/:id/versions` | 获取版本历史列表 | 版本历史是 Web UI 功能，CLI/Agent 几乎不用 |
| `GET /agent/api/external/team/teams/:id/versions/:versionNo` | 获取特定版本详情 | 同上 |
| `POST /agent/api/external/team/teamrun/debug` | 调试模式启动（内联 Team 配置） | 开发者调试用途，Agent 不需要 |
| `DELETE /agent/api/external/team/teamrun/:id` | 软删除 TeamRun 记录 | 运行记录软删除，管理类操作 |
| `POST /agent/api/external/team/teamrun/:id/pause` | 暂停 TeamRun | 人工干预场景，Agent 自动化流程里极少出现 |
| `POST /agent/api/external/team/teamrun/:id/resume` | 恢复被暂停的 TeamRun | 同上 |
| `POST /agent/api/external/team/teamrun/:id/retry` | 重试失败/取消的 TeamRun | 直接 `+run-start` 重新跑更清晰 |
| `GET /agent/api/external/team/teamrun/:id/flow` | 获取执行流程图（DAG） | DAG 可视化，CLI 纯文本输出没有意义 |
| `GET /agent/api/external/team/teamrun/:id/whiteboard` | 获取白板内容 | 协作白板，人类用 Web 看更合适 |
| `GET /agent/api/external/team/teamrun/:id/validations` | 获取验证/质检结果 | 验证结果已包含在 `+run-result` 里 |
| `GET /agent/api/external/team/teamrun/stream/:id` | SSE 实时推送 | SSE 长连接，CLI 场景不适用 |
| `GET /agent/api/external/team/teamrun/:id/artifacts/:artifactId/download` | 下载产物文件流 | 二进制文件流，需要额外能力支持 |
