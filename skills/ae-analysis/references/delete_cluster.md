# analysis_audience +delete_cluster (Delete Cluster)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Cluster Management**

## Use Cases
- Permanently delete a cluster by its name.

## Commands
```bash
ae-cli analysis_audience +delete_cluster --project_id <project_id> --cluster_name my_cluster
ae-cli analysis_audience +delete_cluster --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--cluster_name` | Yes | Cluster name to delete |

## Decision Rules
- Use `+list_clusters` first to confirm the cluster name before deleting.
- This is a destructive operation; keep the confirmation prompt unless automation is explicitly required.

## Recommended Chain
- `+list_clusters` -> `+delete_cluster`
