# analysis +list_alerts (alert strategy search)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Metadata Lookup**

## Constraints

**Fuzzy Search Fallback:** If `--query` returns no results, retry with broader keywords (max 3 attempts), then fall back to full list. See [SKILL.md § C. FUZZY_SEARCH_FALLBACK](../SKILL.md#c-fuzzy_search_fallback).

## Use Cases
- List all alerts in the project. Supports keyword filtering by alert name. Returns a paginated list containing alerts array and pager result with total count.
- List all alerts in the project.

## Commands
```bash
ae-cli analysis +list_alerts --project_id <project_id>
ae-cli analysis +list_alerts --project_id <project_id> --query demo
ae-cli analysis +list_alerts --project_id <project_id> --limit 20 --offset 0
ae-cli analysis +list_alerts --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--query` / `-q` | No | Optional keyword filter. Performs fuzzy matching against alert names; if omitted, all alerts are returned. |
| `--limit` / `-l` | No | Optional page size. Default: 20, maximum: 10000. |
| `--offset` / `-o` | No | Optional page offset. Default: 0. |

## Decision Rules
- For the first run, it is recommended to pass only the required parameters (`--project_id`) and add optional parameters after confirming the chain works.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id`).
- If the result is empty, first confirm the project ID/keyword, then try broadening the filter conditions.

## Recommended Chaining
- +list_alerts
