# analysis public-link list

Use when the user needs public links in a project.

Do not use for dashboard or BI panel asset listing. Use the matching list command.

Command:

```bash
ae-cli analysis public-link list --project-id <project_id> [--query <keyword>] [--fields '["id","resource_id"]'] [--limit 50] [--offset 0]
```

Input sends `project_id` and optional `query`, `fields`, `limit`, `offset`.

When `has_more=true`, continue only with the returned `next_offset`; do not calculate the next page locally.

Output is the gateway envelope. `data` contains public-link summaries.
