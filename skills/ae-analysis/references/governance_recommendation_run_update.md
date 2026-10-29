# analysis-meta governance-recommendation run-update

Renew or finish the tracked recommendation started by [export](governance_recommendation_export.md#tracked-page-recommendation-lifecycle).

```bash
ae-cli analysis-meta governance-recommendation run-update --project-id <project_id> --run-id <run_id> --status HEARTBEAT
```

Capability: `metadata.governance_recommendation.run_update`. Input required flags: `--project-id`, `--run-id`, `--status`. Optional: `--reason` with a short non-sensitive reason.

Use HEARTBEAT at least every five minutes during actual interpretation. SUCCEEDED without page submission means an empty successful result. Page submission automatically records the exact batch ID. FAILED and CANCELLED release occupancy; record CANCELLED only after execution has stopped. Updating state does not cancel Agent execution. The server requires the same project, actor and active run ID; a fifteen-minute lost lease ends as TIMED_OUT and cannot be revived.

Do not use this command to start recommendations or bypass another run. Output returns the current project status, exact run ID and successful batch ID when present; terminal states release occupancy.
