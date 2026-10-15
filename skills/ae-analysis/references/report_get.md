# analysis report get

Use when the user needs one saved report definition as AI QP without executing the report.

Do not use it to execute report data; use `report-data run/export` for the result. Reuse a definition already read when preparing supported overrides or an ad-hoc query.

Command:

```bash
ae-cli analysis report get --project-id <project_id> --report-id <report_id>
```

Input sends `project_id` and `report_id`.

This command reads saved definition metadata and deliberately has no `--use-cache` option. Cache selection applies to `report-data run/export`, not to definition reads.

Output is the gateway envelope. `data` contains `version`, `model_type`, `definition`, report metadata, and dashboard membership in snake_case. Event reports additionally expose separate `presentation` with `chart_type` and `table_layout`. Use `data.version` as `--report-version` when updating the same report. Raw frontend `events`, `event_view`, `visual_view`, and raw QP are not returned.

`presentation.chart_type` describes the source report's effective chart under the current definition. `presentation.table_layout` describes its persisted result-table layout when readable; a legacy report without a persisted layout omits it because that setting can be inherited from the browser, not because it is necessarily `date`. For a table card on a specific analysis board, read [`dashboard-report get`](dashboard_report_get.md) with the exact dashboard ID. A raw chart code such as `L0` can coexist with a displayed result table or a dashboard table card; it is not proof of a read failure. Use the semantic response fields, and state unknown/null presentation fields as inherited/unknown rather than inventing values.

For an effective trend, presentation also returns `series_scope=report` and per-metric `series` including default styles/axes. Non-default series can make `chart_type=combo` despite native `graphShape=L0`. Match each 1-based series index to this response's `definition.metrics` order, and use its current version for a subsequent source-series write. Read [event-report presentation](event_report_presentation.md) before interpreting or editing combination styles/axes.

Reads preserve historical filter trees without flattening, including definitions deeper than the current analysis page can author. Follow the read/write boundary in [`ai_models.md`](ai_models.md): omit `definition` for metadata-only changes, and never feed an unsupported historical tree back as a definition update.

For saved tag/cluster filters, `data.definition` preserves `field.type` and the persisted `cluster_date_policy`: `AUTO` means dynamic matching by analysis date, `LATEST` means the latest computed result, and `SPECIFIED` requires `specified_cluster_date`. Do not infer dynamic matching from the tag name or `field.type` alone; if a legacy report has no readable policy, state that the saved date semantics are unknown rather than claiming `AUTO`.

For a saved non-SQL report with a time granularity, `data.definition` returns the agent-facing `time_particle_size` spelling, such as `day`, `hour`, or `total`; internal `T0` through `T9` codes must never leak. If `time_particle_size` is absent, the saved definition has no readable granularity. Do not infer a granularity from the number of result rows; execute the saved report as-is or use an explicit ad-hoc definition when the user requires a specific granularity.

Reuse this definition when already read; otherwise get it before applying report-data overrides. Branch on `data.model_type`:

- `sql`: only `--sql-params` is valid. Every override name must already exist in `data.definition.params`; time values may be overridden only through a saved `part_date` or time parameter. For a selector runtime override, copy the exact UI label from `data.definition.params[].options[].name` into the override's `value`; never send `options[].value`, which is the saved SQL expansion fragment. A saved PartDate definition exposes boolean `use_timezone` (default `false`); it is definition metadata and cannot be overridden by report-data.
- non-SQL analysis models: use `--filters`, `--group-by`, `--start-time`, `--end-time`, or `--time-granularity`; do not send `--sql-params`.
- `tag`: report-data executes the saved tag definition. For a different tag view, use `analysis history-tag-data run/export`.
