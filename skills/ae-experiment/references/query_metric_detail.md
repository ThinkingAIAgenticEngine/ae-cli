# experiment metric get

Query metric detail.

```bash
ae-cli experiment metric get --project-id <id> --metric-id <metricId>
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--metric-id`: Metric ID.

Response shape: the metric is in `data.item`, with recursively snake_case keys.

Reversible QP is returned as `metric_definition` with
`metric_definition_status=AVAILABLE`. Missing QP is `NOT_APPLICABLE`; unsupported
historical QP is `UNAVAILABLE` with `metric_definition_unavailable_reason`.
Internal `metric_config` and `calc_type` are never returned.
