# te-engage +flow_detail

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Query flow details.

Mapped command: `ae-cli engage +flow_detail`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--flow_uuid` | string | Yes | Flow UUID |

## Common enums in the response

### `status`

- `0`: `DRAFT`
- `1`: `WAITING`
- `2`: `RUNNING`
- `3`: `PENDING`
- `4`: `COMPLETE`

### `mappingStatus`

- `0`: `DRAFT`
- `1`: `APPROVE`
- `2`: `DENY`
- `3`: `REGISTERING`
- `4`: `REGISTER_FAIL`
- `5`: `WAITING`
- `6`: `RUNNING`
- `7`: `PENDING`
- `8`: `COMPLETE`

### `versionType`

- `0`: history version
- `1`: current version
- `2`: update-content version
- `3`: new version
- `4`: test version

### `entryTriggerType`

- `0`: scheduled single trigger
- `1`: scheduled recurring trigger
- `2`: event trigger

### `nodeList[].type`

Common node types include:

- `single_trigger`
- `repeat_trigger`
- `event_trigger`
- `feature_judge`
- `event_judge`
- `message_push`
- `wechat_push`
- `webhook_push`
- `config_push`
- `tag`
- `time_control`
- `feature_split_flow`
- `event_split_flow`
- `trigger_prop_split_flow`
- `percent_split_flow`
- `ab_split_flow`
- `race_split_flow`
- `exit_flow`

## Examples

```bash
ae-cli engage +flow_detail --project_id 1 --flow_uuid flow_uuid_123
```
