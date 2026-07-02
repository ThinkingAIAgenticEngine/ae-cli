# analysis_audience +update_id_cluster (Update ID Cluster)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Cluster Management**

## Use Cases
- Update an existing ID cluster by re-uploading CSV file content as plain text.
- The cluster is identified by `cluster_name`. The operation is asynchronous.

## Commands
```bash
ae-cli analysis_audience +update_id_cluster --project_id <project_id> --cluster_name my_id_cluster --file_content "user_001
user_002"
ae-cli analysis_audience +update_id_cluster --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--cluster_name` | Yes | Cluster name to update |
| `--file_content` | Yes | New CSV file content as plain text. No header row, UTF-8 encoding. Each row contains one user ID. Max 100MB. |
| `--display_name` | No | Optional new display name |
| `--remarks` | No | Optional new remarks (max 200 characters) |
| `--main_column_name` | No | Optional new main column name for ID matching |

## Return Value
Returns `clusterId`, `uploadNum`, `userNum`, `unmatchedNum`, and `clusterName`.

## Decision Rules
- Use `+list_clusters` to confirm the cluster name before updating.
- If file size exceeds 100MB, inform the user to upload directly via the web interface.

## Recommended Chain
- `+list_clusters` -> `+update_id_cluster`
