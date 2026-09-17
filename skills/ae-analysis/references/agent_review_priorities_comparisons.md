# Review Priority and Definition Comparisons

Read after interpreting individual assets and before [independent preflight](agent_review_preflight.md). These are Agent assessments inside each item's `ai_summary`, not new Common admission rules, certification decisions or server evidence. Generate them in LOCAL_ONLY rehearsals too, without submitting anything.

## Per-Asset Review Priority

Write `recommendation.priority` as `HIGH`, `MEDIUM` or `LOW`, with a concrete Chinese `priority_reason` and `evidence_refs`. This ranks human review attention, not whether certification should pass, fail or be deferred. Do not duplicate `ai_summary.summary` into `recommendation.reason`; the summary remains the single item recommendation reason.

- Consider actual business use, distinct users, dependency/reuse scope, decision importance and definition clarity together. State which verified facts make this item more or less urgent within its business domain. A heavily reused foundational field can deserve attention despite little direct viewing.
- Heat alone, source order, asset type, a copied name or a numeric cutoff is not the decision. Scripts may expose comparable facts, never assign grades or template the rationale. Do not invent business criticality when only usage is known.
- A consequential suspected conflict can raise review urgency while lowering confidence in certification. LOW means lower review priority, not "defer certification". HIGH is not approval or proof of accuracy. Do not force a distribution or mark everything HIGH to satisfy the priority filter.
- Preserve usage provenance and windows; missing values are not zero. If evidence cannot support a grade, omit `priority`, explain the specific gap in `priority_reason` and count the item as unassessed in preflight. Never default unassessed assets to MEDIUM or claim full coverage.

Local priority `evidence_refs` resolve against that item's unchanged `evidence_snapshot`, including signals, definitions and lineage. Evidence outside that snapshot must be identified in the source ledger rather than silently copied into authoritative fields.

## Cross-Asset Comparison Pass

After merging authoring chunks, compare candidate peers across dashboards and business-topic boundaries. Chunk-level review alone is insufficient. Build a local comparison ledger: scoped item identities, common business question, which definition facts were read, outcome, and why potential peers were included or excluded. Do not compare every pair indiscriminately: use same/similar business meaning, shared measure/entity, actual formula/SQL and dependency overlap to shortlist. Names and "copy" suffixes are retrieval hints, never conclusions.

Compare the actual counted entity and distinct key, unit, numerator/denominator, aggregation, filter scope, grouping, time semantics, joins and exclusions. For dashboards compare the child-report sets and the meaning of their shared business measures; visual/name similarity alone is not a conflict. Normalize structural syntax only for retrieval; semantic equivalence remains an Agent judgment. Do not execute report queries just to compare saved definitions.

Before assigning a priority or comparison outcome, cross-check these common interpretation traps against the raw definition:

- Preserve relative/dynamic time selectors alongside saved absolute dates; cached dates alone do not prove a fixed historical window or justify a lower priority. If selector resolution is unavailable, name that uncertainty.
- Read the actual formula operands and JOIN predicates. A projected/grouped ID is not necessarily a join key; a token denominator is not a message count. Verify claimed grouping differences on both sides.
- Missing, null, empty, zero and explicit false are distinct evidence states. Do not infer default filter behavior or turn a missing status/environment filter into an intentional business-scope difference without evidence.
- A field's display name does not prove its timing boundaries or virtual-property formula. Keep unsupported semantic relationships INSUFFICIENT_EVIDENCE rather than asserting equivalence or safe coexistence.
- After chunk integration, reconcile the comparison ledger and coverage with the actual peer entries. Remove resolved author handoff tasks, retain real evidence gaps, and investigate obvious same-measure peers before claiming the stated scope COMPLETE.

Write `comparisons[]` only for meaningful examined peers, each with:

| Field | Contract |
| --- | --- |
| `other_item_key` | The peer's exact `client_item_id` in this packet, not a report ID or display name. |
| `target_ref` | The peer's unchanged full scoped target reference; must agree with `other_item_key`. |
| `classification` | One of the four outcomes below. New materials must supply it. |
| `similarities` | Chinese explanation of the shared business meaning that justified comparison. |
| `differences` | Concrete definition differences, or explicit supported equivalence; not just "definitions differ". |
| `impact` | Business interpretation/decision affected by the difference, not raw evidence paths. |
| `review_question` | For a possible conflict, what the human should establish about intended scope/authority. For other outcomes, state any remaining question without manufacturing a need to choose one winner. |
| `evidence_refs` | Two or more scoped evidence references covering both sides, as described below. |

Classifications:

- `POSSIBLE_CONFLICT`: evidence supports the same intended business concept and overlapping scope, but incompatible entity/formula/filter/time semantics could yield competing answers. State the precise incompatibility and uncertainty; the Agent does not decide which asset is authoritative.
- `EQUIVALENT`: examined definitions express the same meaning in the reviewed scope. Shared assets appearing under multiple dashboards are one identity, not a self-comparison or conflict. Identical definitions on distinct assets may warrant consolidation discussion, not a conflict badge.
- `RELATED_DIFFERENT_SCOPE`: related concept with an explicitly supported difference in purpose, population, grain or time scope that explains coexistence. Do not infer intended scope merely to dismiss an unexplained difference.
- `INSUFFICIENT_EVIDENCE`: a relevant peer was found, but missing definitions or unresolved parameters prevent classification. Name the missing facts. Do not claim a proven conflict or no conflict.

Both endpoints of every in-packet `POSSIBLE_CONFLICT` must contain reciprocal comparisons with the same classification, reversed identities and correctly oriented evidence/differences. Keep both assets in their normal groups and keep all human review actions available. Do not remove one or assume an original is authoritative over its copy. Pair comparisons never authorize changing certification status.

Comparison references are strings of the form `items[client_item_id=<exact ID>].evidence_snapshot.<actual path>`, resolved by keyed identity, not array position. Include at least one supporting path from each endpoint; verify that the values support the stated difference. Keep these cross-item refs in `comparisons[].evidence_refs`; report `analysis_explanation` retains its existing item-local `evidence_snapshot.analysis...` contract. References are provenance for Agent checks, not fields for Common to interpret or manufacture.

In the current page contract, actionable peer links require both assets in the retained packet. Record relevant out-of-pool or rejected peers in the local ledger and disclose the comparison boundary; use only necessary read-only CLI evidence lookups. Do not restore rejected branches or fabricate a peer ID just to create a badge. An unexamined external peer prevents a whole-project no-conflict claim.

## Explicit Coverage, Not Empty-by-Default

Every item also carries `comparison_review`:

```json
{
  "status": "COMPLETE",
  "scope": "<examined candidate pool and relevant peer scope, in Chinese>",
  "compared_item_keys": [],
  "reason": "<what was checked and why no relevant peer exists, or a concise outcome>",
  "missing_evidence": []
}
```

`status` is `COMPLETE`, `PARTIAL` or `NOT_REVIEWED`. COMPLETE means the stated comparison scope was examined, not that the whole project has no conflicts. A relevant pair classified INSUFFICIENT_EVIDENCE requires PARTIAL and named missing evidence. An empty `comparisons` array is acceptable after a supported no-peer review; by itself it proves nothing. List the actual compared IDs, not every asset in a topic. This coverage object is stored with AI material for audit; do not assume older pages render it.

## Preflight and Bounded Repair

The independent reviewer checks per-item priority coverage and evidence, cross-chunk candidate selection, both definitions for each pair, classifications, reciprocal conflict edges, identity/refs and whether the wording claims more coverage than was checked. It must challenge both false conflict badges and likely missed conflicts. Record counts by priority (including unassessed), comparison outcome, unique unordered conflict pairs, affected items, and incomplete comparisons. Count pair A-B once, not twice because of reciprocal entries.

Use the same logical-packet correction budget in preflight: at most 3 corrections total, not 3 for each priority, pair or reviewer. On exhausted quality corrections, preserve the findings and follow authorized warning continuation. LOCAL_ONLY always ends with local files. Missing priority, incomplete comparison, and poor rationale are Agent quality findings, not new CLI/Common rejection rules.
