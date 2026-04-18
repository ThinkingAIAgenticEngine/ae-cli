# analysis_meta +get_project_config (Read Project Analysis Configuration)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Project Configuration**

## Use Cases
- Get project configuration details. Returns: projectId, projectName, companyId, defaultTimeZoneOffset (project default time zone offset), remark, timeZoneEnabled (whether multiple time zones are supported), timeZoneOffsetColumn (time zone column name in event data), and availableTimeZones (array of time zone offsets used in this project). Call this tool when you need project basic info or time zone configuration.
- Get project configuration details.

## Command
```bash
ae-cli analysis_meta +get_project_config --project_id 1
ae-cli analysis_meta +get_project_config --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |

## Decision Rules
- First run should only pass the required parameter (`--project_id`), and add optional parameters only after the path is confirmed to work.
- `timeZoneEnabled` and `availableTimeZones` are often used to determine whether `zone_offset` can be passed to `create/update_cluster` and `create/update_tag`.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps After Failure
- If the required parameter is missing, fall back to the smallest runnable command and fill it in (focus on `--project_id`).
- If reading fails, first verify whether the object ID exists and belongs to the current project.

## Recommended Chaining
- +get_project_config -> +create_project_mark_time / +update_project_mark_time
