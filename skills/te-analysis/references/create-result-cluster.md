# te_analysis +create_result_cluster (create result cluster)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Model Analysis**

## Use Cases
- Create a reusable result cluster from users matched by a drilldown condition in an existing analysis result.
- Use this tool only after query_adhoc, query_report_data, or query_dashboard_report_data.
- Keep the qp consistent with the source analysis.
- Drilldown parameters such as drilldownDate, funnelStep, and retentionDays must come from real analysis results.
- Prerequisite: it is recommended to first run query_adhoc, query_report_data, or query_dashboard_report_data, then call this tool.

## Mandatory Prerequisites (MUST)
- Before building `--qp` and the various drilldown parameters, you must first read and follow the following reference docs:
  - [`./query-adhoc.md`](./query-adhoc.md)
  - [`./query-report-data.md`](./query-report-data.md)
  - [`./query-dashboard-report-data.md`](./query-dashboard-report-data.md)
- `qp`, `drilldown_date`, `drilldown_groups`, `event_index`, `retention_days`, `funnel_step`, and other parameters must come from real analysis results and must not be guessed.
- Do not create a result cluster until the upstream query and result reread have been completed.

## Prerequisite Call Chain (required for creating a result cluster)
1. Run the upstream analysis first (`+query_adhoc` / `+query_report_data` / `+query_dashboard_report_data`) and save the result.
2. Extract `qp` and the drilldown positioning parameters (date, group, step, interval, and so on) from the upstream result.
3. Verify that `--model_type` matches the upstream analysis model.
4. Call `+create_result_cluster` to create the cluster.

## Commands
```bash
te-cli te_analysis +create_result_cluster --project_id 1 --cluster_name demo --model_type event --qp '{}'
te-cli te_analysis +create_result_cluster --project_id 1 --cluster_name demo --display_name demo --model_type event --qp '{}' --zone_offset 8 --drilldown_date 2026-04-08 --drilldown_groups '[]' --event_index 8 --is_lost true --retention_days 8 --is_churned_user true --funnel_step 8 --interval demo --distribution_bucket 8 --compare_index 8 --include_total true --relation_val demo
te-cli te_analysis +create_result_cluster --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--cluster_name` | Yes | Cluster name. Must start with a letter and contain only letters, digits, and underscores. It must be unique within the project. |
| `--display_name` | No | Optional cluster display name. If omitted, clusterName is used. |
| `--model_type` | Yes | Model type used in the source analysis. Supported values: event, retention, funnel, distribution, attribution, heat_map, interval, path, rank_list, prop_analysis, sql. |
| `--qp` | Yes | Query parameter JSON. MUST be copied from the source analysis request/result and keep fully consistent with the upstream analysis context. |
| `--zone_offset` | No | Optional time zone offset. If omitted, the project default time zone is used. |
| `--drilldown_date` | No | Target drilldown date from the analysis result. Required for event and retention models. Format: yyyy-MM-dd |
| `--drilldown_groups` | No | Drilldown group values from the analysis result as a JSON array, for example ["ios"]. Defaults to the overall group when omitted. |
| `--event_index` | No | Event index for event-model drilldown. Use the event position from the analysis result starting from 0. |
| `--is_lost` | No | For retention analysis, true saves lost users and false saves retained users. Default: false |
| `--retention_days` | No | Retention interval in days from the analysis result, for example 7 for day-7 retention |
| `--is_churned_user` | No | For funnel analysis, true saves churned users for the step and false saves converted users. Default: false |
| `--funnel_step` | No | Funnel step number from the analysis result starting from 1 |
| `--interval` | No | Interval used for interval analysis |
| `--distribution_bucket` | No | Distribution bucket index from the analysis result |
| `--compare_index` | No | Comparison index used in comparison analysis scenarios |
| `--include_total` | No | Whether to save users from the total row. Default: false |
| `--relation_val` | No | Relation value used in relation analysis scenarios |

## Decision Rules
- Drilldown positioning parameters must come from upstream analysis results and must not be fabricated.
- `qp` must not be rewritten or "simplified"; it should remain consistent with the source analysis.
- For the first run, it is recommended to pass only the required parameters (`--project_id`, `--cluster_name`, `--model_type`, `--qp`) and add optional parameters after confirming the chain works.
- Wrap JSON parameters in single quotes (for example `--qp '{}'`) to avoid shell escaping issues.
- When dates/time ranges are involved, validate with a short range first and then expand gradually.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Step After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id`, `--cluster_name`, `--model_type`, `--qp`).
- If `Invalid JSON` appears, first check the raw `qp` from the upstream query request, then verify that all necessary drilldown parameters are present.
- If the result after writing is not as expected, immediately reread the corresponding list/get interface and compare before and after.

## Recommended Chaining
- +query_adhoc -> +create_result_cluster
- +query_report_data -> +create_result_cluster
- +query_dashboard_report_data -> +create_result_cluster
