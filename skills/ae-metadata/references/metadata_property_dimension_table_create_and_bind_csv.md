# metadata property create-and-bind-csv-dimension-table

> Capability id: `metadata.property.create_and_bind_csv_dimension_table` · Domain: `metadata`.

## Command

```bash
ae-cli metadata property create-and-bind-csv-dimension-table --project-id <project_id> --property-name <name> --property-scope user --input-file-id <input_file_id> --data-table-name <table_name> --columns '<columns_json>' --yes
```

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--property-name` | Yes | Property technical name. |
| `--property-scope` | Yes | Property owner table, for example `event` or `user`. |
| `--input-file-id` | Yes | ID returned by `metadata input-file upload`. |
| `--data-table-name` | No | Technical data table name. |
| `--display-name` | No | Human-readable table name. |
| `--description` | No | Table description. |
| `--columns` | No | Column definitions JSON array. |
| `--timestamp-join-format` | No | Timestamp join format. |
| `--dict-columns` | No | Dictionary column names JSON array. |

## Decision Rules

- Upload the CSV first with `metadata input-file upload --purpose data_table.csv`.
- Use this one-step command when the user wants a new CSV dimension table bound to a property.
- This is a write command; use `--dry-run` before non-dry-run and pass `--yes` when executing.
