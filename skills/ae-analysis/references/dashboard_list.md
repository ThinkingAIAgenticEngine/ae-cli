# analysis dashboard list

Use when the user needs to find dashboards they can access, with optional keyword, owner, permission, favorite, or projection filters supported by the gateway payload.

Do not use for dashboard report data. Use `dashboard-report-data run` or `dashboard-report-data export` instead.

Command:

```bash
ae-cli analysis dashboard list --project-id <project_id> [--query <keyword>] [--fields '["id","name"]'] [--limit 20] [--offset 0]
```

Input uses `project_id` plus optional `query`, `fields`, `limit`, `offset`. Use `--payload` only when the dedicated gateway contract requires extra snake_case filters.

Output is the gateway envelope. `data` contains dashboard summaries and paging metadata when returned by the gateway.
