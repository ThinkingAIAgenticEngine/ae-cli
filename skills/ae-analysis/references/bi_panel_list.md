# analysis bi-panel list

Use when the user needs to find BI panels they can access.

Do not use for dashboard assets. Use `dashboard list`.

Command:

```bash
ae-cli analysis bi-panel list --project-id <project_id> [--query <keyword>] [--fields '["id","name"]'] [--limit 20] [--offset 0]
```

Input sends `project_id` and optional `query`, `fields`, `limit`, `offset`.

Output is the gateway envelope. `data` contains BI panel summaries and paging metadata when returned.
