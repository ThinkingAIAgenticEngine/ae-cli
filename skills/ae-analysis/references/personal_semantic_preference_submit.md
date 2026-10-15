# Submit a personal semantic preference for project review

Use `ae-cli personal-semantic-preference submit` only when the user wants an existing personal preference reviewed for project use. Capability: `business_semantics.personal_context.submit`; risk: write. Do not use this to certify an asset or publish a KB.

Required flags: `--project-id`, `--id` (the existing preference identifier). Optional: `--project-review-note`, `--request-id` (reuse on retries). Use `--validate` or `--dry-run` to check the input without submitting.

The result includes `submitted` and the refreshed `preference`. Submission changes eligible NONE/REJECTED records to PENDING; an already submitted record does not imply a new submission. Review and KB compilation are separate steps.
