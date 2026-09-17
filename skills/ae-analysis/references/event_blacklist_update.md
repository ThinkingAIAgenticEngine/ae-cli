# tracking event-blacklist update

Use only when the user asks to update tracking event blacklist config.

Command:

```bash
ae-cli tracking event-blacklist update --project-id <project_id> --event-names '<event_names>' --type <type>
```

Capability id: `tracking.event_blacklist.update`

Input sends `project_id`, `event_names`, and `type`. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |
| `--event-names` | JSON array of event names. | Yes |
| `--type` | Blacklist event config type: 0 or 1. | Yes |

