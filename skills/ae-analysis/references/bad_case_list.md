# analysis bad-case list


```bash
ae-cli analysis bad-case list --project-id 1 --limit 20 --offset 0
```

Optional --state PENDING|APPROVED|REJECTED and --query filter. Omit state for all. CLI includes unpublished cases; the page only lists explicitly submitted cases.

Read [Bad Case discovery and review](bad_case_review.md) before running the workflow. Project owner or administrator access is required. This additive L2 command uses `analysis.bad_case.list`; use `--help` for shared capability dry-run flags. Review saves the decision first; the current CLI then synchronizes with AE and reports evaluation.state. See the shared review reference for retry and authentication requirements.

Do not use list pagination instead of history for exhaustive deduplication. The response contains items and total; offset and limit apply across batches.
