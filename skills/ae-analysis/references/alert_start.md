# analysis alert start

Use only when the user asks to start an alert.

Command:

```bash
ae-cli analysis alert start --project-id <project_id> --alert-id <alert_id>
```

Capability id: `analysis.alert.start`

Input sends `project_id` and `alert_id`. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |
| `--alert-id` | Alert task ID. | Yes |

