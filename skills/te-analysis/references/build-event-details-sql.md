# te_analysis +build_event_details_sql (generate event detail SQL)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Event Detail SQL Queries**

## Use Cases
- When building `filters` / `properties`, first obtain the filter schema and the project's real event/property metadata.
- Build the SQL for an event details query. The parameters are the same as `+query_event_details`, but the tool returns SQL instead of query results.
- Build the SQL for an event details query.

## Mandatory Prerequisites (MUST)
- Before building `--filters` / `--properties`, you must first read and follow the following reference docs:
  - [`./get-filter-schema.md`](./get-filter-schema.md)
  - [`../../te-meta/references/list-events.md`](../../te-meta/references/list-events.md)
  - [`../../te-meta/references/list-properties.md`](../../te-meta/references/list-properties.md)
- Do not generate final `filters` / `properties` until the above docs have been read and the prerequisite commands have been called.

## Prerequisite Call Chain (required for filters/properties)
1. Read `get-filter-schema.md`, then call `te-cli te_analysis +get_filter_schema` to get the filter structure.
2. Read `list-events.md`, then call `te-cli te_meta +list_events --project_id 1` to confirm available event names.
3. Read `list-properties.md`, then call `te-cli te_meta +list_properties --project_id 1` to get available properties.
4. Build `filters` / `properties` based on the schema and metadata, then call `+build_event_details_sql`.

## Commands
```bash
te-cli te_analysis +build_event_details_sql --project_id 1 --event_name login --start_time '2026-04-08 00:00:00' --end_time '2026-04-08 23:59:59'
te-cli te_analysis +build_event_details_sql --project_id 1 --event_name login --relative_date_range 0-7 --filters '{}' --properties '{}' --sort_by time --sort_order desc --limit 100 --zone_offset 8
te-cli te_analysis +build_event_details_sql --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--event_name` | Yes | Event name |
| `--start_time` | No | Start time. Format: yyyy-MM-dd HH:mm:ss |
| `--end_time` | No | End time. Format: yyyy-MM-dd HH:mm:ss |
| `--relative_date_range` | No | Optional relative date range in m-n format. For example, 0-7 means the most recent 7 days including today. Use either this field or start_time/end_time. |
| `--filters` | No | Optional filter JSON. If provided, MUST follow `+get_filter_schema`, and referenced fields must come from `te_meta +list_properties` in the same `project_id`. |
| `--properties` | No | Optional display properties JSON, for example `[{"columnName":"#user_id","tableType":"0"},{"columnName":"device_id","tableType":"0"}]`. If provided, property names should come from `te_meta +list_properties` in the same `project_id`. |
| `--sort_by` | No | Optional sort field |
| `--sort_order` | No | Optional sort order. Supported values: asc and desc |
| `--limit` | No | Optional result limit. Default: 100 |
| `--zone_offset` | No | Time zone offset. For example, UTC+8 is 8 |

## Decision Rules
- `filters` / `properties` cannot be written by hand based on experience alone: they must satisfy both the schema structure and the project's real metadata.
- `list_events` / `list_properties` must be learned from the corresponding reference docs before calling them.
- For the first run, it is recommended to pass only the required parameters (`--project_id`, `--event_name`) and add optional parameters after confirming the chain works.
- Wrap JSON parameters in single quotes (for example `--filters '{}'`, `--properties '{}'`) to avoid shell escaping issues.
- When dates/time ranges are involved, validate with a short range first and then expand gradually.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id`, `--event_name`).
- If `Invalid JSON` appears, first check the required filter schema fields, then verify that the event name/property name comes from metadata queried in the same `project_id`.

## Recommended Chaining
- +get_filter_schema -> te_meta +list_events -> te_meta +list_properties -> +build_event_details_sql
- +query_entity_details -> +query_event_details -> +build_event_details_sql
