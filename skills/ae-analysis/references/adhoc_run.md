# analysis adhoc run

Run one unified ad-hoc analysis inline query from an AI-facing model definition.

Use this command for AI-facing ad-hoc model analysis. Do not use removed ad-hoc QP builder or schema helper commands.

Submit the requested metrics, windows, filters and groups together in the selected model definition. Reuse verified canonical metadata; resolve unknown metadata with [`metadata_resolution.md`](metadata_resolution.md) before execution. Use `analysis filter-value list` only when a needed stored filter value remains unknown.

Routing: read [`analysis_data_retrieval.md`](analysis_data_retrieval.md) before choosing this `run` command instead of `adhoc export`.

## Command

```bash
ae-cli analysis adhoc run \
  --project-id <project_id> \
  --model-type <model_type> \
  --definition '<json>' \
  [--intent-snapshot '<snapshot_json>'] \
  [--resolutions '<confirmed_resolution_json>'] \
  [--request-id cli_<32 lowercase hex>] \
  [--use-cache true|false] \
  [--zone-offset <hours>] \
  [--fields '["列名"]'] \
  [--cluster-query-scope GLOBAL|SLAVE] \
  [--slave-cluster-id <id>] \
  [--preview-rows <n>] \
  [--timeout-seconds <n>]
```

## AI models

Read the shared registry and building blocks in [`ai_models.md`](ai_models.md), then open `ai_models/<model_type>.md` directly for the selected model. Do not search for section line numbers or load other model files. For event period totals plus daily trends, use the `day` + `comparison_time_ranges` example in [`ai_models/event.md`](ai_models/event.md). Read [`ai_models/sql.md`](ai_models/sql.md) and its dynamic params contract only for SQL.

For SQL model definitions, use [`sql_table_list.md`](sql_table_list.md) to discover an unknown table, then [`sql_table_columns.md`](sql_table_columns.md) with the exact returned `table_ref` and the same `usage=analysis`. A known authorized table can go directly to column inspection. Ask only when discovered candidates remain ambiguous or the required data source is unavailable; do not invent table or column names.

## Input

- `--project-id`: target project ID.
- `--model-type`: one of the 12 AI-facing model names from [`ai_models.md`](ai_models.md). Do not pass `scenario`, `history_tag`, or `cluster`; tags and cohorts/clusters are separate capabilities.
- `--definition`: model-specific AI-facing definition JSON.
- `--intent-snapshot`: use when the caller supplies an existing snapshot containing `schema_version: 1`, non-empty `requirement`, `definition`, and `model_type`. The CLI checks that its definition and model match the submitted values locally; the snapshot is never sent to Gateway.
- `--resolutions`: only after user confirmation, pass deterministic bindings keyed by compiler error path. Keep each bound field's path and original wording; fill the other confirmed model parameters in `--definition`. Follow [`metadata_resolution.md`](metadata_resolution.md).

Omit `--preview-rows` to use the current model and cluster synchronous row limit. An explicit value must be positive and cannot exceed that runtime limit; agents should normally pass 100 to bound context. `--timeout-seconds` defaults to 120 and has a maximum of 180. The routing rule lives in [`analysis_data_retrieval.md`](analysis_data_retrieval.md).

For `model_type=path`, `preview_rows` follows the analysis UI's graph contract: it limits real nodes per path level, not total nodes across the graph. Nodes beyond the per-level boundary are combined into a `more` node. `result.nodes` retains that synthesized node for graph structure and drilldown coordinates. `returned_rows` counts real business nodes actually returned across all levels; it excludes synthesized `more` nodes and the real nodes folded into them. The count may still exceed `preview_rows` because the boundary applies independently to each level. `has_more=true` means at least one level contains real nodes folded into `more`.

If the requested result exceeds the current runtime synchronous maximum, go directly to `analysis adhoc export`. Do not lower the requested row count, run a partial sync query first, or loop over repeated `run` calls.

Do not use raw QP, `events`, `event_view`, `visual_view`, removed ad-hoc QP builder outputs, or schema helper outputs as `--definition`.

Timezone contract: fixed `--zone-offset` values are integers from `-12` through `14`. Use `--zone-offset 99` for local-time mode, which analyzes timestamps as stored local time without applying a fixed UTC offset conversion; it does not mean UTC+99. Omit the flag to use the project's analysis default.

Cluster routing: omit both routing flags for current-self data. Before `GLOBAL` or `SLAVE`, call `analysis query-cluster list`; `SLAVE` requires exactly one returned physical cluster ID. SQL and attribution do not support `GLOBAL`; distribution with default intervals also rejects `GLOBAL`. These 查询集群 options are unrelated to 用户分群 definitions.

## Output

The response may include:

- `query_context_id`: Redis-backed context for follow-ups from this bounded synchronous preview.
- `sources[].drilldown`: compact allowed-action summary. Detailed coordinate options are read lazily with `analysis query-context get`; `preview_rows` remains the selection boundary.
- `title` / `rows` / `returned_rows` / `has_more`: tabular preview fields. `total` appears only when the backend supplies an exact total. When `has_more` is true, use `adhoc export`; there is no next-page request.
- `row_metadata` / `column_metadata`, when returned: align with row/column positions. Event `scope=total` identifies a total row; `period_values` specifies stage aggregates. Time comparisons repeat metric titles in separate column blocks, so preserve indexes. See [event result totals](ai_models/event.md#event-totals-and-comparison-columns).
- `result`: direct result for non-tabular models. Path results also return top-level `returned_rows` and `has_more` using the per-level node contract above.
- `request_id`: lifecycle request id.
- `definition`: normalized AI-facing definition used for compilation. Tag/cluster filters expose the effective `cluster_date_policy`; `AUTO` means each analysis date uses its matching computed result, while an omitted policy defaults to `LATEST`.
- `actual_cluster_query_scope`, optional `actual_slave_cluster_id`, and `cluster_query_scope_source`: actual physical data route. Verify these before comparing results or following the query context.

Execution failures are returned as command failures with `request_id`; only the explicit project-no-data condition is a successful empty result. Do not interpret an empty object as evidence that a failed query succeeded.

Use the inline result directly. See [result handling](analysis_data_retrieval.md#preserve-and-interpret-results) when local processing or a requested file is needed.

The execute, `--validate`, and `--dry-run` paths all compile the AI-facing definition. If metadata resolution needs clarification, the command fails with `AI_QP_COMPILE_FAILED`; inspect `meta.compile_status`, `meta.errors[]`, `meta.resolved`, and `meta.warnings`. Each metadata error retains `path`, `slot_kind`, `raw_value`, `allowed_resource_types`, `search_targets`, and `candidates`. Follow [`metadata_resolution.md`](metadata_resolution.md); do not guess from display text.

For `meta.compile_status=invalid_argument`, correct the reported parameter paths in the current definition and submit that corrected definition. For metadata `need_clarification`, use the returned candidates and [confirmation workflow](metadata_resolution.md). Once the requested meaning and required parameters are ready, execute directly.

If a concrete field mismatch remains unexplained by the loaded reference, inspect this command's model contract or capability schema once. A preflight is conditional on that input problem: validate that exact definition once, then run the same definition once. Preserve all requested filters and groups through corrections.

For a gateway `oneOf` error, focus on the selected `model_type` branch and shared input fields; other model branches are alternatives, not additional requirements. Apply every relevant correction together (for example, both `event_property_name` and string-valued `values` for funnel step filters). Local `INVALID_ANALYSIS_DEFINITION` is a pre-dispatch input failure, not a query failure. Passing this narrow local check is not proof that the full backend schema or query has passed. Follow the failure-evidence rules in `../SKILL.md` and honor the user's retry limit.

When the request needs a drilldown action advertised by the selected source, read [`analysis_drilldown_contract.md`](analysis_drilldown_contract.md), call `analysis query-context get`, and assemble the coordinate from its returned option fragments. Do not pass raw QP or infer a coordinate from display text.
