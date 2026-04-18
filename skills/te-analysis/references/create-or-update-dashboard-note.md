# te_analysis +create_or_update_dashboard_note (Maintain Dashboard Note)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Dashboard management**

## Use Cases
- Create a new dashboard note or update an existing one. If noteId is provided, updates the existing note; otherwise creates a new note. Returns the created or updated note information.
- Create a new dashboard note or update an existing one.

## Command
```bash
te-cli te_analysis +create_or_update_dashboard_note --project_id 1 --dashboard_id 1 --note_title demo
te-cli te_analysis +create_or_update_dashboard_note --project_id 1 --dashboard_id 1 --note_id 1 --note_title demo --description demo --ui_config '{}'
te-cli te_analysis +create_or_update_dashboard_note --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--dashboard_id` / `-d` | Yes | Dashboard ID |
| `--note_id` | No | Optional note ID. If provided, updates the existing note; otherwise creates a new note. |
| `--note_title` | Yes | Note title |
| `--description` | No | Optional note description content. |
| `--ui_config` | No | Optional UI configuration JSON string for the note style. |

## Decision Rules
- On the first run, start with only the required parameters (`--project_id`, `--dashboard_id`, `--note_title`) and add optional parameters after confirming the path works.
- Wrap JSON parameters in single quotes (for example `--ui_config '{}'`) to avoid shell escaping issues.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.
- Write operations keep the confirmation prompt by default; evaluate whether to use `--yes` for automated scenarios.

## Next Steps on Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in first (focus on `--project_id`, `--dashboard_id`, `--note_title`).
- If `Invalid JSON` appears, first verify with the smallest JSON structure (for example `{}` or `[]`), then add fields incrementally.
- If the result after writing does not match expectations, immediately read back the corresponding list/get interface to compare before and after.

## Recommended chaining
