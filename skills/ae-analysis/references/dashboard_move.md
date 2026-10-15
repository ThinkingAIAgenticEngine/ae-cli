# analysis dashboard move

Move one or more analysis dashboards (看板) to the same project-space root or folder inside that project space. Do not use this command for a BI panel (仪表盘), copying a dashboard, changing its owner, or moving it to a personal-space folder.

```bash
ae-cli analysis dashboard move --project-id <project_id> --dashboard-ids '[<dashboard_id>,...]' --to-space-id <space_id> [--to-folder-id <folder_id>]
```

Always pass `--dashboard-ids` as a JSON array. Use a one-item array for a single dashboard. Duplicate IDs are moved once, in first-seen order.

Use `analysis project-space list` to resolve a target space and inspect its returned `permissions`. When moving into a folder, resolve the folder under that exact space; the service rejects a folder ID that does not belong to `--to-space-id`.

The server resolves every dashboard's current space and folder. Do not ask the user to provide source location IDs. Execution requires all of the following asset-level permissions:

- `dashboardMoveTo` on the source dashboard;
- `spaceAddDashboard` when the target is a project-space root; or
- `folderAddDashboard` when the target is a folder.

The command is a normal `write` capability and supports `--dry-run`. A dry run validates the CLI/Gateway contract and the `analysis:write` scope without moving dashboards; asset-level source and target permissions are checked only during formal execution. Formal execution is atomic: if any dashboard fails existence, source-location, or permission checks, none are moved.

Successful output contains `requested_count`, `moved_count`, `unchanged_count`, and `items`. Each item contains `dashboard_id`, `moved`, `from_location`, and `to_location`. `moved=false` means that dashboard was already at the requested location; asset permissions are still checked during formal execution.
