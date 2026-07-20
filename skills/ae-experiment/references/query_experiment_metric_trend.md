# +query_experiment_metric_trend

Query experiment metric trend report.

```bash
ae-cli experiment +query_experiment_metric_trend --project_id <id> --exp_id <expId> --metric_id <metricId> --start_time 2026-07-01 --end_time 2026-07-07 [--request_id <id>] [--force_refresh true]
```

Flags:
- `--project_id`, `-p`: Project ID.
- `--exp_id`: Experiment ID.
- `--metric_id`: Metric ID.
- `--start_time`: Start date, `yyyy-MM-dd`.
- `--end_time`: End date, `yyyy-MM-dd`.
- `--request_id`: Optional request ID for query tracking.
- `--force_refresh`: Optional boolean for report refresh.
