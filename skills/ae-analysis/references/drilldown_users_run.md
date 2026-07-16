# analysis drilldown-users run

Precondition: the upstream response must have `drilldown_available=true` and the selected source must contain `target_contract`. If either is absent, do not call this command or reconstruct a target from display text.

Drill down to users from a previous analysis data query context.

Use this after any analysis data command that returns `query_context_id`:

- `analysis adhoc run`
- `analysis adhoc export`
- `analysis report-data run`
- `analysis report-data export`
- `analysis dashboard-report-data run`
- `analysis dashboard-report-data export`

Do not pass raw QP.

## Command

```bash
ae-cli analysis drilldown-users run \
  --query-context-id <query_context_id> \
  --target '<json>' \
  [--limit 100] \
  [--timeout-seconds 120]
```

## Input

- `--query-context-id`: returned by an analysis data run/export submit response, or by the first metadata line of a JSONL artifact.
- `--target`: pass the selected source's `target_contract.default_target` directly for the whole-result default. For a specific result row or cell, copy that object and replace only the fields named by `target_contract.copy_from_selected_result`.
- `--properties`: optional backend property request object array. Omit this in normal agent calls and use the default returned columns. Do not pass string-name arrays such as `["#user_id"]`.

Do not use raw QP or reconstruct the first query request. The server resolves the source QP from Redis by `query_context_id`.

## Target

`--target` identifies the cell/step/bucket/date to drill down. The upstream `sources[]` entry is the machine-readable contract. Do not infer a target shape from model memory or reuse a target from a different source/model.

`target_contract.default_target` already contains `report_id` or `chart_id` when needed. Preserve it unchanged:

```json
{"report_id":1001,"drilldown_date":"2026-07-01","drilldown_groups":["ios"],"event_index":0}
```

Common fields:

- `report_id`: required when the context contains multiple report sources.
- `chart_id`: required when the context contains multiple BI chart sources. BI SQL chart contexts normally return `drilldown_available=false`; do not call drilldown unless the first response explicitly says `drilldown_available=true`.
- `drilldown_date` or `target_dates`: target date(s) from the result row. Include one of these when you plan to call `drilldown-user-events` next; `include_total` alone can list users but may not carry enough date context for event-sequence lookup.
- `drilldown_groups`: group values from the result row.
- `event_index`: event model index, starting from 0.
- `retention_days`, `is_lost`: retention target.
- `funnel_step`, `is_churned_user`: funnel target.
- `interval`, `distribution_bucket`, `compare_index`, `include_total`, `relation_val`: model-specific target fields.

## Output

The response contains at most `limit` user rows and a `drilldown_context_id`. When `truncated=true`, use `analysis drilldown-users export`; do not attempt to fetch another page.

Use `drilldown_context_id` with `analysis drilldown-user-events run` or `analysis drilldown-user-events export`.
