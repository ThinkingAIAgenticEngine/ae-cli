# analysis bad-case get


```bash
ae-cli analysis bad-case get --project-id 1 --item-id 9007199254741001
```

Returns original question, reviewed answer, discovery reason, recorded CLI calls and review supplement. Missing calls are not invented. Keep ID and version as decimal strings.

Read [Bad Case discovery and review](bad_case_review.md) before running the workflow. Project owner or administrator access is required. This additive L2 command uses `analysis.bad_case.get`; use `--help` for shared capability dry-run flags. Review saves the decision first; the current CLI then synchronizes with AE and reports evaluation.state. See the shared review reference for retry and authentication requirements.

Do not use this command to reread a live answer or rerun business queries; it returns the immutable review evidence snapshot.
