# capability run experiment.report.sample-size

Query experiment sample-size report.

```bash
ae-cli capability run experiment.report.sample-size --input '{"project_id":1,"exp_id":"exp_123","start_time":"2026-07-01","end_time":"2026-07-07","by_hour":false}'
```

Required input: `project_id`, `exp_id`, `start_time`, `end_time`.
Optional input: `request_id`, `force_refresh`, `by_hour`.

Response shape: `data.report`, with recursively snake_case keys. Preserve `request_id` for cancellation.
