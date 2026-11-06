# analysis bad-case history


```bash
ae-cli analysis bad-case history --project-id 1 --after-id 0 --limit 100
```

Follow next_after_id while has_more is true. Includes all batches, all review states and CLI-only cases. Do not restrict historical cases to the scan time window; fail discovery if history is incomplete.

Read [Bad Case discovery and review](bad_case_review.md) before running the workflow. Project owner or administrator access is required. This additive L2 command uses `analysis.bad_case.history`; use `--help` for shared capability dry-run flags. Review saves the decision first; the current CLI then synchronizes with AE and reports evaluation.state. See the shared review reference for retry and authentication requirements.

The response includes items, has_more and next_after_id. An empty page with has_more=false completes traversal; it does not prove the selected archive has no new Bad Cases.
