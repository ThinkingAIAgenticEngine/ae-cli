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

- `analysis adhoc run`: bounded inline query. Default limit is 100, max 1000. Default timeout is 60 seconds, max 180 seconds.
- `analysis adhoc export`: async artifact query. Default and maximum runtime is 21600 seconds (6 hours); pass a smaller `--timeout-seconds` only when requested. Cancel earlier with `analysis query cancel --run-id <run_id>`.

Both commands return or materialize `query_context_id` when Redis context creation succeeds. Use that id for follow-up drilldown or result-cluster creation.

### Report definitions and data

- `analysis report create`: create a report from AI-facing `model_type + definition`. Supports the 12 analysis models plus `tag` for saved tag report data.
- `analysis report update`: update metadata and/or AI-facing report definition. Supports the same model set as create.
- `analysis report get`: returns AI-facing `model_type + definition`; raw QP is not returned.
- `analysis report-data run`: bounded inline saved-report data. Default limit is 100, max 1000. Default timeout is 60 seconds, max 180 seconds.
- `analysis report-data export`: async saved-report artifact. Default and maximum runtime is 21600 seconds (6 hours); cancel earlier with `analysis query cancel --run-id <run_id>`.

Report data supports AI-facing override inputs for filters, group-by, time range, time granularity, and SQL dynamic parameter values.

### Dashboard and BI page data

- `analysis dashboard-report-data run`: bounded inline dashboard report data. Default limit is 100, max 1000. Default timeout is 60 seconds, max 180 seconds.
- `analysis dashboard-report-data export`: async dashboard report data artifact. Default and maximum runtime is 21600 seconds (6 hours); cancel earlier with `analysis query cancel --run-id <run_id>`.
- `analysis bi-panel-page-data run`: bounded inline BI panel page data. Inline limit default is 100, max 1000; chart `row_limit` default is 100, max 1000; timeout default is 60 seconds, max 180 seconds.
- `analysis bi-panel-page-data export`: async BI panel page data artifact. Default and maximum runtime is 21600 seconds (6 hours); cancel earlier with `analysis query cancel --run-id <run_id>`.

BI panel page data is executed from BI SQL/page state, not from the saved-report AI QP model registry. Do not infer saved-report drilldown support for BI page data unless the response includes a `query_context_id` that explicitly supports the requested follow-up.

### Follow-up query context commands

- `analysis drilldown-users run`: preview users from a previous analysis result by `query_context_id`. Do not pass raw QP or paginate the preview.
- `analysis drilldown-users export`: asynchronously export all matching users as one artifact.
- `analysis drilldown-user-events run`: preview one user's event sequence by `drilldown_context_id`. Do not pass raw QP or reconstruct the first query.
- `analysis drilldown-user-events export`: asynchronously export the complete event sequence as one artifact.
- `analysis query create-result-cluster`: save users matched by a previous analysis data result into a reusable result cluster by `query_context_id`. Do not pass raw QP.
- `analysis query cancel`: cancel an async run/export by `run_id`.
- `analysis run inspect`: inspect an async run/export by `run_id`.
- `analysis artifact download`: download an async artifact by the bound `run_id + artifact_id` pair.

The intended flow is:

1. Run `analysis adhoc run/export`, `analysis report-data run/export`, or `analysis dashboard-report-data run/export`.
2. Read `query_context_id` from the response or artifact metadata.
3. Pass that `query_context_id` to `analysis drilldown-users run/export` or `analysis query create-result-cluster`.
4. Pass returned `drilldown_context_id` to `analysis drilldown-user-events run/export`.

For async exports, inspect with `analysis run inspect --run-id <run_id>` and download with `analysis artifact download --run-id <run_id> --artifact-id <artifact_id> --output <file>`.

## Legacy MCP query cancellation

`analysis +cancel_query` remains for canceling the MCP-only queries that are still registered.

For cancellable MCP query tools, request lifecycle is caller-owned:

- Generate `requestId` before starting the query.
- `requestId` is not auto-generated for MCP query tools.
- Use `mcp_<32 lowercase hex UUID>`, for example `mcp_0123456789abcdef0123456789abcdef`.
- If the caller stops waiting, sees `fetch failed`, or hits `HTTP timeout`, the backend query may still be running.
- Use `+cancel_query --request_id <same value>` for proactive cancellation.
- Responses include `metadata.requestId`.
- Missing request id returns `REQUEST_ID_REQUIRED`; invalid format returns `INVALID_REQUEST_ID`.

`+cancel_query` itself also requires the id supplied before starting the original query. It is for MCP request cancellation; capability-gateway async run/export cancellation uses `analysis query cancel --run-id <run_id>`.

## Routing references

- Main agent skill: `skills/ae-analysis/SKILL.md`.
- Shared model registry and SQL dynamic parameter examples: `skills/ae-analysis/references/ai_models.md`.
- Analysis data retrieval run/export routing: `skills/ae-analysis/references/analysis_data_retrieval.md`.
- Per-command references live under `skills/ae-analysis/references/*`.
