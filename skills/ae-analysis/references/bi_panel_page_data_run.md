# analysis bi-panel-page-data run

Use for bounded inline BI panel page chart or summary data.

Routing: read [`analysis_data_retrieval.md`](analysis_data_retrieval.md) before choosing this `run` command instead of `bi-panel-page-data export`.

Do not use this command for full, unknown-size, larger than 1000-row, or long-running page data; use `bi-panel-page-data export`.

Command:

```bash
ae-cli analysis bi-panel-page-data run --project-id <project_id> --panel-id <panel_id> --page-key <page_key> --result-type charts [--chart-ids '["chart1"]'] [--row-limit 100] [--limit 100] [--timeout-seconds 120]
```

Input sends `project_id`, `panel_id`, `page_key`, `result_type`, and optional control, paging, cache, request, timeout, and limit fields. Control defaults: inline `--limit` default 100 / max 1000, `--timeout-seconds` default 120 / max 180. Chart `--row-limit` default 100 / max 1000. The routing rule lives in [`analysis_data_retrieval.md`](analysis_data_retrieval.md).

Output is the gateway envelope. `data` contains bounded inline page data.

BI page/chart sources are SQL and do not support analysis drilldown or result-cluster creation. Do not call model drilldown commands from this result.
