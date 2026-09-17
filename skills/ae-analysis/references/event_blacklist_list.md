# tracking event-blacklist list

Use only when the user asks to list tracking event blacklist configuration.

Command:

```bash
ae-cli tracking event-blacklist list --project-id <project_id>
```

Capability id: `tracking.event_blacklist.list`

Input sends `project_id`. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |

