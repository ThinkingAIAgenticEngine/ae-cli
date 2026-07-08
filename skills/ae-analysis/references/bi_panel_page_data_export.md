# analysis bi-panel-page-data export

Use for BI panel page data that may be large or long-running.

Do not use for tiny previews. Use `bi-panel-page-data run` with a small limit.

Command:

```bash
ae-cli analysis bi-panel-page-data export --project-id <project_id> --panel-id <panel_id> --page-key <page_key> --result-type charts [--chart-ids '["chart1"]'] [--artifact-format jsonl]
```

Input sends `project_id`, `panel_id`, `page_key`, `result_type`, and optional control, paging, cache, request, timeout, and format fields. Use CLI flag `--artifact-format` for the gateway `format` input; `--format` is the CLI output formatter.

Output is the gateway envelope. `data` contains an async export descriptor such as `run_id`, `artifact_id`, status fields, inspect path, and download path.
