# tracking plan get

Use only when the user asks to get the tracking plan for one project.

Command:

```bash
ae-cli tracking plan get --project-id <project_id>
```

Capability id: `tracking.plan.get`

Input sends `project_id`. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |

