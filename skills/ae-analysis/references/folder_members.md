# analysis folder members

Use when the user needs to inspect folder members.

Do not use to modify members. Use `folder share`.

Command:

```bash
ae-cli analysis folder members --project-id <project_id> --folder-id <folder_id>
```

Input sends `project_id` and `folder_id`.

Output is the gateway envelope. `data` contains folder members.
