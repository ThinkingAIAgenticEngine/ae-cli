# te-engage +task_detail

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Query the details of a single task.

Mapped command: `ae-cli engage +task_detail`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--task_id` | string | Yes | task ID |

## Common enums in the response

### `status`

- `0`: `DRAFT`, draft, not submitted
- `1`: `WORKING`, running
- `2`: `PENDING`, paused
- `3`: `COMPLETE`, completed

### `mappingStatus`

- `0`: `DRAFT`
- `1`: `WORKING`
- `2`: `PENDING`
- `3`: `COMPLETE`
- `4`: `APPROVE`, pending review
- `5`: `DENY`, review denied

### `channelType`

- `1`: `WEBHOOK`
- `2`: `APP_PUSH`
- `3`: `CLIENT_PUSH`
- `4`: `WECHAT`
- `5`: `DOU_YIN`

### `triggerType`

- `0`: `SCHEDULED_SINGLE`
- `1`: `SCHEDULED_RECURRING`
- `2`: `MANUAL`
- `3`: `TRIGGER_COMPLETE_A`
- `4`: `TRIGGER_COMPLETE_A_THEN_B`
- `5`: `TRIGGER_COMPLETE_A_NOT_B`
- `6`: `CUSTOM_TRIGGER`

### `realtime`

- `0`: physical cluster, physical audience
- `1`: virtual cluster, virtual audience

## Examples

```bash
ae-cli engage +task_detail --project_id 1 --task_id task_123
```
