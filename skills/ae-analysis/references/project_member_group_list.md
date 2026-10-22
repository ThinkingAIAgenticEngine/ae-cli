# project member-group list

Use when the user needs to find existing member groups in a project under Project management → Member management → Member groups.

Do not use this command for AgentSpace/system membership or analysis user-cluster/user-tag audiences. Project member-group membership is separate from project membership; use `project member list` to discover project members. Use `project member-group members` to inspect a group’s members; the group list returns counts, not nested member lists.

```bash
ae-cli project member-group list --project-id 1 --limit 100 --offset 0
```

Capability ID: `project.member_group.list`. Risk: `read`. Requires the project's `VIEW_PROJECT_MEMBER` permission.

For group lifecycle changes, read [create](project_member_group_create.md), [rename](project_member_group_rename.md), or [delete](project_member_group_delete.md). Membership changes use [add-members](project_member_group_add_members.md) and [remove-members](project_member_group_remove_members.md).

## Parameters

| Flag | Required | Meaning |
|---|---|---|
| `--project-id` | Yes | Integer project ID from 1 to 2147483647. |
| `--limit` | No | Integer page size from 1 to 1000; default 100. |
| `--offset` | No | Integer row offset from 0 to 2147483647; default 0. |

The gateway input uses `project_id`, `limit`, and `offset`.

## Output and pagination

The gateway success envelope contains `data.items`, `total`, `limit`, `offset`, `has_more`, and `next_offset`. Each group item has `group_id`, `group_name`, `is_default`, and `member_count`.

When `has_more` is true, repeat with the returned `next_offset`. Continue until `has_more` is false before claiming a complete list; a page can contain at most 1000 rows. Preserve any `request_id` and `invocation_id` in the gateway metadata. A permission error does not mean the project or group is empty.
