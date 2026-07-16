# analysis user-cluster update

Update a condition or SQL user cluster. Discover the exact `cluster_name` first.

Do not use it for ID-file membership replacement or to create a missing cluster. Output is the updated cluster result; a submitted recomputation may still be in progress.

Flags: `--project-id`, `--cluster-name` required. Optional: `--display-name`, `--definition-request`, `--authenticated-only`, `--remark`, `--zone-offset`. The cluster type comes from `definition_request.type` when the definition changes.

Read `user_cluster_models.md` before changing the definition. The backend validates and compiles `definition_request` inside update and refuses to modify the cluster if clarification is required. Condition definitions are saved as mixed-condition clusters.

```bash
ae-cli analysis user-cluster update --project-id <project_id> --cluster-name retained_users --display-name "Retained Users v2"
```
