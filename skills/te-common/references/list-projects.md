# te_common +list_projects (view projects accessible to the current user)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **project discovery / cross-module pre-query**

## Use Cases
- List all projects accessible to the current user. No parameters are required.
- Returns a list of project summaries; key fields include: `projectId`, `projectName`, `companyId`, `projectType`, `remark`, `appId`, `roleName`.

## Mandatory Rules (MUST)
- This command does not accept any business parameters; do not invent `project_id`, keywords, or pagination parameters.
- If a later target command requires `project_id`, `+list_projects` may only be used for "candidate project discovery" and cannot replace user confirmation.
- In the final response, prioritize the returned `projectId`, `projectName`, and `roleName` to help the user confirm the project.

## Command
```bash
te-cli te_common +list_projects
te-cli te_common +list_projects --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| None | - | No business parameters required |

## Decision Rules
- When the user says "let me see what projects I have", "list the available projects first", or "I don't know project_id", call this command first.
- When you need to continue with a command that depends on `project_id`, show candidate projects first, then ask the user to explicitly confirm the target `projectId`.
- If there are many projects returned, prioritize summarizing by `projectName`, `projectId`, and `roleName` to avoid expanding all low-value fields at once.

## Next Step on Failure
- If the result is empty, first confirm whether the current account, environment, and permissions are correct.
- If the call fails, first check the authentication status, the target environment host, and the current login identity.

## Recommended Chaining
- `+list_projects` -> user confirms `project_id` -> any command that requires `project_id`
