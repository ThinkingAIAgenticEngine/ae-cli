# analysis user-tag refresh

Refresh a user tag by exact `tag_name`.

Do not use it to change the definition or refresh one history snapshot. Output means recomputation was submitted; inspect tag state before reporting completion.

Flags: `--project-id`, `--tag-name` required.

```bash
ae-cli analysis user-tag refresh --project-id <project_id> --tag-name user_level
```
