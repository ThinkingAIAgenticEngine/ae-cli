# analysis report update

Use when the user explicitly wants to update saved report metadata or replace its AI QP definition.

Do not use raw QP, `qp`, `report_model`, or `analysis_query`. When changing the definition, pass `model_type` and AI QP `definition` together.

Read [`ai_models.md`](ai_models.md) for the single AI-facing model registry. Report update supports the 12 analysis models plus `tag` for saved tag report data.

Command:

```bash
ae-cli analysis report update --project-id <project_id> --report-id <report_id> --report-version <version> --report-name "New name"
ae-cli analysis report update --project-id <project_id> --report-id <report_id> --report-version <version> --model-type event --definition '{...}'
```

Input sends `project_id`, `report_id`, `version` from CLI `--report-version`, and at least one of `report_name`, `report_desc`, or `definition`. Read `version` from `analysis report get` before updating. `model_type` is required when `definition` is provided.

Output is the gateway envelope. `data` contains update status, `report_id`, and the normalized AI QP definition when a definition was updated.

When a definition is supplied, update and its `--validate` / `--dry-run` paths use the same compiler contract. `AI_QP_COMPILE_FAILED` preserves `meta.compile_status`, full `meta.errors[]` (including `code`, `candidates`, and `suggestions`), `meta.resolved`, and `meta.warnings`. The report is not changed on this failure; resolve the ambiguity before retrying.

For the shortest safe update, read the current `version` exactly once with `analysis report get` immediately before the write; do not reuse a version from an older list or conversation turn. If a SQL dynamic parameter definition changed, query the saved default before applying an override so default persistence and override behavior are verified separately.

For a SQL `part_date` parameter, `use_timezone` is a boolean saved definition field with default `false`. Change it only by submitting the complete updated `definition`; report-data `--sql-params` is value-only and must not contain `use_timezone`.

After a successful update, call `analysis-meta asset url-get` with the updated `report_id` and output its `markdown_link`.
