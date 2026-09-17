# analysis-meta agent-review retry

Use this to execute an authorized retry. Input requires project scope, string batch ID, operation key and failed item IDs. Do not use retry to approve pending proposals.

```bash
ae-cli analysis-meta agent-review retry --project-id 1 --batch-id '9007199254740993' \
  --client-request-id retry_002 --item-ids '["9007199254740994"]' --dry-run
```

Capability: `metadata.agent_review.retry`. Requires `assetAuthentication` and metadata write scope. L2 provides validated, unique string IDs, bounded selection and an explicit replay key. Retry only selected failed executions under their existing valid approvals after explicit retry intent. Do not retry successful items, manufacture approval for deferred/rejected items, or use retry from an unattended submission-only task. Read current detail first. A manual retry uses a new key; a network replay uses the exact previous key and payload. Validation/dry-run performs no mutation and does not guarantee current domain eligibility.

Output includes refreshed detail, `submission_id`, and per-item `results`; inspect failures individually and read records for the linked execution attempts. Do not describe success until the selected executions actually succeeded.
