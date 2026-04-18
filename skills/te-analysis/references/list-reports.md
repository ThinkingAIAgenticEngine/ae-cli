# analysis +list_reports (List Reports)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Report management**

## Use Cases
- List report metadata accessible to the current user in the project. Supports keyword filtering and returns report IDs, names, model types, update times, and related metadata, but not report definitions or analysis data.
- List report metadata accessible to the current user in the project.

## Command
```bash
ae-cli analysis +list_reports --project_id 1
ae-cli analysis +list_reports --project_id 1 --query demo
ae-cli analysis +list_reports --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--query` / `-q` | No | Optional keyword filter. Performs fuzzy matching against report names and descriptions; if omitted, all accessible reports are returned. |

## Decision Rules
- On the first run, start with only the required parameters (`--project_id`), and add optional parameters after confirming the path works.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id`).
- If the result is empty, first confirm the project ID / keyword, then try loosening the filter conditions.

## Recommended chaining
- +list_reports -> +get_report_definition -> +query_report_data
