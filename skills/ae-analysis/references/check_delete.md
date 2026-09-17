# tracking check delete

Use only when the user asks to delete one tracking validation run.

Command:

```bash
ae-cli tracking check delete --project-id <project_id> --uuid <uuid> --confirm true --dry-run
# Summarize the target and impact, then wait for explicit user confirmation.
ae-cli tracking check delete --project-id <project_id> --uuid <uuid> --confirm true --yes
```

Capability id: `tracking.check.delete`

Input sends `project_id`, `uuid`, and lifecycle fields when exposed. Delete also sends `yes` from `--confirm`. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |
| `--uuid` | Tracking check task UUID. | Yes |
| `--confirm` | Must be true for this destructive tracking operation. Also use global --yes to skip local confirmation. | Yes |
