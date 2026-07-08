# analysis dashboard share

Use when the user explicitly wants to add, remove, or batch modify dashboard sharing.

Do not use to read sharing only. Use `dashboard share-info`.

Command:

```bash
ae-cli analysis dashboard share --project-id <project_id> --dashboard-id <dashboard_id> [--member-authorities '{...}'] [--payload '{...}'] --yes
```

Input sends `project_id`, `dashboard_id`, and either `member_authorities` or a backend-compatible snake_case `payload`.

Output is the gateway envelope. `data` contains the share update result.
