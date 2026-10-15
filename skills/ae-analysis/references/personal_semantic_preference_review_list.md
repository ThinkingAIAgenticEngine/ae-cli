# List personal semantic preferences for project review

Use `ae-cli personal-semantic-preference review-list` for the authorized project review queue. Capability: `business_semantics.personal_context.review_list`; risk: read. Do not use this instead of the user's personal preference list.

Required flag: `--project-id`. Optional filters: `--project-review-status` (`none`, `pending`, `adopted`, `rejected`), `--owner` (user name, login name, or user ID; open_id is not accepted), `--context-type` (`preference`, `asset_context`, `experience`, `background`), `--keyword`, `--limit`, and `--offset`.

The result includes `items`, `total`, `limit`, `offset`, `has_more`, and `next_offset`. Use the returned identifiers for an explicit adopt/reject decision; listing does not change review status or refresh a KB. Project reviewer permissions are required.
