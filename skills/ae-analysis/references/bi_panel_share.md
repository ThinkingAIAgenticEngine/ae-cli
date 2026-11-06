# analysis bi-panel share

This is a `high-risk-write` operation because it changes access, ownership, or authentication policy. Preview the affected scope with `--dry-run`, obtain explicit user confirmation, then use global `--yes` for non-interactive execution. Validation and dry-run do not apply the change.

Use when the user wants to modify BI panel sharing members.

Do not use to share dashboards or folders. Use the matching resource share command.

Command:

```bash
ae-cli analysis bi-panel share --project-id <project_id> --panel-id <panel_id> [--payload '{...}'] --yes
```

Input sends `project_id`, `panel_id`, and backend-compatible snake_case `payload`.

Supported payload fields include:

- `all_auth_user_authority`: project-wide BI panel authority. Use `READ`, `JUNIOR`, `SENIOR`, or `MAINTAIN`; `VIEWER` is accepted as `READ`.
- `auth_users`: user authority list.
- `auth_user_groups`: user-group authority list.

Output is the gateway envelope. `data` contains the share update result.
