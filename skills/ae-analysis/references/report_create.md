# analysis report create

Use when the user explicitly wants to create a saved analysis report from an AI QP definition.

Do not use raw QP, `analysis_query`, `events`, `event_view`, or `visual_view`. The gateway accepts `model_type` plus AI QP `definition`.

Read [`ai_models.md`](ai_models.md) for the single AI-facing model registry. Report create supports the 12 analysis models plus `tag` for saved tag report data.

Command:

```bash
ae-cli analysis report create --project-id <project_id> --report-name "Demo" --model-type event --definition '{...}' [--report-desc "..."] [--dashboard-ids "[1001]"]
```

Input sends `project_id`, `report_name`, `model_type`, `definition`, optional `report_desc`, `cache_seconds`, `query_duration_ms`, and `dashboard_ids`.

Output is the gateway envelope. `data` contains the created `report_id`, creation status, normalized `model_type`, AI QP `definition`, and optional resolution warnings.

## SQL dynamic parameter shortest path

When a SQL report contains a `${...}` placeholder, define its saved default in the same AI-facing `definition`. Example:

```bash
ae-cli analysis report create --project-id <project_id> --report-name "Recent SQL" --model-type sql --definition '{"sql":"select * from events where ${PartDate:ds} limit 100","params":[{"name":"ds","type":"part_date","recent_day":"1-7"}]}'
```

After creation, keep the `report_id` returned by this exact create response. To verify the report, query the saved default first with `analysis report-data run` and omit `--sql-params`; then make one second query with a value-only `--sql-params` override. Do not rebuild internal `sqlViewParams` or guess an ID.

After any successful report create, call `analysis_common +get_resource_url` with that returned `report_id` and output its `markdown_link`.
