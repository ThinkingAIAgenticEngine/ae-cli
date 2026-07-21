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

For SQL model definitions, do not invent table or column names. If the table reference is known, inspect columns with `analysis-meta datatable columns-get`; if the table is unknown, ask for it instead of guessing.

## Input

- `--project-id`: target project ID.
- `--model-type`: one of the 12 AI-facing model names from [`ai_models.md`](ai_models.md). Do not pass `scenario`, `history_tag`, or `cluster`; tags and cohorts/clusters are separate capabilities.
- `--definition`: model-specific AI-facing definition JSON.

Control defaults: `--limit` default 100 / max 1000, `--timeout-seconds` default 60 / max 180. The routing rule lives in [`analysis_data_retrieval.md`](analysis_data_retrieval.md).

If the user asks for more than 1000 rows, or the SQL text requests `LIMIT 2000` (or any limit above 1000), go directly to `analysis adhoc export`. Do not lower the SQL limit to 1000, run a truncated sync query first, or loop over repeated `run` calls.

Do not use raw QP, `events`, `event_view`, `visual_view`, removed ad-hoc QP builder outputs, or schema helper outputs as `--definition`.

Timezone contract: fixed `--zone-offset` values are integers from `-12` through `14`. Use `--zone-offset 99` for local-time mode, which analyzes timestamps as stored local time without applying a fixed UTC offset conversion; it does not mean UTC+99. Omit the flag to use the project's analysis default.

## Output

The response may include:

- `query_context_id`: Redis-backed context for follow-ups from this bounded synchronous preview.
- `sources[].drilldown`: finite row, column, and metric options plus allowed actions. The preview `limit` is the selection boundary.
- `title` / `rows` / `total` / `returned_rows` / `truncated`: tabular preview fields. When truncated, use `adhoc export`; there is no next-page request.
- `result`: direct result for non-tabular models.
- `request_id`: lifecycle request id.

Execution failures are returned as command failures with `request_id`; only the explicit project-no-data condition is a successful empty result. Do not interpret an empty object as evidence that a failed query succeeded.

Read [`analysis_drilldown_contract.md`](analysis_drilldown_contract.md). Use the context only with an action advertised by the selected source/metric, and assemble the coordinate only from returned option fragments. Do not pass raw QP or infer a coordinate from display text.
