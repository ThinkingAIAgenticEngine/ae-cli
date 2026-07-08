# metadata input-file upload

> Capability endpoint: `POST /api/cli/metadata/v1/input-files` · Domain: `metadata`.

## Use Cases

- Upload a local CSV file before `metadata data-table csv-write`.
- Get an `input_file_id` such as `ifile_<32 lowercase hex>`.

## Command

```bash
ae-cli metadata input-file upload --project-id <project_id> --purpose data_table.csv --file <local_file> --yes
ae-cli metadata input-file upload --project-id <project_id> --purpose data_table.csv --file <local_file> --dry-run
```

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--purpose` | Yes | Input-file purpose. Use `data_table.csv` for data table CSV imports. |
| `--file` | Yes | Local file path to upload. |

## Decision Rules

- Run `--dry-run` first to verify the gateway URL and multipart fields.
- Use the returned `input_file_id` in CSV data-table write or create-and-bind commands.
- This is a write command; non-dry-run execution requires `--yes`.
