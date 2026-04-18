# analysis_audience +get_clusters_by_name (Locate Clusters by Name)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Cluster Management**

## Use Cases
- Get cluster definition details in batch by cluster name. Returns complete cluster information for matched clusters, including IDs, names, display names, types, status, user counts, and refresh status.

## Commands
```bash
ae-cli analysis_audience +get_clusters_by_name --project_id 1 --names '["demo"]'
ae-cli analysis_audience +get_clusters_by_name --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--names` | Yes | List of cluster names (JSON array). Exact-name matching is used; unmatched clusters are ignored automatically. |

## Decision Rules
- For the first execution, it is recommended to pass only the required parameters (`--project_id`, `--names`) and add optional parameters after confirming the path works.
- `--names` must be passed as a JSON array (e.g. `--names '["cluster_a","cluster_b"]'`).
- When troubleshooting across projects, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill the gap (focus on `--project_id`, `--names`).
- If reading fails, first verify whether the object ID exists and belongs to the current project.

## Recommended Chain
- +list_clusters -> +get_clusters_by_name -> +update_cluster
