# analysis +build_entity_details_sql (Generate Entity Details SQL)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Entity details SQL queries**

## Use Cases
- When constructing `definition`, you must first obtain the cluster schema and fill in the project event/property metadata.
- Build the SQL for an entity details query. The parameters are the same as `+query_entity_details`, but the tool returns SQL instead of query results.
- Build the SQL for an entity details query.

## Mandatory prerequisites (MUST)
- Before constructing `--definition` / `--properties`, you must first read and follow these reference documents:
  - [`../../te-audience/references/get-cluster-definition-schema.md`](../../te-audience/references/get-cluster-definition-schema.md)
  - [`../../te-meta/references/list-events.md`](../../te-meta/references/list-events.md)
  - [`../../te-meta/references/list-properties.md`](../../te-meta/references/list-properties.md)
- Do not generate the final `definition` / `properties` until the documentation review and prerequisite command calls are complete.

## Prerequisite call chain (required for constructing definition/properties)
1. First confirm the cluster type (condition / sql).
2. Read `get-cluster-definition-schema.md`, then call `ae-cli analysis_audience +get_cluster_definition_schema --cluster_type <condition|sql>` to get the structure.
3. Read `list-events.md`, then call `ae-cli analysis_meta +list_events --project_id 1`.
4. Read `list-properties.md`, then call `ae-cli analysis_meta +list_properties --project_id 1`.
5. Build `definition` (and optional `properties`) from the schema + metadata, then call `+build_entity_details_sql`.

## Command
```bash
ae-cli analysis +build_entity_details_sql --project_id 1 --definition '{}'
ae-cli analysis +build_entity_details_sql --project_id 1 --entity_id 1001 --definition '{}' --properties '{}' --sort_by time --sort_order desc --limit 100 --zone_offset 8
ae-cli analysis +build_entity_details_sql --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--entity_id` | No | Optional entity ID used in multi-entity scenarios. If omitted, the default user entity is used. |
| `--definition` | Yes | Cluster definition JSON. MUST call `+get_cluster_definition_schema` first, then fill valid event/property names from `analysis_meta +list_events` / `analysis_meta +list_properties` in the same `project_id`. |
| `--properties` | No | Optional display properties JSON, for example `[{"columnName":"#user_id","tableType":"0"},{"columnName":"device_id","tableType":"0"}]`. If provided, property names should come from `analysis_meta +list_properties` in the same `project_id`. |
| `--sort_by` | No | Optional sort field |
| `--sort_order` | No | Optional sort order. Supported values: asc and desc |
| `--limit` | No | Optional result limit. Default: 1000, maximum: 10000 |
| `--zone_offset` | No | Time zone offset. For example, UTC+8 is 8 |

## Decision Rules
- `definition` / `properties` cannot be written from experience alone: they must satisfy both the schema structure and the project metadata constraints.
- Before calling `list_events` / `list_properties`, you must first study the corresponding reference documents.
- On the first run, start with only the required parameters (`--project_id`, `--definition`) and add optional parameters after confirming the path works.
- Wrap JSON parameters in single quotes (for example `--definition '{}'`, `--properties '{}'`) to avoid shell escaping issues.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id` and `--definition`).
- If `Invalid JSON` appears, first check the schema required fields, then verify whether the event/property names come from metadata query results for the same `project_id`.

## Recommended chaining
- +get_cluster_definition_schema -> analysis_meta +list_events -> analysis_meta +list_properties -> +build_entity_details_sql
- +query_entity_details -> +query_event_details -> +build_event_details_sql
