# te-engage +strategy_detail

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Query the details of a single strategy.

Mapped command: `ae-cli engage +strategy_detail`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--config_id` | string | Yes | config item ID |
| `--strategy_uuid` | string | Yes | strategy UUID |

## Common enums in the response

### `status`

- `0`: `DRAFT`
- `1`: `ONLINE`
- `2`: `SUSPEND`
- `3`: `OFFLINE`

### `mappingStatus`

- `0`: `DRAFT`
- `1`: `APPROVE`
- `2`: `DENY`
- `3`: `REGISTERING`
- `4`: `REGISTER_FAIL`
- `5`: `WAITING`
- `6`: `ONLINE`
- `7`: `SUSPEND`
- `8`: `OFFLINE`

### `targetClusterType`

- `0`: `ALL_USERS`
- `1`: `CUSTOM_CLUSTER`
- `2`: `SINGLE_USER`

### `realtime`

- `0`: physical cluster, physical audience
- `1`: virtual cluster, virtual audience

### `triggerType`

- `0`: `SCHEDULED_SINGLE`
- `1`: `SCHEDULED_RECURRING`
- `2`: `MANUAL`

### `versionType`

- `0`: history version
- `1`: current version
- `2`: update-content version

### `channelType`

- `1`: `WEBHOOK`
- `2`: `APP_PUSH`
- `3`: `CLIENT_PUSH`
- `4`: `WECHAT`
- `5`: `DOU_YIN`

## Examples

```bash
ae-cli engage +strategy_detail --project_id 1 --config_id cfg_123 --strategy_uuid uuid_123
```
