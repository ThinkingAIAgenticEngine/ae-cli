# metadata data-table sql-write

> Capability id: `metadata.data_table.sql_write` · Domain: `metadata`.

## Command

```bash
ae-cli metadata data-table sql-write --project-id <project_id> --operation create --table-name datatable_<project_id>_<name> --columns '<columns_json>' --qp '<qp_json>' --zone-offset 8 --yes
ae-cli metadata data-table sql-write --project-id <project_id> --operation update --data-table-id <id> --columns '<columns_json>' --qp '<qp_json>' --strategy overwrite --update-cron '0 0 * * * ?' --yes
```

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--operation` | Yes | `create` or `update`. |
| `--columns` | Yes | Column definitions JSON array. Preferred fields are `column_name`, `column_type`, and `column_desc`; CLI also accepts `name`, `type`, and `display_name` aliases. Must match SQL output column names. |
| `--qp` | Yes | `SqlDatatableDef` JSON object (see below). |
| `--data-table-id` | For update | Existing data table ID. |
| `--table-name` | For create | Technical table name. Use `datatable_<project_id>_<name>`. |
| `--display-name` | No | Human-readable name. |
| `--remarks` | No | Table remarks. |
| `--zone-offset` | No | Time zone offset in hours. For example, UTC+8 is `8` and UTC-5 is `-5`. Valid range: -12 to 14. |
| `--strategy` | For update | `overwrite` or `insert`. Ignored for create. |
| `--update-cron` | For update | Scheduled update cron. Ignored for create. |

## QP contract (`SqlDatatableDef`)

`--qp` must be a JSON object with this shape. **Do not** pass a top-level `sql` field.

```json
{
  "taSqlVo": {
    "sql": "select '1' as id, 'demo' as name",
    "sqlVoParams": []
  },
  "taSqlView": {}
}
```

| Field | Required | Description |
|---|---|---|
| `taSqlVo` | Yes | SQL entity definition (`TaSqlVo`). |
| `taSqlVo.sql` | Yes | SELECT statement. Output columns must appear in `--columns`. |
| `taSqlVo.sqlVoParams` | No | Dynamic SQL parameters. Use `[]` when none. |
| `taSqlView` | No | SQL view (`TaSqlView`). Use `{}` when no dynamic view params. |
| `taSqlView.sqlViewParams` | No | View dynamic parameters. |

Inspect the live schema:

```bash
ae-cli capability inspect metadata.data_table.sql_write
```

## Create example

```bash
ae-cli metadata data-table sql-write \
  --project-id 1 \
  --operation create \
  --table-name datatable_1_orders_dim \
  --display-name "Orders dim" \
  --columns '[{"name":"id","type":"string","display_name":"id"},{"name":"name","type":"string","display_name":"name"}]' \
  --qp '{"taSqlVo":{"sql":"select '\''1'\'' as id, '\''demo'\'' as name","sqlVoParams":[]},"taSqlView":{}}' \
  --zone-offset 8 \
  --dry-run

ae-cli metadata data-table sql-write \
  --project-id 1 \
  --operation create \
  --table-name datatable_1_orders_dim \
  --display-name "Orders dim" \
  --columns '[{"name":"id","type":"string","display_name":"id"},{"name":"name","type":"string","display_name":"name"}]' \
  --qp '{"taSqlVo":{"sql":"select '\''1'\'' as id, '\''demo'\'' as name","sqlVoParams":[]},"taSqlView":{}}' \
  --zone-offset 8
```

## Decision Rules

- This is a write command; use `--dry-run` before non-dry-run execution.
- Keep `columns` and `qp` as valid JSON. `qp` must follow `SqlDatatableDef`; dry-run validates structure but does not execute SQL.
- If you provide a table name, it must include the project segment, for example `datatable_2_orders_sql`.
- If execute fails with `CAPABILITY_EXECUTION_FAILED`, fix qp structure first, then retry with a valid query before investigating backend SQL/Presto issues.
