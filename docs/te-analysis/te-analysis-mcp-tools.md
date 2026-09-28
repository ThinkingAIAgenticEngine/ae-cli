# te-analysis agent-facing command surface

This document records the current `ae-cli analysis` surface exposed to agents. It intentionally does not document removed ad-hoc QP builder commands or ad-hoc schema helper commands.

## Command model

- Capability-gateway commands use resource/action form: `ae-cli analysis <resource> <action>`.
- CLI flags use kebab-case, gateway input uses snake_case.
- For ad-hoc and report definitions, the contract is `model_type + definition`; agents must pass an AI-facing `definition`, not raw QP, frontend DTOs, `events`, `event_view`, `visual_view`, or `analysis_query`.
- For the 12 supported analysis model names and SQL dynamic parameter syntax, read `skills/ae-analysis/references/ai_models.md`.
- For analysis data retrieval `run` vs `export` routing, read `skills/ae-analysis/references/analysis_data_retrieval.md`. This rule is scoped to analysis data retrieval and is not a te-cli global business-module policy.

## Current high-value commands

### Ad-hoc analysis

- `analysis adhoc run`: bounded inline query. Omit `--preview-rows` to use the current model and cluster synchronous row limit; explicit values are checked against that runtime maximum. Default timeout is 120 seconds, max 180 seconds.
- `analysis adhoc export`: async artifact query. Default and maximum runtime is 21600 seconds (6 hours); pass a smaller `--timeout-seconds` only when requested. Cancel earlier with `analysis query cancel --run-id <run_id>`.

Only the bounded `run` preview may return `query_context_id` and finite `sources[].drilldown` choices. Export never creates an interactive follow-up context.

### Report definitions and data

- `analysis report create`: create a report from AI-facing `model_type + definition`. Supports the 12 analysis models plus `tag` for saved tag report data.
- `analysis report update`: update metadata and/or AI-facing report definition. Supports the same model set as create.
- `analysis report get`: returns AI-facing `model_type + definition`; raw QP is not returned.
- `analysis report-data run`: bounded inline saved-report data. Omit `--preview-rows` to use each report model's current cluster synchronous limit; explicit values are checked at runtime. Default timeout is 120 seconds, max 180 seconds.
- `analysis report-data export`: async saved-report artifact. Default and maximum runtime is 21600 seconds (6 hours); cancel earlier with `analysis query cancel --run-id <run_id>`.

Report data supports AI-facing override inputs for filters, group-by, time range, time granularity, and SQL dynamic parameter values.

### Dashboard and BI page data

- `analysis dashboard-report-data run`: bounded inline dashboard report data. Omit `--preview-rows` to use each report model's current cluster synchronous limit; explicit values are checked at runtime. Default timeout is 180 seconds, max 180 seconds.
- `analysis dashboard-report-data export`: async dashboard report data artifact. Default and maximum runtime is 21600 seconds (6 hours); cancel earlier with `analysis query cancel --run-id <run_id>`.
- `analysis bi-panel-page-data run`: bounded inline BI panel page data. Omit `--preview-rows` to use the current cluster synchronous limit; explicit values are checked at runtime. Timeout defaults to 120 seconds and has a maximum of 180 seconds.
- `analysis bi-panel-page-data export`: async BI panel page data artifact. Default and maximum runtime is 21600 seconds (6 hours); cancel earlier with `analysis query cancel --run-id <run_id>`.

BI panel page data is executed from BI SQL/page state, not from the saved-report AI QP model registry, and does not support analysis model drilldown/result-cluster creation.

### Follow-up query context commands

- `analysis drilldown-events run`: preview raw events only for a synchronous event-analysis metric whose returned angle is `EVENT_LIST`.
- `analysis drilldown-events export`: stream all matching raw events for that returned coordinate into one `csv.gz` artifact; no paging parameters.
- `analysis drilldown-entities run`: preview users or custom entities for an advertised synchronous-preview coordinate.
- `analysis drilldown-entities export`: asynchronously export all entities for the same returned coordinate as one artifact.
- `analysis drilldown-user-events run`: preview one user's event sequence by `drilldown_context_id`. Do not pass raw QP or reconstruct the first query.
- `analysis drilldown-user-events export`: asynchronously export the complete event sequence as one artifact.
- `analysis query create-result-cluster`: save an advertised user/custom-entity coordinate as that subject's reusable result cluster.
- `analysis query cancel`: cancel an async run/export by `run_id`.
- `analysis run inspect`: inspect an async run/export by `run_id`.
- `analysis run wait`: resume short-request polling by `run_id`; optional `--output` downloads after the successful terminal state.
- `analysis artifact download`: stream a completed async artifact by the bound `run_id + artifact_id` pair. Existing output files require `--force`.

The intended flow is:

1. Run a bounded synchronous `analysis adhoc run`, `analysis report-data run`, or `analysis dashboard-report-data run`.
2. Read `query_context_id`, select one returned source, and shallow-merge only that source's returned row/column/metric coordinate fragments. The sync preview limit is the hard selection boundary; never use export/download rows.
3. Call only the selected metric/source action with the original `--project-id`: `analysis drilldown-events run|export`, `analysis drilldown-entities run|export`, or `analysis query create-result-cluster`. Common rejects a project ID that does not match the stored context. Do not pass raw QP or `target_id`.
4. Only a user-subject entity preview may return `drilldown_context_id`; pass it with the same `--project-id` and a canonical returned `user_id` to `analysis drilldown-user-events run|export`. Custom entities have no user event sequence.

For async exports, plain invocation submits only. Add `--wait` to wait, or
`--output <file>` to wait and atomically stream the completed artifact. Resume
with `analysis run wait --run-id <run_id> [--output <file>]`. Local interruption
never cancels the remote run. `analysis run inspect` and `analysis artifact
download` remain primitive lifecycle commands.

## CLI query cancellation

ae-cli no longer exposes MCP query cancellation by `request_id`. All CLI analysis queries use capability-gateway lifecycle commands; cancel an async run/export only with `analysis query cancel --run-id <run_id>`. The Common service's MCP tools and their internal lifecycle support remain available to direct MCP clients.

## Routing references

- Main agent skill: `skills/ae-analysis/SKILL.md`.
- Shared model registry and SQL dynamic parameter examples: `skills/ae-analysis/references/ai_models.md`.
- Analysis data retrieval run/export routing: `skills/ae-analysis/references/analysis_data_retrieval.md`.
- Exact filter-value discovery: `analysis filter-value list`, documented in `skills/ae-analysis/references/filter_value_list.md`.
- Physical query-cluster routing: `analysis query-cluster list`, documented in `skills/ae-analysis/references/query_cluster_list.md`.
- Per-command references live under `skills/ae-analysis/references/*`.
