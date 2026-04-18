# te_analysis +list_alerts (alert strategy search)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Metadata Lookup**

## Use Cases
- List all alerts in the project. Supports keyword filtering by alert name. Returns a paginated list containing alerts array and pager result with total count.
- List all alerts in the project.

## Commands
```bash
te-cli te_analysis +list_alerts --project_id 1
te-cli te_analysis +list_alerts --project_id 1 --query demo
te-cli te_analysis +list_alerts --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--query` / `-q` | No | Optional keyword filter. Performs fuzzy matching against alert names; if omitted, all alerts are returned. |

## Decision Rules
- For the first run, it is recommended to pass only the required parameters (`--project_id`) and add optional parameters after confirming the chain works.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id`).
- If the result is empty, first confirm the project ID/keyword, then try broadening the filter conditions.

## Recommended Chaining
- +list_alerts
