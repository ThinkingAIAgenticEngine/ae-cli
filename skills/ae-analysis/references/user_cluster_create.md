# analysis user-cluster create

Create a condition or SQL user cluster directly from an AI-facing definition request.

Do not use it for uploaded-ID clusters or result-derived clusters; use `user-cluster create-id` or `query create-result-cluster`. A successful create automatically starts the initial computation. Do not immediately call `user-cluster refresh`; use `user-cluster get` to observe the initial refresh/computation status and refresh only for a later explicit recomputation.

Flags: `--project-id`, `--cluster-name`, `--display-name`, `--definition-request` required. Optional: `--authenticated-only`, `--zone-offset`, `--entity-id`. The cluster type comes from `definition_request.type`.

Read `user_cluster_models.md` before constructing `--definition-request`. Create does not accept `--remark`; set it later with `user-cluster update` when needed.

The backend validates and compiles the definition inside the create operation; if metadata is ambiguous or missing, creation fails without creating the cluster. Condition clusters are saved as mixed-condition clusters (`clusterType=CONDITION`, `clusterSubType=MIX_CONDITION`).

```bash
ae-cli analysis user-cluster create --project-id <project_id> --cluster-name retained_users --display-name "Retained Users" --definition-request '{"type":"condition","conditions":{"relation":"and","items":[{"type":"user","field":{"name":"country","type":"user_property"},"operator":"eq","values":["US"]}]}}'
```
