# analysis bad-case run


```bash
ae-cli analysis bad-case run --project-id 1 --batch-id 42 --action HEARTBEAT
```

Use HEARTBEAT every minute or FAILED when discovery cannot finish. Only the owning administrator can operate the active batch. No previous case is deleted.

Read [Bad Case discovery and review](bad_case_review.md) before running the workflow. Project owner or administrator access is required. This additive L2 command uses `analysis.bad_case.run`; use `--help` for shared capability dry-run flags. Review saves the decision first; the current CLI then synchronizes with AE and reports evaluation.state. See the shared review reference for retry and authentication requirements.

Do not renew completed batches or a batch owned by another user. The response returns the batch identity and its current status; a failed or expired run must restart.
