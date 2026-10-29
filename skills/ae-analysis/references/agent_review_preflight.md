# Agent Review Preflight

Use for preparing or checking review-page materials, including a local-only rehearsal. Ordinary recommendation defaults to FOCUSED_RECOMMENDATION; FULL_AUDIT applies only when the user explicitly requests a comprehensive definition/material audit. These are local review-scope labels, not CLI flags or Common fields. Read alongside [submit-to-page](agent_review_submit_to_page.md). A CLI validation success is not a quality approval; a focused review is not a full certification audit.

## Authorization and Isolation

Record `LOCAL_ONLY` or `SUBMISSION_AUTHORIZED` from the user's current instructions before starting. `LOCAL_ONLY` prohibits creating batches, notifications, decisions, certification, retries and metric writes, even after a quality PASS. Use only project resolution, recommendation export and necessary evidence/history reads through the project CLI. Keep all drafts and checks local; do not invoke submission commands just to test the review. Existing explicit submission authorization remains valid only while not revoked or narrowed; a newer no-submit request takes precedence over all earlier authorization. Quality PASS or retry exhaustion never creates authorization.

Use a fresh-context reviewer subagent that did not author the material. Give it this reference, the raw evidence files, the exact draft and the scope/source ledger; do not give it the author's quality conclusion or ask it to confirm correctness. It has no submission or rewrite authority. Never substitute a second persona in the same conversation for isolation. If independent subagents are unavailable, record `NOT_REVIEWED` with `REVIEWER_UNAVAILABLE` and disclose unchecked scope. Do not self-approve or spend three attempts on the same unavailable reviewer; follow the warning continuation policy below.

For an explicit audit-only request, the independent reviewer may run these checks directly without spawning another reviewer. Its findings are the audit result, not self-approval of authored text.

## Focused Recommendation Review (Default)

Apply one whole-packet programmatic check and one independent semantic pass over the following focused scope:

- Check every business domain and subtopic, including the narrower question, membership, supporting definitions from each represented dashboard, missed cross-dashboard merges and unjustified source-container splits. Use actual core measures/populations/time boundaries; exhaustive SQL projection analysis is unnecessary unless it affects that judgment.
- Check the recommendation basis and explanation for identified material risks: uncertain counting entity or formula, a meaningful name/definition mismatch, conflicting peers, or missing evidence behind a claim. Inspect only the affected fields and relevant peers. Dynamic SQL or a generic extractor's empty fields alone is not a requirement for a full audit.
- Other items retain concise author-written purposes/reasons and a core evidence-backed measure/calculation for every report. The independent reviewer does not need to reread every remaining definition, individually grade metadata dependencies, or author exhaustive pair comparisons. Omitted priority/comparison fields are allowed; never interpret them as a no-conflict result.
- Record checked semantic item IDs and identified risk IDs separately from whole-packet machine coverage. PASS means the declared focused scope passed; explicitly state that full item-definition auditing was not performed. No focused PASS with unchecked topics/subtopics or unchecked identified risks. A few sampled items do not constitute a full audit.
- Correct factual or materially unsupported grouping/recommendation claims, then recheck affected semantic fields and rerun the machine check. Do not spend rounds on stylistic preferences, exhaustive coverage records or optional prose. The existing maximum of 3 material corrections remains a ceiling, never a routine three-round workflow.

Preserve the exact source/draft hashes and actual coverage. A newly discovered risk expands only the affected inspection scope; it does not silently turn ordinary recommendation into a full-batch audit. Authorization, missing required evidence and structural errors remain separate checks.

## Prepare Once, Interpret in Batches

1. Resolve the host/project, export the candidate pool, and apply current-state selection and the bounded 20 -> 50 -> 100 procedure; do not query review history to exclude candidates. Preserve the original export file. Record CLI/source revision, loaded Skill path and file hashes so an installed old Skill cannot silently stand in for the tested one.
2. Build a scope ledger accounting for every candidate: selected current uncertified work, existing certified context, overflow, or an explicit evidence gap. Account separately for metric-creation candidates, which are not CERTIFY proposals. A missing explanation is unfinished work, not a reason to silently remove an asset. Preserve shared asset identity and retained relations.
3. Interpret selected assets' core definitions and author both grouping levels under [Business Topics and Subtopics](agent_review_submit_to_page.md#business-topics-and-subtopics). Compare grouping across source dashboard boundaries before transport assembly. Keep concise per-item reasons and material risk notes; use chunks only when needed for the size. Full audits also require the per-item comprehensive interpretation below. Do not drop selected assets merely to avoid writing their core meaning or fill entries with templates.
4. Keep narrative entries separately keyed by `client_item_id`. Scripts may join these entries to the packet, never compose their sentences. Deep-copy each original `evidence_snapshot`, including `asset`, `signals`, `definition`, `analysis`, revisions and source provenance when present. Copy candidate source/evidence links too. The abbreviated transport example is not a field allowlist.
5. For a gap-only evidence read, preserve the entire original response and record its asset identity and file in the source ledger. The reviewer must verify any replacement/addition against that response. Never replace an existing value merely to agree with prose or recompute server hashes. Common stores the submitted packet; it does not fill omitted statistics or author explanations.
6. Run [priorities and cross-asset comparisons](agent_review_priorities_comparisons.md) only when requested, when concrete peer/conflict evidence needs inspection, or for a full audit. Ordinary items need not carry grades or comparison coverage. For comparisons actually made, keep evidence and classifications; missing fields are not a default priority or proof of no conflict.

## Required Independent Checks

The machine pass covers the entire exact packet in either scope. The independent reviewer interprets definitions for every topic/subtopic and identified risk in focused scope; a FULL_AUDIT additionally covers every retained item's detailed meaning. Use scripts for deterministic comparisons rather than repeating those checks in prose.

### A. Evidence and Coverage

- Match by full scoped `target_ref` and stable item ID, not name. Reconcile all candidates, all draft items and every displayed relation with the scope ledger. Missing or duplicate coverage cannot PASS.
- Structurally compare each draft snapshot with its original source, preserving all original fields, array order and values. Check `signals` explicitly: missing, null and zero are different. Available heat/users/impact must not disappear while remaining only in prose. Record exact mismatching paths. Verify any permitted enrichment against its saved evidence response; a draft-authored value is not source evidence.
- Keep usage provenance. Export ranking fields such as `heat_count90d` can differ from selected `evidence_snapshot.signals` values. Do not overwrite either or call this alone corruption. Explain which source/window a numerical claim uses. The 90-day usage window is not the report's saved query time.
- Resolve every factual `evidence_refs` path and check the value, not just path existence. Verify revisions, source links, hierarchy and documented exclusions. Save machine-check results with checked item IDs and uncovered IDs.
- Cross-check counted entities, filter/group fields and formula dependencies in actual definitions against the exported dependency graph. All relation IDs resolving does not prove all dependencies were exported. Record missing dependencies as source gaps; never invent asset IDs or evidence-backed edges. Use the relevant read-only CLI lookup only when it can resolve that gap, and preserve its response before adding a verified relation.

### B. Business Grouping (Both Scopes)

- Business topics: review every topic's Agent-authored `semantic_basis.business_question`, `grouping_reason`, and `evidence_item_ids` against definitions of items displayed in that topic. Missing basis is a semantic quality finding even though legacy transport accepts its absence. Copying a dashboard/report title or `topic_seed` is not a business interpretation. Explain why reports answer the same business question, identify justified cross-dashboard merges and within-dashboard splits, and use `待确认业务主题` with the specific uncertainty when evidence is insufficient. A legitimate business name can equal a source name: never reject it by keyword or equality alone.
- Business subtopics: independently check every `topics[].groups[]` and its own `semantic_basis` against member report definitions, not just the parent topic's meaning. Verify its narrower question, boundaries from siblings, evidence for every represented dashboard, and whether related selected dashboards were wrongly separated. One-dashboard-per-group output requires definition-based scrutiny for missed merges; changing group names without reconsidering membership does not resolve it. Accept a single-dashboard subtopic when its specific question and selected-scope limits justify it. Do not force unrelated dashboards together or use name equality/count thresholds as the verdict. Missing basis, copied source containers and unsupported membership are semantic quality findings, not new CLI/Common admission rules.
- Record `checked_topic_ids`, `unreviewed_topic_ids`, and scoped `checked_subtopic_refs` / `unreviewed_subtopic_refs` (`{topic_id, group_id}`), with topic/subtopic-specific findings alongside item coverage. For every subtopic record its dashboard item IDs, definition evidence inspected, cross-dashboard merge/split assessment and any single-dashboard justification in `subtopic_checks`. A top-level topic review or item-only PASS cannot stand in for these checks. No whole-packet PASS with unchecked topics or subtopics. Reuse the existing bounded correction budget and warning continuation policy; grouping checks do not authorize certification or submission.


### C. Full Audit Only

The following comprehensive item, priority and paired-definition checks apply to FULL_AUDIT. For focused recommendations use them only on fields needed by a grouping judgment or an identified risk; do not expand to every item.

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
  "review_scope": "FOCUSED_RECOMMENDATION",
  "decision": "NEEDS_REVISION",
  "repair_attempt": 0,
  "max_repair_attempts": 3,
  "reviewer_id": "<independent agent ID>",
  "source_sha256": "<original evidence file hash>",
  "draft_sha256": "<exact reviewed file hash>",
  "expected_item_ids": [],
  "checked_evidence_ids": [],
  "checked_semantic_ids": [],
  "expected_semantic_ids": [],
  "identified_risk_ids": [],
  "unchecked_risk_ids": [],
  "not_audited_item_ids": [],
  "unreviewed_ids": [],
  "checked_topic_ids": [],
  "unreviewed_topic_ids": [],
  "checked_subtopic_refs": [],
  "unreviewed_subtopic_refs": [],
  "subtopic_checks": [
    {
      "topic_id": "<business-domain-id>",
      "group_id": "<business-subtopic-id>",
      "dashboard_item_ids": ["<dashboard item id>"],
      "definition_evidence_refs": ["<raw file and report-definition path>"],
      "merge_split_assessment": "<why these members belong together and differ from siblings>",
      "single_dashboard_justification": "<reason if one dashboard; null otherwise>",
      "result": "<PASS|NEEDS_REVISION>"
    }
  ],
  "findings": [
    {
      "topic_id": "<domain ID for a grouping finding; omit for item-only findings>",
      "group_id": "<subtopic ID for a subtopic finding; omit otherwise>",
      "item_id": "<asset ID for an item finding; omit for grouping-only findings>",
      "field": "<draft field>",
      "code": "<EVIDENCE_LOSS|UNSUPPORTED_CLAIM|BOILERPLATE|INCOMPLETE|SCOPE_GAP>",
      "source_ref": "<raw file and supporting path>",
      "problem": "<concrete mismatch>",
      "required_action": "<evidence to read or content to repair>"
    }
  ]
}
```

The reviewer, not the author or transport script, sets `PASS` only for the explicitly recorded `review_scope`. For FOCUSED_RECOMMENDATION, machine checks cover all expected item IDs, semantic checks cover all topic/subtopic supporting evidence and identified risk IDs, and remaining items appear in `not_audited_item_ids`; their absence from detailed semantic review is not automatically a finding. For FULL_AUDIT, `expected_semantic_ids` includes every retained item and none may remain unaudited. Reports without an explicit scope are legacy full-audit records, not evidence of a newly completed focused review.

Enumerate expected `{topic_id, group_id}` pairs from the exact draft and reconcile them with checked/unreviewed coverage; counts or a few examples are insufficient. Unknown source facts may remain when honestly explained; unresolved meaning within the declared checked scope cannot PASS. Do not put this local artifact into the Common packet or treat it as authoritative server evidence. Always disclose focused versus full coverage without creating identical per-item audit boilerplate.

On `NEEDS_REVISION`, reopen cited definitions, restore evidence or correct the actual interpretation. Adding synonyms or prefixes merely to defeat repeated-text checks is prohibited. Independently re-review affected material findings in the declared scope and rerun whole-packet programmatic evidence checks; do not restart every unchanged report explanation for a grouping or copy edit.

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
