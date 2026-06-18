# ae-cli model / sync 交互与双向同步计划

状态：需求已确认，待编码。

## 背景

当前 `ae-cli model list` 直接表格展示 `name / scope / modelId / baseUrl / id` 等字段，`ae-cli model set <id>` 需要用户从列表中复制 Model.id 后再执行切换。确认后的目标形态是不再保留 `model list` / `model set` 子命令，只保留 `ae-cli model` 一个交互命令：进入后展示模型列表，选择后切换，不选择可按 `q` 退出。`ae-cli sync` 当前只支持从当前工作空间向 te-claude 主应用推送 personal Skill / MCP，Skill 扫描需要使用 `.claude/skills/.skill-manifest.json` v2 中的 `scope` 判断是否跳过，MCP 扫描使用 workspace `.mcp.json` 的 `_scope` 过滤 system/company。

这次改造目标是：

- 简化模型列表与切换交互，避免用户复制内部 id。
- 将模型能力收敛为单一 `ae-cli model` 命令：展示模型列表、单选切换、`q` 退出。
- 将 Skill scope 元数据统一收敛到 `.claude/skills/.skill-manifest.json` v2，不再设计或生成 `.te-agent-scope.json`。
- `ae-cli sync` 增加同步方向选择：工作空间 -> 主应用、主应用 -> 工作空间。
- 主应用 -> 工作空间时支持 system / company / personal 标记的 Skill 与 MCP 刷新。

## 当前代码事实

- `src/commands/model/index.ts`
  - `model list` 通过 `getSandboxModels()` 拉取主应用模型列表。
  - 当前模型通过 `settings.json` 顶层 `model` 与返回的 `modelId` 对比推断。
  - 旧 `model set <id>` 调 `/api/sandbox/models/credentials` 再写 `settings.json` 的链路已废弃；当前 `ae-cli model` 选择后调用 `/api/sandbox/models/select`。
- `src/core/multiselect.ts`
  - 已有 `promptMultiselect` 和 `promptSingleSelect`。
  - `promptMultiselect` 支持 `space` 勾选、预选、分组。
  - `promptSingleSelect` 目前是方向键 + enter，不支持 `space` 选择态。
- `src/commands/sync/index.ts`
  - 当前先选资源类型，再扫描本地，再 `POST /api/sandbox/sync/push`。
  - `sync/push` 当前只接受 `scope: "personal"`。
- `src/commands/sync/scanners.ts`
  - Skill 只扫描当前工作空间 `.claude/skills/<slug>/SKILL.md`。
  - MCP 扫描当前工作空间 `.mcp.json`、当前工作空间 `.claude/.claude.json`、全局 `~/.claude.json`。
- te-claude 当前已有 `POST /api/sandbox/sync/push`，没有现成的 `pull` 接口。
- te-claude workspace provisioning 已有主应用写工作空间的能力，且使用 `.claude/skills/.skill-manifest.json` 作为清理边界。

## 已确认决策

1. `ae-cli mode list` 是笔误，实际为 `ae-cli model list`。
2. 模型命令不保留 `list` / `set` 子命令，目标形态只保留 `ae-cli model`。
3. `ae-cli model` 展示模型列表；用户选择后切换模型；用户不想操作时按 `q` 退出。
4. 模型切换成功文案使用 `已切换为 <name>`。
5. Skill scope 统一写入 `.skill-manifest.json` v2 的 `skills[].scope`。
6. 主应用 -> 工作空间同步时，未选择的既有主应用管理资源保留。
7. 主应用 -> 工作空间同步会更新 te-claude desired state。
8. 允许该同步修改 te-claude 项目中的配套接口与 provisioning 逻辑。

## 方案一：模型命令优化

### `ae-cli model`

只保留一个模型命令：

```bash
ae-cli model
```

执行后直接展示模型列表，用户通过单选交互切换模型。按 `q` / `Esc` / `Ctrl+C` 退出，不执行任何切换。

列表只展示：

- 当前标记
- `name`
- `scope`

不再展示：

- `id`
- provider `modelId`
- `baseUrl`
- API key 或任何凭证信息

当前模型识别建议调整为：

- 若 `settings.json` 的 `ANTHROPIC_CUSTOM_HEADERS` 中存在 `model-id`，优先按该值匹配 `Model.id`。
- 若没有 `model-id`，再用顶层 `model` / `ANTHROPIC_MODEL` 与 system 模型的 provider `modelId` 匹配。
- 如果匹配不到，列表仍展示，但不打当前标记。

原因：personal/company 模型此前已经要求把 Model.id 写入 `model-id` header；系统模型不写 header，只能回退到 provider modelId。

交互方式：

- 拉取可见模型列表。
- 只展示 `name` 和 `scope`。
- 单选，不支持全选。
- 当前模型默认高亮并预选。
- `space` 选择当前行，`enter` 确认。
- `q` / `Esc` / `Ctrl+C` 取消退出。
- 选择当前已经在用的模型时，直接提示 `当前已使用该模型`，不再调用 credentials 和写 settings，避免不必要操作。
- 切换成功只输出 `已切换为 <name>`，不输出 settings 路径、API key、baseUrl、model-id header 等细节。

实现建议：

- 在 `src/core/multiselect.ts` 新增 `promptSingleCheckboxSelect` 或扩展 `promptSingleSelect` 支持 `space` 与 `preselected`。
- `ae-cli model` 使用新单选组件。
- 移除 `model list` / `model set` 子命令注册。
- 抽出 `readCurrentModelSelection()` helper，集中处理当前模型识别。
- 选中某个模型后，用 DB `Model.id` 与当前 `workspacePath` 调 `POST /api/sandbox/models/select`，由 te-claude 更新 `Workspace.modelId` 并推送 settings。

## 方案二：Skill manifest v2 改造

目标 manifest 结构：

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

已确认：不再维护独立 scope marker。`dirName` 是真实落盘目录名，也是清理旧 managed Skill 的 key；`scope` 来自本轮最终物化的同一个 Skill 对象。

理由：

- `.skill-manifest.json` 原本就是 workspace provisioning 的管理边界，scope 放入同一文件后不会出现目录内容与独立 scope 文件不一致。
- `ae-cli sync` push 成功后写 v2 manifest，scope 固定为 `personal`。
- 主应用 -> 工作空间 pull 物化后，也由 te-claude 写 v2 manifest；下一次 `ae-cli sync` 扫描即可按该 manifest 过滤 company/system。

扫描规则计划改为：

- 只读取 `.claude/skills/.skill-manifest.json` v2 对象作为 scope 来源。
- v2 manifest 中 scope 为 `system` / `company` 的 Skill，工作空间 -> 主应用时跳过。
- v2 manifest 中 scope 为 `personal` 的 Skill，工作空间 -> 主应用时允许同步。
- v2 manifest 中不存在的 Skill，视为用户自行安装，允许同步。
- 旧数组 manifest 或 JSON 损坏时，不作为 scope 来源，不阻断扫描。

te-claude 配套建议：

- 后续主应用向工作空间写入 Skill 时，直接维护 `.claude/skills/.skill-manifest.json` v2。
- 不再写每个 Skill 目录下或 skills 根目录下的 `.te-agent-scope.json`。
- 旧数组 manifest 只作为清理旧 managed 目录的兼容输入，不用于恢复 scope。

## 方案三：sync 增加同步方向

`ae-cli sync` 交互顺序建议改为：

1. 选择同步方向
   - 工作空间 -> 主应用
   - 主应用 -> 工作空间
2. 选择资源类型
   - Skills
   - MCPs
   - Skills + MCPs
3. 根据方向进入对应扫描/候选列表。

### 工作空间 -> 主应用

保持当前 push 语义：

- Skill：只允许 personal 或 manifest 中缺失的用户自装 Skill。
- MCP：
  - `.mcp.json` 中 `_scope: "system"` / `"company"` 跳过。
  - `.mcp.json` 中 `_scope: "personal"` 或缺失 `_scope` 允许同步。
  - workspace `.claude/.claude.json` 和全局 `~/.claude.json` 中当前 project 的 MCP 仍视为用户安装，允许同步。
- 成功 push Skill 后继续复制完整 package 到主应用返回的 `skillTargetRoot/<slug>/`。
- 成功 push Skill 后继续更新 workspace `.claude/skills/.skill-manifest.json`，避免后续 workspace provisioning 清理掉该 Skill。

### 主应用 -> 工作空间

这一方向当前需要 te-claude 增加接口；不建议 ae-cli 直接猜主应用内部目录。

建议接口拆分：

- `GET /api/sandbox/sync/pull/candidates?workspacePath=<path>&kind=skill|mcp|both`
  - 只返回当前 workspace 配置中已选择的 system / company / personal 资源。
  - Skill 返回 `id / name / scope / selected`。
  - MCP 返回 `id / name / scope / selected`。
  - CLI 只展示 `selected=true` 的 `name` 和 `scope`，并默认预选全部候选。
- `POST /api/sandbox/sync/pull`
  - 入参：`workspacePath`、`kind`、选中的 skill ids / mcp ids。
  - 由 te-claude 复用现有 workspace provisioning，把选中资源写入当前 workspace。
  - 响应每项 `synced / failed`。

主应用 -> 工作空间的文件写入建议：

- Skill 写到 `.claude/skills/<slug>/`，完整 package 包括 `SKILL.md`、`references/`、`assets/`、`scripts/`、隐藏文件/目录。
- 写 `.claude/skills/.skill-manifest.json` v2，记录主应用物化管理过的 Skill 目录和 scope。
- MCP 合并写 workspace 根目录 `.mcp.json`：
  - system/company/personal 主应用管理项写 `_scope`。
  - 保留用户手动安装且缺失 `_scope` 的 MCP，避免覆盖用户自己加的配置。
  - 对同名 MCP，如果用户选择了主应用资源，以主应用资源覆盖该 key。

清理策略建议：

- 默认只 upsert/refresh 用户本次选择的资源，不删除未选择资源。
- 未选择的既有主应用管理资源保留，不做删除。
- 如后续要做“以主应用选择为准覆盖 workspace”，需另行设计显式 `--replace` 和二次确认，避免误删用户自装 Skill/MCP。

Desired state：

- 主应用 -> 工作空间同步必须更新 te-claude 的 `workspace_skill` / `workspace_mcp` desired state。
- 只物化文件但不更新 desired state 的方案废弃。

## te-claude 接口结论

- `主应用 -> 工作空间` 仍需要 te-claude 新增 pull candidates / pull apply 接口。
- `ae-cli model` 保留 `GET /api/sandbox/models` 作为候选列表接口。
- `ae-cli model` 选择后使用 `POST /api/sandbox/models/select`；旧 `POST /api/sandbox/models/credentials` 已无现行调用方，应随本地 writer 链路删除。

## 预计改动文件

te-cli：

- `src/core/multiselect.ts`
- `src/commands/model/index.ts`
- `src/commands/sync/index.ts`
- `src/commands/sync/scanners.ts`
- `src/commands/sync/local-copy.ts`
- `src/commands/sync/skill-manifest.ts`
- `src/core/te-agent-client.ts`
- `tests/model-*.test.ts`
- `tests/sync-*.test.ts`

te-claude：

- 新增 sandbox sync pull candidates/apply API。
- workspace provisioning 改为 `.skill-manifest.json` v2。
- MCP `.mcp.json` 写入/合并策略按新规则调整。
- 增加 API 与 provisioning 单测。

## 验证计划

te-cli：

- `npm run build`
- 新增/更新 model 交互 helper 测试。
- `npx tsx tests/model-index.test.ts`
- `npx tsx tests/te-agent-credentials.test.ts`
- `npx tsx tests/sync-scanners.test.ts`
- `npx tsx tests/sync-local-copy.test.ts`

te-claude：

- workspace provisioning 单测覆盖 `.skill-manifest.json` v2。
- sandbox sync pull API 单测覆盖 system/company/personal Skill/MCP。
- MCP merge 单测覆盖保留用户自装缺失 `_scope` 的 MCP。

## 风险与边界

- 如果只改 te-cli，无法完成“主应用 -> 工作空间”完整能力，因为候选资源与完整 package 来源在 te-claude。
- 当前模型“系统模型”的 current 识别只能基于 provider `modelId` 回退，若多个 system 模型共享同一 provider `modelId`，会有歧义。可由 te-claude API 后续支持按 settings 回传 current 标记来彻底解决。
- `.mcp.json` 整体覆盖风险较高，pull 方向建议使用 merge 策略。
- `.skill-manifest.json` 损坏时，如果直接阻断 sync 会影响用户自装 Skill 同步；建议按缺失 manifest scope 处理，不阻断扫描。
