# analysis alert delete

Use only when the user asks to delete an alert.

Command:

```bash
ae-cli analysis alert delete --project-id <project_id> --alert-id <alert_id> --dry-run
# Summarize the target and impact, then wait for explicit user confirmation.
ae-cli analysis alert delete --project-id <project_id> --alert-id <alert_id> --yes
```

Capability id: `analysis.alert.delete`

Input sends `project_id` and `alert_id`. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |
| `--alert-id` | Alert task ID. | Yes |
