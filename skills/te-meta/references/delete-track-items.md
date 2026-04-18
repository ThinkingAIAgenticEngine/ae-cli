# te_meta +delete_track_items (Delete Track Program Items)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Project Configuration**

## Use Cases
- Delete TRACKING-PLAN metadata items only. Do not use for effective system metadata deletion/editing; those belong to MetaPowerTool/other system metadata flows.
- Delete TRACKING-PLAN metadata items only.

## Command
```bash
te-cli te_meta +delete_track_items --project_id 1 --delete_data '{}'
te-cli te_meta +delete_track_items --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--delete_data` | Yes | Delete payload JSON object with events/eventPropNames/userPropNames/commonEventPropNames. At least one list must be provided. |

## Decision Rules
- First run should only pass required parameters (`--project_id`, `--delete_data`), and add optional parameters only after the path is confirmed to work.
- Wrap JSON arguments in single quotes (for example `--delete_data '{}'`) to avoid shell escaping issues.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.
- Write operations keep the confirmation prompt by default; re-evaluate whether to use `--yes` in automation scenarios.

## Next Steps After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id` and `--delete_data`).
- If `Invalid JSON` occurs, validate with the smallest JSON structure first (for example `{}` or `[]`), then add fields step by step.
- If the result after writing is not as expected, immediately read back the corresponding list/get interface for a before-and-after comparison.

## Recommended Chaining
- +get_track_program -> +delete_track_items -> +get_track_program
