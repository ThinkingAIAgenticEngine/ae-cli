# analysis +list_spaces (List Spaces)

> **Prerequisite:** Follow the Global AE CLI Rules in [`../SKILL.md`](../SKILL.md).

Domain: **Dashboard Management**

## Use Cases
- List all spaces and folders accessible to the current user as a recursive tree.
- Returns two parts: (1) project spaces with spaceId, name, spaceDesc, and children (folders/dashboards); (2) personal-space folders (My Space / Shared with me / Ungrouped) with their children.
- Use to resolve `spaceId` for `+create_dashboard` / `+copy_dashboard`, and `toSpaceId` / `toFolderId` / `fromSpaceId` / `fromFolderId` for `+move_dashboard` and `+copy_dashboard`.

## Commands
```bash
ae-cli analysis_audience +list_spaces --project_id <project_id>
ae-cli analysis_audience +list_spaces --dry-run
```

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project_id` / `-p` | Yes | Project ID |

## Decision Rules
- Call this before `+copy_dashboard` or `+move_dashboard` whenever the user specifies a target space or folder by name.

## Recommended Chain
- `+list_spaces` -> `+copy_dashboard` / `+move_dashboard` / `+create_dashboard`
