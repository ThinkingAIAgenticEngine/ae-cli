# analysis +freeze_dashboards (Freeze / Unfreeze Dashboards)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Dashboard Management**

## Use Cases
- Freeze one or more dashboards to take their scheduled refresh jobs offline.
- Unfreeze dashboards to bring scheduled jobs back online (for dashboards that have a schedule configured).

## Commands
```bash
ae-cli analysis_audience +freeze_dashboards --project_id <project_id> --dashboard_ids '[123, 456]' --freeze true
ae-cli analysis_audience +freeze_dashboards --project_id <project_id> --dashboard_ids '[123]' --freeze false
ae-cli analysis_audience +freeze_dashboards --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--dashboard_ids` | Yes | JSON array of dashboard IDs to freeze or unfreeze |
| `--freeze` | Yes | true to freeze, false to unfreeze |

## Decision Rules
- Use `+list_dashboards` to confirm dashboard IDs before freezing.

## Recommended Chain
- `+list_dashboards` -> `+freeze_dashboards`
