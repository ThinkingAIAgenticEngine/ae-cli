# analysis_audience +list_tags (Tag Search)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Tag Management**

## Constraints

**Fuzzy Search Fallback:** If `--query` returns no results, retry with broader keywords (max 3 attempts), then fall back to full list. See [SKILL.md § C. FUZZY_SEARCH_FALLBACK](../SKILL.md#c-fuzzy_search_fallback).

## Use Cases
- List tag metadata accessible to the current user in the project.
- Supports payload governance parameters: `query`, `fields`, `limit`, `offset`.
- Returns a paginated envelope (items + total + limit + offset + hasMore), not tag members.

## Commands
```bash
ae-cli analysis_audience +list_tags --project_id <project_id>
ae-cli analysis_audience +list_tags --project_id <project_id> --query demo
ae-cli analysis_audience +list_tags --project_id <project_id> --fields '["id","clusterName","usersNum"]' --limit 20 --offset 0
ae-cli analysis_audience +list_tags --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--query` / `-q` | No | Optional keyword filter. Performs fuzzy matching against tag names, display names, and remarks; if omitted, all tags are returned. |
| `--fields` | No | Optional return field list (JSON array). Invalid fields will fail with `INVALID_FIELDS`. |
| `--limit` | No | Optional page size. Default: 20, max: 50. |
| `--offset` | No | Optional page offset. Default: 0. |

## Decision Rules
- For the first execution, it is recommended to pass only the required parameters (`--project_id`) and add optional parameters after confirming the path works.
- When troubleshooting across projects, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill the gap (focus on `--project_id`).
- If the result is empty, first confirm the project ID/keyword, then try broadening the filter conditions.

## Recommended Chain
- +list_tags -> +get_tags_by_name -> +update_tag
