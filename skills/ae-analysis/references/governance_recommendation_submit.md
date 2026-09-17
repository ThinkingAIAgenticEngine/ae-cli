# analysis-meta governance-recommendation submit

This existing command executes explicit approval decisions. It does not submit proposals to the review page. Use `analysis-meta agent-review submit-to-page` for submission-only authorization. Never invoke this executing command automatically from an unattended review-submission task.

Submit CLI Agent approval decisions for one business-topic recommendation group.

Use this after `analysis-meta governance-recommendation export` and after the user explicitly chooses approve, reject, or skip for items in a topic.

Do not use this command to generate or refresh recommendations; it only records decisions for evidence already returned by export.

Command:

```bash
ae-cli analysis-meta governance-recommendation submit \
  --project-id <project_id> \
  --run-id <run_id> \
  --snapshot-hash <snapshot_hash> \
  --topic-name '支付分析' \
  --decisions '[{"item_type":"asset","decision":"APPROVE","resource_type":"dashboard","resource_key":"903","evidence_hash":"..."},{"item_type":"metric_candidate","decision":"SKIP","candidate_key":"recommended_metric:abc123","definition_signature":"...","evidence_hash":"...","reason":"Need metric name"}]'
```

Capability id: `metadata.governance_recommendation.submit`.

Input sends `project_id`, `run_id`, optional `snapshot_hash`, optional `topic_id`, required `topic_name`, optional `window_days`, optional `limit`, and required `decisions`.

Decision items use:

- `item_type`: `asset` or `metric_candidate`.
- `decision`: `APPROVE`, `REJECT`, or `SKIP`.
- Asset decisions require `resource_type` and `resource_key`.
- Metric-candidate approvals require `candidate_key`, `definition_signature`, `metric_name`, and `metric_desc`.
- Include `evidence_hash` when it was returned by export.

Output includes `run_id`, optional `topic_id`, `total`, `applied`, `recorded`, `failed`, and per-decision `items`.

## Decision Rules

- Do not submit decisions without explicit user approval.
- Submit one topic at a time so user intent and audit evidence stay aligned.
- Use `REJECT` for a decision that should suppress or de-prioritize the same item in future recommendation views; use `SKIP` when the user is deferring judgment.
- If the server reports a stale candidate or snapshot mismatch, run `governance-recommendation export` again and ask the user to review the refreshed evidence.
