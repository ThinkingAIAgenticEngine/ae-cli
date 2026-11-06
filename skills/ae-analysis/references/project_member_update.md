# project member update

This is a `high-risk-write` operation because it changes access, ownership, or authentication policy. Preview the affected scope with `--dry-run`, obtain explicit user confirmation, then use global `--yes` for non-interactive execution. Validation and dry-run do not apply the change.

Use when the user needs to update one project member.

Do not use it for unrelated project-management actions or for fields not present in the common-service capability schema. Do not send camelCase aliases.

Command:

```bash
ae-cli project member update --project-id <project_id> --payload <payload> --target-user-id <target_user_id> --yes
```

Capability id: `project.member.update`.

Input sends `project_id`, `payload`, `target_user_id`. Payload keys, JSON arrays, and projection fields must follow the common-service snake_case input schema.

Output uses the gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`. Preserve `request_id` and `invocation_id` when present.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--payload` | Yes | Member edit payload matching ProjMemberEditReq in snake_case. |
| `--target-user-id` | Yes | Target user ID. |
