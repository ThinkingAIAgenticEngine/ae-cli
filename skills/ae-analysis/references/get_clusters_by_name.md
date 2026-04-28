# analysis_audience +get_clusters_by_name (Locate Clusters by Name)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Cluster Management**

## Use Cases
- Get cluster definition details in batch by cluster name. Returns complete cluster information for matched clusters, including IDs, names, display names, types, status, user counts, and refresh status.

## Commands
```bash
ae-cli analysis_audience +get_clusters_by_name --project_id <project_id> --names '["demo"]'
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

## Enum Codebook (Asset Definition Interpretation Only)

When interpreting cluster `definition` for users, if operator enum codes appear, use the following complete `calcuSymbol` mapping instead of outputting raw codes only.

| Code | Meaning | Applicable Types |
|---|---|---|
| `C00` | equals | all |
| `C000` | equals empty string | string |
| `C01` | not equals | all |
| `C010` | not equals empty string | string |
| `C02` | less than | number |
| `C020` | less than or equal | number |
| `C03` | greater than | number |
| `C030` | greater than or equal | number |
| `C04` | has value | all |
| `C05` | no value | all |
| `C06` | range | number/date |
| `C060` | date range | date |
| `C07` | contains | string |
| `C08` | does not contain | string |
| `C09` | true | bool |
| `C10` | false | bool |
| `C11` | regex match | string |
| `C12` | regex does not match | string |
| `C13` | relative to current time | date/datetime |
| `C14` | relative to event time | date/datetime |
| `C15` | element exists | array |
| `C16` | element does not exist | array |
| `C17` | element position | array |
| `C18` | no value | array |
| `C19` | has value | array |
| `C20` | belongs to cluster | cluster/tag (`tableType="2"`) |
| `C21` | does not belong to cluster | cluster/tag (`tableType="2"`) |
| `C22` | object exists that satisfies condition | array |
| `C23` | no object satisfies condition | array |
| `C24` | all objects satisfy condition | array |

## Next Step on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill the gap (focus on `--project_id`, `--names`).
- If reading fails, first verify whether the object ID exists and belongs to the current project.

## Recommended Chain
- +list_clusters -> +get_clusters_by_name -> +update_cluster
