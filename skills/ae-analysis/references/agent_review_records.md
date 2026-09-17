# analysis-meta agent-review records

Use this to audit a known batch. Input requires project scope and a string batch ID. Output is the `records` array. Do not use audit events as current asset-definition evidence.

```bash
ae-cli analysis-meta agent-review records --project-id 1 --batch-id '9007199254740993'
```

Capability: `metadata.agent_review.records`. Returns `records`, immutable batch, review, execution, retry and notification events. L2 flags require the project and a lossless decimal batch ID. Distinguish human approval from execution attempts and successful results. Do not use historical records as current asset evidence or repeatedly poll unchanged records for notifications.
