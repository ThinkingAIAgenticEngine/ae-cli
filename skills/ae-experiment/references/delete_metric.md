# experiment metric delete

Delete a metric.

```bash
ae-cli experiment metric delete --project-id <id> --metric-id <metricId> [--yes]
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--metric-id`: Metric ID.

Deletion is rejected with `error_code: METRIC_IN_USE` while the metric has an active experiment binding. Remove the metric from the related experiment before retrying.
