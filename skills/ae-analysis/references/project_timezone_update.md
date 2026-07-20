# analysis project timezone update

Use when the user needs to update one project time zone configuration item.

Do not use it for unrelated project-management actions or for fields not present in the common-service capability schema. Do not send camelCase aliases.

Command:

```bash
ae-cli analysis project timezone update --project-id <project_id> --payload <payload> --item <item>
ae-cli analysis project timezone update --dry-run --project-id <project_id> --payload <payload> --item <item>
```

Capability id: `project.timezone.update`.

Input sends `project_id`, `payload`, `item`. Payload keys, JSON arrays, and projection fields must follow the common-service snake_case input schema.

Output uses the gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`. Preserve `request_id` and `invocation_id` when present.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--payload` | Yes | Timezone update payload. Shape depends on item. |
| `--item` | Yes | Timezone item: timezone_toggle, zone_offset, user_timezone, project_timezone_display. |
