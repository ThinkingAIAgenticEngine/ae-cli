# analysis-meta metric list

Use when the user needs to list, search, page, or field-project project metrics.

Do not use it to calculate metric values; use report/dashboard/ad-hoc data routing for result queries.

Command:

```bash
ae-cli analysis-meta metric list --project-id <project_id>
ae-cli analysis-meta metric list --project-id <project_id> --ignore-authentication true
ae-cli analysis-meta metric list --project-id <project_id> --query pay
ae-cli analysis-meta metric list --project-id <project_id> --query pay --fields '["metric_name","authentication_status"]' --limit 10 --offset 0 --authenticated-only true
ae-cli analysis-meta metric list --dry-run
```

Capability id: `metadata.metric.list`.

Input sends `project_id`, `ignore_authentication`, `query`, `fields`, `limit`, `offset`, and `authenticated_only`.

Output `data.metrics[]` contains project metric summaries. When `limit` or `offset` is present, output also includes `total`, `limit`, `offset`, and `has_more`.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--ignore-authentication` | No | Whether to skip asset authentication status decoration. |
| `--query` | No | Optional keyword filter. Fuzzy match on `metric_name`, `metric_desc`, and `metric_remark`. |
| `--fields` | No | Optional result field projection JSON array. Supported fields: `metric_id`, `metric_name`, `metric_desc`, `metric_remark`, `metric_mode`, `authentication_status`, `open_id`, `creator`, `creator_login_name`, `update_open_id`, `update_creator`, `update_login_name`, `create_time`, `update_time`. |
| `--limit` | No | Optional page size. Default: 20 when pagination is used, maximum: 50. |
| `--offset` | No | Optional zero-based result offset. Default: 0. |
| `--authenticated-only` | No | When true, return only authenticated metrics. |

## Decision Rules
- Do not call this just to prepare normal ad-hoc analysis. Pass saved metric wording directly in `analysis adhoc run/export --definition`; the backend compiler resolves saved metric names internally.
- Use `--fields` to keep discovery responses compact.
- Use `analysis-meta metric get` after this command when a full metric definition is needed.
