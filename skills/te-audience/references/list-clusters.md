# analysis_audience +list_clusters (Cluster Search)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Cluster Management**

## Use Cases
- List cluster metadata accessible to the current user in the project. Supports keyword filtering and returns cluster names, display names, types, status, user counts, and related metadata, but not cluster members.

## Commands
```bash
ae-cli analysis_audience +list_clusters --project_id 1
ae-cli analysis_audience +list_clusters --project_id 1 --query demo
ae-cli analysis_audience +list_clusters --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--query` / `-q` | No | Optional keyword filter. Performs fuzzy matching against cluster names, display names, and remarks; if omitted, all clusters are returned. |

## Decision Rules
- For the first execution, it is recommended to pass only the required parameters (`--project_id`) and add optional parameters after confirming the path works.
- When troubleshooting across projects, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill the gap (focus on `--project_id`).
- If the result is empty, first confirm the project ID/keyword, then try broadening the filter conditions.

## Recommended Chain
- +list_clusters -> +get_clusters_by_name -> +update_cluster
