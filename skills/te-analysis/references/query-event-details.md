# te_analysis +query_event_details (Query Event Details)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Event detail queries**

## Use Cases
- When constructing `filters` / `properties`, you must first obtain the filter schema and the project metadata for real events/properties.
- Query event detail data. Supports time range, filters, display properties, sorting, and result limits.
- Query event detail data.

## Mandatory prerequisites (MUST)
- Before constructing `--filters` / `--properties`, you must first read and follow these reference documents:
  - [`./get-filter-schema.md`](./get-filter-schema.md)
  - [`../../te-meta/references/list-events.md`](../../te-meta/references/list-events.md)
  - [`../../te-meta/references/list-properties.md`](../../te-meta/references/list-properties.md)
- Do not generate the final `filters` / `properties` until the documentation review and prerequisite command calls are complete.

## Prerequisite call chain (required for constructing filters/properties)
1. Read `get-filter-schema.md`, then call `te-cli te_analysis +get_filter_schema` to get the filter structure.
2. Read `list-events.md`, then call `te-cli te_meta +list_events --project_id 1` to confirm the available event names.
3. Read `list-properties.md`, then call `te-cli te_meta +list_properties --project_id 1` to get the available properties.
4. Build `filters` / `properties` from the schema + metadata, then call `+query_event_details`.

## Command
```bash
te-cli te_analysis +query_event_details --project_id 1 --event_name login --start_time '2026-04-08 00:00:00' --end_time '2026-04-08 23:59:59'
te-cli te_analysis +query_event_details --project_id 1 --event_name login --relative_date_range 0-7 --filters '{}' --properties '{}' --sort_by time --sort_order desc --limit 100 --zone_offset 8 --use_cache true
te-cli te_analysis +query_event_details --dry-run
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
| `--limit` | No | Optional result limit. Default: 1000 |
| `--zone_offset` | No | Time zone offset. For example, UTC+8 is 8 |
| `--use_cache` | No | Whether to use cache. Default: true |

## Decision Rules
- `filters` / `properties` cannot be written from experience alone: they must satisfy both the schema structure and the project metadata constraints.
- Before calling `list_events` / `list_properties`, you must first study the corresponding reference documents.
- On the first run, start with only the required parameters (`--project_id`, `--event_name`) and add optional parameters after confirming the path works.
- Wrap JSON parameters in single quotes (for example `--filters '{}'`, `--properties '{}'`) to avoid shell escaping issues.
- When dates/time ranges are involved, first verify with a short range, then gradually expand the range.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id`, `--event_name`).
- If `Invalid JSON` appears, first check the filter schema required fields, then verify whether the event/property names come from metadata query results for the same `project_id`.
- If the query times out or results are abnormal, first narrow the time range / grouping dimensions, then split the subqueries to locate the issue.

## Recommended chaining
- +get_filter_schema -> te_meta +list_events -> te_meta +list_properties -> +query_event_details
- +query_entity_details -> +query_event_details -> +build_event_details_sql
