# analysis_meta +list_project_users (Read Project Member List)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Project Configuration**

## Use Cases
- Get all project members. Returns userId, loginName, and userName for each member. Use this to resolve userId when managing dashboard share members.
- Get all project members.

## Command
```bash
ae-cli analysis_meta +list_project_users --project_id 1
ae-cli analysis_meta +list_project_users --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |

## Decision Rules
- First run should only pass the required parameter (`--project_id`), and add optional parameters only after the path is confirmed to work.
- The result can be used for dashboard member configuration, permission mapping, and similar scenarios.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps After Failure
- If the required parameter is missing, fall back to the smallest runnable command and fill it in (focus on `--project_id`).
- If the result is empty, first confirm the project ID/keyword, then try loosening the filter conditions.

## Recommended Chaining
- +get_project_config -> +list_project_users
