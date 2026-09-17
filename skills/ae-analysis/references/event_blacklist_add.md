# tracking event-blacklist add

Use only when the user asks to add events to tracking event blacklist.

Command:

```bash
ae-cli tracking event-blacklist add --project-id <project_id> --event-names '<event_names>'
```

Capability id: `tracking.event_blacklist.add`

Input sends `project_id` and `event_names`. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |
| `--event-names` | JSON array of event names. | Yes |

