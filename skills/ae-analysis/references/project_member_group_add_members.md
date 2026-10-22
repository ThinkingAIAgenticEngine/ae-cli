# project member-group add-members

Use when the user explicitly requests adding existing project members to an existing project member group.

Do not use this command to invite someone into the project or company, change roles, create/delete a group, rename it, or change its default-join setting. AgentSpace/system membership and analysis user-cluster/user-tag audiences use their own command families.

1. Resolve the target group with `project member-group list` and read its members with `project member-group members`, following pagination as needed. Resolve numeric `user_id` values from `project member list`; do not substitute login names or open IDs.
2. Preview the exact change:

   ```bash
   ae-cli project member-group add-members --project-id 1 --group-id 20 --user-ids '[101,102]' --dry-run
   ```

3. Summarize the project, group, and requested member changes. After explicit user confirmation, execute the unchanged request with global `--yes`:

   ```bash
   ae-cli project member-group add-members --project-id 1 --group-id 20 --user-ids '[101,102]' --yes
   ```

Capability ID: `project.member_group.add_members`. Risk: `high-risk-write`. Requires the project's `MAINTAIN_PROJECT_USER` permission. Non-interactive execution requires `--yes`; dry-run does not modify membership.

## Parameters

| Flag | Required | Meaning |
|---|---|---|
| `--project-id` | Yes | Integer project ID from 1 to 2147483647. |
| `--group-id` | Yes | Integer ID from 1 to 2147483647 of an existing group in this project. |
| `--user-ids` | Yes | JSON array containing 1 to 1000 integer user IDs from 1 to 2147483647, for example `[101,102]`. Strings, non-integers, zero, and negative IDs are rejected. |
| `--yes` | Execution | Global confirmation flag after explicit authorization. |

The gateway input uses `project_id`, `group_id`, `user_ids`, and `yes: true`. Every requested user must already belong to the project. The server applies the requested membership delta atomically, preserving the group name, default-join setting, and other group members. Do not send a replacement member list or call the page's full-group save interface.

## Output

The gateway success envelope returns `group_id`, `requested_user_ids`, `changed_user_ids`, and the resulting `member_count` in `data`. Use `changed_user_ids` to report the actual change rather than assuming every requested ID changed. Read back with `project member-group members` when the user needs the resulting membership. Preserve any `request_id` and `invocation_id` in metadata; report gateway permission or membership-validation failures without claiming success.
