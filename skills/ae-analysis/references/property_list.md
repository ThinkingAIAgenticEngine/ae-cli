# analysis-meta property list

Use when the user needs to list event or user properties.

Do not use it for property values or across mixed table types; select the event/user scope explicitly.

Command:

```bash
ae-cli analysis-meta property list --project-id <project_id> --table-type <table_type>
ae-cli analysis-meta property list --dry-run
```

Capability id: `metadata.property.list`.

Input sends `project_id`, `table_type`.

Output `data.properties[]` contains property metadata for the selected table type.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--table-type` | Yes | Property table type. |
