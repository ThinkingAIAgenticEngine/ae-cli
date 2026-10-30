# analysis report create

Use when the user explicitly wants to create a saved analysis report from an AI QP definition.

Do not use raw QP, `analysis_query`, `events`, `event_view`, or `visual_view`. The gateway accepts `model_type` plus AI QP `definition`.

Read [`ai_models.md`](ai_models.md) for the single AI-facing model registry. Report create supports the 12 analysis models plus `tag` for saved tag report data.

Command:

```bash
ae-cli analysis report create --project-id <project_id> --report-name "Demo" --model-type event --definition '{...}' [--presentation '{"chart_type":"line","table_layout":"date"}'] [--resolutions '<confirmed_resolution_json>'] [--report-desc "..."] [--dashboard-ids "[1001]"]
```

When the caller supplies an existing snapshot, optional `--intent-snapshot` accepts `schema_version: 1`, non-empty `requirement`, `definition` and `model_type`. The CLI checks that its definition and model match the submitted values locally; the snapshot is never sent to Gateway.

Input sends `project_id`, `report_name`, `model_type`, `definition`, optional top-level `presentation`, user-confirmed `resolutions`, `report_desc`, `cache_seconds`, `query_duration_ms`, and `dashboard_ids`. `--resolutions` is not supported with `--model-type tag`.

Omitting `--report-desc` or passing `--report-desc ""` sends `report_desc: ""`, matching analysis-page creation. This default applies only to creation: [`report update`](report_update.md) preserves the saved description when `--report-desc` is omitted, and clears it when explicitly empty.

## Event-report presentation

For `model_type=event`, optional `presentation` is separate from `definition`. `chart_type` accepts `line`, `combo`, `bar`, `stacked`, `cumulative`, or `pie`; `table_layout` accepts `date`, `event`, or `group` for the analysis page's result table. The gateway checks compatibility with the saved definition; pie always requires grouping without time comparison. A total-time report supports bar, or pie only when those grouping/comparison conditions hold. Omission leaves page-default/inherited settings. This contract does not expose presentation writes for other models.

For `combo`, explicitly set a requested non-total `definition.time_particle_size` such as `day` (omission defaults to `total`), and supply report-level `presentation.series` with metric indexes and bar/line + primary/secondary axes. Read [event-report presentation](event_report_presentation.md) for the version-bound metric binding, subset/reset contract, examples and impact on inherited dashboard trends. It also distinguishes combo from cumulative and corrects the event pie mapping; never use raw graph codes.

A table card is a dashboard-level display, not `presentation.chart_type=table` on the source report. To create a table card, create the event report, associate it through `--dashboard-ids` or [`dashboard-report add`](dashboard_report_add.md), then call [`dashboard-report update`](dashboard_report_update.md) with the returned report ID, exact dashboard ID, and `--chart-type table`. Do not insert `graphShape`, `byType`, `reportGraphShape`, or other raw QP/UI fields into the definition or presentation.

Saved report definitions follow the filter write boundary in [`ai_models.md`](ai_models.md): one compound group level with leaf-only, non-empty `items`. A deeper tree or empty group is rejected by the capability schema as `INVALID_CAPABILITY_INPUT`; use the returned field path or schema keyword to correct it, and never flatten a deeper tree.

Output is the gateway envelope. `data` contains the created `report_id`, creation status, normalized `model_type`, AI QP `definition`, event-report `presentation`, and optional resolution warnings. Card presentation is read separately with `dashboard-report get`.

Report creation and its `--validate` / `--dry-run` paths use the same compiler contract. `AI_QP_COMPILE_FAILED` preserves the full structured error array. No report is created on this failure; follow [`metadata_resolution.md`](metadata_resolution.md), keep each bound field's path and original wording, fill confirmed model parameters, and pass `--resolutions` only after user confirmation.

## SQL dynamic parameter shortest path

When a SQL report contains a `${...}` placeholder, define its saved default in the same AI-facing `definition`. Example:

```bash
ae-cli analysis report create --project-id <project_id> --report-name "Recent SQL" --model-type sql --definition '{"sql":"select * from events where ${PartDate:ds} limit 100","params":[{"name":"ds","type":"part_date","recent_day":"1-7","use_timezone":true}]}'
```

`use_timezone` is an optional boolean definition field only for `part_date`; it defaults to `false`. `true` makes that parameter use the query's effective timezone. It is a saved definition field, so change it through report create/update `--definition`, never through report-data `--sql-params`.

After creation, keep the `report_id` returned by this exact create response. If the user also requests report data, call `analysis report-data run` directly with the requested value-only `--sql-params` overrides, or omit that flag to use saved defaults. Do not rebuild internal `sqlViewParams` or guess an ID.

After any successful report create, call `analysis-meta asset url-get` with that returned `report_id` and output its `markdown_link`.

The capability schema includes model-specific nested definition validation. Unknown fields, including nested filter/time-range fields and diagnostic backing fields, are rejected instead of silently ignored. Use canonical snake_case keys and aggregation names such as `user_count`; event report metrics may additionally carry `display_name`. Inspect the report capability itself for the full saved-report definition schema.
