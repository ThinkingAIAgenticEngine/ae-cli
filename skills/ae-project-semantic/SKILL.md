---
name: ae-project-semantic
description: "Use when generating, testing, submitting, reviewing, or publishing governed project semantic candidates from AE/TE project asset packages. This skill owns progressive asset-scope consent, recommendation quality gates, evidence authority, topic-domain grouping, candidate JSON generation, CLI closed-loop validation, and frontend review acceptance. Do not use it for ordinary analysis questions that only consume already published semantics."
---

# ae-project-semantic

Project semantics are governed L2 project-wide business concepts, rules, calculation conventions, and default asset-selection methods. They sit above dashboards and reports. Dashboards, reports, events, properties, and metrics are L1 evidence and execution assets; they are not project semantics by themselves.

Use `ae-cli` only. Do not write the database directly for recommendations, approvals, or releases.

## Boundary

- Use this skill to generate or evaluate project semantic recommendations.
- Use `ae-analysis` to consume already published project semantics during analysis tasks.
- Frontend can review, edit, approve, reject, and publish candidates; it must not generate recommendations.
- Start with governed authenticated dashboards/reports. Broader project assets may be inspected only after explicit user consent and must retain their lower authority in evidence and confidence. Events, properties, metrics, background documents, and notes can provide supporting evidence only, never the primary L2 candidate subject.

## Required Workflow

1. Resolve the project and host.
2. Read both recommendation references before inspecting candidates:
   - [`references/recommendation-quality.md`](references/recommendation-quality.md) for the governed L2 quality bar;
   - [`references/query-routing-v5.md`](references/query-routing-v5.md) for the current query-routing, recall-shortcut, and analysis-playbook discovery protocol.
3. Check existing published project semantics:

```bash
ae-cli project-semantic list --project-id <project_id>
```

4. Export governed authenticated project assets and semantic snapshot context by default:

```bash
ae-cli project-semantic asset-package export --project-id <project_id> --asset-scope governed --output <tmp>/project-semantic-assets --force
```

When `--host` points directly to a locally started Common service instead of the deployed analysis gateway, scope the empty gateway domain to that command so the request uses Common's native `/api/cli/v1` route. Do not export this override globally:

```bash
AE_CLI_CAPABILITY_GATEWAY_DOMAIN= ae-cli project-semantic asset-package export --project-id <project_id> --asset-scope governed --output <tmp>/project-semantic-assets --force --host http://127.0.0.1:8992
```

5. Inspect `asset_scope`, `exported_asset_count`, `authenticated_asset_count`, `unauthenticated_asset_count`, `truncated`, work-unit count, and definition-family count before scanning. If `truncated=true`, warn that the package hit a compatibility limit. If the governed package is too sparse to support useful problem frames, report the actual counts and ask whether to re-export active collaborative assets. Do not broaden automatically:

```bash
ae-cli project-semantic asset-package export --project-id <project_id> --asset-scope collaborative --output <tmp>/project-semantic-assets --force
```

If that package is still too sparse, report its counts and ask separately whether to export all valid project dashboards/reports and their referenced metadata:

```bash
ae-cli project-semantic asset-package export --project-id <project_id> --asset-scope all_visible --output <tmp>/project-semantic-assets --force
```

`governed` is authenticated + collaborative + active in the recent 90-day window. `collaborative` removes only the authentication requirement. `all_visible` removes authentication, collaboration, and recency filters while still excluding deleted, frozen, hidden, offline, or otherwise invalid assets. Export is project-administrator-only; no per-user visibility filtering is required inside `all_visible`. Asset authentication is a separate governance write and must never be changed implicitly by scanning.

6. Read the package in this order:
   - `manifest.json`, `.asset-package.json`, `catalog/published.jsonl`, `catalog/disabled.jsonl` when present, `catalog/active-candidates.jsonl`, and `catalog/rejected-candidates.jsonl` to build the exclusion and revision context;
   - `indexes/work-units.jsonl` as the dashboard-first investigation queue, preserving its usage-priority order while rotating across distinct business themes;
   - `indexes/definition-families.jsonl` and compact dashboard/report records to compare reusable definition variants;
   - `indexes/asset-directory.jsonl` and `indexes/governance-coverage.jsonl` for supporting evidence;
   - `details/normalized/**` only for candidate-bearing or conflicting families, and `details/raw/**` only when the normalized definition is insufficient.

   The service owns deterministic parsing, key-field normalization, definition signatures, usage ordering, and catalog assembly. The Agent owns business topic discovery, evidence interpretation, counterexample review, and candidate wording. Display names, descriptions, and notes remain evidence for interpretation, but they never make two otherwise identical definitions distinct. Do not load every detail file into context up front or delegate business judgment to a project-specific keyword table or deterministic template generator.

7. Compare the proposed behavior against published, disabled, active-candidate, and rejected catalogs. Disabled semantics are suppression context: do not consume, recreate, or update them through recommendation generation. A project administrator can explicitly enable them later. Produce `CREATE` only for a genuinely new semantic, `UPDATE` when an active semantic needs a material revision, and no candidate when the package is already covered. Zero new candidates is a valid successful recommendation result.

8. Validate the Agent-authored file against the exact exported package. This command checks only deterministic contract rules such as required fields, supported enums, catalog conflicts, duplicate fingerprints, and resolvable evidence references. `passed=true` is not a semantic-quality approval:

```bash
ae-cli project-semantic candidate validate --asset-package <tmp>/project-semantic-assets --submit-file <tmp>/project-semantic-candidates.json
```

9. Perform a separate Agent quality-review pass over the unchanged candidate file and the evidence it cites. Apply the Hard Quality Bar and `references/recommendation-quality.md`; do not rely on the generation pass to approve its own wording. For every candidate, record `PASS`, `REVISE`, or `INSUFFICIENT_EVIDENCE` with concrete findings and evidence references. Revise and repeat both deterministic validation and Agent review until every submitted candidate is `PASS`. A successful empty recommendation is preferable to weak filler.

10. Submit the unchanged validated and Agent-reviewed file. Use `.asset-package.json.snapshot_hash`, or the `snapshot_hash` returned by `candidate validate`:

```bash
ae-cli project-semantic candidate submit --project-id <project_id> --submit-file <tmp>/project-semantic-candidates.json --snapshot-hash <snapshot_hash>
```

11. Review and enable through CLI when validating the full closed loop:

```bash
ae-cli project-semantic candidate list --project-id <project_id>
ae-cli project-semantic candidate get --project-id <project_id> --candidate-id <candidate_id>
ae-cli project-semantic candidate enable --project-id <project_id> --candidate-ids '["candidate_1"]'
ae-cli project-semantic get --project-id <project_id> --id <semantic_id> --mark-used
```

Lifecycle management is deliberately separate from recommendation review:

```bash
ae-cli project-semantic disable --project-id <project_id> --semantic-id <semantic_id> --expected-version <version> --reason <reason>
ae-cli project-semantic list --project-id <project_id> --status disabled
ae-cli project-semantic delete-impact --project-id <project_id> --semantic-id <semantic_id>
ae-cli project-semantic delete --project-id <project_id> --semantic-id <semantic_id> --expected-version <version> --reason <reason>
ae-cli project-semantic enable --project-id <project_id> --semantic-id <semantic_id> --expected-version <version> --reason <reason>
```

Disable means “do not consume and do not recommend again.” From disabled state, either enable the same semantic or inspect impact and physically delete it. Physical deletion means the semantic is absent and may be rediscovered by a future scan. Never delete merely to regenerate recommendations.

## Hard Quality Bar

A candidate file is not acceptable unless all of these are true:

- It starts from governed evidence, or records the explicitly approved broader scope and lowers confidence for claims that depend on unauthenticated assets.
- It groups by L2 business topic domain before generating candidates.
- Every topic group includes the submit-contract fields `topic_domain_key`, `topic_domain_title`, `topic_group_key`, and `topic_group_title`.
- It does not create one candidate per asset.
- It does not promote an event/property/metric name into a project semantic title.
- Each candidate binds `resource_refs` with real asset names/types/ids or names from the package.
- Each candidate explains what it means, where it applies, how to use it, and what it excludes.
- Each candidate body covers business definition, applicable questions, decision or calculation rules, Agent usage, and boundaries or exceptions in the project's natural language. Exact headings are not a machine contract.
- The concrete business judgment belongs in the decision or calculation content; asset names and counts belong in `resource_refs`, `evidence`, and `recommendation_reason`, not in the semantic body.
- A batch fails review when candidates reuse the same body with only asset names or counts changed.
- Each candidate includes evidence excerpts or source titles that show why it was recommended.
- Each candidate changes how the Agent interprets a business question, selects default assets, or applies a project-wide rule.
- Each candidate declares one of the evidence-backed recommendation kinds in `query-routing-v5.md`: `QUERY_ROUTING`, `RECALL_SHORTCUT`, or `ANALYSIS_PLAYBOOK`.
- A formula, threshold, state, event, property, report, or asset name is supporting L1 evidence, never a standalone candidate.
- A route must contain a meaningful asset-choice branch; a shortcut must contain a minimal bundle plus stop and fallback; a playbook must be note-backed or explicitly labeled as a structure-inferred recommended path.
- Existing published and disabled semantics are checked before submission; disabled semantics suppress recreation.
- An unauthenticated asset may support a route, shortcut, or playbook only when definitions, work-unit structure, usage, or notes provide corroboration. Never present it as a certified project rule solely because it was exported.
- Sparse evidence is either skipped or marked lower confidence; do not inflate weak recommendations.

## Generic Extraction Protocol

The protocol must work unchanged for games, retail, finance, SaaS, operations, and unknown project domains.

1. Inventory evidence without deciding themes. Separate authenticated and unauthenticated dashboards/reports, record the export scope and selection reason, and keep existing governed semantics and supporting L1 metadata distinct.
2. Discover semantic families only from evidence that was actually read. Use these cross-domain dimensions as questions, not as prefilled answers:
   - business object, state, and alias;
   - analysis subject and deduplication grain;
   - measure, aggregation, numerator, denominator, and transformation;
   - inclusion, exclusion, and filter scope;
   - query range, cohort window, observation window, and freshness;
   - unit, currency, normalization, and attribution;
   - default asset selection and relationships between assets;
   - applicability, exception, and conflict boundaries.
3. Compare definition variants inside each family. A candidate may state a default only when evidence shows one authoritative variant. Conflicting variants require a disambiguation rule or a warning, not an invented standard.
4. Form a topic domain after the semantic families are understood. The domain title must come from the project's natural business language and explain why its candidates are reviewed together.
5. Generate a candidate only when removing it would make a future Agent more likely to choose the wrong business object, asset, grain, formula, scope, unit, window, or exception.
6. For every claim in the body, identify direct supporting evidence. Keep asset names and excerpts in `resource_refs`, `evidence`, and `recommendation_reason`; keep reusable business knowledge in `content`.
7. Compare candidates by resulting Agent behavior. Merge candidates that lead to the same interpretation and execution; split candidates that answer independently searchable questions.
8. Run a counterexample pass: inspect minority definitions and assets that may violate the proposed rule. Narrow or drop unsupported conclusions.
9. Before wording candidates, form evidence-backed problem frames and assign asset roles. Use `query-routing-v5.md`; do not optimize for candidate count or one-candidate-per-asset coverage.
10. Keep a decision ledger for discovered problem frames, including routed, shortcut, playbook, definition-only, and evidence-insufficient dispositions.

## Anti-Overfitting Rule

- Never encode a customer, project name, project ID, asset ID, expected topic title, expected candidate title, or expected candidate count in this skill or CLI generation code.
- Never start from a fixed industry taxonomy or keyword dictionary. Keywords may locate evidence only after a semantic family is discovered; they must not determine the result.
- A test package is an evaluation sample, not a source of reusable rules. Tune the protocol only when the change is defensible across unrelated domains.
- Quality is measured by evidence support and changed Agent behavior, not by matching a previously approved list of topics.

## User-Facing Recommendation Display

When showing CLI recommendation results to a user, never flatten candidates into a single numbered list. The user-facing answer must use the same hierarchy as the candidate JSON and frontend review UI:

```text
Project semantic recommendation scan completed

Summary:
- Topic domains: <N>
- Candidate semantics: <N>
- Validation: passed | failed

Topic domain: <topic_domain_title> (<candidate_count> semantics)
- [<semantic_type>] <candidate title>
  <one-sentence summary>
  Evidence: <asset title 1>, <asset title 2>, ...
```

Rules:

- Show topic domains first, then candidates under each domain.
- Include each domain's semantic count.
- Include each candidate's semantic type, title, short summary, and primary evidence asset titles.
- If the CLI command returns `topic_groups`, use that field directly for the display order and counts.
- Keep the full JSON path or submit command separate from the human summary.
- Do not present a flat list like `1. semantic A 2. semantic B ...` unless the user explicitly asks for raw candidate order.

## Output Discipline

When reporting recommendation results, include:

- commands run;
- asset scope, exported/authenticated/unauthenticated asset counts, and snapshot hash;
- topic domains, semantic counts per domain, and candidate titles grouped under each domain;
- evidence assets per candidate;
- quality warnings, if any;
- problem-frame coverage and rejected shallow-opportunity warnings;
- submit/review/release IDs after writes.
