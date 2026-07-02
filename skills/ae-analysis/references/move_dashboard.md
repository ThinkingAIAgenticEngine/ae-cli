# analysis +move_dashboard (Move Dashboard)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Dashboard Management**

## Use Cases
- Move a dashboard to a different space or folder.
- Provide `--to_space_id` to move to a space root, or both `--to_space_id` and `--to_folder_id` to move into a folder within that space.
- `--from_space_id` and `--from_folder_id` are optional; provide them when the dashboard exists in multiple spaces to disambiguate the source path.

## Commands
```bash
ae-cli analysis_audience +move_dashboard --project_id <project_id> --dashboard_id <dashboard_id> --to_space_id <space_id>
ae-cli analysis_audience +move_dashboard --project_id <project_id> --dashboard_id <dashboard_id> --to_space_id <space_id> --to_folder_id <folder_id>
ae-cli analysis_audience +move_dashboard --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |
| `--dashboard_id` | Yes | Dashboard ID to move |
| `--to_space_id` | Yes | Target space ID |
| `--to_folder_id` | No | Target folder ID within the target space. Omit to place at the space root. |
| `--from_space_id` | No | Source space ID. Omit if unknown. |
| `--from_folder_id` | No | Source folder ID. Omit if unknown. |

## Decision Rules
- Call `+list_spaces` first to resolve `to_space_id` and `to_folder_id`.

## Recommended Chain
- `+list_spaces` -> `+move_dashboard`
