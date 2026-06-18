# te-claude 主应用：ae-cli sync pull 与 workspace 物化改造计划

状态：需求已确认，待编码。

## 目标

配合 ae-cli 的双向 `sync`：

- 保留现有 `工作空间 -> 主应用` 的 `POST /api/sandbox/sync/push` 语义，只接受 personal。
- 新增 `主应用 -> 工作空间` 能力，让 ae-cli 可以从主应用选择 system / company / personal 的 Skill 与 MCP，并物化到当前 workspace。
- workspace Skill scope 元数据统一放入 `.claude/skills/.skill-manifest.json` v2，不再设计或生成 `.te-agent-scope.json`。
- workspace `.mcp.json` 写入改为合并策略，保留用户手动安装且缺失 `_scope` 的 MCP。
- 主应用写 workspace 时同步更新 `workspace_skill` / `workspace_mcp` desired state，避免网页端显示与落盘文件不一致。

## 已确认决策

1. `ae-cli model` 收敛为单命令交互，`model list` / `model set` 子命令不再作为目标形态保留。
2. `ae-cli model` 仍需要主应用提供模型列表；选中模型后通过 `POST /api/sandbox/models/select` 更新 `Workspace.modelId` 并由 te-claude 推送 settings，不再拉取模型凭证本地写 settings。
3. Skill scope 统一写入 `.skill-manifest.json` v2 的 `skills[].scope`。
4. 主应用 -> 工作空间同步采用 merge 语义，未选择的既有主应用管理资源保留。
5. 主应用 -> 工作空间同步必须更新 `workspace_skill` / `workspace_mcp` desired state。
6. 允许本次能力修改 te-claude 项目，包括新增 sandbox pull 接口、调整 provisioning、调整 `.mcp.json` 写入策略。

## 非目标

- 不让 `sync/push` 支持 system / company 上推。
- 不让 ae-cli 直接读 te-claude 主应用内部文件目录。
- 不在接口响应中返回 apiKey、MCP token、解密 headers 等敏感信息。
- 不保留旧 `model list` / `model set` 子命令与本地 settings writer 链路。
- 不做 replace/删除式同步；本期只做 merge/刷新。

## 接口保留与删除结论

### 保留的现有接口

- `GET /api/sandbox/models`
  - 虽然 ae-cli 不再保留 `model list` 子命令，但单一 `ae-cli model` 仍需要该接口拉取模型候选列表。
  - 该接口继续返回内部字段 `id / modelId / baseUrl` 给 CLI 内部使用；CLI 展示层只展示 `name / scope`。
- `POST /api/sandbox/models/select`
  - 用户在 `ae-cli model` 交互中选中模型后提交当前 `workspacePath` 与目标 `Model.id`，由 te-claude 更新 `Workspace.modelId` 并推送 settings。
- `POST /api/sandbox/sync/push`
  - 继续服务 `工作空间 -> 主应用`，且继续只接受 personal。
- `GET/POST /api/workspaces/[id]/config`
  - 继续服务网页端 workspace 配置，不因新增 sandbox pull 接口删除。

### 新增接口

- `GET /api/sandbox/sync/pull/candidates`
- `POST /api/sandbox/sync/pull`

### 删除接口

`POST /api/sandbox/models/credentials` 已无现行调用方，随 ae-cli 本地 writer 链路一并删除。`GET /api/sandbox/models` 保留，用于 `ae-cli model` 候选列表。

## 当前代码事实

- `POST /api/sandbox/sync/push`
  - 文件：`src/app/api/sandbox/sync/push/route.ts`
  - 鉴权：`X-Sandbox-Id` + `X-Sandbox-Secret-Key`
  - 只接受 `scope: "personal"`。
  - Skill 只写 DB，并返回 `skillTargetRoot`，完整 package 由 ae-cli 在沙箱本机复制。
  - MCP 只写 DB。
- Workspace 配置保存
  - 文件：`src/app/api/workspaces/[id]/config/route.ts`
  - 浏览器鉴权后校验 Skill/MCP 可见性，更新 `workspace_skill` / `workspace_mcp`，调用 `provisionWorkspaceConfigToSandbox()`。
- Workspace 物化
  - 文件：`src/lib/workspaces/provisioning.ts`
  - 当前写 `.claude/skills/<slug>/...`、`.claude/skills/.skill-manifest.json`、workspace 根目录 `.mcp.json`。
  - 当前 system/company Skill 的 scope 需要收敛到 `.skill-manifest.json` v2。
  - 当前 `.mcp.json` 是整体覆盖。
- DB 结构
  - `Skill.scope` / `McpServer.scope` 为 `personal | company | system`。
  - `WorkspaceSkill` / `WorkspaceMcp` 保存 workspace desired state。

## 方案一：新增 sandbox sync pull 接口

### 1. `GET /api/sandbox/sync/pull/candidates`

用途：ae-cli 在选择 `主应用 -> 工作空间` 后拉取当前 workspace 已配置、可重新同步到本地的候选项。

鉴权：

- Header：`X-Sandbox-Id: <sandbox id>`
- Header：`X-Sandbox-Secret-Key: <secret>`
- 通过 `authenticateSandboxRequest()` 解析 `userId / companyId / sandboxId`。

Query：

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `workspacePath` | 是 | 当前 workspace 名称/路径，例如 `wqa13`。必须匹配当前 sandbox 下该用户的 `Workspace.workspacePath`。 |
| `kind` | 否 | `skill` / `mcp` / `both`，默认 `both`。 |

响应：

```json
{
  "workspace": {
    "id": "workspace-cuid",
    "path": "wqa13"
  },
  "mtime": "2026-06-17T10:00:00.000Z",
  "skills": [
    {
      "id": "skill-cuid",
      "name": "ae-analysis",
      "scope": "system",
      "selected": true,
      "description": "AE analysis skill"
    },
  ],
  "mcp": [
    {
      "id": "mcp-cuid",
      "name": "te-mcp-analysis",
      "scope": "system",
      "selected": true,
      "description": "Analysis MCP"
    }
  ]
}
```

字段说明：

- `id` 是 DB 主键，供 POST apply 使用；CLI 展示时只展示 `name` / `scope`。
- candidates 只返回当前 workspace desired state 中已经启用的资源；`selected` 为兼容旧 CLI 保留，当前响应恒为 `true`。
- `mtime` 来自 sandbox workspace config，用于后续 `ifUnmodifiedSince` 防并发覆盖。
- 不返回 `prompt`、`baseDir`、`sourcePath`、MCP headers/token/env 等敏感或内部字段。

候选项可见性：

- Skill:
  - 必须存在于当前 workspace 的 `workspaceSkill(enabled=true)`。
  - `scope=personal`：`userId = auth.userId` 且 `isDeleted=false`。
  - `scope=company`：`companyId = auth.companyId` 且 `isDeleted=false`。
  - `scope=system`：`isDeleted=false`。
- MCP:
  - 必须存在于当前 workspace 的 `workspaceMcp(enabled=true)`，其余同 Skill 的 scope 规则。
  - 对 system MCP 如有用户 credential，只用于 apply 阶段写 workspace，不在 candidates 响应中返回。

错误：

| HTTP | code | 场景 |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | query 非法。 |
| 401 | `SANDBOX_AUTH_FAILED` | sandbox 内部鉴权失败。 |
| 404 | `WORKSPACE_NOT_FOUND` | 当前 sandbox/user 下找不到 workspace。 |
| 500 | `INTERNAL_ERROR` | 其它异常。 |

### 2. `POST /api/sandbox/sync/pull`

用途：ae-cli 提交选择结果，由主应用把 DB 资源物化到当前 workspace。

鉴权：

- 同 `GET /api/sandbox/sync/pull/candidates`。

Body：

```json
{
  "workspacePath": "wqa13",
  "kind": "both",
  "skills": ["skill-cuid-1", "skill-cuid-2"],
  "mcp": ["mcp-cuid-1"],
  "mode": "merge",
  "ifUnmodifiedSince": "2026-06-17T10:00:00.000Z"
}
```

字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `workspacePath` | 是 | 当前 workspace 路径。 |
| `kind` | 否 | `skill` / `mcp` / `both`，默认根据 `skills` / `mcp` 推断。 |
| `skills` | 否 | Skill DB id 数组。 |
| `mcp` | 否 | MCP DB id 数组。 |
| `mode` | 否 | 只支持 `merge`，默认 `merge`。不支持 `replace`。 |
| `ifUnmodifiedSince` | 否 | 来自 candidates 响应的 `mtime`。传入时复用 sandbox config 的 stale 检测。 |

响应：

```json
{
  "workspace": {
    "id": "workspace-cuid",
    "path": "wqa13"
  },
  "mtime": "2026-06-17T10:01:00.000Z",
  "results": [
    {
      "kind": "skill",
      "id": "skill-cuid-1",
      "name": "ae-analysis",
      "scope": "system",
      "status": "synced"
    },
    {
      "kind": "mcp",
      "id": "mcp-cuid-1",
      "name": "te-mcp-analysis",
      "scope": "system",
      "status": "synced"
    }
  ]
}
```

错误：

| HTTP | code | 场景 |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | body 非法、`mode` 不支持、选择为空。 |
| 401 | `SANDBOX_AUTH_FAILED` | sandbox 内部鉴权失败。 |
| 404 | `WORKSPACE_NOT_FOUND` | workspace 不存在。 |
| 404 | `RESOURCE_NOT_FOUND` | 选择的 Skill/MCP 不存在或不可见。 |
| 409 | `STALE_MTIME` | `ifUnmodifiedSince` 与 sandbox workspace config mtime 冲突。返回 `currentMtime` 和 remote config。 |
| 502 | sandbox error code | 写 sandbox config 或 file API 失败。 |

Apply 语义：

- `merge` 模式下，最终 desired state = 当前 workspace 已启用项 + 本次选择项，按 DB id 去重。
- `kind=skill` 时保留现有 MCP desired state；`kind=mcp` 时保留现有 Skill desired state。
- 未选择的既有主应用管理资源保留，不删除。
- 更新 `workspace_skill` / `workspace_mcp`，然后调用 workspace provisioning 写入文件。
- 结果中只返回本次选择项的状态，不返回全部 desired state。
- 失败时整批失败更容易保持 DB 与文件一致；不建议部分成功后继续提交 DB transaction。

## 方案二：抽公共 workspace sync helper

为避免 `src/app/api/workspaces/[id]/config/route.ts` 和新增 sandbox pull route 复制一大段逻辑，建议抽出公共服务：

```ts
// src/lib/workspaces/config-apply.ts
export async function loadWorkspaceSyncCandidates(args): Promise<Candidates>;
export async function applyWorkspaceResourceSelection(args): Promise<ApplyResult>;
```

职责：

- 根据 `userId / companyId / sandboxId / workspacePath` 解析 workspace。
- 计算候选项和当前 selected 状态。
- 校验 Skill/MCP 可见性。
- 计算 merge 后最终 desired state。
- 调用 `applySandboxWorkspaceConfig()`。
- 事务更新 `workspace_skill` / `workspace_mcp`。
- 调用 `provisionWorkspaceConfigToSandbox()`。

现有浏览器 `POST /api/workspaces/[id]/config` 后续也可以改用该 helper，保证网页端与 ae-cli pull 入口一致。

## 方案三：Skill manifest v2

目标文件：

```text
/home/ta/workspaces/<workspace>/.claude/skills/.skill-manifest.json
```

文件结构：

```json
{
  "version": 2,
  "skills": [
    { "dirName": "ae-team", "scope": "system" },
    { "dirName": "requirement-collect", "scope": "company" },
    { "dirName": "my-skill1", "scope": "personal" }
  ]
}
```

写入规则：

- `provisionWorkspaceConfigToSandbox()` 每次按最终 desired skills 重写 v2 manifest。
- system / company / personal 都写入；缺失于该文件的 Skill 视为用户自行安装。
- `dirName` 继续作为 provisioning 管理边界，用于删除旧的 managed Skill。
- 不再写 `.claude/skills/<slug>/.te-agent-scope.json` 或 `.claude/skills/.te-agent-scope.json`。
- company Skill archive 中不再包含任何 `.te-agent-scope.json`。

实现建议：

- 删除或停用：
  - `writeSandboxSkillScopeMarker()`
  - `addSkillScopeMarkerToArchive()`
  - `shouldWriteSkillScopeMarker()` 的 per-skill 用法
- 新增：
  - `writeWorkspaceSkillManifestV2(sandboxTarget, skillsRoot, effectiveSkills)`
  - `buildWorkspaceSkillManifestEntries(skills): Array<{ dirName: string; scope: "system" | "company" | "personal" }>`
- Web UI 与 sandbox pull 物化都先计算最终 effective skills，再用同一批对象写 Skill 目录和 v2 manifest。

迁移注意：

- 已被 provisioning 重新物化的 Skill 目录会被 `rm + copy/write` 清掉旧 per-skill marker。
- 旧的未被管理目录即使残留 per-skill marker，后续 ae-cli 扫描不再读取它；是否清理不影响新逻辑。
- legacy array manifest 只作为旧 managed 目录清理来源，不用于恢复 scope；scope 必须来自本轮最终物化的 Skill 对象。

## 方案四：MCP `.mcp.json` 合并写入

当前 `provisionWorkspaceConfigToSandbox()` 会整体覆盖 workspace 根目录 `.mcp.json`。为了保护用户手动安装的 MCP，改为：

- 读取已有 `.mcp.json`。
- 保留 `mcpServers` 中缺失 `_scope` 的条目，表示用户手动安装。
- 对 `_scope` 为 `system` / `company` / `personal` 的条目，以最终 desired MCP 集合为准重写。
- 如果保留条目和主应用 desired MCP 同名，以主应用 desired MCP 覆盖。
- 写回 `.mcp.json` 时，主应用管理项都带 `_scope`。

示例：

```json
{
  "mcpServers": {
    "manual-mcp": {
      "type": "http",
      "url": "http://manual.example.com/mcp"
    },
    "te-mcp-analysis": {
      "type": "http",
      "url": "http://ta1:8993/mcp/analysis/http/analysis",
      "headers": {},
      "_scope": "system"
    }
  }
}
```

实现建议：

- 新增 helper：
  - `readWorkspaceMcpJson(sandboxTarget, workspaceRoot)`
  - `buildMergedWorkspaceMcpServers(existing, provisioned)`
  - `writeWorkspaceMcpJson(...)`
- `buildWorkspaceMcpServers()` 继续负责从 DB MCP 记录生成主应用管理项。
- `provisionWorkspaceConfigToSandbox()` 改为读取、merge、写回。

## 模型接口影响

当前模型切换需要 `models/select` 接口承接 DB 更新与 settings 推送。

- `GET /api/sandbox/models` 现有响应已经包含 `id / name / scope / modelId / baseUrl / isCurrent`。
- ae-cli 的单一 `model` 命令会只展示 `name / scope`，但仍可内部使用 `id` 和 `modelId` 判断当前模型。
- `POST /api/sandbox/models/select` 接收当前 `workspacePath` 与目标 `Model.id`，由 te-claude 更新 `Workspace.modelId` 并推送 settings。
- 删除旧 `POST /api/sandbox/models/credentials` 和 ae-cli 本地 settings writer 链路。
- 如后续要彻底解决 system 模型 provider `modelId` 重名导致 current 识别歧义，可新增 `currentModelId` query，或让 ae-cli 传 `model-id` header 解析出的 DB id；本次不是必要项。

## 预计改动文件

te-claude：

- `src/app/api/sandbox/sync/pull/candidates/route.ts`
- `src/app/api/sandbox/sync/pull/route.ts`
- `src/lib/workspaces/config-apply.ts`（新增公共 helper）
- `src/lib/workspaces/provisioning.ts`
- `src/tests/api/sandbox-sync-pull-candidates.test.ts`
- `src/tests/api/sandbox-sync-pull.test.ts`
- `src/tests/lib/workspaces/provisioning.test.ts`

可选后续整理：

- `src/app/api/workspaces/[id]/config/route.ts` 改用 `config-apply.ts`，降低重复。

## 测试计划

API 单测：

- candidates 返回 system/company/personal 可见 Skill/MCP。
- candidates 正确标记 workspace 已启用项 `selected=true`。
- candidates 不返回 prompt、baseDir、sourcePath、headers/token/env。
- pull apply 校验不可见 personal/company 资源失败。
- pull apply `merge` 保留现有 desired state。
- pull apply 未选择的既有主应用管理资源保留。
- pull apply `kind=skill` 不改 MCP，`kind=mcp` 不改 Skill。
- `ifUnmodifiedSince` 冲突返回 409 `STALE_MTIME`。

Provisioning 单测：

- 写 `.claude/skills/.skill-manifest.json` v2，内容为 `dirName + scope`。
- 不再写 per-skill 或 root `.te-agent-scope.json`。
- company Skill archive 不再包含 `.te-agent-scope.json`。
- `.skill-manifest.json` 仍只清理旧 managed Skill，不删除用户手动目录。
- `.mcp.json` merge 保留缺失 `_scope` 的手动 MCP。
- `.mcp.json` 中 scoped MCP 以 final desired state 为准重写。

回归：

- 现有 `POST /api/sandbox/sync/push` personal Skill/MCP 测试不变。
- 现有 workspace config 保存路径仍能写 Skill package、manifest、`.mcp.json`。

## 风险与决策点

- 是否支持 `replace`：本期不支持。`replace` 会删除用户不再选择的主应用 managed 资源，误操作风险更高。
- `.mcp.json` merge 是行为变化：以前 UI 保存会覆盖整个文件，改后会保留手动 MCP。这符合 CLI 同步需求，但需要确认产品预期。
- `.skill-manifest.json` 若被用户手动编辑错误，ae-cli push 侧按缺失 manifest scope 处理；主应用 provisioning 每次会重写 managed 部分。
- 新 pull 接口应整批事务化，避免 DB desired state 已更新但文件物化失败。
