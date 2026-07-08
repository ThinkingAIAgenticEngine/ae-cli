# analysis project-space delete

Use when the user explicitly wants to delete one or more project spaces.

Do not use for removing dashboard or folder membership. Use the matching resource command.

Command:

```bash
ae-cli analysis project-space delete --project-id <project_id> [--space-id <space_id>] [--space-ids '[1,2]'] --yes
```

Input sends `project_id` and either `space_id` or `space_ids`.

Output is the gateway envelope. `data` contains the delete result.
