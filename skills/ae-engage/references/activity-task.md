# engage-activity task

> Capability ids: `engage-activity.task.{get,copy}` · Domain: `engage`.
>
> Temporarily disabled: `task create` / `task update` (command registration + skill guidance).

运营活动 - 独立任务（活动下不属于主题的任务）。`copy` 读取源任务详情、改名后重新创建（无后端复制 API）。

## Commands

```bash
# Get a standalone task detail
ae-cli engage-activity task get --project-id <project_id> --task-id <task_id>

# Copy a standalone task (loads detail, renames, re-creates)
ae-cli engage-activity task copy --project-id <project_id> --task-id <task_id> [--new-name <name>]
```

<!-- Temporarily disabled: task create / task update
```bash
# Create a standalone task under an activity (webhook + existing cluster)
ae-cli engage-activity task create --project-id <project_id> \
  --payload '{ ... }'

# Update a standalone task
ae-cli engage-activity task update --project-id <project_id> \
  --payload '{"taskId":"task-1","taskName":"t1", ...}'
```
-->

## Parameters

| Command | Required flags | Notes |
|---|---|---|
| get | `--project-id`, `--task-id` | read. |
| copy | `--project-id`, `--task-id` | `--new-name` optional (default source name + `_copy`). |

<!-- Temporarily disabled
| create | `--project-id`, `--payload` | payload = `OperationTaskOpDTO`; set `activityId`, leave `topicId` empty. |
| update | `--project-id`, `--payload` | payload = `OperationTaskOpDTO` including `taskId`. |
-->

## Output

- `get`: `data.task`.
- `copy`: `data.task_id`, optional `data.trigger_time_stale` (true when source schedule-single time is already past).

## Payload notes (for copy / detail shape)

### Channel content

- `channelType` `1` = webhook, `2` = app_push, `3` = client_push, `4` = wechat, `5` = dou_yin`.
- `groupContentList[].contentList[].content` must be a JSON **array string**.
- **TEXT (rich text) params** must include both `value` and `config` (Slate.js JSON **string**). If `config` is missing, Hermes copy auto-fills  
  `config = [{"type":"paragraph","children":[{"text":"<value>"}]}]` as a JSON string.

### Audience (`targetClusterType`)

| Value | Required | Notes |
|---|---|---|
| `2` (existed) | `clusterKey` | From `analysis user-cluster list/get`. |
| `1` (custom) | `qp` | JSON object string. |
| `3` (all) | — | Do not pass `clusterKey` or `qp`. |

## Decision Rules

- Discover a real `task_id` via `get`/activity `info-list` first; never invent IDs.
- `copy` duplicates the editable task config (not runtime/trigger state).
- `copy` saves via **draft** add (`draft=true`), so a past schedule-single `triggerTime` is allowed; output may include `trigger_time_stale=true`. Update the time before `approval submit`.
- Standalone tasks must **not** include `topicId`; topic tasks use `engage-activity topic copy` (topic create/update are temporarily disabled).

## Copy errors

`copy` = get detail → rename → draft `add` (no dedicated copy API). Prefer actionable codes over `INVALID_CAPABILITY_REQUEST`:

| code | when |
|---|---|
| `TASK_NOT_FOUND` | source `task_id` missing |
| `TASK_PROJECT_MISMATCH` | task exists but not in `--project-id` |
| `TOPIC_TASK_FORBIDDEN` | source has `topicId` (use `topic copy`) |
| `ACTIVITY_ID_REQUIRED` | source has no `activityId` (not a standalone activity task) |
| `TRIGGER_TIME_REQUIRED` | schedule-single missing `triggerTime` |
| `CHANNEL_NOT_FOUND` | source channel missing / type mismatch |
| `TASK_COUNT_LIMIT` | project task count limit exceeded |
| `RCC_SERVER_REQUIRED` | client push (`channelType=3`) but RCC server is not installed |

Past `triggerTime` no longer fails copy; check `data.trigger_time_stale` and fix before approval. Unmapped domain `PARAMETER_ERROR` may still return `INVALID_CAPABILITY_REQUEST` with a readable fallback message.
