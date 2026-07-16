# analysis adhoc run

Run one unified ad-hoc analysis inline query from an AI-facing model definition.

Use this command for AI-facing ad-hoc model analysis. Do not use removed ad-hoc QP builder or schema helper commands.

Routing: read [`analysis_data_retrieval.md`](analysis_data_retrieval.md) before choosing this `run` command instead of `adhoc export`.

## Command

```bash
ae-cli analysis adhoc run \
  --project-id <project_id> \
  --model-type <model_type> \
  --definition '<json>' \
  [--request-id cli_<32 lowercase hex>] \
  [--use-cache true|false] \
  [--zone-offset <hours>] \
  [--fields '["列名"]'] \
  [--limit <n>] \
  [--timeout-seconds <n>]
```

## AI models

Read [`ai_models.md`](ai_models.md) for the single 12-model `model_type` registry, AI-facing `definition`, and SQL dynamic params contract.

For SQL model definitions, do not invent table or column names. If the table is unknown, call `analysis sql-table list --project-id <project_id>`; then inspect the selected `table_ref` with `analysis sql-table columns --project-id <project_id> --table-ref <table_ref>` before writing SQL.

## Input

- `--project-id`: target project ID.
- `--model-type`: one of the 12 AI-facing model names from [`ai_models.md`](ai_models.md). Do not pass `scenario`, `history_tag`, or `cluster`; tags and cohorts/clusters are separate capabilities.
- `--definition`: model-specific AI-facing definition JSON.

Control defaults: `--limit` default 100 / max 1000, `--timeout-seconds` default 120 / max 180. The routing rule lives in [`analysis_data_retrieval.md`](analysis_data_retrieval.md).

If the user asks for more than 1000 rows, or the SQL text requests `LIMIT 2000` (or any limit above 1000), go directly to `analysis adhoc export`. Do not lower the SQL limit to 1000, run a truncated sync query first, or loop over repeated `run` calls.

Do not use raw QP, `events`, `event_view`, `visual_view`, removed ad-hoc QP builder outputs, or schema helper outputs as `--definition`.

## Output

The response may include:

- `query_context_id`: Redis-backed context for drilldown or result-cluster creation.
- `drilldown_available`: whether the response contains a complete machine-readable follow-up target. When false, read `drilldown_unavailable_reason` and do not infer a target from display text.
- `sources[].target_contract.default_target`: a complete target that can be passed directly to a follow-up command. Copy and replace only fields named by `copy_from_selected_result` when drilling into a different row or cell.
- `title` / `rows` / `total` / `returned_rows` / `truncated`: tabular preview fields. When truncated, use `adhoc export`; there is no next-page request.
- `result`: direct result for non-tabular models.
- `request_id`: lifecycle request id.
- `effective_time_range`: the resolved query scope actually sent to execution. `clipping_reasons` is empty when the gateway applied no range cap.
- `data_time_range`: the minimum/maximum machine dates present in returned rows when available. Compare it with `effective_time_range` to distinguish query-range clipping from missing data.
- `row_metadata`: row-aligned machine fields. For date-drilldown rows, copy `drilldown_date`; `display_date` is presentation text only.

Execution failures are returned as command failures with `request_id`; only the explicit project-no-data condition is a successful empty result. Do not interpret an empty object as evidence that a failed query succeeded.

Use `query_context_id` with `analysis drilldown-users run` or `analysis query create-result-cluster` only when `drilldown_available=true` and the selected source includes `target_contract.default_target`. Do not pass raw QP or infer a target from display text.
