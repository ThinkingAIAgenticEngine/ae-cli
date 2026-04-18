# te_meta +delete_project_mark_times (Delete Project Mark Times)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Project Configuration**

## Use Cases
- Delete one or more project date markers.

## Commands
```bash
te-cli te_meta +delete_project_mark_times --project_id 1 --mark_time_ids '[]'
te-cli te_meta +delete_project_mark_times --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--mark_time_ids` | Yes | List of marker IDs |

## Decision Rules
- For the first run, pass only the required parameters (`--project_id` and `--mark_time_ids`) to confirm the path works, then add optional parameters.
- Wrap JSON parameters in single quotes (for example `--mark_time_ids '{}'`) to avoid shell escaping issues.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.
- Write operations keep confirmation prompts by default; evaluate whether to use `--yes` only for automation scenarios.

## Next Steps After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id` and `--mark_time_ids`).
- If `Invalid JSON` appears, first validate with the smallest JSON structure (such as `{}` or `[]`), then add fields step by step.
- If the result after writing does not match expectations, immediately reread the corresponding list/get interfaces for before-and-after comparison.

## Recommended Chaining
- +list_project_mark_times -> +delete_project_mark_times
