# experiment operation-log query

Query full operation logs for one experiment.

Returns the complete Atlas experiment operation-log payload, including `remark`,
`operation_content`, and structured `changes` when present. No field projection.

```bash
ae-cli experiment operation-log query --project-id <id> --exp-id <exp-id>
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--exp-id`: Experiment ID.

Response shape: `data.items` contains the full log records, `data.total` contains
the count, and item keys are recursively snake_case.
