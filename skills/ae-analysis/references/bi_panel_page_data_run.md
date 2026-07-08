# analysis bi-panel-page-data run

Use for bounded inline BI panel page chart or summary data.

Do not use for large or long-running page data. Use `bi-panel-page-data export`.

Command:

```bash
ae-cli analysis bi-panel-page-data run --project-id <project_id> --panel-id <panel_id> --page-key <page_key> --result-type charts [--chart-ids '["chart1"]'] [--limit 100] [--timeout-seconds 60]
```

Input sends `project_id`, `panel_id`, `page_key`, `result_type`, and optional control, paging, cache, request, timeout, and limit fields.

Output is the gateway envelope. `data` contains bounded inline page data.
