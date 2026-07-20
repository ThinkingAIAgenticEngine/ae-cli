# engage-activity topic

> Capability ids: `engage-activity.topic.{remove-task,delete,get,copy}` · Domain: `engage`.
>
> Temporarily disabled: `topic create` / `topic update` (command registration + skill guidance).

Activity topics and tasks under a topic. `copy` loads the source topic, renames it, and re-creates (no dedicated backend copy API).

## Commands

```bash
# Remove a task from its topic (high-risk)
ae-cli engage-activity topic remove-task --project-id <project_id> --task-id <task_id> --yes

# Delete a topic (high-risk)
ae-cli engage-activity topic delete --project-id <project_id> --topic-id <topic_id> --yes

# Get a topic detail
ae-cli engage-activity topic get --project-id <project_id> --topic-id <topic_id>

# Copy a topic (loads detail, renames, re-creates)
ae-cli engage-activity topic copy --project-id <project_id> --topic-id <topic_id> [--new-name <name>]
```

<!-- Temporarily disabled: topic create / topic update
```bash
# Create a topic and its tasks under an activity
ae-cli engage-activity topic create --project-id <project_id> --payload '{ ... }'

# Update a topic and its task relations
ae-cli engage-activity topic update --project-id <project_id> --payload '{"topicId":"topic-1", ...}'
```
-->

## Parameters

| Command | Required flags | Notes |
|---|---|---|
| remove-task | `--project-id`, `--task-id` | high-risk; requires `--yes`; no dry-run. Only tasks with a non-empty `topicId`. |
| delete | `--project-id`, `--topic-id` | high-risk; requires `--yes`; no dry-run. |
| get | `--project-id`, `--topic-id` | read. |
| copy | `--project-id`, `--topic-id` | `--new-name` optional (default source name + `_copy`). |

<!-- Temporarily disabled
| create | `--project-id`, `--payload` | payload = `TopicAddDTO` (camelCase). |
| update | `--project-id`, `--payload` | payload = `TopicModifyReq` (`topicId` + fields + task lists). |
-->

## Notes for get / copy

TEXT (rich text) params inside `groupContentList[].contentList[].content` need both `value` and Slate `config` (JSON string). If `config` is omitted, Hermes copy auto-fills  
`[{"type":"paragraph","children":[{"text":"<value>"}]}]`. See `activity-task.md` Channel content.

Topic-level audience uses `topicClusterKey` / `topicQp`; do **not** pass task-level `clusterKey` at topic root.

## Output

- `get`: `data.topic` (includes `topicClusterKey` for topic audience).
- `remove-task` / `delete` / `copy`: `data.success`.
- `copy` may include `data.trigger_time_stale=true` when source schedule-single time is already past.

## Decision Rules

- `remove-task` and `delete` are `high-risk-write` — require `--yes`, no dry-run.
- `remove-task` only deletes **topic tasks** (`topicId` present). Standalone tasks → use `engage-task task delete`.
- `copy` duplicates the editable topic config and its tasks (not runtime/approval state).
- `copy` saves via **draft** add (`isDraft=true`), so a past schedule-single `triggerTime` is allowed; output may include `trigger_time_stale=true`. Update the time before `approval submit`.
- Prefer `topic get` as a template when inspecting channel/content fields.

## Copy errors

`copy` = get topic detail → rename → draft `addTopicAndTask` (no dedicated copy API). Prefer actionable codes over `INVALID_CAPABILITY_REQUEST` / mismatched i18n text like "Campaign does not exist.":

| code | when |
|---|---|
| `TOPIC_NOT_FOUND` | source `topic_id` missing |
| `TOPIC_PROJECT_MISMATCH` | topic exists but not in `--project-id` |
| `ACTIVITY_ID_REQUIRED` | source topic detail has no `activityId` |
| `ACTIVITY_NOT_FOUND` | parent activity missing / deleted / wrong project |
| `TOPIC_TASKS_REQUIRED` | source topic has no tasks |
| `ACTIVITY_STATUS_INVALID` | parent activity is approving/working/complete |
| `TOPIC_COUNT_LIMIT` | activity topic count limit exceeded |
| `CHANNEL_NOT_FOUND` | source channel missing / type mismatch |
| `TASK_COUNT_LIMIT` | project task count limit exceeded |
| `RCC_SERVER_REQUIRED` | client push (`channelType=3`) but RCC server is not installed |
| `TRIGGER_TIME_REQUIRED` | schedule-single missing `triggerTime` |

Past `triggerTime` no longer fails copy; check `data.trigger_time_stale` and fix before approval.

## remove-task errors

| code | when |
|---|---|
| `TASK_NOT_FOUND` | `--task-id` missing |
| `TASK_PROJECT_MISMATCH` | task exists but not in `--project-id` |
| `NOT_TOPIC_TASK` | task has no `topicId` (standalone); use `engage-task task delete` |
| `TASK_WORKING` | topic task `mappingStatus=working`; pause/end first |
| `TASK_APPROVING` | topic task pending approval; withdraw first |
