# analysis bi-panel list

Use when the user needs to find BI panels they can access.

Do not use for dashboard assets. Use `dashboard list`.

Command:

```bash
ae-cli analysis bi-panel list --project-id <project_id> [--query <keyword>] [--limit 50] [--offset 0]
```

Input sends `project_id` and optional `query`, `fields`, `limit`, `offset`. Prefer the default projection for discovery. Do not request generic `id`; BI panel summaries use fields such as `panel_id` and `name` when projected.

When `has_more=true`, continue only with the returned `next_offset`; do not calculate the next page locally.

Output is the gateway envelope. `data` contains BI panel summaries and paging metadata when returned.
