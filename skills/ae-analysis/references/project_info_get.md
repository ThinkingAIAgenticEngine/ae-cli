# project info get

Use when the user needs to get project configuration details.

Do not use it for unrelated project-management actions or for fields not present in the common-service capability schema. Do not send camelCase aliases.

Command:

```bash
ae-cli project info get --project-id <project_id>
```

Capability id: `project.info.get`.

Input sends `project_id`. Payload keys, JSON arrays, and projection fields must follow the common-service snake_case input schema.

Output uses the gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`. Preserve `request_id` and `invocation_id` when present.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |

## Scenario sample collection policy

`data.analysis_scenario_collection_enabled` is a live boolean from the source project's own configuration. It is true only for explicit `agent_analysis_scenario_collection_enabled=on`. Missing, invalid, or unreadable configuration defaults to false; company configuration is not inherited. This field does not change ordinary invocation/intent telemetry. Older servers may omit it; treat omission as disabled. Re-read for each scenario or append rather than keeping a previous grant.
