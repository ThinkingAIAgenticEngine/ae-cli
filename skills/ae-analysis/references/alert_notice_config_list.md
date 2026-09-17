# analysis alert-notice-config list

Use only when the user asks to list alert notice configs.

Command:

```bash
ae-cli analysis alert-notice-config list --project-id <project_id>
```

Capability id: `analysis.alert_notice_config.list`

Input sends `project_id`. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |

