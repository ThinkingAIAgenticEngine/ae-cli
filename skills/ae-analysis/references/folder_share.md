# analysis folder share

Use when the user wants to add, remove, or batch modify folder sharing members.

Do not use to inspect members only. Use `folder members`.

Command:

```bash
ae-cli analysis folder share --project-id <project_id> --folder-id <folder_id> [--payload '{...}'] --yes
```

Input sends `project_id`, `folder_id`, and backend-compatible snake_case `payload`.

Output is the gateway envelope. `data` contains the share update result.
