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

For the shortest safe update, read the current `version` exactly once with `analysis report get` immediately before the write; do not reuse a version from an older list or conversation turn. If a SQL dynamic parameter definition changed, query the saved default before applying an override so default persistence and override behavior are verified separately.

After a successful update, call `analysis_common +get_resource_url` with the updated `report_id` and output its `markdown_link`.
