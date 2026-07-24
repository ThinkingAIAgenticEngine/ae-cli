# capability run experiment.report.metric-trend

Query experiment metric trend report.

```bash
ae-cli capability run experiment.report.metric-trend --input '{"project_id":1,"exp_id":"exp_123","metric_id":"metric_1","start_time":"2026-07-01","end_time":"2026-07-07"}'
```

Required input: `project_id`, `exp_id`, `metric_id`, `start_time`, `end_time`.
Optional input: `request_id`, `force_refresh`.

Response shape: `data.report`, with recursively snake_case keys. Preserve `request_id` for cancellation.
