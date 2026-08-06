# experiment metric list

Query metrics in a project.

```bash
ae-cli experiment metric list --project-id <id>
```

Flags:
- `--project-id`, `-p`: Project ID.

Response shape: `data.items` contains metrics, `data.total` contains the count, and item keys are recursively snake_case.

Each item uses `metric_definition` and `metric_definition_status`. Internal
`metric_config` and `calc_type` are never returned.
