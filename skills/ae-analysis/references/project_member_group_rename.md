# project member-group rename

Use when the user needs to rename an existing project member group.

Do not use this command to replace group members, change roles, or change the default-join setting. The rename preserves all existing group memberships and the group's default-join setting. Resolve the exact group ID with `project member-group list` before modifying it.

```bash
ae-cli project member-group rename --project-id 1 --group-id 20 --group-name 'Customer Success' --dry-run
ae-cli project member-group rename --project-id 1 --group-id 20 --group-name 'Customer Success'
```

Capability ID: `project.member_group.rename`. Risk: `write`. Requires the project's `MAINTAIN_PROJECT_USER` permission.

## Parameters

| Flag | Required | Meaning |
|---|---|---|
| `--project-id` | Yes | Integer project ID from 1 to 2147483647. |
| `--group-id` | Yes | Integer ID from 1 to 2147483647 of an existing group in this project. |
| `--group-name` | Yes | Non-blank group name of 1 to 80 characters. |

The gateway input uses `project_id`, `group_id`, and `group_name`. Send only the new name; do not copy and resubmit a page-level group member list.

## Output

The gateway success envelope returns `group_id` and the resulting `group_name` in `data`. Read back with `project member-group list` to verify the name. If the user needs membership evidence, use `project member-group members` and follow its pagination. Preserve any `request_id` and `invocation_id` in metadata; a permission failure is not a successful rename.
