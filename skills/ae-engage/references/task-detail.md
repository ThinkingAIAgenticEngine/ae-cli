# ae-cli engage-task task get


Query the details of a single task.

Mapped command: `ae-cli engage-task task get`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project-id` / `-p` | number | Yes | Project ID |
| `--task-id` | string | Yes | task ID |

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
ae-cli engage-task task get --project-id 1 --task-id task_123
```
