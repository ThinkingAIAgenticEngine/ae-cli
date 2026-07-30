# analysis project-space list

Use when the user needs project spaces they can access.

Do not use for project lookup or project ID verification. Use `project info list`.

Command:

```bash
ae-cli analysis project-space list --project-id <project_id> [--query <keyword>] [--fields '["space_id","name","space_desc"]'] [--limit 50] [--offset 0]
```

Input sends `project_id` and optional `query`, `fields`, `limit`, `offset`.

When `has_more=true`, continue only with the returned `next_offset`; do not calculate the next page locally.

Output is the gateway envelope. `data` contains project-space summaries.

Supported projection fields are `space_id`, `name`, `space_desc`, `creator`, `user_id`, `origin`,
`authority_type`, `avatar_type`, `color_key`, `avatar`, `is_favorite`, and `permissions`.
Use only these snake_case names; camelCase projection names are rejected.
