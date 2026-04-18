---
name: te-audience
version: 1.0.0
description: "TE audience operations and targeting: create, update, query, recompute, and inspect member details for clusters and tags, plus cluster/tag definition schemas. Triggered when the user mentions audience building/targeting, audience packages, tag systems, tag assignment, tag member lookup, updating cluster rules, or recomputing clusters or tags."
metadata:
  requires:
    bins: ["ae-cli"]
  cliHelp: "ae-cli te_audience --help"
---

# te-audience

> **CRITICAL - Before starting, MUST first read [`../te-shared/SKILL.md`](../te-shared/SKILL.md)**: authentication, host configuration, global parameters, and write-operation confirmation rules are defined there.
> **CRITICAL - Before performing write operations, MUST first read [`../te-common/SKILL.md`](../te-common/SKILL.md)**: shared post-action constraints (append resource links after create/update) are defined in that module.
> **CRITICAL - For every command that requires `project_id`, MUST follow `te-common`'s `PROJECT_ID_GATE` (if missing, stop and confirm with the user).**
> **CRITICAL - Before running any `+<tool_name>` command, MUST first read the corresponding reference document `./references/<tool-name>.md`** For example: before running `+create_cluster`, you must read [`./references/create-cluster.md`](./references/create-cluster.md)

## When to Use

Use `te-audience` when the user needs cluster and tag capabilities:

- Clusters: create, update, query, member inspection, recomputation
- Tags: create, update, query, member inspection, recomputation
- Cluster/tag definition schema: for frontend configurators or command argument construction

## Command Format

`ae-cli te_audience +<tool_name> [options]`

## Tool Groups (14)

### Clusters (6)
- `+create_cluster` ([Docs](./references/create-cluster.md))
- `+get_clusters_by_name` ([Docs](./references/get-clusters-by-name.md))
- `+list_cluster_members` ([Docs](./references/list-cluster-members.md))
- `+list_clusters` ([Docs](./references/list-clusters.md))
- `+update_cluster` ([Docs](./references/update-cluster.md))
- `+refresh_cluster` ([Docs](./references/refresh-cluster.md))

### Tags (6)
- `+create_tag` ([Docs](./references/create-tag.md))
- `+get_tags_by_name` ([Docs](./references/get-tags-by-name.md))
- `+list_tag_members` ([Docs](./references/list-tag-members.md))
- `+list_tags` ([Docs](./references/list-tags.md))
- `+update_tag` ([Docs](./references/update-tag.md))
- `+refresh_tag` ([Docs](./references/refresh-tag.md))

### Schema Definitions (2)
- `+get_cluster_definition_schema` ([Docs](./references/get-cluster-definition-schema.md))
- `+get_tag_definition_schema` ([Docs](./references/get-tag-definition-schema.md))

## Quick Validation

```bash
ae-cli te_audience --help
npm run verify:te-audience-tools
# Example: preview the request with dry-run (replace project_id with your actual project ID)
ae-cli te_audience +list_clusters --project_id <YOUR_PROJECT_ID> --dry-run
```

## Reference Docs

See the `references/` directory (14 per-command documents total).
