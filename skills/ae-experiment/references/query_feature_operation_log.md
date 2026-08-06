# experiment feature operation-log query

Query Feature operation logs for one Feature key.

Reuses Hermes `GET /v1/atlas/feature/operationLogs` and returns the generic Atlas
operation-log payload (`operation_type`, `operation_type_name`, `operator_name`,
`operation_content`, `operate_time`). This is separate from
`experiment operation-log query` and does not include experiment-side `changes`.

```bash
ae-cli experiment feature operation-log query --project-id <id> --feature-key <feature-key>
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--feature-key`: Feature key.

Response shape: `data.items` contains the full log records, `data.total` contains
the count, and item keys are recursively snake_case.
