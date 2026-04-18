# te_meta +update_project_mark_time (Update Project Date Marker)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Project Configuration**

## Use Cases
- Update an existing project date marker. Returns the updated marker ID, timestamp, content, and visibility status.
- Update an existing project date marker.

## Command
```bash
te-cli te_meta +update_project_mark_time --mark_time_id 1 --project_id 1 --marked_at '2026-04-09 10:00' --content demo
te-cli te_meta +update_project_mark_time --mark_time_id 1 --project_id 1 --marked_at '2026-04-09 10:00' --zone_offset 8 --content demo --is_visible 1
te-cli te_meta +update_project_mark_time --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--mark_time_id` | Yes | Marker ID |
| `--project_id` / `-p` | Yes | Project ID |
| `--marked_at` | Yes | Marker timestamp. Format: yyyy-MM-dd HH:mm |
| `--zone_offset` | No | Marker time zone offset |
| `--content` | Yes | Marker content |
| `--is_visible` | No | Whether the marker is visible. Default: 1 |

## Decision Rules
- First run should only pass required parameters (`--mark_time_id`, `--project_id`, `--marked_at`), and add optional parameters only after the path is confirmed to work.
- For date/time ranges, first validate with a short range, then expand the range step by step.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.
- Write operations keep the confirmation prompt by default; re-evaluate whether to use `--yes` in automation scenarios.

## Next Steps After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--mark_time_id`, `--project_id`, and `--marked_at`).
- If the result after writing is not as expected, immediately read back the corresponding list/get interface for a before-and-after comparison.

## Recommended Chaining
- +list_project_mark_times -> +update_project_mark_time
