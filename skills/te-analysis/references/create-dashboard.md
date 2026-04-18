# te_analysis +create_dashboard (create dashboard)

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Domain: **Dashboard Management**

## Use Cases
- Create a new dashboard.
- Can automatically associate an initial report after creation.
- Can optionally create an initial dashboard note at the same time.
- Returns basic dashboard information (such as ID and name), not the full dashboard configuration.

## Commands
```bash
ae-cli te_analysis +create_dashboard --project_id 1 --dashboard_name demo
ae-cli te_analysis +create_dashboard --project_id 1 --dashboard_name demo --space_id 1 --folder_id 1 --initial_report_id 1 --note_title demo --note_content demo --note_style '{}'
ae-cli te_analysis +create_dashboard --project_id 1 --dashboard_name demo --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--dashboard_name` | Yes | Dashboard name |
| `--space_id` | No | Optional space ID. If provided, the dashboard is created in that space. |
| `--folder_id` | No | Optional folder ID. If provided, the dashboard is created in that folder. |
| `--initial_report_id` | No | Optional initial report ID. If provided, the report is automatically associated with the new dashboard after creation. |
| `--note_title` | No | Optional note title for an initial dashboard note. |
| `--note_content` | No | Optional note content for an initial dashboard note. |
| `--note_style` | No | Optional note style configuration JSON for an initial dashboard note. |

## Decision Rules
- For the first run, it is recommended to pass only the required parameters (`--project_id`, `--dashboard_name`) and add optional parameters after confirming the chain works.
- Wrap JSON parameters in single quotes (for example `--note_style '{}'`) to avoid shell escaping issues.
- Only pass `--space_id` and `--folder_id` when you clearly know the target location; if unsure, create it in the default location first.
- Dashboard note-related parameters are best passed as a group to avoid incomplete results caused by specifying only the title or only the content.
- For cross-project troubleshooting, first confirm whether `--project_id` matches the current permissions and target environment.
- Write operations keep the confirmation prompt by default; evaluate whether to use `--yes` only for automation scenarios.

## Next Step After Failure
- If required parameters are missing, fall back to the smallest runnable command and fill them in (focus on `--project_id`, `--dashboard_name`).
- If `Invalid JSON` appears, first validate with the smallest JSON structure (for example `{}`), then add fields gradually.
- If the result after writing is not as expected, immediately reread the corresponding list/get interface and compare before and after.

## Recommended Chaining
- +create_dashboard -> +list_dashboards
- +create_dashboard -> +query_dashboard_detail
- +create_dashboard -> +update_dashboard
- +create_dashboard -> +query_adhoc -> +create_report -> +update_dashboard
