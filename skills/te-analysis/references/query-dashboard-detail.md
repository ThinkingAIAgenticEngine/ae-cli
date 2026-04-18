# te_analysis +query_dashboard_detail (read dashboard structure)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Dashboard Management**

## Use Cases
- Get detailed information about a specific dashboard including:
- Associated reports (IDs, names, types, and metadata)
- Dashboard notes (IDs, titles, descriptions)
- Share members (userId, userName, permissions)
- Get detailed information about a specific dashboard including: - Associated reports (IDs, names, types, and metadata) - Dashboard notes (IDs, titles, descriptions) - Share members (userId, userName, permissions)

## Commands
```bash
te-cli te_analysis +query_dashboard_detail --project_id 1 --dashboard_id 1
te-cli te_analysis +query_dashboard_detail --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--dashboard_id` / `-d` | Yes | Dashboard ID |

## Decision Rules
- For the first run, it is recommended to pass only the required parameters (`--project_id`, `--dashboard_id`) and add optional parameters after confirming the chain works.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id`, `--dashboard_id`).
- If the query times out or the result is abnormal, first reduce the time range/grouping dimensions, then split the query to locate the issue.

## Recommended Chaining
- +list_dashboards -> +query_dashboard_detail -> +query_dashboard_report_data
