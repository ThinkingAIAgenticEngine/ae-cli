# te_audience +list_cluster_members (View Cluster Members)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Cluster Management**

## Use Cases
- List members in the specified cluster. Returns member information such as user property values and total user count.

## Commands
```bash
te-cli te_audience +list_cluster_members --project_id 1 --cluster_name demo
te-cli te_audience +list_cluster_members --project_id 1 --cluster_name demo --property_names '["#user_id","name"]' --use_cache false
te-cli te_audience +list_cluster_members --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--cluster_name` | Yes | Cluster name |
| `--property_names` | No | Optional list of user property names (JSON array) |
| `--use_cache` | No | Whether to use cache. Default: true |

## Decision Rules
- For the first execution, it is recommended to pass only the required parameters (`--project_id`, `--cluster_name`) and add optional parameters after confirming the path works.
- `--property_names` must be passed as a JSON array (e.g. `--property_names '["#user_id"]'`).
- When troubleshooting across projects, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill the gap (focus on `--project_id`, `--cluster_name`).
- If the result is empty, first confirm the project ID/keyword, then try broadening the filter conditions.

## Recommended Chain
- +list_clusters -> +get_clusters_by_name -> +update_cluster
