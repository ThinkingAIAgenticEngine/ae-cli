# analysis folder create

Use when the user explicitly wants to create a folder in personal space or a project space.

Do not use to create a project space. Use `project-space create`.

Command:

```bash
ae-cli analysis folder create --project-id <project_id> --folder-name <name> [--space-id <space_id>] [--parent-folder-id <folder_id>] [--payload '{...}'] --yes
```

Input sends `project_id`, `folder_name`, and optional `space_id`, `parent_folder_id`, `payload`.

Output is the gateway envelope. `data` contains the created folder result.
