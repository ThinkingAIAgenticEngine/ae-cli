# Agent Review Preflight

Use for preparing or checking review-page materials, including a local-only rehearsal. This is an Agent workflow, not a Common admission rule. Read alongside [submit-to-page](agent_review_submit_to_page.md). A CLI validation success is not a quality approval.

## Authorization and Isolation

Record `LOCAL_ONLY` or `SUBMISSION_AUTHORIZED` from the user's current instructions before starting. `LOCAL_ONLY` prohibits creating batches, notifications, decisions, certification, retries and metric writes, even after a quality PASS. Use only project resolution, recommendation export and necessary evidence/history reads through the project CLI. Keep all drafts and checks local; do not invoke submission commands just to test the review. Existing explicit submission authorization remains valid only while not revoked or narrowed; a newer no-submit request takes precedence over all earlier authorization. Quality PASS or retry exhaustion never creates authorization.

Use a fresh-context reviewer subagent that did not author the material. Give it this reference, the raw evidence files, the exact draft and the scope/source ledger; do not give it the author's quality conclusion or ask it to confirm correctness. It has no submission or rewrite authority. Never substitute a second persona in the same conversation for isolation. If independent subagents are unavailable, record `NOT_REVIEWED` with `REVIEWER_UNAVAILABLE` and disclose unchecked scope. Do not self-approve or spend three attempts on the same unavailable reviewer; follow the warning continuation policy below.

For an explicit audit-only request, the independent reviewer may run these checks directly without spawning another reviewer. Its findings are the audit result, not self-approval of authored text.

## Prepare Once, Interpret in Batches

1. Resolve the host/project, export the candidate pool, and apply the existing rejection/20 -> 50 -> 100 procedure. Preserve the original export file. Record CLI/source revision, loaded Skill path and file hashes so an installed old Skill cannot silently stand in for the tested one.
2. Build a scope ledger accounting for every candidate: retained, existing certified context, same-definition rejection, or an explicit evidence gap. Account separately for metric-creation candidates, which are not CERTIFY proposals. A missing explanation is unfinished work, not a reason to silently remove an asset. Preserve shared asset identity and retained relations.
3. Split retained assets into manageable business-domain chunks, with a per-item checklist. Read actual definitions before writing each chunk. Authoring subagents may work on disjoint chunks, but none may approve its own work. Complete and merge every chunk before calling a batch complete; do not stop at representative examples or fill remaining entries with templates.
4. Keep narrative entries separately keyed by `client_item_id`. Scripts may join these entries to the packet, never compose their sentences. Deep-copy each original `evidence_snapshot`, including `asset`, `signals`, `definition`, `analysis`, revisions and source provenance when present. Copy candidate source/evidence links too. The abbreviated transport example is not a field allowlist.
5. For a gap-only evidence read, preserve the entire original response and record its asset identity and file in the source ledger. The reviewer must verify any replacement/addition against that response. Never replace an existing value merely to agree with prose or recompute server hashes. Common stores the submitted packet; it does not fill omitted statistics or author explanations.
6. Complete [per-asset priorities and cross-asset comparisons](agent_review_priorities_comparisons.md) after merging chunks. Supply evidence-backed `recommendation`, classified `comparisons` and explicit `comparison_review` coverage; missing fields are not a default priority or proof of no conflict.

## Required Independent Checks

The reviewer performs both passes on the complete retained scope. It may use scripts for deterministic comparisons, but must itself interpret the definitions for the semantic pass.

### A. Evidence and Coverage

- Match by full scoped `target_ref` and stable item ID, not name. Reconcile all candidates, all draft items and every displayed relation with the scope ledger. Missing or duplicate coverage cannot PASS.
- Structurally compare each draft snapshot with its original source, preserving all original fields, array order and values. Check `signals` explicitly: missing, null and zero are different. Available heat/users/impact must not disappear while remaining only in prose. Record exact mismatching paths. Verify any permitted enrichment against its saved evidence response; a draft-authored value is not source evidence.
- Keep usage provenance. Export ranking fields such as `heat_count90d` can differ from selected `evidence_snapshot.signals` values. Do not overwrite either or call this alone corruption. Explain which source/window a numerical claim uses. The 90-day usage window is not the report's saved query time.
- Resolve every factual `evidence_refs` path and check the value, not just path existence. Verify revisions, source links, hierarchy and documented exclusions. Save machine-check results with checked item IDs and uncovered IDs.
- Cross-check counted entities, filter/group fields and formula dependencies in actual definitions against the exported dependency graph. All relation IDs resolving does not prove all dependencies were exported. Record missing dependencies as source gaps; never invent asset IDs or evidence-backed edges. Use the relevant read-only CLI lookup only when it can resolve that gap, and preserve its response before adding a verified relation.

### B. Meaning, Not Filled Fields

- Review every retained item's recommendation, and every retained dashboard/report's definition-based explanation. Track checked IDs; sampling cannot establish a whole-batch PASS. If the scope is too large, split the review across fresh reviewers with disjoint ID lists and combine their coverage and findings.
- Dashboard: explain the business question jointly answered by its actual child reports and why this particular combination merits review. A title plus heat and "stabilize downstream definitions" is insufficient.
- Report: explain the actual counted entity, unit, aggregation/formula, measure-level and report-level filters, grouping and saved time semantics. Read raw/normalized configuration when the generic extractor loses model-specific meaning; for example a distinct count may count a company property rather than users. Empty generic measures/dimensions do not establish absent measures/grouping.
- For entity counts, inspect saved entity configuration (such as `measures[].config.quotaEntities` when present), the distinct key and denominator, not only `user_count` or null `identity_scope`. For rank/retention models with empty generic measures, inspect the available `normalized_definition` model section first; do not repeatedly fetch the same evidence just because the generic projection is empty.
- SQL: inspect saved SQL and parameter definitions, even for DYNAMIC/PARTIAL status. Explain supported aggregation, joins and predicates from the original text, clearly separated from unresolved runtime values. Do not invent projections or lineage, and do not use "see the report definition" as the calculation explanation. State the specific unresolved parameter, branch or wildcard and its decision impact, rather than treating all dynamic SQL as unreadable.
- Compare summaries, purposes, calculations, limitations and questions after removing asset names (including Chinese corner quotes), IDs, dates and numbers. Repeated shapes flag items for definition-based review, not mechanical paraphrasing. Different strings and correct citation syntax do not prove meaningful explanation; conversely a genuinely shared rule can be valid if each item's evidence supports it.
- Unknown facts stay unknown. Verify that "no grouping/filter" and distinct-entity claims are actually supported. Risks must be item-specific evidence gaps, not speculative warnings attached to every asset.
- Apply the priority/comparison reference: verify review urgency separately from certification outcome, examine both definitions and cross-topic peers, distinguish equivalent/different-scope/insufficient evidence from possible conflicts, and require reciprocal conflict links. Record graded/unassessed coverage, classified pair outcomes and unchecked peers. These checks share the same maximum 3 corrections, never a new budget per pair.

## Review Artifact and Repair

Write a local `preflight-review.json` with:

```json
{
  "mode": "LOCAL_ONLY",
  "decision": "NEEDS_REVISION",
  "repair_attempt": 0,
  "max_repair_attempts": 3,
  "reviewer_id": "<independent agent ID>",
  "source_sha256": "<original evidence file hash>",
  "draft_sha256": "<exact reviewed file hash>",
  "expected_item_ids": [],
  "checked_evidence_ids": [],
  "checked_semantic_ids": [],
  "unreviewed_ids": [],
  "findings": [
    {
      "item_id": "<asset ID>",
      "field": "<draft field>",
      "code": "<EVIDENCE_LOSS|UNSUPPORTED_CLAIM|BOILERPLATE|INCOMPLETE|SCOPE_GAP>",
      "source_ref": "<raw file and supporting path>",
      "problem": "<concrete mismatch>",
      "required_action": "<evidence to read or content to repair>"
    }
  ]
}
```

The reviewer, not the author or transport script, sets `PASS` only when both passes cover the entire expected scope and no blocking finding remains. Source limitations may remain when honestly explained and the core interpretation is supported; unresolved core meaning cannot PASS. Do not put this local artifact into the Common packet or treat it as authoritative server evidence.

On `NEEDS_REVISION`, the author reopens cited definitions, restores evidence or rewrites the actual interpretation. Adding asset names, IDs, numeric details, synonyms or prefixes merely to defeat repeated-text checks is prohibited. Re-review changed narratives independently and rerun full evidence/coverage checks.

Allow at most **three correction attempts per logical material packet**. Initial drafting/review is attempt 0 and does not consume a correction. Each subsequent author revision plus independent re-review consumes one attempt (1, 2, 3); stop correcting immediately on PASS. Persist the counter and link each finding to the changed fields and the reviewer's resolved/unresolved result. After review of attempt 3 still returns NEEDS_REVISION, do not start attempt 4: retain the failed quality verdict and continue with warnings under the policy below. Replacing subagents, renaming files, regenerating drafts, changing source run IDs, or resuming the same task must not reset this counter. Do not quietly reduce the batch, skip the reviewer or label unfinished work complete. A new retry budget requires explicit user authorization. This is a ceiling, not a quota: stop correcting earlier when no meaningful repair is possible with available evidence and scope; record why, and do not spend attempts on unchanged retries.

## Continue With Disclosed Quality Issues

Quality verdict and submission authorization are separate. A failed quality review must not block an already authorized material-submission workflow after the bounded correction loop. Apply these outcomes without asking for redundant authorization:

| Mode | Quality outcome | Next action |
| --- | --- | --- |
| `LOCAL_ONLY` | Any, including PASS or attempt-3 failure | `LOCAL_ARTIFACT_ONLY`: return draft, review and unresolved issues; never submit or notify. |
| `SUBMISSION_AUTHORIZED` | PASS | Submit the reviewed material through the normal CLI path. |
| `SUBMISSION_AUTHORIZED` | NEEDS_REVISION after attempt 3, or documented no-progress stop | `SUBMIT_WITH_WARNINGS`: submit the latest material and disclose remaining issues; never relabel it PASS. |
| `SUBMISSION_AUTHORIZED` | NOT_REVIEWED because an independent reviewer is unavailable | `SUBMIT_WITH_WARNINGS`: disclose unavailable review and unchecked scope; do not pretend a review happened. |

Before warning-mode dispatch, put a concise Chinese notice in the existing `batch.ai_summary.summary`: actual correction count, unresolved issue categories and affected scope, and that the material is being handed to human review without a quality PASS. Add item-specific `limitations` or `open_questions` for the affected assets where supported, with concrete verification actions; do not duplicate a generic warning on every asset. Keep the full item/field/finding list in the local report and give its location to the user. These are draft annotations, not new Common schema fields or fabricated source facts. Unknown values remain unknown; never invent statistics, definitions or references to make a request valid.

Any change to the draft or source invalidates its previous PASS. Bind each independent review to its exact source/draft hashes. Record the final dispatch hash separately from the last reviewed hash and enumerate warning-only additions. Run deterministic structure/evidence comparisons after adding warnings; warning annotation does not start a fourth semantic correction or fabricate a new review. Preserve NEEDS_REVISION/NOT_REVIEWED and the actual coverage.

This continuation applies only to Agent quality findings, not missing submission authorization, invalid required fields, broken evidence references, authentication/permission failures, or transport/server errors. Keep ordinary CLI/Common validation and error handling; do not bypass it, silently drop items, switch to a less checked API, or claim success without a returned batch ID. After actual submission, compare stored detail with the final dispatched material, report remaining quality issues and the review-page link, and do not automatically approve or resubmit. In LOCAL_ONLY, these network steps remain forbidden even when warning-mode policy would otherwise apply.
