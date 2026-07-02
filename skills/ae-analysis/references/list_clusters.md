# analysis_audience +list_clusters (Audience/User Segment Cluster Search)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Cluster Management**

## Constraints

**Fuzzy Search Fallback:** If `--query` returns no results, retry with broader keywords (max 3 attempts), then fall back to full list. See [SKILL.md § C. FUZZY_SEARCH_FALLBACK](../SKILL.md#c-fuzzy_search_fallback).

**Term boundary:** This command lists audience/user segment clusters only. It is not a server, region, or deployment inventory tool.

## Use Cases
- List audience/user segment cluster metadata accessible to the current user in the project.
- Supports payload governance parameters: `query`, `fields`, `limit`, `offset`.
- Returns a paginated envelope (items + total + limit + offset + hasMore), not cluster members.

## Commands
```bash
ae-cli analysis_audience +list_clusters --project_id <project_id>
ae-cli analysis_audience +list_clusters --project_id <project_id> --query demo
ae-cli analysis_audience +list_clusters --project_id <project_id> --fields '["id","clusterName","displayName","remarks","clusterType","progress","usersNum"]' --limit 20 --offset 0
ae-cli analysis_audience +list_clusters --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--query` / `-q` | No | Optional keyword filter. Performs fuzzy matching against clusterName, displayName, and remarks; if omitted, all clusters are returned. |
| `--fields` | No | Optional return field list (JSON array). Supported fields: `id`, `clusterName`, `displayName`, `clusterType`, `progress`, `usersNum`, `refreshStatus`, `remarks`. Default fields when omitted: `id`, `clusterName`, `displayName`, `remarks`, `clusterType`, `progress`, `usersNum`. Invalid fields will fail with `INVALID_FIELDS`. |
| `--limit` | No | Optional page size. Default: 20, max: 50. |
| `--offset` | No | Optional page offset. Default: 0. |

## Decision Rules
- For the first execution, it is recommended to pass only the required parameters (`--project_id`) and add optional parameters after confirming the path works.
- When troubleshooting across projects, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill the gap (focus on `--project_id`).
- If the result is empty, first confirm the project ID/keyword, then try broadening the filter conditions.

## Recommended Chain
- +list_clusters -> +get_clusters_by_name -> +update_cluster
