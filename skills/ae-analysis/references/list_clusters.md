# analysis_audience +list_clusters (Cluster Search)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Cluster Management**

## Use Cases
- List cluster metadata accessible to the current user in the project.
- Supports payload governance parameters: `query`, `fields`, `limit`, `offset`.
- Returns a paginated envelope (items + total + limit + offset + hasMore), not cluster members.

## Commands
```bash
ae-cli analysis_audience +list_clusters --project_id <project_id>
ae-cli analysis_audience +list_clusters --project_id <project_id> --query demo
ae-cli analysis_audience +list_clusters --project_id <project_id> --fields '["id","clusterName","usersNum"]' --limit 20 --offset 0
ae-cli analysis_audience +list_clusters --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--query` / `-q` | No | Optional keyword filter. Performs fuzzy matching against cluster names, display names, and remarks; if omitted, all clusters are returned. |
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
- +list_clusters -> +get_clusters_by_name -> +update_cluster
