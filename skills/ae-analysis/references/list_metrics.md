# analysis_meta +list_metrics (Metric Search)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Metadata Query**

## Constraints

**Fuzzy Search Fallback:** If `--query` returns no results, retry with broader keywords (max 3 attempts), then fall back to full list. See [SKILL.md § C. FUZZY_SEARCH_FALLBACK](../SKILL.md#c-fuzzy_search_fallback).

**Not a builder pre-step:** Do not call `+list_metrics` before `+build_event_analysis_qp`, `+build_retention_analysis_qp`, `+build_funnel_analysis_qp`, or `+build_prop_analysis_qp` for normal ad-hoc analysis. Event builder resolves saved metric names internally when the metric name is passed in `metrics[].event`. If the builder fails, stop and ask for clarification instead of using this command as a fallback.

## Use Cases
- List metric metadata in the project. Supports keyword filtering and returns metric IDs, names, display names, model types, remarks, and related metadata, but not metric calculation results.
- Supports pagination with fields/limit/offset for payload governance.
- Query performs fuzzy matching on metricName, metricDesc, and metricRemark.
- Use this command for metric metadata management, metric editing, auditing, or when the user explicitly asks to inspect/search metric metadata. Do not use it merely to prepare a builder-supported ad-hoc query.

## Command
```bash
ae-cli analysis_meta +list_metrics --project_id <project_id>
ae-cli analysis_meta +list_metrics --project_id <project_id> --query demo
ae-cli analysis_meta +list_metrics --project_id <project_id> --query demo --fields '["metricId","metricName","metricDesc","metricRemark","metricMode"]' --limit 10 --offset 0
ae-cli analysis_meta +list_metrics --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--query` / `-q` | No | Optional keyword filter. Fuzzy match on metricName, metricDesc, metricRemark. |
| `--fields` | No | Optional fields to return. Supported: metricId, metricName, metricDesc, metricRemark, metricMode, authenticationStatus, openId, creator, creatorLoginName, updateOpenId, updateCreator, updateLoginName, createTime, updateTime. Default fields when omitted: metricId, metricName, metricDesc, metricRemark, metricMode, authenticationStatus. Invalid fields cause INVALID_FIELDS error. |
| `--limit` | No | Optional limit. Default: 20, maximum: 50. |
| `--offset` | No | Optional offset. Default: 0. |
| `--authenticated_only` | No | When true, return only authenticated metrics. |

## Decision Rules
- Use `--authenticated_only true` only when the user explicitly asks for authenticated assets. `authenticationStatus` is `1` for authenticated and `0` for unauthenticated.
- First run should only pass the required parameter (`--project_id`), and add optional parameters only after the path is confirmed to work.
- For pagination, use `--limit` and `--offset` together. Default limit is 20.
- Use `--fields` to select specific columns for lighter response payloads.
- For builder-supported ad-hoc analysis, do not search metrics here first. Pass the user-provided metric name directly to the builder.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps After Failure
- If the required parameter is missing, fall back to the smallest runnable command and fill it in (focus on `--project_id`).
- If the result is empty, first confirm the project ID/keyword, then try loosening the filter conditions.
- If INVALID_FIELDS error appears, check that all field names in `--fields` match the supported list.

## Recommended Chaining
- +list_metrics -> +create_metric -> +get_metric
- For ad-hoc event metric query: +build_event_analysis_qp -> +query_adhoc
