# analysis user-cluster update

Update a condition or SQL user cluster. Discover the exact `cluster_name` first.

Do not use it for ID-file membership replacement or to create a missing cluster. Supplying `--definition-request` automatically starts recomputation after the definition is updated; do not call `user-cluster refresh` afterward. Updating only `--display-name` or `--remark` does not recompute. A successful update means the definition was saved, not that the new result is complete. Poll `user-cluster get` until `progress=100` and `refresh_end_time` is not older than `update_time` before using `users_num` or querying members.

The response distinguishes both paths. A definition update returns `computation.triggered_automatically=true`, `result_freshness.is_stale=true`, and normally `next_action=poll_get` with an exact capability/input pair. A display-name/remark-only update returns `computation.status=not_triggered`, `result_freshness.status=fresh`, and `next_action=none`.

Flags: `--project-id`, `--cluster-name` required. Optional: `--display-name`, `--definition-request`, `--authenticated-only`, `--remark`, `--zone-offset`. The cluster type comes from `definition_request.type` when the definition changes.

Read `user_cluster_models.md` before changing the definition. The backend validates and compiles `definition_request` inside update and refuses to modify the cluster if clarification is required. Condition definitions are saved as mixed-condition clusters.

```bash
ae-cli analysis user-cluster update --project-id <project_id> --cluster-name retained_users --display-name "Retained Users v2"
```
