# metadata data-table csv-write

> Capability id: `metadata.data_table.csv_write` · Domain: `metadata`.

## Command

```bash
ae-cli metadata data-table csv-write --project-id <project_id> --operation create --input-file-id <input_file_id> --data-table-name <name> --columns '<columns_json>' --yes
ae-cli metadata data-table csv-write --project-id <project_id> --operation incremental_update --data-table-id <id> --input-file-id <input_file_id> --yes
ae-cli metadata data-table csv-write --project-id <project_id> --operation replace_update --data-table-id <id> --input-file-id <input_file_id> --yes
```

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--operation` | Yes | `create`, `incremental_update`, or `replace_update`. |
| `--input-file-id` | Yes | ID returned by `metadata input-file upload`. |
| `--data-table-id` | For updates | Existing data table ID. |
| `--data-table-name` | For create | Technical data table name. |
| `--display-name` | No | Human-readable table name. |
| `--description` | No | Table description. |
| `--columns` | No | Column definitions JSON array. |

## Decision Rules

- Upload the CSV first with `metadata input-file upload --purpose data_table.csv`.
- This is a write command; use `--dry-run` before non-dry-run and pass `--yes` when executing.
