# analysis +query_entity_details (query entity details)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Entity Detail Queries**

## Use Cases
- When building `definition`, first obtain the cluster schema and supplement it with the project's real event/property metadata.
- Query entity detail data. Returns user detail results based on the entity ID and cluster definition, and supports display properties, sorting, and result limits.
- Query entity detail data.

## Mandatory Prerequisites (MUST)
- Before building `--definition` / `--properties`, you must first read and follow the following reference docs:
  - [`../../te-audience/references/get-cluster-definition-schema.md`](../../te-audience/references/get-cluster-definition-schema.md)
  - [`../../te-meta/references/list-events.md`](../../te-meta/references/list-events.md)
  - [`../../te-meta/references/list-properties.md`](../../te-meta/references/list-properties.md)
- Do not generate final `definition` / `properties` until the above docs have been read and the prerequisite commands have been called.

## Prerequisite Call Chain (required for building definition/properties)
1. First confirm the cluster type (condition / sql).
2. Read `get-cluster-definition-schema.md`, then call `ae-cli analysis_audience +get_cluster_definition_schema --cluster_type <condition|sql>` to get the structure.
3. Read `list-events.md`, then call `ae-cli analysis_meta +list_events --project_id 1`.
4. Read `list-properties.md`, then call `ae-cli analysis_meta +list_properties --project_id 1`.
5. Build `definition` (and optional `properties`) based on the schema and metadata, then call `+query_entity_details`.

## Commands
```bash
ae-cli analysis +query_entity_details --project_id 1 --definition '{}'
ae-cli analysis +query_entity_details --project_id 1 --entity_id 1001 --definition '{}' --properties '{}' --sort_by time --sort_order desc --limit 100 --zone_offset 8 --use_cache true
ae-cli analysis +query_entity_details --dry-run
```

## Parameters
| Parameter | Required | Description                                                                                                                                                                                                                                      |
|---|---|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `--project_id` / `-p` | Yes | Project ID                                                                                                                                                                                                                              |
| `--entity_id` | No | Optional entity ID used in multi-entity scenarios. If omitted, the default user entity is used.                                                                                                                                         |
| `--definition` | Yes | Cluster definition JSON. MUST call `+get_cluster_definition_schema` first, then fill valid event/property names from `analysis_meta +list_events` / `analysis_meta +list_properties` in the same `project_id`.                                      |
| `--properties` | No | Optional display properties JSON, for example `[{"columnName":"#user_id","tableType":"0"},{"columnName":"device_id","tableType":"0"}]`. If provided, property names should come from `analysis_meta +list_properties` in the same `project_id`. |
| `--sort_by` | No | Optional sort field                                                                                                                                                                                                                     |
| `--sort_order` | No | Optional sort order. Supported values: asc and desc                                                                                                                                                                                     |
| `--limit` | No | Optional result limit. Default: 1000, maximum: 10000                                                                                                                                                                                    |
| `--zone_offset` | No | Time zone offset. For example, UTC+8 is 8                                                                                                                                                                                               |
| `--use_cache` | No | Whether to use cache. Default: true                                                                                                                                                                                                     |

## Decision Rules
- `definition` / `properties` cannot be written by hand based on experience alone: they must satisfy both the schema structure and the project's real metadata.
- `list_events` / `list_properties` must be learned from the corresponding reference docs before calling them.
- For the first run, it is recommended to pass only the required parameters (`--project_id`, `--definition`) and add optional parameters after confirming the chain works.
- Wrap JSON parameters in single quotes (for example `--definition '{}'`, `--properties '{}'`) to avoid shell escaping issues.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id`, `--definition`).
- If `Invalid JSON` appears, first check the required schema fields, then verify that the event name/property name comes from metadata queried in the same `project_id`.
- If the query times out or the result is abnormal, first reduce the time range/grouping dimensions, then split the query to locate the issue.

## Recommended Chaining
- +get_cluster_definition_schema -> analysis_meta +list_events -> analysis_meta +list_properties -> +query_entity_details
- +query_entity_details -> +query_event_details -> +build_event_details_sql
