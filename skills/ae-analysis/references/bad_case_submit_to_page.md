# analysis bad-case submit-to-page


```bash
ae-cli analysis bad-case submit-to-page --project-id 1 --item-id 9007199254741001 --client-request-id publish-1
```

Explicit user intent is required. Reuses the existing pending item and its review state; no copy is created. Reviewed cases cannot be submitted again.

Read [Bad Case discovery and review](bad_case_review.md) before running the workflow. Project owner or administrator access is required. This additive L2 command uses `analysis.bad_case.submit_to_page`; use `--help` for shared capability dry-run flags. Review saves the decision first; the current CLI then synchronizes with AE and reports evaluation.state. See the shared review reference for retry and authentication requirements.

Do not submit an approved or rejected case again. The response is the same case identity and state, now visible in the page list.
