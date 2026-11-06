# analysis dashboard handover

This is a `high-risk-write` operation because it changes access, ownership, or authentication policy. Preview the affected scope with `--dry-run`, obtain explicit user confirmation, then use global `--yes` for non-interactive execution. Validation and dry-run do not apply the change.

Use when the user explicitly wants to transfer one or more dashboards to another project user.

Do not use to share dashboards without ownership transfer. Use `dashboard share`.

Command:

```bash
ae-cli analysis dashboard handover --project-id <project_id> --dashboard-ids '[1001,1002]' --to-user-id <user_id> --yes
```

Input sends `project_id`, `dashboard_ids`, and `to_user_id`.

Output is the gateway envelope. `data` contains the handover result.
