# analysis +get_report_definition (read report definition)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Report Management**

## Use Cases
- Get the definition details of a single report. Returns model type, event configuration, display configuration, and other definition data without executing a data query.
- Get the definition details of a single report.
- When interpreting report information, remember that for recent-day ranges, 1-N means the last N days (past N days), which is actually N+1 days ago through yesterday, while 0-N means the most recent N days, which is actually N days ago through today.

## Commands
```bash
ae-cli analysis +get_report_definition --project_id 1 --report_id 1
ae-cli analysis +get_report_definition --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--report_id` / `-r` | Yes | Report ID |

## Decision Rules
- For the first run, it is recommended to pass only the required parameters (`--project_id`, `--report_id`) and add optional parameters after confirming the chain works.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id`, `--report_id`).
- If reading fails, first verify whether the object ID exists and belongs to the current project.

## Recommended Chaining
- +list_reports -> +get_report_definition -> +query_report_data
