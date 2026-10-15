# 工作空间事项 CLI reference

本 reference 描述已实现命令，不重复维护权限和数据业务规则。[主 Spec](https://gitlab.thinkingdata.cn/te-ai/te-claude/-/blob/feat/workspace-issues-convergence/docs/specs/2026-09-17-workspace-issues-convergence/spec.md)。

Transition status: transitional
Owning module: te-claude / src/lib/agent-space-things
Current transport: TE REST /api/cli/things/v1; cli-token
Gateway target: Capability Gateway things domain (TBD)
Review after: 2026-10-14
Exit condition: Gateway 提供等价空间校验、幂等、权限、分页和会话关联能力后迁移 transport。

事项尚未接入 Gateway。类型化 flags、JSON/stdin、正文脱敏 dry-run、默认值和目标一致性检查提供必要的 Transitional 入口。

## 公共参数

`--agent-space-id` 在会话外必填，会话内须与当前会话空间一致。`--id` 为事项 ID。写请求用 `--command-id <uuid>` 支持原样重试，省略时生成；编辑、归档和恢复须带 `--expected-version`。分页为 `--limit 1..100 --cursor <opaque>`，默认 50。通用 `--format json` 输出结构化结果；`--dry-run` 不请求业务 API、不读取文件/stdin、不泄露正文。主事项解除、删除资产关联或协作者属于 high-risk-write，已获授权的脚本使用 `--yes`。

## 字段和记录

事项字段仅为 title、description、tags、status、assigneeId、collaboratorIds。新建标题 1–200 字符、描述 1–10000 字符必填。活跃状态 `open | paused | done`，归档和恢复使用独立动作。个人或共享空间创建时省略负责人均默认当前用户；更新省略保持不变，`null` 被拒绝。`--tags '["标签"]'`、`--collaborator-ids '["member-id"]'`，空数组清空。`--assignee-id` 只能指定有效空间成员。

新建/更新可用 `--file fields.json` 或 `--stdin` 读取 camelCase 字段对象，显式 flags 覆盖同名字段。失效的验收、优先级、分组、截止时间、进展快照、阻塞、下一步、父子事项字段被拒绝；group 和 draft 命令已移除。

| 命令                      | 参数和结果                                                                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `list`                    | `--query --status open\|paused\|done\|archived --assignee-id`；返回 items/nextCursor                                                                                                                               |
| `get`                     | `--id`；字段、权限、version、协作者及 latestProgress                                                                                                                                                               |
| `create`                  | `--title --description` 和可选业务字段                                                                                                                                                                             |
| `update`                  | `--id --expected-version` 和业务字段                                                                                                                                                                               |
| `archive/restore`         | `--id --expected-version`                                                                                                                                                                                          |
| `delete`                  | `--id --expected-version --confirm-delete --yes`；不可恢复，清理事项及所有关联，保留会话、消息、历史运行快照与空间文件；活动运行冲突返回 THING_RUNNING_CONFLICT                                                    |
| `members/options`         | 分页查询成员/事项候选；options 支持 `--query`                                                                                                                                                                      |
| `collaborator add/remove` | `--id --user-id`                                                                                                                                                                                                   |
| `entry list`              | `--id` 和分页，按 createdAt、id 倒序                                                                                                                                                                               |
| `entry append`            | `--id --type url\|note\|progress`；省略时服务端自动识别链接或备注，可选 `--title`；`--content`、`--file`、`--stdin` 三选一                                                                                         |
| `entry update`            | `--id --entry-id --expected-updated-at`；至少一个修改字段：`--title`、`--clear-title`、`--type note\|url\|progress` 或正文输入；可只改标题或类型，title 与 clear-title 互斥                                        |
| `from-message`            | `--conversation-id --message-id` 和正文；`--id` 追加或 `--title` 新建二选一；仅 `--id` 追加模式可选 `--entry-type note\|progress`，默认 note；`--title` 新建模式传入会报错，新建以正文作为描述，不生成额外进展记录 |

```bash
ae-cli things create --agent-space-id <space-id> --title '验收事项' --description '验证成员操作与权限' --format json
ae-cli things entry append --agent-space-id <space-id> --id <thing-id> --type progress --content '完成接口联调' --format json
```

## 会话

| 命令                       | 参数和含义                                            |
| -------------------------- | ----------------------------------------------------- |
| `conversation get`         | `--conversation-id`；读取可访问会话快照及当前模型投影 |
| `conversation primary`     | `--conversation-id`；读取主事项关联                   |
| `conversation bind/unbind` | `--conversation-id`；bind 额外需要 `--id`             |
| `conversations`            | `--id` 和分页；关联会话                               |
| `link-conversation`        | `--id --conversation-id`；追加引用，不替换主事项      |

关联不授予会话访问权；不能读取其他用户私有会话。会话排队、运行或等待交互时允许绑定/解绑，立即更新归属但不修改已受理 Run 的冻结上下文，下一次新 Run 生效。绑定后用 `conversation primary` 回读，不使用普通引用代替主事项绑定。

## 进展与汇总

阶段成果写 `entry append --type progress`；交接写 `--type note`，用标题和正文说明已完成内容、证据、下一步。人员关系使用负责人和协作者，不需要认领。

`+detail --id` 收集事项、全部可读 entries/assets 和实时 context。`+digest` 支持负责人筛选或 `--thing-ids id-a,id-b`，不能同时指定两种范围；可选 `--from --to --time-zone`，时间须带时区，窗口左闭右开。默认分别分页采集活动与归档事项，跨集合按 ID 去重。返回 open/paused/done 三态 counts、archivedCount、items 和采集边界。latestProgress 使用服务端最新 progress 记录；effectiveProgressCount 只统计 progress 记录，不代表模型已核实内容；status 时间线的 before/after 用于重建基线。

每链最多 100 页/10000 条。异常、重复游标、空页继续或达到上限标 truncated；重复 ID 不解释为完整。报告核对 fetchedCount、truncated、consistency、collectedAt。non_transactional 不是事务快照；changed_during_collection 或截断时 baseline 为 null。counts 是采集时状态，不能当周期末状态。未记录不等于未推进，附件可用不表示已读取或已验收。

## 错误与恢复

THING_INVALID_INPUT 修正参数；THING_FORBIDDEN/THING_NOT_FOUND 不推断不可见资源；THING_READ_ONLY 表示资源只读：归档事项需恢复后编辑，不可用空间需先恢复空间可用性，操作日志不可编辑、应追加新记录；THING_VERSION_CONFLICT/记录时间戳冲突重读并比较，不能只换版本号；THING_COMMAND_CONFLICT 表示同 UUID 不同请求；THING_RATE_LIMITED 等待后用原 commandId 重试。主事项绑定不因运行中而拒绝；永久删除仍保留 THING_RUNNING_CONFLICT 活动运行保护。

## 文件与交付物（阶段4）

`asset available` 分页合并当前空间实际文件和登记元数据；已登记项返回稳定 `assetId`，未登记项 assetId=null、path 为相对路径。`asset link` 接受 `--asset-id` 或 `--path` 二选一，路径关联时校验、登记并关联，列表读取不登记。`asset list --id` 分页读取事项关联。核对 availability 及 scanStatus/scanReason；部分扫描不代表目录完整。

```bash
ae-cli things asset available --agent-space-id <space-id> --limit 100 --format json
ae-cli things asset list --agent-space-id <space-id> --id <thing-id> --format json
ae-cli things asset link --agent-space-id <space-id> --id <thing-id> --asset-id <asset-id> --role attachment --command-id <uuid> --format json
ae-cli things asset publish --id <thing-id> --conversation-id <conversation-id> --artifact-id <artifact-id> --confirm-share --command-id <uuid> --format json
ae-cli things asset publish --id <thing-id> --conversation-id <conversation-id> --run-id <run-id> --source-path <absolute-delivered-file> --confirm-share --command-id <uuid> --format json
ae-cli things asset link --agent-space-id <space-id> --id <thing-id> --path <space-relative-path> --command-id <uuid> --format json
ae-cli things asset unlink --agent-space-id <space-id> --id <thing-id> --asset-id <asset-id> --command-id <uuid> --format json
```

- `role` 仅接受 attachment（默认）；deliverable 在正常执行与 dry-run 的参数校验阶段均被拒绝。同一事项与资产只有一个关联。
- 发布传 `--confirm-share`，授权边界见 Skill。来源为 artifact-id、file-token、source-path 三选一；source-path 必须同时带 run-id，服务端验证执行归属、真实沙箱文件及会话 artifacts 目录边界。发布到空间后所有成员可见。
- 发布使用既有会话产物发布器。发布回执与资产元数据同事务，使用原 commandId 重试不会再复制。返回 `linked:false, assetId, code:THING_ASSET_LINK_FAILED` 时文件已经共享，用 asset link 只补关联；不重复发布、不声称已交付。
- 解除关联不删除文件、不恢复私有；被引用的资产删除返回 `AGENT_SPACE_ASSET_REFERENCED`，须先解除关联。
- `THING_ASSET_UNAVAILABLE` 表示文件缺失或不能验证，`THING_ASSET_PUBLISH_FAILED` 表示发布未完成。文件引用只冻结 ID 和引用文本，不代表不可变正文。上下文最多选取前10份引用，超出会明确提示，完整文件列表按需读取。

## 执行快照与实时上下文

```bash
# 本次执行使用的冻结事实；参数取自本轮绑定声明
ae-cli things context --agent-space-id <space-id> --id <thing-id> --run-id <run-id> --format json
# 显式读取当前事实；不带 run-id 的既有行为保持不变
ae-cli things context --agent-space-id <space-id> --id <thing-id> --format json
```

带 `--run-id` 时请求现有 GET context 的 `runId` 参数，返回保存的快照及 `source: {kind: "run_snapshot", runId}`、`currentFiles`、`fileReferencePolicy`。`thing.version`/`capturedAt` 为受理时版本/时间，`currentFiles` 为当前可用路径；文件正文不保证版本冻结，使用前读取。原 `notices` 保留。无参数时返回原实时上下文；不从环境变量自动选择执行，`+detail`/`+digest` 也继续实时采集。

执行、会话、空间及快照中的原事项必须匹配，且操作者仍有访问权限；执行 ID 不是授权。会话当前主事项可以已切换或解除，本轮等待/恢复/重试仍读取原快照。`THING_TARGET_CONFLICT` 表示快照与请求目标不一致，应重新确认目标；`THING_CONTEXT_UNAVAILABLE` 表示快照缺失或损坏，应重新发起执行，不自动降级实时读取。`THING_NOT_FOUND` 不区分不存在和不可见。归档或不可用文件沿用 `THING_READ_ONLY` / `THING_ASSET_UNAVAILABLE`。

切换或解绑保留历史和 provider session，只改变会话归属及下一新 Run 默认目标；不是遗忘或撤权。普通聊天无需查事项，具体事项工作先读快照；当前状态及写入前版本需额外显式实时读取。工具失败时披露缺失。**对已有事项的修改**只按用户明确授权或确认执行，不能因为历史关联过就默认回写；创建新事项不受此限，按 [SKILL 的创建信号](../SKILL.md#何时创建事项)自主判断。

维护模块沿用 Things Transitional transport；新增参数不创建同义命令或独立 Gateway 入口，迁移出口沿用本 reference 的收录记录。跨仓实施契约见 te-claude `docs/specs/2026-09-17-workspace-issues-convergence/spec.md`；应用与 CLI/Skill 配套交付。
