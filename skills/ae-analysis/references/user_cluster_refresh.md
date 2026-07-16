# analysis user-cluster refresh

Refresh a user cluster by exact `cluster_name`.

Do not use it to change a definition or upload ID members. Output means recomputation was submitted; inspect cluster state before reporting completion.

Flags: `--project-id`, `--cluster-name` required.

```bash
ae-cli analysis user-cluster refresh --project-id <project_id> --cluster-name retained_users
```
