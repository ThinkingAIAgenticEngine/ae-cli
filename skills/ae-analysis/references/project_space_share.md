# analysis project-space share

Use when the user wants to add, remove, or batch modify project-space sharing members.

Do not use to inspect members only. Use `project-space members`.

Command:

```bash
ae-cli analysis project-space share --project-id <project_id> --space-id <space_id> [--payload '{...}'] --yes
```

Input sends `project_id`, `space_id`, and backend-compatible snake_case `payload`.

Output is the gateway envelope. `data` contains the share update result.
