# metadata data-table sql-write

> Capability id: `metadata.data_table.sql_write` · Domain: `metadata`.

## Command

```bash
ae-cli metadata data-table sql-write --project-id <project_id> --operation create --table-name datatable_<project_id>_<name> --columns '<columns_json>' --qp '<qp_json>' --zone-offset 8 --strategy overwrite --yes
ae-cli metadata data-table sql-write --project-id <project_id> --operation update --data-table-id <id> --columns '<columns_json>' --qp '<qp_json>' --yes
```

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--operation` | Yes | `create` or `update`. |
| `--columns` | Yes | Column definitions JSON array. Preferred fields are `column_name`, `column_type`, and `column_desc`; CLI also accepts `name`, `type`, and `display_name` aliases. |
| `--qp` | Yes | SQL data table query plan JSON. |
| `--data-table-id` | For update | Existing data table ID. |
| `--table-name` | For create | Technical table name. Use `datatable_<project_id>_<name>`. |
| `--display-name` | No | Human-readable name. |
| `--remarks` | No | Table remarks. |
| `--zone-offset` | No | Time zone offset in hours. For example, UTC+8 is `8` and UTC-5 is `-5`. Valid range: -12 to 14. |
| `--strategy` | No | `overwrite` or `insert`. |
| `--update-cron` | No | Scheduled update cron. |

## Decision Rules

- This is a write command; use `--dry-run` before non-dry-run and pass `--yes` when executing.
- Keep `columns` and `qp` as valid JSON; do not pass raw SQL unless the server schema requires it inside `qp`.
- If you provide a table name, it must include the project segment, for example `datatable_2_orders_sql`.
