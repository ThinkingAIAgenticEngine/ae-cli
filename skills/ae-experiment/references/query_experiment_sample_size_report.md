# experiment report sample-size

Query experiment sample-size report.

```bash
ae-cli experiment report sample-size --project-id 1 --exp-id exp_123 --start-time 2026-07-01 --end-time 2026-07-07
ae-cli experiment report sample-size --project-id 1 --exp-id exp_123 --start-time 2026-07-01 --end-time 2026-07-07 --by-hour true
```

Required flags: `--project-id`, `--exp-id`, `--start-time`, `--end-time`.
Optional: `--request-id`, `--force-refresh`, `--by-hour`.

Response shape: `data.report`, with recursively snake_case keys. Preserve `request_id` for cancellation via `capability run experiment.query.cancel`.
