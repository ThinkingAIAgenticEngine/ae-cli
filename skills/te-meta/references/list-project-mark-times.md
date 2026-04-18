# te_meta +list_project_mark_times (List Project Mark Times)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Project Configuration**

## Use Cases
- List project date markers. Returns marker IDs, timestamps, content, and visibility status.
- List project date markers.

## Commands
```bash
te-cli te_meta +list_project_mark_times --project_id 1
te-cli te_meta +list_project_mark_times --project_id 1 --zone_offset 8
te-cli te_meta +list_project_mark_times --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--zone_offset` | No | Marker time zone offset |

## Decision Rules
- For the first run, pass only the required parameter (`--project_id`) to confirm the path works, then add optional parameters.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.

## Next Steps After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id`).
- If the result is empty, first confirm the project ID/keyword, then try loosening the filter conditions.

## Recommended Chaining
- +get_project_config -> +list_project_mark_times
