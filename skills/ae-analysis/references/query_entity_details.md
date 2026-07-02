# analysis +query_entity_details (query entity details)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Entity Detail Queries**

## Use Cases
- When building `definition`, first obtain the cluster schema and supplement it with the project's real event/property metadata.
- Query entity detail data. Returns user detail results based on the entity ID and cluster definition, and supports display properties, sorting, and result limits.
- Query entity detail data.

## Mandatory Prerequisites (MUST)
- Before building `--definition` / `--properties`, you must first read and follow the following reference docs:
  - [`./get_cluster_definition_schema.md`](./get_cluster_definition_schema.md)
  - [`./list_events.md`](./list_events.md)
  - [`./list_properties.md`](./list_properties.md)
- Do not generate final `definition` / `properties` until the above docs have been read and the prerequisite commands have been called.

## Prerequisite Call Chain (required for building definition/properties)
1. First confirm the cluster type (condition / sql).
2. Read `get_cluster_definition_schema.md`, then call `ae-cli analysis_audience +get_cluster_definition_schema --cluster_type <condition|sql>` to get the structure.
3. Read `list_events.md`, then call `ae-cli analysis_meta +list_events --project_id <project_id>`.
4. Read `list_properties.md`, then call `ae-cli analysis_meta +list_properties --project_id <project_id>`.
5. Build `definition` (and optional `properties`) based on the schema and metadata, then call `+query_entity_details`.

## Commands
```bash
ae-cli analysis +query_entity_details --project_id <project_id> --definition '{}'
ae-cli analysis +query_entity_details --project_id <project_id> --entity_id 1001 --definition '{}' --properties '{}' --sort_by time --sort_order desc --limit 20 --zone_offset 8 --use_cache true --request_id mcp_eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee --timeout_minutes 8
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
| `--limit` | No | Optional result limit. Default: 1000, maximum: 10000                                                                                                                                                                                         |
| `--zone_offset` | No | Time zone offset. For example, UTC+8 is 8                                                                                                                                                                                               |
| `--use_cache` | No | Whether to use cache. Default: true                                                                                                                                                                                                     |
| `--request_id` | Yes | Required unique request ID used for tracking and cancellation. Generate it before starting the query. It must use `mcp_<32 lowercase hex UUID>`, for example `mcp_0123456789abcdef0123456789abcdef`. Provide this before starting the query so it can be cancelled later with `+cancel_query --request_id <same value>`, even if the caller stops waiting before the tool returns. If `fetch failed`, HTTP timeout, or caller timeout happens, the backend query may still be running. `requestId` is not auto-generated for MCP query tools because the caller must know it before the response for proactive cleanup. If omitted or blank, the backend returns `REQUEST_ID_REQUIRED`; invalid format returns `INVALID_REQUEST_ID`. The response `metadata.requestId` echoes the supplied requestId and can also be passed to `cancel_query(requestId)` when the query is no longer needed. |
| `--timeout_minutes` | No | Query timeout in minutes. If omitted, 30 minutes is used. |

## Decision Rules
- `definition` / `properties` cannot be written by hand based on experience alone: they must satisfy both the schema structure and the project's real metadata.
- `list_events` / `list_properties` must be learned from the corresponding reference docs before calling them.
- For the first run, include all required parameters (`--project_id`, `--definition`, `--request_id`) and add optional parameters after confirming the chain works.
- Wrap JSON parameters in single quotes (for example `--definition '{}'`, `--properties '{}'`) to avoid shell escaping issues.
- Generate and pass `--request_id` before starting any cancelable query; it is required. If `fetch failed`, HTTP timeout, or caller timeout happens, the backend query may still be running; call `+cancel_query --request_id <same value>` with the preset ID. The value must use `mcp_<32 lowercase hex UUID>`, for example `mcp_0123456789abcdef0123456789abcdef`. Omitted or blank IDs return `REQUEST_ID_REQUIRED`; invalid format returns `INVALID_REQUEST_ID`.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id`, `--definition`, `--request_id`).
- If `Invalid JSON` appears, first check the required schema fields, then verify that the event name/property name comes from metadata queried in the same `project_id`.
- If the query times out or the result is abnormal, first reduce the time range/grouping dimensions, then split the query to locate the issue.

## Recommended Chaining
- +get_cluster_definition_schema -> analysis_meta +list_events -> analysis_meta +list_properties -> +query_entity_details
- +query_entity_details -> +query_event_details -> +build_event_details_sql
