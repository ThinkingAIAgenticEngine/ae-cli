# analysis alert-detail list

Use only when the user asks to list alert delivery details.

Command:

```bash
ae-cli analysis alert-detail list --project-id <project_id> --alert-id <alert_id>
```

Capability id: `analysis.alert_detail.list`

Input sends `project_id`, `alert_id`, optional `start_time`, and optional `end_time`. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |
| `--alert-id` | Alert task ID. | Yes |
| `--start-time` | Optional alert detail start time. | No |
| `--end-time` | Optional alert detail end time. | No |

