# experiment metric get

Query metric detail.

```bash
ae-cli experiment metric get --project-id <id> --metric-id <metricId>
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--metric-id`: Metric ID.

Response shape: the metric is in `data.item`, with recursively snake_case keys.
