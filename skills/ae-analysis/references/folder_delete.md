# analysis folder delete

Use when the user explicitly wants to delete one or more folders.

Do not use for deleting dashboards or BI panels inside a folder. Use the asset delete command.

Command:

```bash
ae-cli analysis folder delete --project-id <project_id> [--folder-id <folder_id>] [--folder-ids '[1,2]'] [--space-id <space_id>] --yes
```

Input sends `project_id`, either `folder_id` or `folder_ids`, and optional `space_id`.

Output is the gateway envelope. `data` contains the delete result.
