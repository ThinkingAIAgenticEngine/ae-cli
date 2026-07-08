# metadata property bind-existing-dimension-table

> Capability id: `metadata.property.bind_existing_dimension_table` · Domain: `metadata`.

## Command

```bash
ae-cli metadata property bind-existing-dimension-table --project-id <project_id> --property-name <name> --property-scope user --data-table-id <id> --yes
ae-cli metadata property bind-existing-dimension-table --project-id <project_id> --property-name <name> --property-scope event --data-table-id <id> --dict-columns '["display_name"]' --yes
```

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--property-name` | Yes | Property technical name. |
| `--property-scope` | Yes | Property owner table, for example `event` or `user`. |
| `--data-table-id` | Yes | Existing dimension data table ID. |
| `--timestamp-join-format` | No | Timestamp join format. |
| `--dict-columns` | No | Dictionary column names JSON array. |

## Decision Rules

- Confirm the property with `metadata property get` or `analysis_meta +list_properties`.
- Confirm the data table with `metadata data-table get`.
- This is a write command; use `--dry-run` before non-dry-run and pass `--yes` when executing.
