# analysis-meta governance-recommendation auto-review

## Use

Use this command only when the user explicitly asks the Agent to automatically review or automatically certify recommended assets.

## Do not use

Do not call this command for a plain recommendation request. Do not call this command for recommendation plus review-page submission. Those flows use `governance-recommendation export` and, when explicitly authorized, `agent-review submit-to-page`.

## Input and command

Provide `--project-id`. `--window-days` defaults to 90; `--limit` is optional and fixes the recommendation scope when supplied.

```bash
ae-cli analysis-meta governance-recommendation auto-review \
  --project-id <project_id> \
  --window-days 90
```

Capability id: `metadata.governance_recommendation.auto_review`.

Risk: `write`.

When `--limit` is omitted, the CLI runs a bounded expansion flow before the write:

1. Validate automatic-review preconditions first. The validate call must check both `agent_auto_asset_certification_enabled` and `project_semantic_enable`; if either is disabled, stop before collecting recommendations.
2. Inspect top-20 pending recommendation material with `governance-recommendation export --include-completed false --limit 20`.
3. If the retained pending scope is too small for a recurring automatic job, inspect top-50 with `--limit 50`, then top-100 with `--limit 100`. These are cumulative top-N hot-dashboard scopes, not pages.
4. Stop when there are at least about 10 pending asset candidates and 3 pending work-unit branches, when Common says there are no more dashboards, or after top 100.
5. Build automatic certification decisions exactly once from the final selected material, then submit those decisions for execution and audit. The 20/50/100 inspection steps are read-only and must not create certification traces.

Pass `--limit` only for an explicit diagnostic or user-specified scope. An explicit limit disables automatic expansion and preserves that exact scope.

## Output

The command returns `manual_review_handoff` for assets that remain uncertified after automatic review. This handoff is not a page submission. It is the evidence packet to use only if the user later explicitly asks to submit the uncertified assets to the review page.

## Project Switch

The server checks `agent_auto_asset_certification_enabled` before collecting recommendations.

If the command returns `PROJECT_AUTO_CERTIFICATION_DISABLED`, tell the user the project has not enabled automatic asset certification and stop. If it returns `PROJECT_SEMANTIC_DISABLED`, tell the user project semantics are not enabled and stop. Do not fall back to page submission, legacy `governance-recommendation submit`, direct asset-authentication update, metric mutation, or ordinary recommendation export.

## Automatic Review Rules

Common owns the deterministic evidence packet and the final execution/audit write. The CLI Agent owns the automatic certification decision, including semantic-duplicate detection and reviewer-readable duplicate explanations.

- Only asset candidates are eligible for automatic certification. Metric candidates are not automatically created or certified.
- Only actionable candidates with strong positive evidence are approved.
- Candidates with missing source evidence, stale evidence, weak usage/impact signals, explicit prior human rejection/deferral, or CLI Agent semantic-duplicate findings are skipped for manual review.
- Semantic-duplicate skips must name the conflicting asset targets, including type/key/display name and the reason they are considered close, such as copy-like naming, same display name, synonym properties, or ambiguous close business definitions. Do not claim a duplicate when no concrete conflicting target is returned.
- The batch caps automatic decisions to the server-side limit and reports overflow separately.
- Heat, user count, and impact are signals for eligibility, not the full reason by themselves. The Agent must report the decision reason, duplicate targets where present, and source evidence so the customer can tell why a candidate was certified or skipped.

## Audit Trace

Successful automatic review calls submit CLI Agent decisions through the same server-side certification path as manual approval, writing decision rows and certification operation records.

Automatic decision reasons must be reviewer-readable Chinese. Preserve raw source/rule identifiers only in debug exports or technical notes; do not expose fields such as `source`, `rule_version`, or raw `conflict_risks` as the page-visible explanation.

`decision:"APPROVE"` means the server attempted certification for that asset. `decision:"SKIP"` means the item remains uncertified and needs manual review if the user still wants it certified.

The command result includes `auto_review_expansion` when CLI expansion was used. Preserve `initial_limit`, `final_limit`, inspected limits, per-attempt pending counts, and `stop_reason` in unattended-job logs or user-facing summaries. This expansion trace explains why a daily automation did not keep reviewing only the same top-20 hot dashboards.

## Follow-up Page Submission

If the user asks to submit the automatic-review leftovers to the page after `auto-review` has completed, do not rerun the whole recommendation flow as a fresh page-review batch unless the handoff is missing or stale. Use `manual_review_handoff` from the auto-review result:

- Submit `manual_review_handoff.page_review_items`, not only bare `manual_review_handoff.items`. `page_review_items` contains the uncertified assets plus the dashboard/report parent context required by the review page hierarchy. Treat only entries without `manual_review_context:true` as the human certification workload.
- Copy each item's original source links, evidence links, target reference, evidence snapshot, and relation context into the `agent-review submit-to-page` draft.
- Include the automatic-review reason in the page-visible item reason, using `manual_review_reason` / `auto_review_decision.display_reason` / `auto_review_decision.reason` as the basis. Do not describe `previous_decision_exists_for_different_evidence` as a duplicate or close-meaning risk unless the result also names a concrete conflicting asset. Convert it into a reviewer-readable fallback that says no verifiable duplicate target was returned and asks the reviewer to confirm from the current definition and source evidence. Do not expose internal wording such as evidence fingerprints, historical audit evidence, or existing audit records.
- Copy `manual_review_handoff.auto_review_trace` into submit-to-page `source_metadata.auto_review_trace`. This leaves a page-batch audit record showing which assets were already automatically certified in the same workflow.
- The item remains a normal `CERTIFY` proposal for human review; do not encode `SKIP`, `FAILED`, or automatic decision status as an approval.
- Set the batch summary to identify the source auto-review run and explain that the page batch contains only assets still uncertified after automatic review.

If `manual_review_handoff.candidate_count` is 0, tell the user there are no remaining uncertified automatic-review candidates to submit from that run.
