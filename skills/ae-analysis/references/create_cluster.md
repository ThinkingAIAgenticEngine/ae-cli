# analysis_audience +create_cluster (Create Cluster)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Cluster Management**

## Use Cases
- Prerequisite helper: first call `+get_cluster_definition_schema` to obtain the `definition` structure, then call this tool.
- When building a real `definition`, metadata must be verified in the same session and `project_id`: first build in this session must call `analysis_meta +list_events` and `analysis_meta +list_properties`; later calls should reuse the session-verified results first.
- Create a user cluster definition. Supports the condition and sql cluster types. Returns cluster information without cluster members.

## Required Prerequisites (MUST)
- Before constructing `--definition`, you must first read and follow these reference docs:
  - [`./get_cluster_definition_schema.md`](./get_cluster_definition_schema.md)
  - [`./list_events.md`](./list_events.md)
  - [`./list_properties.md`](./list_properties.md)
- Do not generate the final `definition` until the above docs have been read and metadata has been verified: first build in this session for the same `project_id` must run metadata commands; if session-verified metadata already exists, reuse it first.

## Prerequisite Call Chain (Required for Building Definition)
1. Read `get_cluster_definition_schema.md` to understand the input and output structure of `+get_cluster_definition_schema`.
2. Obtain the schema progressively (by cluster type). Start with base mode:
   `ae-cli analysis_audience +get_cluster_definition_schema --cluster_type condition`
   Request `--response_mode examples` only if base is insufficient; request `--response_mode full` only for complex, ambiguous, or repeatedly failing definition construction.
3. Read `list_events.md` to understand the parameters and return structure of `+list_events`.
4. Get the event list (for `event_name` and other fields): if this is the first definition build in the current session for this `project_id` (or metadata is not yet verified), call
   `ae-cli analysis_meta +list_events --project_id <project_id>`;
   otherwise, reuse the session-verified event metadata first.
5. Read `list_properties.md` to understand the parameters and return structure of `+list_properties`.
6. Get the property list (for property filters, grouping, and comparison fields): if this is the first definition build in the current session for this `project_id` (or metadata is not yet verified), call
   `ae-cli analysis_meta +list_properties --project_id <project_id>`;
   otherwise, reuse the session-verified property metadata first.
7. Build `definition` based on the schema + metadata, then call `+create_cluster`.

## Commands
```bash
ae-cli analysis_audience +create_cluster --project_id <project_id> --cluster_name demo --display_name demo --definition '{}'
ae-cli analysis_audience +create_cluster --project_id <project_id> --cluster_name demo --display_name demo --type condition --definition '{}' --zone_offset 8 --entity_id 1001
ae-cli analysis_audience +create_cluster --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--cluster_name` | Yes | Cluster name. Must start with a letter and contain only letters, digits, and underscores. Length: 1-80 |
| `--display_name` | Yes | Cluster display name. Length: 1-80 |
| `--type` | No | Cluster type. Supported values: condition and sql. Default: condition |
| `--definition` | Yes | Cluster definition JSON. MUST call `+get_cluster_definition_schema` first to learn the exact structure, then fill valid event/property names from metadata verified in the same `project_id` (first build queries `analysis_meta` metadata commands; later builds in the same session should reuse verified results first). |
| `--zone_offset` | No | Optional time zone offset for cluster computation. Valid range: -12 to 14 (supports decimals like 5.5). If the user does not specify a timezone, omit this parameter. When a timezone is specified, call get_project_config first to check whether the project supports time zones (timeZoneEnabled) and available values (availableTimeZones). |
| `--entity_id` | No | Optional entity ID for cluster definition. Use list_entities to query available entities. |

## Decision Rules
- `definition` cannot be written from experience alone: it must satisfy both the schema structure and the project's real metadata (events and properties).
- Determine `--type` first, then fetch the schema for the corresponding `--cluster_type`; do not mix condition/sql structures.
- Use progressive schema loading: base first, examples only when needed, full only as a last resort. Do not request full schema for simple cluster creation when the intent is clear.
- Before calling `list_events` / `list_properties`, you must first read their reference docs to avoid misuse of parameters or misreading return fields. Query metadata on the first build in this session for the same `project_id`; after that, prefer reusing session-verified metadata.
- For the first execution, it is recommended to pass only the required parameters (`--project_id`, `--cluster_name`, `--display_name`, `--definition`) and add optional parameters after confirming the path works.
- Wrap JSON parameters in single quotes (e.g. `--definition '{}'`) to avoid shell escaping issues.
- When troubleshooting across projects, first confirm whether `--project_id` matches the current permissions and target environment.
- Write operations keep confirmation prompts by default; for automation scenarios, reevaluate whether to use `--yes`.

## Next Step on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill the gap (focus on `--project_id`, `--cluster_name`, `--display_name`, `--definition`).
- If `Invalid JSON` appears, first check whether a schema-required field is missing, then verify whether event/property names come from the same `project_id`'s `list_events/list_properties` results.
- If the result after writing is not as expected, immediately re-read the corresponding list/get interfaces and compare before and after.

## Recommended Chain
- +get_cluster_definition_schema -> (first build or refresh) analysis_meta +list_events -> analysis_meta +list_properties -> +create_cluster
- +list_clusters -> +get_clusters_by_name -> +update_cluster
