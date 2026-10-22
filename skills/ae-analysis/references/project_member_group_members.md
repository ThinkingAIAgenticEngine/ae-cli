# project member-group members

Use when the user needs to inspect the members of an existing project member group under Project management → Member management → Member groups.

Do not use this command for AgentSpace/system membership or analysis user-cluster/user-tag audiences. Project member-group membership is separate from project membership; use `project member list` to discover project members. Use `project member-group list` to resolve the group ID first.

```bash
ae-cli project member-group members --project-id 1 --group-id 20 --limit 100 --offset 0
```

Capability ID: `project.member_group.members`. Risk: `read`. Requires the project's `VIEW_PROJECT_MEMBER` permission.

## Parameters

| Flag | Required | Meaning |
|---|---|---|
| `--project-id` | Yes | Integer project ID from 1 to 2147483647. |
| `--group-id` | Yes | Integer ID from 1 to 2147483647 returned by `project member-group list` for this project. |
| `--limit` | No | Integer page size from 1 to 1000; default 100. |
| `--offset` | No | Integer row offset from 0 to 2147483647; default 0. |

The gateway input uses `project_id`, `group_id`, `limit`, and `offset`.

## Output and pagination

The gateway success envelope contains `data.items`, `total`, `limit`, `offset`, `has_more`, and `next_offset`. The result also identifies `group_id`; each member item has `user_id`, `login_name`, and `user_name`.

When `has_more` is true, repeat with the returned `next_offset`. Continue until `has_more` is false before claiming a complete list; a page can contain at most 1000 rows. Preserve any `request_id` and `invocation_id` in the gateway metadata. A permission error does not mean the project or group is empty.
