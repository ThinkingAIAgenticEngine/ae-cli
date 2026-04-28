# analysis_meta +list_metrics (Metric Search)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Metadata Query**

## Use Cases
- List metric metadata in the project. Supports keyword filtering and returns metric IDs, names, display names, model types, remarks, and related metadata, but not metric calculation results.
- Supports pagination with fields/limit/offset for payload governance.
- Query performs fuzzy matching on metricName, metricDesc, and metricRemark.

## Command
```bash
ae-cli analysis_meta +list_metrics --project_id <project_id>
ae-cli analysis_meta +list_metrics --project_id <project_id> --query demo
ae-cli analysis_meta +list_metrics --project_id <project_id> --query demo --fields '["metricId","metricName"]' --limit 10 --offset 0
ae-cli analysis_meta +list_metrics --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--query` / `-q` | No | Optional keyword filter. Fuzzy match on metricName, metricDesc, metricRemark. |
| `--fields` | No | Optional fields to return. Supported: metricId, metricName, metricDesc, metricRemark, metricMode, openId, creator, creatorLoginName, updateOpenId, updateCreator, updateLoginName, createTime, updateTime. Invalid fields cause INVALID_FIELDS error. |
| `--limit` | No | Optional limit. Default: 20, maximum: 50. |
| `--offset` | No | Optional offset. Default: 0. |

## Decision Rules
- First run should only pass the required parameter (`--project_id`), and add optional parameters only after the path is confirmed to work.
- For pagination, use `--limit` and `--offset` together. Default limit is 20.
- Use `--fields` to select specific columns for lighter response payloads.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps After Failure
- If the required parameter is missing, fall back to the smallest runnable command and fill it in (focus on `--project_id`).
- If the result is empty, first confirm the project ID/keyword, then try loosening the filter conditions.
- If INVALID_FIELDS error appears, check that all field names in `--fields` match the supported list.

## Recommended Chaining
- +list_metrics -> +create_metric -> +get_metric
