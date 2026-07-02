# analysis +copy_dashboard (Copy Dashboard)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Dashboard Management**

## Use Cases
- Copy a dashboard to a new dashboard, optionally copying its associated reports.
- To place the copy in a specific space or folder, provide `--to_space_id` or `--to_folder_id`. Use `+list_spaces` to resolve these IDs.

## Commands
```bash
ae-cli analysis_audience +copy_dashboard --project_id <project_id> --dashboard_id <dashboard_id> --dashboard_name "Copy of Dashboard"
ae-cli analysis_audience +copy_dashboard --project_id <project_id> --dashboard_id <dashboard_id> --dashboard_name "Copy of Dashboard" --report_copy true --to_space_id <space_id>
ae-cli analysis_audience +copy_dashboard --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--dashboard_id` | Yes | Source dashboard ID to copy |
| `--dashboard_name` | Yes | Name for the new copied dashboard |
| `--report_copy` | No | Whether to also copy associated reports. Defaults to false. |
| `--to_space_id` | No | Target space ID. Omit to use the default location. |
| `--to_folder_id` | No | Target folder ID inside the target space. Omit to place at the space root. |

## Decision Rules
- Call `+list_spaces` first when the user wants to place the copy in a specific space or folder.
- Returns the new dashboard ID and name on success.

## Recommended Chain
- `+list_dashboards` -> `+list_spaces` -> `+copy_dashboard` -> `analysis_common +get_resource_url`
