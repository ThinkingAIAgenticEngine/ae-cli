# engage-scene config-channel

> Capability ids: `engage-scene.config-channel.{create,update,query-log}` · Domain: `engage`.

场景管理 / 配置中心 - 配置通道管理与操作日志。

## Commands

```bash
# Create a config channel and enable it
ae-cli engage-scene config-channel create \
  --project-id <project_id> --channel-name <name> --channel-type <0|1> --config '<json string>'

# Update a config channel's name and optionally its config
ae-cli engage-scene config-channel update \
  --project-id <project_id> --channel-id <channel_id> --channel-name <name> [--config '<json string>']

# Query a config channel's operation log
ae-cli engage-scene config-channel query-log --project-id <project_id> --channel-id <channel_id>
```

## Parameters

### create

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--channel-name` | Yes | Channel name. |
| `--channel-type` | Yes | Channel type: **0 webhook**, **1 client** (not the same as engage push `channelType`, where 1=webhook). |
| `--config` | Yes | Channel-specific JSON config string. Webhook (`0`) requires `config.url`; client (`1`) must not include `url`. |

### update

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--channel-id` | Yes | Channel ID to update. |
| `--channel-name` | Yes | New channel name. |
| `--config` | No | Channel-specific JSON config string. Omit to keep the current config (typical when renaming an enabled channel). Required when changing webhook URL, auth, or parameter definitions on a disabled channel. |

### query-log

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--channel-id` | Yes | Channel ID whose operation log to query. |

## Output

- `create`: `data.channel_id` — the created channel ID.
- `update`: `data.success`.
- `query-log`: `data.items` + `data.total`.

## Decision Rules

- `create`/`update` are `write`; `query-log` is read.
- Discover real `channel_id`s with `ae-cli engage +config_channel_list --project_id <project_id>` first.
