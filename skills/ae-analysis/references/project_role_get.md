# analysis project role get

Use when the user needs to get one role by role name.

Do not use it for unrelated project-management actions or for fields not present in the common-service capability schema. Do not send camelCase aliases.

Command:

```bash
ae-cli analysis project role get --role-name <role_name>
ae-cli analysis project role get --dry-run --role-name <role_name>
```

Capability id: `project.role.get`.

Input sends `role_name`. Payload keys, JSON arrays, and projection fields must follow the common-service snake_case input schema.

Output uses the gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`. Preserve `request_id` and `invocation_id` when present.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--role-name` | Yes | Role name. |
