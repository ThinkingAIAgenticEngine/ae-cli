# analysis +list_reports (List Reports)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Report management**

## Constraints

**Fuzzy Search Fallback:** If `--query` returns no results, retry with broader keywords (max 3 attempts), then fall back to full list. See [SKILL.md § C. FUZZY_SEARCH_FALLBACK](../SKILL.md#c-fuzzy_search_fallback).

## Use Cases
- List report metadata accessible to the current user in the project. Supports keyword filtering and returns report IDs, names, model types, update times, and related metadata, but not report definitions or analysis data.
- List report metadata accessible to the current user in the project.

## Command
```bash
ae-cli analysis +list_reports --project_id <project_id>
ae-cli analysis +list_reports --project_id <project_id> --query demo
ae-cli analysis +list_reports --project_id <project_id> --fields '["reportId","reportName","reportModel"]' --limit 20 --offset 0
ae-cli analysis +list_reports --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--query` / `-q` | No | Optional keyword filter. Performs fuzzy matching against report names, descriptions, and AI remarks; if omitted, all accessible reports are returned. |
| `--fields` / `-f` | No | Optional fields to return (JSON array). Supported fields: `reportId`, `reportName`, `reportDesc`, `reportModel`, `aiRemark`. |
| `--limit` / `-l` | No | Optional page size. Default: 20, maximum: 50. |
| `--offset` / `-o` | No | Optional page offset. Default: 0. |

## Decision Rules
- On the first run, start with only the required parameters (`--project_id`), and add optional parameters after confirming the path works.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id`).
- If the result is empty, first confirm the project ID / keyword, then try loosening the filter conditions.

## Recommended chaining
- +list_reports -> +get_report_definition -> +query_report_data
