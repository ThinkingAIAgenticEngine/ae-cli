# system query-task realtime-list

Use for a one-time snapshot of the Query Monitor **Realtime Query** tab. The existing `query-task list` command is for historical **Query Logs** and requires a fixed start/end range. Do not substitute one for the other.

```bash
ae-cli system query-task realtime-list --company-id <company_id> --project-ids '[123]' --cluster-names '["cluster-a"]' --duration-minutes 30 --limit 100
```

Capability ID: `system.query_task.realtime_list`. Run `ae-cli system query-task options --company-id <company_id>` first if IDs, status codes, or cluster names are unknown. Discovery does not grant access; a project or workspace outside the company is rejected during execution.

The global system-project ID `-1` cannot be selected as a company-scoped project. System tasks tied to a company workspace remain visible through that workspace where applicable.

Provide at least one non-empty `--project-ids` or `--space-codes` JSON array, and a non-empty `--cluster-names` JSON array. `--duration-minutes` defaults to 30 (range 1–30). Optional `--status-codes` filters task states. `--limit` defaults to 100 (maximum 200). This command does not poll or cancel tasks.

The response contains `items`, `limit`, `has_more`, and `snapshot_at`. `has_more` means the bounded snapshot has additional matching rows, not a full historical count. Task rows omit credentials, user identity tokens, internal SQL gateway selection, and SQL text. To inspect one task, use `query-task get`; cancel remains a separate high-risk operation requiring confirmation.
