# analysis +delete_alert (Delete Alert)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Alert Management**

## Use Cases
- Permanently delete an alert by its ID.

## Commands
```bash
ae-cli analysis +delete_alert --project_id <project_id> --alert_id <alert_id>
ae-cli analysis +delete_alert --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--alert_id` | Yes | Alert ID to delete |

## Decision Rules
- Use `+list_alerts` first to confirm the alert ID before deleting.
- This is a destructive operation; keep the confirmation prompt unless automation is explicitly required.

## Recommended Chain
- `+list_alerts` -> `+delete_alert`
