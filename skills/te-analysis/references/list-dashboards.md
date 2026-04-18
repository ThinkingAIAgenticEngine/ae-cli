# analysis +list_dashboards (List Dashboards)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Dashboard management**

## Use Cases
- List dashboard metadata accessible to the current user in the project. Supports keyword filtering and returns dashboard IDs, names, descriptions, and related metadata, but not dashboard configuration or report data.
- List dashboard metadata accessible to the current user in the project.

## Command
```bash
ae-cli analysis +list_dashboards --project_id 1
ae-cli analysis +list_dashboards --project_id 1 --query demo
ae-cli analysis +list_dashboards --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--query` / `-q` | No | Optional keyword filter. Performs fuzzy matching against dashboard names; if omitted, all accessible dashboards are returned. |

## Decision Rules
- On the first run, start with only the required parameters (`--project_id`), and add optional parameters after confirming the path works.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id`).
- If the result is empty, first confirm the project ID / keyword, then try loosening the filter conditions.

## Recommended chaining
- +list_dashboards -> +query_dashboard_detail -> +query_dashboard_report_data
