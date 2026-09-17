# analysis-meta agent-review detail

Use this to read current item states and versions. Input requires project scope and a string batch ID. Output is one review batch with its immutable snapshots. Do not use approval state alone as proof of certification.

Preserve item-level `reused_batch_id` and `reused_item_id` as strings when present. They link unchanged proposals to their original review while keeping the current batch's complete item coverage and request identity.

```bash
ae-cli analysis-meta agent-review detail --project-id 1 --batch-id '9007199254740993'
```

Capability: `metadata.agent_review.detail`. L2 flags validate project scope and preserve the batch ID as a decimal string. Output includes snapshots as objects, `review_url`, notification status and items with `client_item_id`, string `id`, `version`, `review_state`, `execution_state`, and `validity_state`. Do not infer certification from APPROVED alone; inspect successful execution and its audit record. Re-fetch current versions before preparing decisions and after writes; never round IDs through JavaScript numbers.
