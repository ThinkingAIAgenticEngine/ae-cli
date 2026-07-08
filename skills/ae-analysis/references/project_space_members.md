# analysis project-space members

Use when the user needs to inspect project-space members.

Do not use to modify members. Use `project-space share`.

Command:

```bash
ae-cli analysis project-space members --project-id <project_id> --space-id <space_id>
```

Input sends `project_id` and `space_id`.

Output is the gateway envelope. `data` contains project-space members.
