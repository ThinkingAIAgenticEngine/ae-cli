# analysis bad-case begin


```bash
ae-cli analysis bad-case begin --project-id 1 --client-request-id discovery-20261029
```

Preserve the returned batch_id. Renew every minute during analysis with run HEARTBEAT; another active project discovery blocks begin. A failed or expired batch requires a new request and complete history scan.

Read [Bad Case discovery and review](bad_case_review.md) before running the workflow. Project owner or administrator access is required. This additive L2 command uses `analysis.bad_case.begin`; use `--help` for shared capability dry-run flags. Review saves the decision first; the current CLI then synchronizes with AE and reports evaluation.state. See the shared review reference for retry and authentication requirements.

Do not start persistence for an ordinary read-only archive question. The response includes batch_id, status, summary and heartbeat_seconds; preserve batch_id for all subsequent writes.
