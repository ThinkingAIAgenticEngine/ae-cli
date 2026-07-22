# engage-setting preset-event

> Capability ids: `engage-setting.preset-event.{list,update}` · Domain: `engage`.

## Commands

```bash
# Query the project preset-event config
ae-cli engage-setting preset-event list --project-id <project_id>

# Update the project preset-event config
ae-cli engage-setting preset-event update --project-id <project_id> [--add-event-desc <qp>] [--active-event-desc <qp>] [--recharge-event-desc <qp>]
```

## Parameters

### list

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |

### update

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--add-event-desc` | No | Add-event qp definition. |
| `--active-event-desc` | No | Active-event qp definition. |
| `--recharge-event-desc` | No | Recharge-success-event qp definition. |

At least one `*-event-desc` must be provided for `update`.

## Output

- `list`: `data.add_event_desc`, `data.active_event_desc`, `data.recharge_event_desc` (each may be `null`).
- `update`: `data.success` — whether the config was updated.

## Decision Rules

- Use these commands when the user asks to query or configure preset events for the analysis workbench.
- `update` replaces the provided desc fields; omitting a field clears it. Before clearing a field that is in use, the backend rejects the update if metrics still depend on it.
