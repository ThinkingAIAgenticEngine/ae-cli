# analysis_common +list_projects (view projects accessible to the current user)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **project discovery / cross-module pre-query**

## Use Cases
- List all projects accessible to the current user. No parameters are required.
- Returns a list of project summaries; key fields include: `projectId`, `projectName`, `companyId`, `projectType`, `remark`, `appId`, `roleName`.

## Mandatory Rules (MUST)
- This command does not accept any business parameters; do not invent `project_id`, keywords, or pagination parameters.
- If a later target command requires `project_id`, `+list_projects` is used for first-time project discovery, new project verification, project switching, or ambiguity resolution. Do not call it repeatedly when the same continuous conversation already has a verified project context for the same host/environment.
- In the final response, prioritize the returned `projectId`, `projectName`, and `roleName` to help the user confirm the project.

## Command
```bash
ae-cli analysis_common +list_projects
ae-cli analysis_common +list_projects --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| None | - | No business parameters required |

## Decision Rules
- When the user says "let me see what projects I have", "list the available projects first", or "I don't know project_id", call this command first.
- When a later command depends on `project_id` and there is no verified project context, show candidate projects first, then ask the user to explicitly confirm the target `projectId`.
- When the same continuous conversation already has a verified `project_id` for the same host/environment, reuse it directly and do not call `+list_projects` again unless the user switches projects, switches host/environment, asks to list projects, or the current project context becomes ambiguous.
- If there are many projects returned, prioritize summarizing by `projectName`, `projectId`, and `roleName` to avoid expanding all low-value fields at once.

## Next Step on Failure
- If the result is empty, first confirm whether the current account, environment, and permissions are correct.
- If the call fails, first check the authentication status, the target environment host, and the current login identity.

## Recommended Chaining
- First use: `+list_projects` -> user confirms `project_id` -> any command that requires `project_id`
- Follow-up use in the same verified context: reuse confirmed `project_id` -> target command
