# analysis-meta agent-review review

Use this only for explicit human decisions. Input requires project scope, string batch ID, operation key and versioned decisions. Do not use submission authorization as approval authorization.

Record a human's explicit decisions for existing versioned items. APPROVE executes certification immediately; DEFER and REJECT record opinions without certifying. Do not call this from a submission-only unattended task. Creating a review batch does not authorize this command.

```bash
ae-cli analysis-meta agent-review review --project-id 1 --batch-id '9007199254740993' \
  --client-request-id decision_001 \
  --decisions '[{"item_id":"9007199254740994","version":1,"decision":"DEFER","reason":"Need refreshed evidence"}]' \
  --dry-run
```

Capability: `metadata.agent_review.review`. Requires the exact project function `assetAuthentication` and metadata write scope. L2 validates string IDs, nonnegative item versions (initial version 0 is valid), unique targets, APPROVE/DEFER/REJECT and mandatory nonblank reasons for DEFER/REJECT. Read detail first; preserve its versions. A preview invokes no mutations and does not reserve versions. Execute with explicit decision authorization, without changing the reviewed scope.

Output is refreshed detail plus `submission_id` and per-item `results`. A successful response can contain failed executions; inspect each result and read detail/records. Same operation key replays the same decisions. A new human decision uses a new key. On stale-version or evidence conflicts, re-read and obtain a fresh decision; never automatically approve changed content.
