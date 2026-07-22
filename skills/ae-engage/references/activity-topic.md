# engage-activity topic

> Capability ids: `engage-activity.topic.{create,update,remove-task,delete,get,copy}` · Domain: `engage`.

Activity topics and tasks under a topic. `copy` loads the source topic, renames it, and re-creates (no dedicated backend copy API).

## Commands

```bash
# Create a topic and its tasks under an activity
ae-cli engage-activity topic create --project-id <project_id> --payload '{ ... }'

# Update a topic and its task relations
ae-cli engage-activity topic update --project-id <project_id> --payload '{"topicId":"topic-1", ...}'

# Remove a task from its topic (high-risk)
ae-cli engage-activity topic remove-task --project-id <project_id> --task-id <task_id> --yes

# Delete a topic (high-risk)
ae-cli engage-activity topic delete --project-id <project_id> --topic-id <topic_id> --yes

# Get a topic detail
ae-cli engage-activity topic get --project-id <project_id> --topic-id <topic_id>

# Copy a topic (loads detail, renames, re-creates)
ae-cli engage-activity topic copy --project-id <project_id> --topic-id <topic_id> [--new-name <name>]
```

## Parameters

| Command | Required flags | Notes |
|---|---|---|
| create | `--project-id`, `--payload` | payload = `TopicAddDTO` (camelCase). Prefer `triggerType` `0` (schedule single) or `1` (schedule repeat); activity topics do not use manual (`2`). |
| update | `--project-id`, `--payload` | payload = `TopicModifyReq` (`topicId` + fields + task lists). |
| remove-task | `--project-id`, `--task-id` | high-risk; requires `--yes`; no dry-run. Only tasks with a non-empty `topicId`. |
| delete | `--project-id`, `--topic-id` | high-risk; requires `--yes`; no dry-run. |
| get | `--project-id`, `--topic-id` | read. |
| copy | `--project-id`, `--topic-id` | `--new-name` optional (default source name + `_copy`). |

## Notes for get / copy / create

TEXT (rich text) params inside `groupContentList[].contentList[].content` need both `value` and Slate `config` (JSON string). If `config` is omitted, Hermes copy/create auto-fills  
`[{"type":"paragraph","children":[{"text":"<value>"}]}]`. See `activity-task.md` Channel content.

Topic-level audience uses `topicClusterKey` / `topicQp`; do **not** pass task-level `clusterKey` at topic root.

### Audience (`targetClusterType`)

| Value | Required | Notes |
|---|---|---|
| `1` (custom) | `topicQp` | Valid condition JSON object string (not `{}`). |
| `2` (existed) | `topicClusterKey` | From an existing user cluster. |
| `3` (all) | — | **Not supported for activity topics** → `TOPIC_TARGET_CLUSTER_TYPE_UNSUPPORTED`. Use standalone `engage-activity task create` for all-users. |

### Trigger (`triggerType`)

| Value | Required | Notes |
|---|---|---|
| `0` (schedule single) | `triggerTime` (`yyyy-MM-dd HH:mm`, future) | Preferred for CLI create. |
| `1` (schedule repeat) | `startDate`, `endDate`, `triggerCrontab` | |
| `2` (manual) | — | **Not supported for activity topics** (UI only offers 0/1). Using it without `endDate` causes `CAPABILITY_EXECUTION_FAILED`. |

## Output

- `get`: `data.topic` (includes `topicClusterKey` for topic audience).
- `create` / `update` / `remove-task` / `delete` / `copy`: `data.success`.
- `copy` may include `data.trigger_time_stale=true` when source schedule-single time is already past.

## Decision Rules

- `remove-task` and `delete` are `high-risk-write` — require `--yes`, no dry-run.
- `remove-task` only deletes **topic tasks** (`topicId` present). Standalone tasks → use `engage-task task delete`.
- `copy` duplicates the editable topic config and its tasks (not runtime/approval state).
- `copy` saves via **draft** add (`isDraft=true`), so a past schedule-single `triggerTime` is allowed; output may include `trigger_time_stale=true`. Update the time before submitting for approval (`engage-activity.approval.submit` is temporarily unavailable).
- Prefer `topic get` as a template when inspecting channel/content fields.

## Create / update audience errors

| code | when |
|---|---|
| `TOPIC_TARGET_CLUSTER_TYPE_UNSUPPORTED` | `targetClusterType=3` (all); topics only allow 1/2 |
| `TOPIC_CLUSTER_KEY_REQUIRED` | `targetClusterType=2` missing `topicClusterKey`, or topic-root `clusterKey` alias |
| `TOPIC_QP_REQUIRED` | `targetClusterType=1` missing `topicQp` |
| `TOPIC_QP_INVALID` | `topicQp` is not a JSON object string |
| `TARGET_CLUSTER_TYPE_INVALID` | `targetClusterType` not a known enum value |

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
