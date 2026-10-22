# project member-group create

Use when the user needs a new project member group under Project management → Member management → Member groups.

Do not use this command to create a company/project member, an AgentSpace group, an audience cluster, or a user tag. It creates an empty group with `is_default=false`; it does not enroll project members or change another group's settings. Add existing project members afterward with `project member-group add-members`.

```bash
ae-cli project member-group create --project-id 1 --group-name 'Customer Success' --dry-run
ae-cli project member-group create --project-id 1 --group-name 'Customer Success'
```

Capability ID: `project.member_group.create`. Risk: `write`. Requires the project's `MAINTAIN_PROJECT_USER` permission.

## Parameters

| Flag | Required | Meaning |
|---|---|---|
| `--project-id` | Yes | Integer project ID from 1 to 2147483647. |
| `--group-name` | Yes | Non-blank group name of 1 to 80 characters. |

The gateway input uses `project_id` and `group_name`. No default-join flag is exposed.

## Output

The gateway success envelope returns the new `group_id` and `group_name` in `data`. Use that ID for membership changes; read the resulting group with `project member-group list`. Preserve any `request_id` and `invocation_id` in metadata. Report name-validation or permission failures without claiming the group was created.
