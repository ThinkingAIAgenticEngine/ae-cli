# Submit a personal semantic preference for project review

Use `ae-cli personal-semantic-preference submit` only when the user wants an existing personal preference reviewed for project use. Capability: `business_semantics.personal_context.submit`; risk: write. Do not use this to certify an asset or publish a KB.

Required flags: `--project-id`, `--id` (the existing preference identifier). Optional: `--project-review-note`, `--request-id` (reuse on retries). Use `--validate` or `--dry-run` to check the input without submitting.

The result includes `submitted` and the refreshed `preference`. Submission creates an immutable share application with `share_request_id` and `source_revision`; it does not edit the personal row or its revision. An existing pending application is returned unchanged. Prefer `business_semantics.sharing.submit` with an explicit displayed source_revision for new workflows. Review and KB compilation are separate steps.
