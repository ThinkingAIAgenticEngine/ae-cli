# te_audience +update_cluster (Update Cluster)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Cluster Management**

## Use Cases
- Prerequisite helper: first call `+get_cluster_definition_schema` to get the structure, then supplement it with the project's real metadata (events and properties).
- Update a user cluster definition. Supports updating the display name, remark, type, or definition. Updating only the display name or remark does not trigger recomputation.

## Required Prerequisites (MUST only when updating definition)
- If this request includes `--definition`, you must first read and follow these reference docs:
  - [`./get-cluster-definition-schema.md`](./get-cluster-definition-schema.md)
  - [`../../te-meta/references/list-events.md`](../../te-meta/references/list-events.md)
  - [`../../te-meta/references/list-properties.md`](../../te-meta/references/list-properties.md)
- Do not submit a new `definition` until the above docs have been read and the prerequisite commands have been run.

## Prerequisite Call Chain (run only when updating definition)
1. First determine `--type` (condition / sql).
2. Read `get-cluster-definition-schema.md`, then call `te-cli te_audience +get_cluster_definition_schema --cluster_type <condition|sql>` to obtain the structure.
3. Read `list-events.md`, then call `te-cli te_meta +list_events --project_id 1`.
4. Read `list-properties.md`, then call `te-cli te_meta +list_properties --project_id 1`.
5. Build the new `definition` based on the schema + metadata, then run `+update_cluster`.

## Commands
```bash
te-cli te_audience +update_cluster --project_id 1 --cluster_name demo --display_name "Demo v2"
te-cli te_audience +update_cluster --project_id 1 --cluster_name demo --type condition --definition '{}' --zone_offset 8
te-cli te_audience +update_cluster --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--cluster_name` | Yes | Cluster name |
| `--display_name` | No | New cluster display name. Length: 1-80 |
| `--remark` | No | New cluster remark |
| `--type` | No | New cluster type. Supported values: condition and sql. It is recommended to provide this when updating the definition. |
| `--definition` | No | New cluster definition JSON. If provided, MUST call `+get_cluster_definition_schema` first, then fill valid event/property names from `te_meta` metadata commands in the same `project_id`. |
| `--zone_offset` | No | Optional time zone offset for cluster computation. Valid range: -12 to 14 (supports decimals like 5.5). |

## Decision Rules
- If you are not updating `definition` (only updating `display_name`/`remark`), you can skip the schema and metadata prerequisite chain.
- When updating `definition`, it cannot be written from experience alone; it must satisfy both the schema structure and the project's real metadata.
- Before calling `list_events` / `list_properties`, you must first read the corresponding reference docs.
- For the first execution, it is recommended to pass only the required parameters (`--project_id`, `--cluster_name`) and add optional parameters after confirming the path works.
- Wrap JSON parameters in single quotes (e.g. `--definition '{}'`) to avoid shell escaping issues.
- When troubleshooting across projects, first confirm whether `--project_id` matches the current permissions and target environment.
- Write operations keep confirmation prompts by default; for automation scenarios, reevaluate whether to use `--yes`.

## Next Step on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill the gap (focus on `--project_id`, `--cluster_name`).
- If `Invalid JSON` appears, first check whether a schema-required field is missing, then verify whether event/property names come from the same `project_id`'s metadata query results.
- If the result after writing is not as expected, immediately re-read the corresponding list/get interfaces and compare before and after.

## Recommended Chain
- +get_cluster_definition_schema -> te_meta +list_events -> te_meta +list_properties -> +update_cluster
- +list_clusters -> +get_clusters_by_name -> +update_cluster
