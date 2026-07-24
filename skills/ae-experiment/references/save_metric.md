# experiment metric save

Create or update a metric.

```bash
ae-cli experiment metric save --project-id <id> --req '<json>'
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--req`: Metric save request JSON object.

Create mode requires metric identifiers and metric configuration. Modify mode uses `update=true`.
