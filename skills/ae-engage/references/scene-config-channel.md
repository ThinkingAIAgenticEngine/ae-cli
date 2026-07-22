# engage-scene config-channel

> Capability ids: `engage-scene.config-channel.{list,get,create,update,update-status,delete,query-log}` · Domain: `engage`.

Scene / config center — **config channel management** (Webhook / client config channels).

## Commands

```bash
# List channels (optional type filter)
ae-cli engage-scene config-channel list --project-id <project_id> [--channel-type 0|1]

# Get channel detail (includes config JSON)
ae-cli engage-scene config-channel get --project-id <project_id> --channel-id <channel_id>

# Create a config channel and enable it
ae-cli engage-scene config-channel create \
  --project-id <project_id> --channel-name <name> --channel-type <0|1> --config '<json string>'

# Update a config channel's name and optionally its config
ae-cli engage-scene config-channel update \
  --project-id <project_id> --channel-id <channel_id> --channel-name <name> [--config '<json string>']

# Enable / disable channel
ae-cli engage-scene config-channel update-status \
  --project-id <project_id> --channel-id <channel_id> --channel-status <1|2>

# Delete a disabled channel (high-risk; requires --yes after confirm)
ae-cli engage-scene config-channel delete --project-id <project_id> --channel-id <channel_id> --yes

# Query operation log
ae-cli engage-scene config-channel query-log --project-id <project_id> --channel-id <channel_id>
```

## Parameters

### list

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--channel-type` | No | Filter: **0 webhook**, **1 client**. Omit for all. |

### get

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--channel-id` | Yes | Channel ID. |

### create

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--channel-name` | Yes | Channel name (≤80). |
| `--channel-type` | Yes | **0 webhook**, **1 client** (not the same as engage push `channelType`, where 1=webhook). |
| `--config` | Yes | Channel-specific JSON config string. Webhook (`0`) requires `config.url`; client (`1`) must not include `url`. |

### update

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--channel-id` | Yes | Channel ID to update. |
| `--channel-name` | Yes | New channel name. |
| `--config` | No | Channel-specific JSON config string. Omit to keep the current config (typical when renaming an enabled channel). Required when changing webhook URL, auth, or parameter definitions on a disabled channel. |

### update-status

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--channel-id` | Yes | Channel ID. |
| `--channel-status` | Yes | **1 enable**, **2 disable**. |

### delete

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--channel-id` | Yes | Channel ID. Must already be **disabled** (`channel_status=2`). |

### query-log

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--channel-id` | Yes | Channel ID whose operation log to query. |

## Webhook `config` JSON shape

```json
{
  "url": "https://example.com/hook",
  "testUrl": "https://example.com/hook-test",
  "authConfig": {
    "enable": true,
    "secretKey": "<token>",
    "secretType": 1
  },
  "customsParamList": [
    {
      "key": "user_id",
      "columnName": "#account_id",
      "defaultValue": "",
      "systemIdParam": true
    }
  ],
  "envParamList": []
}
```

- `url` — production environment URL (required for webhook)
- `testUrl` — optional test environment URL
- `authConfig.enable` — channel auth switch; when true, `secretKey` is required; `secretType` **1 = basic**, **2 = advanced**
- `customsParamList` — user params (field key / linked user property / default value / system-integration identity)
- `envParamList` — environment params (from config tables)
- At most one `systemIdParam=true` across user + env params

## Output

- `list`: `data.items` + `data.total` (snake_case fields: `channel_id` / `channel_name` / `channel_type` / `channel_status` / `creator` / `updater` / `create_time` / `update_time`)
- `get`: `data.channel` (same as list item + `config`)
- `create`: `data.channel_id`
- `update` / `update-status` / `delete`: `data.success`
- `query-log`: `data.items` + `data.total`

## Decision Rules

- Risk: `list` / `get` / `query-log` = read; `create` / `update` / `update-status` = write; `delete` = high-risk-write (user confirmation + `--yes`)
- Discover `channel_id` with `list` first; never invent IDs
- Enabled channel (`channel_status=1`): only limited fields such as name can change; disable first (`update-status --channel-status 2`) before changing URL, auth, or parameter definitions
- Delete: disable first, then `delete --yes`
- Copy: `get` → rename (often append `_copy`) → `create`
- Filter by name: substring-match `channel_name` on `list` results

Workflows: [`channel-mgmt.md`](channel-mgmt.md).
