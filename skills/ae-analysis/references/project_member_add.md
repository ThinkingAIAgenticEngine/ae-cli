# project member add

Use when the user needs to add project members. Use `--type 0` to create a company member from project management, or `--type 1` to add an existing company member to the project.

Do not use it for unrelated project-management actions or for fields not present in the common-service capability schema. Do not send camelCase aliases.

When the company disables project-level member creation, `--type 0` is rejected by both dry-run and execute. Create the member through system management first, then use `--type 1`. The company setting does not block system-management member creation.

Command:

```bash
ae-cli project member add --project-id <project_id> --payload '{"user_roles":[{"user_id":<user_id>,"role_list":["<role_name>"]}]}' --type 1
```

Capability id: `project.member.add`.

Input sends `project_id`, `payload`, `type`. Payload keys, JSON arrays, and projection fields must follow the common-service snake_case input schema.

Output uses the gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`. Preserve `request_id` and `invocation_id` when present.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--payload` | Yes | JSON object with `user_roles`. For an existing company member, each item uses `user_id` and `role_list` (verified project role names); optional `data_power_id` selects data permissions. For a new user (`--type 0`), use `login_name`, `password`, and `role_list` instead of an existing `user_id`; `user_name` is optional. |
| `--type` | Yes | `0`: create a company member from project management; `1`: add an existing company member. Type `0` may be disabled by company configuration. |
