# analysis alert get

Use only when the user asks to get one alert.

Command:

```bash
ae-cli analysis alert get --project-id <project_id> --alert-id <alert_id>
```

Capability id: `analysis.alert.get`

Input sends `project_id` and `alert_id`. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |
| `--alert-id` | Alert task ID. | Yes |

