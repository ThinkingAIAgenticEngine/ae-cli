# analysis +delete_dashboard (Delete Dashboard)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Dashboard Management**

## Use Cases
- Permanently delete a dashboard by its ID.

## Commands
```bash
ae-cli analysis +delete_dashboard --project_id <project_id> --dashboard_id <dashboard_id>
ae-cli analysis +delete_dashboard --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--dashboard_id` | Yes | Dashboard ID to delete |

## Decision Rules
- Use `+list_dashboards` first to confirm the dashboard ID before deleting.
- This is a destructive operation; keep the confirmation prompt unless automation is explicitly required.

## Next Step on Failure
- If the dashboard is not found, use `+list_dashboards` to verify the ID.

## Recommended Chain
- `+list_dashboards` -> `+delete_dashboard`
