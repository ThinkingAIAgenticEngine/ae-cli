# analysis +create_report (Create Report)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Report management**

## Use Cases
- Precondition helper: call `+get_analysis_query_schema` to get the structure before using this tool.
- When constructing a real `analysis_query`, you must supplement it with real project metadata; first call `analysis_meta +list_events` and `analysis_meta +list_properties`.
- Create and persist a new report definition. Returns the new report ID and name without querying data or modifying existing reports.

## Mandatory prerequisites (MUST)
- Before constructing `--analysis_query`, you must first read and follow these reference documents:
  - [`./get-analysis-query-schema.md`](./get-analysis-query-schema.md)
  - [`../../te-meta/references/list-events.md`](../../te-meta/references/list-events.md)
  - [`../../te-meta/references/list-properties.md`](../../te-meta/references/list-properties.md)
- Do not generate the final `analysis_query` until the documentation review and prerequisite command calls are complete.

## Prerequisite call chain (required for constructing analysis_query)
1. First determine `--model_type`.
2. Read `get-analysis-query-schema.md`, then call `ae-cli analysis +get_analysis_query_schema --model_type <model_type>` to get the structure.
3. Read `list-events.md`, then call `ae-cli analysis_meta +list_events --project_id 1`.
4. Read `list-properties.md`, then call `ae-cli analysis_meta +list_properties --project_id 1`.
5. Build `analysis_query` from the schema + metadata, then call `+create_report`.

## Command
```bash
ae-cli analysis +create_report --project_id 1 --report_name demo --model_type event --analysis_query '{}'
ae-cli analysis +create_report --project_id 1 --report_name demo --model_type event --analysis_query '{}' --description demo --cache_seconds 8 --query_duration_ms 8 --dashboard_ids '[]'
ae-cli analysis +create_report --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--report_name` | Yes | Report name. Length: 1-80 characters |
| `--model_type` | Yes | Report model type. Supported values: event, retention, funnel, prop_analysis, path, distribution, sql, interval, attribution |
| `--analysis_query` | Yes | Report analysis query JSON. MUST call `+get_analysis_query_schema` first, and use event/property metadata from `analysis_meta +list_events` / `analysis_meta +list_properties` in the same `project_id`. |
| `--description` | No | Optional report description |
| `--cache_seconds` | No | Optional cache duration in seconds |
| `--query_duration_ms` | No | Optional query duration in milliseconds |
| `--dashboard_ids` | No | Optional list of dashboard IDs to associate |

## Decision Rules
- `analysis_query` cannot be written from experience alone: it must satisfy both the schema structure and the project metadata constraints.
- Before calling `list_events` / `list_properties`, you must first study the corresponding reference documents.
- On the first run, start with only the required parameters (`--project_id`,`--report_name`,`--model_type`), and add optional parameters after confirming the path works.
- Wrap JSON parameters in single quotes (for example `--analysis_query '{}'`, `--dashboard_ids '{}'`) to avoid shell escaping issues.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.
- Write operations keep the confirmation prompt by default; evaluate whether to use `--yes` for automated scenarios.

## Next Steps on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id`, `--report_name`, `--model_type`).
- If `Invalid JSON` appears, first check the schema required fields, then verify whether the event/property names come from metadata query results for the same `project_id`.
- If the result after writing does not match expectations, immediately read back the corresponding list/get interface to compare before and after.

## Recommended chaining
- +get_analysis_query_schema -> analysis_meta +list_events -> analysis_meta +list_properties -> +create_report
- +list_reports -> +get_report_definition -> +query_report_data
