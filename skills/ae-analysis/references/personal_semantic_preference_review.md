# Review personal semantic preferences

Use `ae-cli personal-semantic-preference review` only for an explicit project review decision by an authorized reviewer. Capability: `business_semantics.personal_context.review`; risk: write. Do not use this to publish a KB or change asset certification.

An authorized project reviewer may adopt or reject an unsubmitted (`none`) preference directly; a separate submit step is optional. Pending preferences can also be reviewed.

Required flags: `--project-id`, `--ids` (JSON array of 1–100 preference IDs from review-list), `--action` (`adopt` or `reject`). Optional: `--project-review-note`, `--request-id` (reuse on retries). Validate or dry-run checks input without applying the decision.

The result contains `action`, reviewed `items`, and `reviewed_count`. Adoption makes the reviewed preference eligible for future project KB refresh; it does not confirm a successful KB compile or publication. Reload after a review-state conflict before deciding again.
