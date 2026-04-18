# te_audience +create_cluster (Create Cluster)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Cluster Management**

## Use Cases
- Prerequisite helper: first call `+get_cluster_definition_schema` to obtain the `definition` structure, then call this tool.
- When building a real `definition`, you must supplement it with real project metadata: first call `te_meta +list_events` and `te_meta +list_properties`, then fill in event names/property names.
- Create a user cluster definition. Supports the condition and sql cluster types. Returns cluster information without cluster members.

## Required Prerequisites (MUST)
- Before constructing `--definition`, you must first read and follow these reference docs:
  - [`./get-cluster-definition-schema.md`](./get-cluster-definition-schema.md)
  - [`../../te-meta/references/list-events.md`](../../te-meta/references/list-events.md)
  - [`../../te-meta/references/list-properties.md`](../../te-meta/references/list-properties.md)
- Do not generate the final `definition` until the above docs have been read and the prerequisite commands have been run.

## Prerequisite Call Chain (Required for Building Definition)
1. Read `get-cluster-definition-schema.md` to understand the input and output structure of `+get_cluster_definition_schema`.
2. Obtain the schema structure (by cluster type):
   `te-cli te_audience +get_cluster_definition_schema --cluster_type condition`
3. Read `list-events.md` to understand the parameters and return structure of `+list_events`.
4. Get the event list (for `event_name` and other fields):
   `te-cli te_meta +list_events --project_id 1`
5. Read `list-properties.md` to understand the parameters and return structure of `+list_properties`.
6. Get the property list (for property filters, grouping, and comparison fields):
   `te-cli te_meta +list_properties --project_id 1`
7. Build `definition` based on the schema + metadata, then call `+create_cluster`.

## Commands
```bash
te-cli te_audience +create_cluster --project_id 1 --cluster_name demo --display_name demo --definition '{}'
te-cli te_audience +create_cluster --project_id 1 --cluster_name demo --display_name demo --type condition --definition '{}' --zone_offset 8 --entity_id 1001
te-cli te_audience +create_cluster --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--cluster_name` | Yes | Cluster name. Must start with a letter and contain only letters, digits, and underscores. Length: 1-80 |
| `--display_name` | Yes | Cluster display name. Length: 1-80 |
| `--type` | No | Cluster type. Supported values: condition and sql. Default: condition |
| `--definition` | Yes | Cluster definition JSON. MUST call `+get_cluster_definition_schema` first to learn the exact structure, then use `te_meta +list_events` / `te_meta +list_properties` to fill valid event/property names from the target project. |
| `--zone_offset` | No | Optional time zone offset for cluster computation. Valid range: -12 to 14 (supports decimals like 5.5). If the user does not specify a timezone, omit this parameter. When a timezone is specified, call get_project_config first to check whether the project supports time zones (timeZoneEnabled) and available values (availableTimeZones). |
| `--entity_id` | No | Optional entity ID for cluster definition. Use list_entities to query available entities. |

## Decision Rules
- `definition` cannot be written from experience alone: it must satisfy both the schema structure and the project's real metadata (events and properties).
- Determine `--type` first, then fetch the schema for the corresponding `--cluster_type`; do not mix condition/sql structures.
- Before calling `list_events` / `list_properties`, you must first read their reference docs to avoid misuse of parameters or misreading return fields.
- For the first execution, it is recommended to pass only the required parameters (`--project_id`, `--cluster_name`, `--display_name`, `--definition`) and add optional parameters after confirming the path works.
- Wrap JSON parameters in single quotes (e.g. `--definition '{}'`) to avoid shell escaping issues.
- When troubleshooting across projects, first confirm whether `--project_id` matches the current permissions and target environment.
- Write operations keep confirmation prompts by default; for automation scenarios, reevaluate whether to use `--yes`.

## Next Step on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill the gap (focus on `--project_id`, `--cluster_name`, `--display_name`, `--definition`).
- If `Invalid JSON` appears, first check whether a schema-required field is missing, then verify whether event/property names come from the same `project_id`'s `list_events/list_properties` results.
- If the result after writing is not as expected, immediately re-read the corresponding list/get interfaces and compare before and after.

## Recommended Chain
- +get_cluster_definition_schema -> te_meta +list_events -> te_meta +list_properties -> +create_cluster
- +list_clusters -> +get_clusters_by_name -> +update_cluster
