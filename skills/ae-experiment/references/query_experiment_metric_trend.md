# experiment report metric-trend

Query experiment metric trend report.

```bash
ae-cli experiment report metric-trend --project-id 1 --exp-id exp_123 --metric-id metric_1 --start-time 2026-07-01 --end-time 2026-07-07
```

Required flags: `--project-id`, `--exp-id`, `--metric-id`, `--start-time`, `--end-time`.
Optional: `--request-id`, `--force-refresh`.

Response shape: `data.report`, with recursively snake_case keys. Preserve `request_id` for cancellation via `capability run experiment.query.cancel`.
