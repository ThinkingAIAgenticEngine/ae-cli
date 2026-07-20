# +query_experiment_sample_size_report

Query experiment sample-size report.

```bash
ae-cli experiment +query_experiment_sample_size_report --project_id <id> --exp_id <expId> --start_time 2026-07-01 --end_time 2026-07-07 [--request_id <id>] [--force_refresh true] [--by_hour true]
```

Flags:
- `--project_id`, `-p`: Project ID.
- `--exp_id`: Experiment ID.
- `--start_time`: Start date, `yyyy-MM-dd`.
- `--end_time`: End date, `yyyy-MM-dd`.
- `--request_id`: Optional request ID for query tracking.
- `--force_refresh`: Optional boolean for report refresh.
- `--by_hour`: Optional boolean to show results by hour.
