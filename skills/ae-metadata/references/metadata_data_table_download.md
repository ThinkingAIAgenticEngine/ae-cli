# metadata data-table download

> Capability id: `metadata.data_table.download` · Domain: `metadata`.

```bash
ae-cli metadata data-table download --project-id <project_id> --data-table-id <id>
ae-cli metadata data-table download --project-id <project_id> --data-table-id <id> --request-id cli_0123456789abcdef0123456789abcdef --timeout-seconds 120
```

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--data-table-id` | Yes | Data table ID. |
| `--request-id` | No | Optional `cli_<32 lowercase hex>` request ID. |
| `--timeout-seconds` | No | Timeout in seconds, 1 to 7200. |

Use this command when the user needs an exported data-table artifact.
