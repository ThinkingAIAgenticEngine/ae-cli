# analysis +delete_report (Delete Report)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Report Management**

## Use Cases
- Permanently delete a report by its ID.

## Commands
```bash
ae-cli analysis +delete_report --project_id <project_id> --report_id <report_id>
ae-cli analysis +delete_report --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--report_id` | Yes | Report ID to delete |

## Decision Rules
- Use `+list_reports` first to confirm the report ID before deleting.
- This is a destructive operation; keep the confirmation prompt unless automation is explicitly required.

## Recommended Chain
- `+list_reports` -> `+delete_report`
