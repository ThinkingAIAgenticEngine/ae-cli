# analysis user-cluster list

List accessible user clusters for discovery. Use this before any get/update/delete/member command; do not invent `cluster_name`.

Flags: `--project-id` required. Optional: `--query`, `--fields`, `--limit`, `--offset`, `--authenticated-only`.

`--offset` is only for stable asset browsing. It is not a member-data pagination strategy.
When `has_more=true`, continue only with the returned `next_offset`; do not calculate the next page locally.

Output is a paged cluster inventory, not cluster members or definition-build results.

```bash
ae-cli analysis user-cluster list --project-id <project_id> --query retained --limit 50
ae-cli analysis user-cluster list --project-id <project_id> --fields '["cluster_name","display_name","users_num"]' --limit 50 --offset 0
```
