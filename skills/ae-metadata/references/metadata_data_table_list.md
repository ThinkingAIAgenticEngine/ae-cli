# metadata data-table list

> Capability id: `metadata.data_table.list` · Domain: `metadata`.

## Command

```bash
ae-cli metadata data-table list --project-id <project_id>
ae-cli metadata data-table list --project-id <project_id> --dry-run
```

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |

## Request Body

```json
{ "project_id": 1 }
```

## Decision Rules

- Use this command to discover `data_table_id` before get, delete, download, or property binding.
- If the list is empty, do not invent IDs; create/upload a table first or ask for the target table.
