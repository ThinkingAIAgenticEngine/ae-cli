# analysis +query_adhoc (Ad Hoc Analysis Execution)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Model analysis**

## Use Cases
- Precondition helper: call `+get_analysis_query_schema` to get the structure before using this tool.
- When constructing a real `qp`, you must supplement it with real project metadata; first call `analysis_meta +list_events` and `analysis_meta +list_properties`.
- Event analysis: metrics such as event trigger counts, user counts, sums, averages, and more.
- Retention analysis: metrics such as user churn and retention.
- Funnel analysis: metrics such as multi-step conversion.
- Distribution analysis: bucketed distribution analysis.
- Attribution analysis: multi-touch attribution analysis (first touch, last touch, linear attribution).
- Interval analysis: time interval analysis between events.
- Path analysis: user behavior path analysis.
- Property analysis: user property distribution analysis.
- Heat map: visual heat map analysis of user interactions.
- Rank list: ranking / leaderboard analysis.
- SQL: custom SQL analysis.
- Process: fetch events/properties and the schema first, then assemble the query JSON, and finally execute the analysis.

## Mandatory prerequisites (MUST)
- Before constructing `--qp`, you must first read and follow these reference documents:
  - [`./get-analysis-query-schema.md`](./get-analysis-query-schema.md)
  - [`../../te-meta/references/list-events.md`](../../te-meta/references/list-events.md)
  - [`../../te-meta/references/list-properties.md`](../../te-meta/references/list-properties.md)
- Do not generate the final `qp` until the documentation review and prerequisite command calls are complete.

## Prerequisite call chain (required for constructing qp)
1. First determine `--model_type`.
2. Read `get-analysis-query-schema.md`, then call `ae-cli analysis +get_analysis_query_schema --model_type <model_type>` to get the structure.
3. Read `list-events.md`, then call `ae-cli analysis_meta +list_events --project_id 1` to get the available events.
4. Read `list-properties.md`, then call `ae-cli analysis_meta +list_properties --project_id 1` to get the available properties.
5. Build `qp` from the schema + metadata, then call `+query_adhoc`.

## Command
```bash
ae-cli analysis +query_adhoc --project_id 1 --model_type event --qp '{}'
ae-cli analysis +query_adhoc --project_id 1 --model_type event --qp '{}' --zone_offset 8 --request_id demo --use_cache true --is_sort_by_columns true --resolve_recent_day true --timeout_minutes 8
ae-cli analysis +query_adhoc --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID used to identify the analysis project |
| `--model_type` | Yes | Model type. Supported values: event, retention, funnel, distribution, attribution, heat_map, interval, path, rank_list, prop_analysis, sql. |
| `--qp` | Yes | Query parameter JSON. MUST call `+get_analysis_query_schema` first, and use event/property metadata from `analysis_meta +list_events` / `analysis_meta +list_properties` in the same `project_id`. |
| `--request_id` | No | Optional unique request ID used for tracking and deduplication. Generated automatically if omitted. |
| `--use_cache` | No | Whether to use result cache. Default: true |
| `--zone_offset` | No | Time zone offset in hours. For example, UTC+8 is 8 and UTC-5 is -5 |
| `--is_sort_by_columns` | No | Whether to sort query results by columns. Default: false |
| `--resolve_recent_day` | No | Whether to resolve relative time expressions such as "last 7 days". Default: false |
| `--timeout_minutes` | No | Query timeout in minutes. If the query exceeds this time, it will be cancelled automatically. |

## Decision Rules
- On the first run, start with only the required parameters (`--project_id`,`--model_type`,`--qp`), and add optional parameters after confirming the path works.
- `qp` cannot be written from experience alone: it must satisfy both the schema structure and the project metadata constraints.
- Before calling `list_events` / `list_properties`, you must first study the corresponding reference documents.
- Wrap JSON parameters in single quotes (for example `--qp '{}'`) to avoid shell escaping issues.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id`, `--model_type`, `--qp`).
- If `Invalid JSON` appears, first check the schema required fields, then verify whether the event/property names come from metadata query results for the same `project_id`.
- If the query times out or results are abnormal, first narrow the time range / grouping dimensions, then split the subqueries to locate the issue.

## Recommended chaining
- +get_analysis_query_schema -> analysis_meta +list_events -> analysis_meta +list_properties -> +query_adhoc
- +list_events -> +list_properties -> +query_adhoc -> +drilldown_users -> +drilldown_user_events
