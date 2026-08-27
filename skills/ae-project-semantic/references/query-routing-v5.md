# Project Semantic Query Routing V5

Use this protocol when project asset packages contain asset definitions, work-unit membership, recent usage, authentication provenance, and optional notes, but do not contain historical user questions, query failures, or execution traces. Never claim that a structure-inferred path is a proven historical best practice.

The only recommendation kinds are:

- `QUERY_ROUTING`: choose the right dashboard/report for a question and distinguish nearby assets;
- `RECALL_SHORTCUT`: reduce broad asset search to a minimal ordered bundle with stop and fallback conditions;
- `ANALYSIS_PLAYBOOK`: execute a multi-step or branching analysis path supported by notes or strong complementary asset structure.

Submission semantic types remain unchanged: routing and shortcuts normally use `asset_semantics`; playbooks normally use `business_rule`.

## Evidence roles

- Dashboard/report membership and work units show which assets jointly address a problem.
- Normalized/raw definitions determine what each asset computes, filters, groups, and returns.
- Display names, descriptions, notes, and dashboard memo text explain intended questions and explicit instructions, but never make otherwise identical definitions different.
- Recent usage and recency may prioritize a default entry among otherwise suitable assets; they never establish a formula, causal rule, or business priority.
- Definition families and conflicts distinguish alternatives, duplicates, misleading titles, and exception variants.
- Published, active, and rejected catalogs provide exclusion and revision context.

## Discover problem frames before candidates

For every inspected work unit, create zero or more evidence-backed `problem_frames`. Do not require every work unit or asset to produce a candidate. Each frame records:

- natural-language problem intent;
- triggers and constraints;
- business object and expected answer grain;
- available assets and their roles;
- decision points that change asset choice;
- explicit note/memo guidance, when present;
- usage/recency priority;
- evidence gaps.

Assign relevant assets one of these roles for the frame:

- `DEFAULT_OVERVIEW`;
- `CONDITIONAL_BRANCH`;
- `DETAIL_DRILLDOWN`;
- `COMPARISON_OR_COUNTEREXAMPLE`;
- `FALLBACK`;
- `UNSUITABLE_FOR_FRAME`.

An asset may have different roles in different frames. Every role assignment must cite exact definition or note evidence.

## QUERY_ROUTING gate

Generate only when all are true:

1. At least two plausible assets could be confused or selected for related questions.
2. Object, grain, formula, scope, time, parameter, or output differences determine the correct asset.
3. The candidate states:
   - triggering question types;
   - default asset or entry dashboard;
   - branch conditions and target assets;
   - assets that must not substitute for one another;
   - required parameters or filters;
   - drilldown and fallback.
4. Removing the route would materially increase wrong-asset selection.

A formula may explain why a branch is selected, but it is not a routing semantic by itself.

## RECALL_SHORTCUT gate

Generate only when all are true:

1. A broad work unit contains more assets than a recurring query needs.
2. Evidence supports a minimal ordered subset.
3. The candidate states the first asset, continuation conditions, stop condition, safe fallback, and unrelated asset groups that can be skipped.
4. Usage may prioritize between evidence-equivalent suitable entries, but cannot override definition fit.
5. Search-space reduction is stated from package membership only; never claim measured latency improvement without runtime evidence.

## ANALYSIS_PLAYBOOK gate

### High-confidence playbook

Requires an explicit note or memo stating an analysis goal, sequence, decision, or caveat, plus executable assets supporting the steps. If any required asset is unauthenticated, label the playbook lower confidence and require project-administrator review; do not present the path as certified.

### Medium-confidence recommended analysis path

Allowed without explicit notes only when all are true:

- at least three complementary roles form an overview-to-branch-to-drilldown or measure-to-diagnose-to-verify path;
- exact definitions establish branch conditions and prevent interchangeable use;
- no causal claim, business priority, or mandatory sequence is invented;
- the output is labeled `RECOMMENDED_ANALYSIS_PATH`;
- boundaries state that the path is structurally inferred and requires review.

Reject paths supported only by co-location, similar titles, independent metrics, or usage ranking.

## Reject shallow candidates

Reject a candidate that only provides:

- one formula, threshold, state, event, property, report, dashboard, or asset name;
- an inventory of related assets;
- a topic summary without asset-choice decisions;
- a broad umbrella listing measures without branches;
- an inferred maturity hierarchy, causal explanation, or best practice absent from notes;
- a route that does not reduce ambiguity or search.

Simple formulas and states remain evidence inside routes and playbooks. They do not become standalone project semantics.

## Candidate fields

In addition to the governed submission fields, retain:

- `candidate_kind`;
- `problem_triggers`;
- `default_route`;
- `branch_rules`;
- `do_not_use`;
- `drilldown_path`;
- `fallback`;
- `asset_roles`;
- `search_space_reduction`;
- `evidence_strength`: `HIGH_NOTE_BACKED` or `MEDIUM_STRUCTURE_BACKED`;
- `confidence_limit`;
- `problem_frame_ids`.

The candidate body must cover business definition, applicable questions, decision or calculation rules, Agent usage, and boundaries or exceptions. Use headings natural to the project's language when headings improve readability; exact localized wording is not part of the machine contract.

Reusable decision knowledge belongs in `content`. Asset names, ids, counts, and excerpts belong in route fields, `resource_refs`, `evidence`, and `recommendation_reason`.

## Decision ledger

When producing recommendation artifacts, record:

- work units and notes actually inspected;
- discovered problem frames;
- asset-role assignments and evidence;
- routing/shortcut/playbook decisions;
- rejected shallow opportunities and reasons;
- candidate-to-frame mappings;
- dispositions: `ROUTED`, `SHORTCUT`, `PLAYBOOK`, `DEFINITION_ONLY`, or `EVIDENCE_INSUFFICIENT`.

Coverage is measured over supported problem frames, not raw asset or definition-signature counts. Every discovered frame needs a disposition, but not every work unit or asset needs a candidate.

## Acceptance

Candidate count and average prose score are not success metrics. Evaluate with evidence-grounded future-query probes and report:

- primary asset or entry selection;
- conditional branch selection;
- prevention of plausible wrong-asset substitution;
- minimal asset bundle;
- stop and fallback completeness;
- search-space reduction versus the work unit;
- playbook step support;
- unsupported causal or order claims;
- problem-frame coverage;
- formula-only or inventory-only candidate count, which must be zero.

Before submit, require:

- CLI validator `passed=true`;
- no shallow formula/state-only candidate;
- every route has a meaningful branch;
- every shortcut has stop and fallback;
- every playbook is note-backed or explicitly labeled structure-backed;
- candidates materially choose or narrow assets better than an undifferentiated work-unit scan.

## Anti-overfitting

Never encode project names, project ids, asset ids, event names, expected topics, expected titles, expected routes, expected counts, or fixed industry dictionaries. The reusable mechanism is problem framing, asset-role classification, decision branching, minimal bundles, and evidence-bounded paths.
