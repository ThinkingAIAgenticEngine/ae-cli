# analysis +get_table_columns (Read Underlying Table Columns)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Model analysis**

## Use Cases
- Query the field list of a project table. Returns all column names and types for `tableRef` so the table schema can be understood before SQL analysis.
- Table guide:
- `hive.ta_dim.datatable_1`: catalog is hive, schema is ta_dim, table is datatable_1.
- `ta_dim.datatable_1`: catalog defaults to hive, schema is ta_dim, table is datatable_1.
- `ta_event_1`: table only; resolved against project available tables and fails if ambiguous.
- The only common catalog is `hive`. Common hive schemas are `ta` (default analysis tables), `ta_dim` (dimension/datatable/exchange tables), `temp` (SQL temporary tables), and `ta_ext` (external datatable/API tables). Do not replace an explicit schema such as `ta_dim` with default `ta`.

## Command
```bash
ae-cli analysis +get_table_columns --project_id <project_id> --table_ref hive.ta_dim.datatable_1
ae-cli analysis +get_table_columns --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--table_ref` | Yes | Table reference. Supports `hive.schema.table`, `schema.table`, or `table`. If only `table` is provided, the backend resolves it against project available tables and fails on ambiguity. |

## Decision Rules
- Prefer a fully qualified `--table_ref` when the schema is known, especially for `ta_dim`, `temp`, or `ta_ext` tables.
- Use table-only `--table_ref <table>` only when you expect the table name to be unique in the project; if the backend returns ambiguity, retry with one of the returned fully qualified `tableRef` values.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps on Failure
- If required parameters are missing, fill in `--project_id` and `--table_ref` first.
- If reading fails, first verify whether the `tableRef` exists, is unambiguous, and belongs to the current project permissions.

## Recommended chaining
- +get_table_columns
