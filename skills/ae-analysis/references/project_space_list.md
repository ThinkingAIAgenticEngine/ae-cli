# analysis project-space list

Use when the user needs project spaces they can access.

Do not use for project lookup or project ID verification. Use `analysis_common +list_projects`.

Command:

```bash
ae-cli analysis project-space list --project-id <project_id> [--query <keyword>] [--fields '["id","name"]'] [--limit 20] [--offset 0]
```

Input sends `project_id` and optional `query`, `fields`, `limit`, `offset`.

Output is the gateway envelope. `data` contains project-space summaries.
