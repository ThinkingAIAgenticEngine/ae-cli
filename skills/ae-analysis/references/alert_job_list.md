# analysis alert-job list

Use only when the user asks to list alert job status.

Command:

```bash
ae-cli analysis alert-job list --project-id <project_id>
```

Capability id: `analysis.alert_job.list`

Input sends `project_id`. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |

