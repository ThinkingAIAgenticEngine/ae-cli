# project member-candidate list

Use when the user needs to list candidate users and role/data-power options for adding project members. Use `--type 0` with `--login-names` to check prospective new company members, or `--type 1` to list existing company members that can be added to the project.

Do not use it for unrelated project-management actions or for fields not present in the common-service capability schema. Do not send camelCase aliases.

When the company disables project-level member creation, `--type 0` is rejected by both dry-run and execute. Use system management to create the member and then query with `--type 1`.

Command:

```bash
ae-cli project member-candidate list --project-id <project_id> --type <type> --login-names <login_names>
```

Capability id: `project.member_candidate.list`.

Input sends `project_id`, `type`, `login_names`. Payload keys, JSON arrays, and projection fields must follow the common-service snake_case input schema.

Output uses the gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`. Preserve `request_id` and `invocation_id` when present.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--type` | Yes | `0`: check prospective new company members; `1`: list existing company members. Type `0` may be disabled by company configuration. |
| `--login-names` | No | Comma-separated login names when checking new users. |
