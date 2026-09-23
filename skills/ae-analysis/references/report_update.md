# analysis report update

Use when the user explicitly wants to update saved report metadata or replace its AI QP definition.

Do not use raw QP, `qp`, `report_model`, or `analysis_query`. When changing the definition, pass `model_type` and AI QP `definition` together.

Read [`ai_models.md`](ai_models.md) for the single AI-facing model registry. Report update supports the 12 analysis models plus `tag` for saved tag report data.

Command:

```bash
ae-cli analysis report update --project-id <project_id> --report-id <report_id> --report-version <version> --report-name "New name"
ae-cli analysis report update --project-id <project_id> --report-id <report_id> --report-version <version> --model-type event --definition '{...}' [--resolutions '<confirmed_resolution_json>']
```

When the caller supplies an existing snapshot, optional `--intent-snapshot` accepts `schema_version: 1`, non-empty `requirement`, `definition` and `model_type`. The CLI checks that its definition and model match the submitted values locally; the snapshot is never sent to Gateway. Metadata-only updates use no definition snapshot.

Input sends `project_id`, `report_id`, `version` from CLI `--report-version`, and at least one of `report_name`, `report_desc`, or `definition`. Read `version` from `analysis report get` before updating. `model_type` is required when `definition` is provided; `resolutions` is allowed only when a definition is provided and is not supported with `model_type=tag`.

Definition replacement follows the filter write boundary in [`ai_models.md`](ai_models.md): one compound group level with leaf-only, non-empty `items`. A deeper historical tree remains readable, but a deeper tree or empty group submitted for writing is rejected by the capability schema as `INVALID_CAPABILITY_INPUT`; use the returned field path or schema keyword to correct it. Omit `definition` for metadata-only changes and never flatten it.

Output is the gateway envelope. `data` contains update status, `report_id`, and the normalized AI QP definition when a definition was updated.

When a definition is supplied, update and its `--validate` / `--dry-run` paths use the same compiler contract. `AI_QP_COMPILE_FAILED` preserves the full structured error array. The report is not changed on this failure; follow [`metadata_resolution.md`](metadata_resolution.md), keep each bound field's path and original wording, fill confirmed model parameters, and retry with `--resolutions` only after confirmation.

For the shortest safe update, read the current `version` exactly once with `analysis report get` immediately before the write; do not reuse a version from an older list or conversation turn. If the user also requests report data, query directly with the requested value-only `--sql-params` overrides, or omit that flag to use saved defaults.

For a SQL `part_date` parameter, `use_timezone` is a boolean saved definition field with default `false`. Change it only by submitting the complete updated `definition`; report-data `--sql-params` is value-only and must not contain `use_timezone`.

After a successful update, call `analysis-meta asset url-get` with the updated `report_id` and output its `markdown_link`.

The capability schema includes model-specific nested definition validation. Unknown fields, including nested filter/time-range fields and diagnostic backing fields, are rejected instead of silently ignored. Use canonical snake_case keys and aggregation names such as `user_count`; event report metrics may additionally carry `display_name`. Inspect the report capability itself for the full saved-report definition schema.

Use `--report-desc ""` to clear an existing description. Omitting `--report-desc` preserves the saved description. Clearing only the description is a valid metadata-only update.
