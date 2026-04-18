# analysis_audience +refresh_cluster (Trigger Cluster Recompute)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Cluster Management**

## Use Cases
- Trigger cluster recomputation and submit an asynchronous refresh task.

## Commands
```bash
ae-cli analysis_audience +refresh_cluster --project_id 1 --cluster_name demo
ae-cli analysis_audience +refresh_cluster --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--cluster_name` | Yes | Cluster name |

## Decision Rules
- For the first execution, it is recommended to pass only the required parameters (`--project_id`, `--cluster_name`) and add optional parameters after confirming the path works.
- When troubleshooting across projects, first confirm whether `--project_id` matches the current permissions and target environment.
- Write operations keep confirmation prompts by default; for automation scenarios, reevaluate whether to use `--yes`.

## Next Step on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill the gap (focus on `--project_id`, `--cluster_name`).

## Recommended Chain
- +list_clusters -> +get_clusters_by_name -> +update_cluster
