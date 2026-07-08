# metadata data-table sql-delete

> Capability id: `metadata.data_table.sql_delete` · Domain: `metadata`.

```bash
ae-cli metadata data-table sql-delete --project-id <project_id> --data-table-id <id> --yes
ae-cli metadata data-table sql-delete --project-id <project_id> --data-table-id <id> --dry-run
```

| Parameter | Required | Description |
|---|---|---|
| `--project-id` / `-p` | Yes | Numeric project ID. |
| `--data-table-id` | Yes | SQL-backed data table ID. |

This is a write command. Confirm the table with `metadata data-table get` before deleting.
