# project member-group delete

Use when the user explicitly requests deleting an existing project member group.

Do not use this command to remove users from a project/company or merely remove selected group members; use `project member-group remove-members` for the latter. Deleting the group leaves the users' project/company memberships intact. Group-based sharing can be affected, so identify the group and explain the impact before executing.

1. Resolve the exact group ID with `project member-group list`; inspect current members with `project member-group members` if needed.
2. Preview:

   ```bash
   ae-cli project member-group delete --project-id 1 --group-id 20 --dry-run
   ```

3. After explicit user confirmation, execute the unchanged request:

   ```bash
   ae-cli project member-group delete --project-id 1 --group-id 20 --yes
   ```

Capability ID: `project.member_group.delete`. Risk: `high-risk-write`. Requires the project's `MAINTAIN_PROJECT_USER` permission. Non-interactive execution requires global `--yes`.

## Parameters

| Flag | Required | Meaning |
|---|---|---|
| `--project-id` | Yes | Integer project ID from 1 to 2147483647. |
| `--group-id` | Yes | Integer ID from 1 to 2147483647 of an existing group in this project. |
| `--yes` | Execution | Global confirmation flag after explicit authorization. |

The gateway input uses `project_id`, `group_id`, and `yes: true`. Dry-run validates and previews without deleting the group.

## Output

Interpret the gateway result as group deletion only, never removal of its users from the project/company. Verify the group is absent with `project member-group list` when readback is needed. Preserve any `request_id` and `invocation_id` in metadata, and report permission or resource-validation failures without claiming deletion.
