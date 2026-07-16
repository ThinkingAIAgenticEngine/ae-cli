# analysis_meta +delete_project_mark_times (Delete Project Mark Times)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Project Configuration**

## Use Cases
- Delete one or more project date markers.
- Do not use it to hide or edit a marker; use `+update_project_mark_time` when the marker should remain.

## Commands
```bash
ae-cli analysis_meta +delete_project_mark_times --project_id <project_id> --mark_time_ids '[]' --dry-run
# Summarize the target and impact, then wait for explicit user confirmation.
ae-cli analysis_meta +delete_project_mark_times --project_id <project_id> --mark_time_ids '[]' --yes
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
- This is `high-risk-write`: inspect the dry-run, summarize the target and impact, and wait for explicit user confirmation before the `--yes` execution.

## Next Steps After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id` and `--mark_time_ids`).
- If `Invalid JSON` appears, first validate with the smallest JSON structure (such as `{}` or `[]`), then add fields step by step.
- If the result after writing does not match expectations, immediately reread the corresponding list/get interfaces for before-and-after comparison.

## Recommended Chaining
- +list_project_mark_times -> +delete_project_mark_times
