# Project Semantic Recommendation Quality

## Business Goal

The Agent should turn a certified project snapshot into a small, reviewable L2 semantic system. The output should help future analysis interpret business terms, choose the right dashboards/reports, and apply project-wide rules consistently.

It should not produce a checklist of assets to approve one by one.

## Extraction Method

1. Start with `manifest.json`, `.asset-package.json`, and all catalog files. Published semantics and active candidates form the duplicate/update exclusion set. Disabled semantics form a strict suppression set and must not be recreated by the scan. Rejected candidates require a documented material change before reconsideration.
2. Treat `indexes/work-units.jsonl` as the primary investigation queue. Follow its recent-90-day usage order, but rotate across distinct evidence-backed business themes before adding more candidates for a dominant theme.
3. Start with authenticated, active dashboards and reports as primary evidence. When the user explicitly approved a broader export scope, preserve each asset's authentication and selection provenance. Unauthenticated dashboards/reports may support discovery only when corroborated by definitions, work-unit relationships, usage, or notes, and any resulting claim must carry a lower confidence boundary. Events, properties, metrics, notes, and background text are supporting evidence only. Open `details/normalized/**` and `details/raw/**` through `detail_locator` only for assets that may support a candidate.
4. Use normalized key fields to establish definition families. Display names, descriptions, and notes remain available as interpretation evidence, but differences in those fields alone must not split a family. Discover semantic families with cross-domain questions: business object/state, analysis subject and grain, formula and denominator, inclusion/exclusion, time roles, units and normalization, asset-selection priority, applicability and exceptions. These are inspection dimensions, not topic names.
5. Name L2 topic domains only after the evidence families are understood. Use the project's own natural business language; do not start from a fixed industry taxonomy or known test-package themes.
6. For every cluster, ask what reusable project meaning it implies:
   - business concept: a named business object or state;
   - business rule: inclusion/exclusion logic;
   - asset semantics: default asset set for a question type;
   - calculation convention: denominator, numerator, window, attribution, currency, deduplication.
7. Create candidates only when the semantic is reusable across future questions and changes Agent behavior.
8. Return a successful empty recommendation when published or active semantics already cover every supported behavior change.
9. Apply [`query-routing-v5.md`](query-routing-v5.md) after evidence-family discovery. Prefer reusable query routing, recall shortcuts, and evidence-bounded analysis paths over standalone formula or state descriptions.

## Reject These Candidates

- One candidate per asset.
- Candidate title merely copies an event/property/report name.
- Candidate title is an L1 metadata object, for example an event, property, metric, tag, or field name.
- Candidate has fewer than two related evidence assets unless one asset is a high-authority certified dashboard/report with detailed notes.
- Candidate claims a calculation rule not present in asset names, descriptions, definitions, notes, or inspected reports.
- Candidate mixes unrelated lifecycle domains to raise evidence count.
- Candidate treats an unauthenticated asset as a certified or authoritative project default without corroboration and an explicit confidence limit.
- Candidate is a duplicate of a published or disabled semantic by title, alias, or equivalent behavior.
- Candidate is a generic lifecycle template that ignores the project domain discovered in the snapshot.
- Candidate only restates one formula, threshold, state, event, property, report, dashboard, or asset name.
- Candidate is a broad topic summary with no asset-choice branch, stop condition, or wrong-asset exclusion.

## Candidate Shape

Each topic group should explain why the assets belong together. Each candidate should include:

- `candidate_kind`: `QUERY_ROUTING`, `RECALL_SHORTCUT`, or `ANALYSIS_PLAYBOOK`;
- `semantic_type`;
- `title`;
- `summary`;
- `content` with definition, scope, usage, and exclusions;
- `keywords`;
- `resource_refs` with asset type, id/name, display name, and description when available;
- `work_unit_coverage` for the snapshot work units it covers;
- `recommendation_reason`;
- `evidence` with source titles and excerpts.
- the V5 route fields required for its candidate kind, including branches, exclusions, stop/fallback behavior, asset roles, evidence strength, and problem-frame ids.

The candidate body must read as governed business knowledge, not as an asset inventory. Use this review order:

1. **Business definition**: what the concept, rule, or convention means in this project.
2. **Applicable questions**: which future questions should activate it.
3. **Decision or calculation rule**: the concrete inclusion, exclusion, grain, denominator, time-window, or asset-selection rule proven by evidence.
4. **Agent usage rule**: how the Agent changes interpretation or execution after adopting it.
5. **Boundaries and exceptions**: what must not be inferred, merged, or substituted.
6. **Evidence assets**: keep dashboards/reports in `resource_refs` and evidence sections; do not make their names the semantic body.

Reject a batch when multiple candidates differ only by asset names or counts while reusing the same definition, usage, and exclusion prose. A recommendation reason must name the business claim supported by the evidence, not merely state that dashboards/reports were bound.

## Evaluation Packages

Evaluate the unchanged protocol on at least two unrelated asset packages when tuning recommendation quality. Do not add project names, asset IDs, expected titles, expected domains, or expected counts to the skill or CLI code after seeing a test result. A sparse governed package should trigger explicit, sequential consent before re-exporting `collaborative` and then `all_visible`; a sparse broad package should still produce fewer candidates or explicit insufficiency warnings rather than generic filler.
