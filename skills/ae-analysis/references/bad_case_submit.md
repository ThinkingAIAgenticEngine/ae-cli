# analysis bad-case submit


```bash
ae-cli analysis bad-case submit --project-id 1 --batch-id 42 --input-file ./bad-cases.json
```

The file contains candidates only. Each occurrence supplies the exact archive source and either a new reason/type, duplicate_of, or duplicate_item_id with dedup_reason. See the workflow for the full shape. Add --submit-to-page true only on explicit page-submission intent. Empty batches are valid. Repeat the identical packet on retries; the server reports discovered, duplicate and new counts.

Read [Bad Case discovery and review](bad_case_review.md) before running the workflow. Project owner or administrator access is required. This additive L2 command uses `analysis.bad_case.submit`; use `--help` for shared capability dry-run flags. Review saves the decision first; the current CLI then synchronizes with AE and reports evaluation.state. See the shared review reference for retry and authentication requirements.

Do not label unverifiable answers as confirmed candidates. The response contains the persisted batch status and summary; compare discovered_count with duplicate_count + new_count before reporting completion.
