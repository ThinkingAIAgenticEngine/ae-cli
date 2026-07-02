# analysis_audience +create_id_cluster (Create ID Cluster)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Cluster Management**

## Use Cases
- Create a new ID cluster by uploading a CSV of user IDs as plain text.
- The CSV should contain a single column of user IDs (no header row required).
- The operation is asynchronous — the cluster enters computing state after creation.

## Commands
```bash
ae-cli analysis_audience +create_id_cluster --project_id <project_id> --display_name "My ID Cluster" --file_content "user_001
user_002
user_003" --entity_id <entity_id>
ae-cli analysis_audience +create_id_cluster --project_id <project_id> --display_name "My ID Cluster" --file_content "user_001" --entity_id <entity_id> --cluster_name my_id_cluster --remarks "Created by script"
ae-cli analysis_audience +create_id_cluster --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--display_name` | Yes | Cluster display name (1-80 characters) |
| `--file_content` | Yes | CSV file content as plain text. No header row, UTF-8 encoding. Each row contains one user ID. Max 100MB. |
| `--entity_id` | Yes | Entity ID to associate the cluster with. Use `analysis_meta +list_entities` to query. |
| `--cluster_name` | No | Cluster name (lowercase letters, digits, underscores, starts with a letter, max 80 chars). Auto-generated if omitted. |
| `--remarks` | No | Optional remarks (max 200 characters) |
| `--main_column_name` | No | Optional main column name for ID matching |

## Return Value
Returns `clusterId`, `uploadNum` (rows uploaded), `userNum` (matched users), `unmatchedNum` (unmatched rows), and `clusterName`.

## Decision Rules
- Call `analysis_meta +list_entities` to resolve `entity_id` before creating.
- If file size exceeds 100MB, inform the user to upload directly via the web interface.

## Recommended Chain
- `analysis_meta +list_entities` -> `+create_id_cluster` -> `+refresh_cluster`
