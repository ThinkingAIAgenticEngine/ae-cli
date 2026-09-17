# analysis-meta metric list

Use when the user needs to list, search, page, or field-project project metrics.

Do not use it to calculate metric values; use report/dashboard/ad-hoc data routing for result queries.

Command:

```bash
ae-cli analysis-meta metric list --project-id <project_id>
ae-cli analysis-meta metric list --project-id <project_id> --ignore-authentication true
ae-cli analysis-meta metric list --project-id <project_id> --queries '["pay","revenue"]'
ae-cli analysis-meta metric list --project-id <project_id> --queries '["pay","revenue"]' --fields '["metric_name","authentication_status"]' --limit 50 --offset 0 --authenticated-only true
```

Capability id: `metadata.metric.list`.

Input sends `project_id`, `ignore_authentication`, `queries`, `fields`, `limit`, `offset`, and `authenticated_only`.

Output always uses the directory envelope: `data.metrics[]`, `total`, `limit`, `offset`, `has_more`, and `next_offset`.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--ignore-authentication` | No | Whether to skip asset authentication status decoration. |
| `--queries` | No | JSON array of 1-20 keyword filters. A row is returned when any keyword matches `metric_name`, `metric_desc`, or `metric_remark`. |
| `--fields` | No | Optional result field projection JSON array. Supported fields: `metric_id`, `metric_name`, `metric_desc`, `metric_remark`, `metric_mode`, `authentication_status`, `open_id`, `creator`, `creator_login_name`, `update_open_id`, `update_creator`, `update_login_name`, `create_time`, `update_time`. |
| `--limit` | No | Page size. Default: 50, maximum: 200; values outside 1..200 are rejected. |
| `--offset` | No | Zero-based page offset. Default: 0; negative values are rejected. |
| `--authenticated-only` | No | When true, return only authenticated metrics. |

## Decision Rules
- For an unknown business measure, use this with relevant `report list` search as the saved-definition discovery path in [`metadata_resolution.md`](metadata_resolution.md). Reuse a verified saved metric name directly.
- Use `--fields` when its projected fields are sufficient. When searching with `--queries`, omit `--fields` to keep `metric_events` and `metric_params` as JSON strings. Read their content in this response; these two fields are not in the projection whitelist.
- Use `analysis-meta metric get` only when a required definition detail is absent from the returned row.
- For a complete result, use `analysis-meta metric export`; do not page repeatedly to synthesize an export.
