# analysis_audience +list_cluster_members (View Cluster Members)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Cluster Management**

## Use Cases
- List members in the specified cluster.
- Supports payload governance parameters: `query`, `fields`, `limit`, `offset`.
- Returns a paginated envelope (items + total + limit + offset + hasMore).

## Commands
```bash
ae-cli analysis_audience +list_cluster_members --project_id <project_id> --cluster_name demo
ae-cli analysis_audience +list_cluster_members --project_id <project_id> --cluster_name demo --property_names '["#user_id","name"]' --use_cache false
ae-cli analysis_audience +list_cluster_members --project_id <project_id> --cluster_name demo --query user_001 --fields '["#user_id","name"]' --limit 20 --offset 0
ae-cli analysis_audience +list_cluster_members --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--cluster_name` | Yes | Cluster name |
| `--property_names` | No | Optional list of user property names (JSON array) |
| `--use_cache` | No | Whether to use cache. Default: true |
| `--query` | No | Optional keyword filter on `#user_id` and selected properties. |
| `--fields` | No | Optional return field list (JSON array). Invalid fields will fail with `INVALID_FIELDS`. |
| `--limit` | No | Optional page size. Default: 20, max: 50. |
| `--offset` | No | Optional page offset. Default: 0. |

## Decision Rules
- For the first execution, it is recommended to pass only the required parameters (`--project_id`, `--cluster_name`) and add optional parameters after confirming the path works.
- `--property_names` must be passed as a JSON array (e.g. `--property_names '["#user_id"]'`).
- When troubleshooting across projects, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill the gap (focus on `--project_id`, `--cluster_name`).
- If the result is empty, first confirm the project ID/keyword, then try broadening the filter conditions.

## Recommended Chain
- +list_clusters -> +get_clusters_by_name -> +update_cluster
