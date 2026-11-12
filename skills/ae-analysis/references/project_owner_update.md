# project owner update

This is a `high-risk-write` operation because it changes access, ownership, or authentication policy. Preview the affected scope with `--dry-run`, obtain explicit user confirmation, then use global `--yes` for non-interactive execution. Validation and dry-run do not apply the change.

Use when the user needs to update project owner.

Omit `--owner-user-id` to use company-admin management without an explicit project owner. This downgrades the existing project owner. The CLI always forwards a supplied user ID unchanged; the fixed Common backend treats a target-company root ID exactly like a null owner and returns success while preserving all root roles. This behavior is shared by the page, CLI, and direct API callers. No company-member lookup or additional member-read permission is required in the CLI.

Deploy the paired Common protection before assigning a root user ID. Older Common versions may still replace privileged roles incorrectly; client upgrades alone cannot repair that backend defect.

Do not use it for unrelated project-management actions or for fields not present in the common-service capability schema. Do not send camelCase aliases.

Command:

```bash
ae-cli project owner update --project-id <project_id> --company-id <company_id> --owner-user-id <owner_user_id> --project-name <project_name> --project-remark <project_remark> --yes
```

Capability id: `project.owner.update`.

Input sends `project_id`, `company_id`, `owner_user_id`, `project_name`, `project_remark`. Payload keys, JSON arrays, and projection fields must follow the common-service snake_case input schema.

Output uses the gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`. Preserve `request_id` and `invocation_id` when present.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--company-id` | Yes | Company ID. |
| `--owner-user-id` | No | New owner user ID. Common treats a company root as company-admin management. Omit for the same behavior; the existing owner is downgraded. |
| `--project-name` | No | Optional project name update. |
| `--project-remark` | No | Optional project remark update. |
