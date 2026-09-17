# tracking plan sync-from-meta

Use only when the user asks to synchronize tracking plan from project metadata.

Command:

```bash
ae-cli tracking plan sync-from-meta --project-id <project_id>
```

Capability id: `tracking.plan.sync_from_meta`

Input sends `project_id`. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |

