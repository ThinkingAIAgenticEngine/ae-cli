# analysis-meta agent-review list

Use this to locate recent batches. Input requires project scope and optionally an integer limit. Output is the `batches` array. Do not use this bounded directory as a complete-history export.

```bash
ae-cli analysis-meta agent-review list --project-id 1 --limit 20
```

Capability: `metadata.agent_review.list`. Returns `batches`, a bounded list of visible recent batches. The typed project ID and integer limit (default 20, range 1..500) form the L2 directory contract. This is not a paginated complete-history export. Do not treat absence from this recent list as proof no earlier proposal exists; retain task batch IDs and proposal fingerprints. Use detail for item versions and records for execution evidence.
