# analysis-meta governance-recommendation decisions

List recent CLI Agent recommendation approval decisions.

Use this to review prior approvals, rejections, skips, and landing status. Do not use it as a substitute for current recommendation evidence; run `governance-recommendation export` when presenting current recommendations.

Command:

```bash
ae-cli analysis-meta governance-recommendation decisions --project-id <project_id> --limit 100
```

Capability id: `metadata.governance_recommendation.decisions`.

Input sends `project_id`, optional `run_id`, and optional `limit`.

Output includes `decisions` and `total`.

## Decision Rules

- Use `--run-id` to audit one recommendation packet after submit.
- Without `--run-id`, treat the result as recent history only.
- Historical decisions inform presentation and risk explanation; they do not prove current asset state or current metric availability.
