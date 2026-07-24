# engage-scene preset-metric

> Trigger keywords: config center, config item · Capability ids: `engage-scene.preset-metric.{get,set}` · Domain: `engage`.

Scene management / config center — config item preset metrics (impression / click / engagement) QP configuration.

## Commands

```bash
# Get preset metric QP config of a config item
ae-cli engage-scene preset-metric get --project-id <project_id> --config-id <config_id>

# Set preset metric QP config
ae-cli engage-scene preset-metric set \
  --project-id <project_id> --config-id <config_id> \
  [--impression-event-qp '<qp json>'] [--click-event-qp '<qp json>'] [--attend-event-qp '<qp json>']
```

## Parameters

### get

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--config-id` | Yes | Config item ID. |

### set

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--config-id` | Yes | Config item ID. |
| `--impression-event-qp` | No | Impression event QP JSON string. |
| `--click-event-qp` | No | Click event QP JSON string. |
| `--attend-event-qp` | No | Attend event QP JSON string. |

## Output

- `get`: `data` — preset metric QP config.
- `set`: `data.success` — whether the operation succeeded.

## Decision Rules

- `get` is read; `set` is `write`.
