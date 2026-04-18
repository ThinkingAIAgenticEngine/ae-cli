# te_analysis +drilldown_users (drill down analysis results to users)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Model Analysis**

## Use Cases
- Prerequisite helper: first call `+get_analysis_query_schema` to get the structure, then call this tool.
- Drill down to the user list for a specific data point in an existing analysis result.
- Use this tool only after query_adhoc, query_report_data, or query_dashboard_report_data.
- The qp must stay the same as the previous analysis.
- Drilldown parameters such as drilldownDate, drilldownGroups, retentionDays, and funnelStep must come from actual analysis results and must not be guessed.
- Prerequisite: it is recommended to first run query_adhoc, query_report_data, or query_dashboard_report_data, then call this tool.
- Constraint: drilldown positioning parameters must come from the previous query result and must not be guessed.

## Mandatory Prerequisites (MUST)
- Before building `--qp` and the drilldown positioning parameters, you must first read and follow the following reference docs:
  - [`./query-adhoc.md`](./query-adhoc.md)
  - [`./query-report-data.md`](./query-report-data.md)
  - [`./query-dashboard-report-data.md`](./query-dashboard-report-data.md)
- `qp`, `drilldown_date`, `drilldown_groups`, `event_index`, `retention_days`, `funnel_step`, and other parameters must come from real analysis results and must not be guessed.
- Do not execute user drilldown until the upstream query and result reread have been completed.

## Prerequisite Call Chain (required for drilldown)
1. Run the upstream analysis first (`+query_adhoc` / `+query_report_data` / `+query_dashboard_report_data`) and save the result.
2. Extract `qp` and the drilldown positioning parameters from the upstream result.
3. Verify that `--model_type` matches the upstream analysis model.
4. Call `+drilldown_users` to execute the user drilldown.

## Commands
```bash
ae-cli te_analysis +drilldown_users --project_id 1 --model_type event --qp '{}'
ae-cli te_analysis +drilldown_users --project_id 1 --model_type retention --qp '{}' --drilldown_date 2026-04-08 --drilldown_groups '[]' --event_index 8 --is_lost true --retention_days 8 --is_churned_user true --funnel_step 8 --interval demo --distribution_bucket 8 --compare_index 8 --include_total true --relation_val demo
ae-cli te_analysis +drilldown_users --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--model_type` | Yes | Model type used in the source analysis. Supported values: event, retention, funnel, distribution, attribution, heat_map, interval, path, rank_list, prop_analysis, sql. |
| `--qp` | Yes | Query parameter JSON used for drilldown. MUST be copied from the source analysis request/result and keep consistent with upstream context. |
| `--properties` | No | Optional user properties JSON array |
| `--zone_offset` | No | Time zone offset. For example, UTC+8 is 8 |
| `--drilldown_date` | No | Target drilldown date from the analysis result. Required for event and retention models. Format: yyyy-MM-dd |
| `--drilldown_groups` | No | Drilldown group values from the analysis result as a JSON array, for example ["ios"]. Defaults to the overall group when omitted. |
| `--event_index` | No | Event index for event-model drilldown. Use the event position from the analysis result starting from 0. |
| `--is_lost` | No | For retention analysis, true queries lost users and false queries retained users. Default: false |
| `--retention_days` | No | Retention interval in days from the analysis result, for example 7 for day-7 retention. If model_type is 'retention', the retention_days must not be null. |
| `--is_churned_user` | No | For funnel analysis, true queries churned users for the step and false queries converted users. Default: false |
| `--funnel_step` | No | Funnel step number from the analysis result starting from 1. If model_type is 'funnel', the funnel_step must not be null. |
| `--interval` | No | Interval |
| `--distribution_bucket` | No | Distribution bucket index from the analysis result |
| `--compare_index` | No | Comparison index used in comparison analysis scenarios |
| `--include_total` | No | Whether to query users from the total row. Default: false |
| `--relation_val` | No | Relation value used in relation analysis scenarios |
| `--use_cache` | No | Whether to use cache. Default: true |
| `--timeout_minutes` | No | Query timeout in minutes. If the query exceeds this time, it will be cancelled automatically. |

## Decision Rules
- Drilldown positioning parameters must come from upstream analysis results and must not be fabricated.
- `qp` must not be rewritten or "simplified"; it should remain consistent with the source analysis.
- For the first run, it is recommended to pass only the required parameters (`--project_id`, `--model_type`, `--qp`) and add optional parameters after confirming the chain works.
- Wrap JSON parameters in single quotes (for example `--qp '{}'`, `--drilldown_groups '{}'`) to avoid shell escaping issues.
- When dates/time ranges are involved, validate with a short range first and then expand gradually.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id`, `--model_type`, `--qp`).
- If `Invalid JSON` appears, first check the raw `qp` from the upstream query request, then verify that all necessary drilldown parameters are present.

## Recommended Chaining
- +query_adhoc -> +drilldown_users
- +query_report_data -> +drilldown_users
- +query_dashboard_report_data -> +drilldown_users
