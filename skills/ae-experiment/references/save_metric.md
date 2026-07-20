# +save_metric

Create or update a metric.

```bash
ae-cli experiment +save_metric --project_id <id> --req '<json>'
```

Flags:
- `--project_id`, `-p`: Project ID.
- `--req`: Metric save request JSON object.

Create mode requires metric identifiers and metric configuration. Modify mode uses `update=true`.
