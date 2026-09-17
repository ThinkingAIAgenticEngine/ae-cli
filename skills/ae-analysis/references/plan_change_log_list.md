# tracking plan-change-log list

Use only when the user asks to list tracking plan change logs.

Command:

```bash
ae-cli tracking plan-change-log list --project-id <project_id>
```

Capability id: `tracking.plan_change_log.list`

Input sends `project_id`. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |

