# analysis +delete_alert (Delete Alert)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Alert Management**

## Use Cases
- Permanently delete an alert by its ID.
- Do not use this command to disable or edit an alert; use `+update_alert` when the alert must remain.

## Output
Success confirms that the specified alert was deleted. The command does not return alert data; use `+list_alerts` to verify it is absent.

## Commands
```bash
ae-cli analysis +delete_alert --project_id <project_id> --alert_id <alert_id> --dry-run
# Summarize the target and impact, then wait for explicit user confirmation.
ae-cli analysis +delete_alert --project_id <project_id> --alert_id <alert_id> --yes
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--alert_id` | Yes | Alert ID to delete |

## Decision Rules
- Use `+list_alerts` first to confirm the alert ID before deleting.
- This is `high-risk-write`: inspect the dry-run, summarize the target and impact, and wait for explicit user confirmation before the `--yes` execution.

## Recommended Chain
- `+list_alerts` -> `+delete_alert`
