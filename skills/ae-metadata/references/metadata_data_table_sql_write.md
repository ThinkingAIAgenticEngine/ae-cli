# metadata data-table sql-write

> Capability id: `metadata.data_table.sql_write` · Domain: `metadata`.

## Command

```bash
ae-cli metadata data-table sql-write --project-id <project_id> --operation create --table-name <name> --columns '<columns_json>' --qp '<qp_json>' --strategy overwrite --yes
ae-cli metadata data-table sql-write --project-id <project_id> --operation update --data-table-id <id> --columns '<columns_json>' --qp '<qp_json>' --yes
```

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--operation` | Yes | `create` or `update`. |
| `--columns` | Yes | Column definitions JSON array. |
| `--qp` | Yes | SQL data table query plan JSON. |
| `--data-table-id` | For update | Existing data table ID. |
| `--table-name` | For create | Technical table name. |
| `--display-name` | No | Human-readable name. |
| `--remarks` | No | Table remarks. |
| `--zone-offset` | No | Time zone offset such as `+08:00`. |
| `--strategy` | No | `overwrite` or `insert`. |
| `--update-cron` | No | Scheduled update cron. |

## Decision Rules

- This is a write command; use `--dry-run` before non-dry-run and pass `--yes` when executing.
- Keep `columns` and `qp` as valid JSON; do not pass raw SQL unless the server schema requires it inside `qp`.
