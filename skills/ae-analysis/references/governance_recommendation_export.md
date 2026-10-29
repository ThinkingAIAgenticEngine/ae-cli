# analysis-meta governance-recommendation export

Requires `project_semantic_enable=on` for the target project. If export returns `PROJECT_SEMANTIC_DISABLED`, report that this project must enable `project_semantic_enable` and stop this workflow. Do not bypass the disabled entry point with other export, metadata, or capability commands.

Use this as the required entry point for CLI Agent asset-authentication and metric-recommendation review.

This command returns one evidence packet seeded from eligible shared dashboards and their reports, ordered by available heat and then recent activity. For normal page-review submission, `--limit 20` is the initial candidate pool; use the bounded expansion procedure below when filtering leaves insufficient candidates. After the command returns, the Agent must transform the returned `work_units` into business-domain review groups before answering. `work_units` are evidence containers, not final answer sections and not an excuse to drop eligible dashboards.

Do not use certification-state management commands as a substitute for this recommendation evidence packet.
Do not load project semantics, project KB, or personal semantic preferences before this command. The recommendation packet is the prerequisite evidence for this review workflow.

Hard output gate: a final answer is invalid if it is grouped by asset type, backend array order, raw `work_units`, source dashboard, source report, or separate top-level asset and metric sections. The final answer must follow the fixed business-domain review display below.

## Intent Routing

There are three separate user intents. Do not merge them.

- Recommendation only: call `analysis-meta governance-recommendation export`, present the evidence-backed recommendations, and stop. Do not check the automatic certification project config, do not submit to the review page, and do not certify assets.
- Recommendation plus page submission: call `analysis-meta governance-recommendation export`, build the review material, then call `analysis-meta agent-review submit-to-page` only after that submission intent is explicit. Do not check the automatic certification project config and do not certify assets.
- Automatic review or automatic certification: call `analysis-meta governance-recommendation auto-review`. This command validates both `agent_auto_asset_certification_enabled` and `project_semantic_enable` before collecting recommendations. If it returns `PROJECT_AUTO_CERTIFICATION_DISABLED` or `PROJECT_SEMANTIC_DISABLED`, tell the user which project config is disabled and stop. Do not fall back to page submission or ordinary approval commands.

`analysis-meta governance-recommendation auto-review` only certifies eligible asset candidates from its current recommendation batch. When `--limit` is omitted, the CLI mirrors the recurring page-review bounded expansion flow by read-only probing top-20/top-50/top-100 pending material, then the CLI Agent builds one automatic decision set from the final selected material and submits it for execution/audit. It does not create recommended metrics. Assets that return `decision:"SKIP"` remain for manual review and must not be described as certified. Automatic decision rows must provide reviewer-readable reasons; semantic-duplicate skips must name concrete conflicting asset targets. Keep raw source/rule traces only in debug output, and preserve the returned `auto_review_expansion` when reporting or auditing the result. If the user later asks to submit the remaining uncertified assets to the page, use `manual_review_handoff` from the auto-review result rather than drafting a fresh all-candidate page batch.

Command:

```bash
ae-cli analysis-meta governance-recommendation export --project-id <project_id> --limit 20
```

Capability id: `metadata.governance_recommendation.export`.

Input sends `project_id`, optional `window_days`, optional `limit`, and optional `include_completed`.

Output includes `schema_version`, `run_id`, `project_id`, `snapshot_hash`, `work_units`, `coverage`, `stat_scopes`, and `agent_presentation_contract`.

## Tracked page-recommendation lifecycle

For page-review recommendations, including sidebar, scheduled and external Agent runs, start with `export --project-id <id> --limit 20 --track-run true`. This requires the matching Common service release. A tracked export starts the project run only when the server accepts actual work; filling a prompt never starts it. Legacy exports without this optional flag retain their original behavior.

- Preserve `run_id`. Expansion to top-50/top-100 must pass `--track-run true --run-id <same_run_id>`; do not start another run. The server rejects competing project runs.
- During Agent interpretation, call `analysis-meta governance-recommendation run-update --project-id <id> --run-id <id> --status HEARTBEAT` at least every five minutes. A fifteen-minute lost lease becomes `TIMED_OUT`; do not resume an expired run.
- Submit the final packet with `source_run_id` equal to the tracked `run_id`. Successful page submission finishes the run with its exact `batch_id` automatically.
- An export with `run_status: SUCCEEDED` has no actionable candidates and is already complete; do not heartbeat or submit it. If later Agent filtering leaves no new recommendation, finish with `--status SUCCEEDED` and report the empty result. If interpretation fails, finish with `--status FAILED --reason <short_non_sensitive_reason>`; use `CANCELLED` only once actual execution has stopped. This command records a terminal state; it does not cancel an executing Agent.
- Terminal states release project occupancy. Never claim success merely because export finished, and never include credentials or raw tool logs in a reason.
- `RECOMMENDATION_RUNNING` means another run owns this project. Do not bypass it with an untracked export. Query `metadata.governance_recommendation.run_status` through capability discovery if diagnosis is needed.

## Customer/Agent Material Package Contract

Ordinary recommendations use concise purpose, recommendation basis, core report meaning and known material risks. Page preparation or a local rehearsal uses [focused preflight](agent_review_preflight.md#focused-recommendation-review-default); recommendation-only display does not require a separate full audit. Preserve full source snapshots even when the authored explanation is short. Interpret only selected assets and their necessary grouping/dependency evidence; scripts can account for overflow without an Agent narrative for each unselected candidate.

Read [priorities and definition comparisons](agent_review_priorities_comparisons.md) only for requested ranking, concrete comparison/conflict clues or an explicit full audit. Ordinary items do not need priority grades or comparison-coverage records. Export ranking and `conflict_risks` are inputs; a related asset is not automatically a conflicting definition. Unknown or unexamined conflict scope must never be reported as fully checked.

- This command requires a numeric `--project-id`. If the user provides only a project name, resolve the project on the same host with `ae-cli project info list` before export.
- `run_id`, `snapshot_hash`, and `review_material_package` are the handoff package for Agent review drafting.
- `review_material_package` should contain candidate assets, heat evidence, source links, evidence links, dashboard/report/metadata relations, report definitions, AI-model definitions, `target_revision`, and hashes needed to draft a page review.
- The Agent must generate the downstream `agent-review submit-to-page` draft from this package: batch `ai_summary`, `presentation_snapshot`, per-item `ai_summary` / recommendation reasons, copied `evidence_snapshot`, copied source links, and relations.
- `work_units` are deterministic Common evidence containers. They are not the final page grouping. The Agent clusters selected assets into business domains and business subtopics for review. Apply [Business Topics and Subtopics](agent_review_submit_to_page.md#business-topics-and-subtopics) to both levels; a source dashboard is not a default subtopic.
- For report and SQL-report items, use `review_material_package.candidate_assets[].evidence_snapshot.analysis` first. Call `analysis-meta agent-review evidence` only when the package marks a definition/analysis gap or when validating a generated draft.

<a id="rejection-filtering-and-bounded-expansion"></a>

## Current Candidates and Bounded Expansion

Manual recommendation selects assets that currently need certification, by business value and current evidence. Do not query review history to select candidates. Earlier recommendations, pending reviews, rejection or deferral do not exclude an otherwise eligible uncertified asset. Historical fields returned in the packet remain audit context; they do not define manual recommendation eligibility. Automatic certification retains its separate explicit intent and safety rules.

1. Start with `--limit 20`, unless the user explicitly requests another scope. Keep the same host, project, time window and completed-context setting throughout expansion.
2. Treat current `authentication_status:0` assets as pending review work. Use current certification facts in the asset or `evidence_snapshot.asset`; do not use historical `action_state`, `actionable`, or `previous_decision` as a substitute for current certification. Unknown certification or missing definition evidence is an evidence gap, not proof of eligibility. Authenticated assets are context only.
3. Deduplicate shared assets by full scoped identity within this packet and preserve source evidence, links and known relations. Do not remove dashboard branches because they appeared in an earlier recommendation.
4. Assess current candidates and business breadth. If there are fewer than about 10 pending review assets or fewer than 3 pending business domains and more dashboards exist, re-export with `--limit 50`, then use `--limit 100` if still insufficient. The pools are cumulative, not pages. Replace the earlier drafting packet with the latest successful export; never mix run IDs, hashes, revisions or snapshots.
5. Apply the daily review capacity after expansion: target about 20-50 pending review assets, hard cap around 80, across roughly 3-6 visible business domains. Rank by impact_degree, heat_count90d, user_count90d and dependency breadth. Use per-domain quotas before adding many assets from one domain.
6. Stop when candidates and domain coverage are sufficient, the pool is exhausted, or the top 100 have been inspected. Record overflow counts and domains for later batches. Do not fill a quota with weak or unsupported candidates. An export failure is an execution failure, not evidence of scarcity; do not expand because of an error or use stale material.
7. Build visible domains only when they contain selected pending work. Retain authenticated assets only as direct supporting context. Do not display or submit a zero-pending business domain as standalone work.
8. Submit the current material once when authorized. A new recommendation may include previously recommended assets. Reuse the same client request key and exact payload only when replaying the same submission after a network failure; a deliberate new submission uses a new key. Read back the returned batch rather than searching old batches to change the candidate set.

Report the final requested limit, actual dashboards returned, dashboards represented in the selected packet, visible pending-domain count, selected pending asset count, context count, overflow summary and stopping reason. Do not describe a selected slice as covering all top-N dashboards. Historical recommendation counts are not part of eligibility or the required scope report.

## Decision Rules

- Use this command before presenting recommendations for certification or metrics.
- After export, always build the business-domain review display before answering. The command output is evidence, not the response format.
- For real review-page submission, apply Current Candidates and Bounded Expansion before grouping. Include eligible assets across the retained dashboard branches; do not compress them into a few representative themes or submit only the first hot dashboard or first `work_unit`. A smaller batch is valid when the evidence supports fewer eligible candidates or the user explicitly requests a sample or diagnostic batch. Explain the actual scope and omissions.
- For recurring recommendation jobs, the default reviewer workspace is pending-first: only business domains with pending review assets are visible. Authenticated/completed assets remain available as relation/context rows under those domains, but they must not create a visible topic by themselves.
- Treat `业务主题域` as a semantic cluster over the selected dashboards, not a copy of the dashboard list. Do not create one topic per hot dashboard just because `--limit 20` returned 20 work units. Merge dashboards into the same topic when their child reports, referenced metadata, metrics, folder context, or authored notes describe the same business process. Split only when the business meaning or review decision is materially different. A result where `topic_count == selected_dashboard_count` requires explicit evidence that every selected dashboard has a distinct business domain.
- Do not call project-semantic, project-KB, or personal-semantic-preference commands as prerequisite context for this workflow.
- Treat `work_units` as deterministic Common evidence. The CLI Agent owns business-domain grouping, Chinese explanations, and approval interaction.
- Agent display is mandatory whenever the user asks to see or review recommended certification assets or recommended metrics. Do not hand back raw JSON as the final answer.
- Show recommendations by business theme/domain, not by flat asset type, backend array order, raw dashboard title, or workflow/test label.
- Preserve `run_id`, `snapshot_hash`, `evidence_hash`, `candidate_key`, and `definition_signature` for later submit.
- Preserve optional dashboard `space_id` / `space_name` when Common returns them. They are review-page location facts, not eligibility requirements; absence is valid because not every dashboard has an owning space.
- Keep completed/authenticated context included by default so certified and uncertified assets from the returned evidence appear together under the same business domain. Pass `--include-completed false` only when the user explicitly asks for a pending-only review.
- If this capability is missing on the target host, report the deployment/catalog gap. Do not synthesize a recommendation from ordinary asset-authentication or metric list commands.

## Incomplete Usage and Lineage

The export may fall back from the requested materialized usage window to Poseidon heat (only for a 90-day request), then to recent activity/update ordering when neither statistic is available. Read `coverage.usage_window_state`, `selection_mode`, and each asset's `heat_source`. Missing statistics and lineage are evidence gaps, not proof of an empty project or a permission failure. Never replace null/unknown users, heat or impact with a factual zero; do not add counts from different sources or claim a Poseidon window anchor that is not exposed. Zero is an observed value and must not be overwritten with older heat. Report the actual returned coverage scope rather than describing all fallback candidates as hot assets. These candidates are for evidence-based manual review, not relaxed automatic certification.

The export marker covers the active request only and is released after success (including empty results) or failure. Do not assume it reserves a project throughout Agent drafting; page submission uses its own idempotency and revision checks.

Each newly authored topic includes optional transport field `semantic_basis: {business_question, grouping_reason, evidence_item_ids}`. Write these explanations from report/event/property/metric definitions and reference items displayed in that topic. The independent preflight must review all topic bases and grouping decisions; CLI/Common only validate nonempty structure and scoped references. Legacy packets without this field remain readable/submittable. Never generate topic business meaning by script templates.

## Agent Approval Display

This is an Agent presentation contract, not a CLI flag and not a Common renderer. Use the basic fields returned by Common to produce exactly one review shape:

- The top-level grouping must be `业务主题域`. Do not split the final answer into separate top-level sections such as `资产认证建议` and `推荐指标`.
- Aggregate by `业务主题域` with each source dashboard as the core evidence package for coverage, not as the business-domain name. Infer each domain from the dashboard semantics plus the business meaning of `topic_seed`, `source_reports`, asset names, metric names, and semantic definitions. The final group name should describe the business area or process, such as payment/revenue, login/channel, retention, item economy, or lifecycle, not the backend work-unit label. This grouping is for review comprehension only; it must not reduce the retained dashboard set after current-state selection and bounded expansion.
- The expected page hierarchy is `业务域 -> 业务小主题 -> 看板 -> 报表 -> 元数据`. Put source dashboards answering the same specific business question under one subtopic within their broader domain. Neither grouping level is the dashboard node; the dashboard remains an asset row inside a subtopic. Review one-group-per-dashboard layouts for missed business merges rather than accepting renamed dashboard containers.
- Treat `work_units` as evidence containers, not presentation groups. One dashboard/work unit can split into multiple business domains when its child reports cover different business processes; one business domain can merge rows from multiple dashboards/work units when the evidence describes the same business process.
- Keep each report-centered evidence chain together: the report row, metadata rows, and metric candidates introduced by that report follow the same `业务主题域`. Do not detach report metadata into a separate generic metadata group, and do not merge unrelated child-report domains only because they share one source dashboard.
- When one source dashboard contains child reports for different business questions, create one `业务主题域` per child-report business question. Do not combine distinct report domains into a broad `A 与 B 运营`, `综合运营`, or `核心语义` group only because they share the same dashboard. The dashboard can appear as shared linked source evidence in each relevant domain.
- Treat source dashboards and reports as evidence containers and possible asset rows, not independent top-level business domains. Never create a generic business-domain group only to place source dashboards, such as `看板上下文`, `综合验收看板上下文`, `推荐上下文`, or `待审批资产`. Attach each source dashboard to the business domains implied by its child reports, events, properties, metrics, and definitions. If the same dashboard supports multiple domains, reuse it as linked source evidence in each relevant domain without using the dashboard title as the domain or double-counting it in the overview.
- Do not expose source-only labels as group names. Strip or ignore prefixes such as acceptance versions, priority markers, asset-type markers, report IDs, dashboard IDs, route names, and test/workflow labels when they do not carry business meaning. If the evidence is too generic to infer a real domain, use `待确认业务主题` and explain the uncertainty from the source evidence.
- Inside each `业务主题域`, show both asset-authentication candidates and metric candidates together so a reviewer can approve the whole business topic instead of isolated rows. For asset rows, keep returned `[已认证]` and `[未认证]` rows in the same domain table when both states are present.
- Use plain-text review labels only: `[已认证]`, `[未认证]`, `[已有指标资产]`, `[推荐指标候选]`, `[认证资产候选]`, `[风险/冲突]`. Agent text cannot rely on color rendering, HTML, font tags, or color names.
- In the domain detail table, the `类型` column is the object class (`资产` or `指标`). Put review labels in `状态` or `审批关注点`, not as the `类型` value.
- The conclusion must explain the recommendation scope: by default this is a full business-topic context for the selected hot-dashboard evidence and includes completed/authenticated context. If the visible asset rows contain only one certification state, say this is what the current returned evidence contains; do not imply an Agent-side pending-only filter or proof that the whole project has no other certified assets.
- Show asset names, not raw IDs, as the main object text. When an asset row has `markdown_link`, use that Markdown link as the object text. When only `raw_url` is present, link `display_name` or `resource_key` to that URL. If no link is available, show the best human name and omit the raw ID unless the name is missing.
- In the `来源证据` column, first use each asset row's `source_evidence[].markdown_link`/`raw_url`; for metric rows, use `source_report.markdown_link`/`raw_url`. Fall back to the work unit's `source_dashboard` or `source_reports` links only when the row has no direct `source_evidence`. Do not strip links from source evidence when the JSON provides them, and do not replace linked sources with unlinked generic text such as `相关报表`, `热门看板`, `来源看板`, `同名看板`, `同名报表`, `<业务>相关报表`, or bare report names. If the asset row itself is the source dashboard or source report, reuse that row's own link as the source evidence. If multiple linked sources support one row, show the most direct source link or a compact comma-separated list of source links.
- Do not expose raw `resource_key`, dashboard/report ID, `candidate_key`, `definition_signature`, or `evidence_hash` in the main review table. Preserve them from the JSON for later submit, and show them only in a compact technical payload if the user asks to approve or debug.
- Show available decision signals from the returned data, especially `heat_count90d`, `user_count90d`, and `impact_degree`. Do not invent values; if a signal is absent, mark it as `-` or omit that part of the signal.
- Convert `recommendation_reason` and `conflict_risks` into concise Chinese explanations. Do not expose internal enum codes as the main display text; keep codes only as supporting identifiers when needed for debugging.
- Risk/conflict text is required for semantic conflicts, identity conflicts, previous rejection of the same evidence, non-actionable items, or mismatch between an existing metric asset and a recommended metric candidate.
- Keep enough identifiers for action in the working context: `run_id`, `snapshot_hash`, item identity, `evidence_hash` for asset candidates, and `candidate_key` plus `definition_signature` for metric candidates.
- For metric candidates, state that approval still needs a metric name and business definition/口径 before creation when those fields are missing.
- If there are no visible work units, say there are no pending recommendation-review items under the current filters; do not fall back to management lists.
- Do not spend Agent narrative budget on hidden topics or pure authenticated context. Generate batch/domain/item summaries for the final visible domains and pending review assets; for context-only rows, preserve source links, heat/user/impact signals, evidence snapshots, and relations without long new summaries unless that context is directly needed to explain a pending item.

Use this fixed review skeleton:

1. One conclusion sentence with project, window, run_id, visible business-domain count, candidate counts, whether completed/authenticated context is included, and whether any risk/conflict exists.
2. A `业务主题域总览` table with columns `业务主题域`, `审批建议`, `认证资产`, `推荐指标`, `风险/冲突`.
3. One section per `业务主题域`, with a single table whose columns are `类型`, `状态`, `对象/指标`, `热度/影响`, `来源证据`, `审批关注点`. Asset rows and metric rows must appear in the same table for that domain.
4. A final `提交信息` line with `run_id` and `snapshot_hash`. Do not show raw JSON.

## Related Commands

- `analysis-meta agent-review submit-to-page` submits existing-asset proposals for review after user choice or preauthorized submission-only task intent; it does not approve or certify. Read `agent_review_submit_to_page.md` for deduplication and unattended-task rules.
- `analysis-meta governance-recommendation auto-review` automatically certifies only eligible recommended asset candidates when the user explicitly asks for automatic review/certification and the project switches are enabled. Without an explicit `--limit`, it performs CLI-side bounded expansion and writes only once. Read `governance_recommendation_auto_review.md`.
- `analysis-meta governance-recommendation submit`
- `analysis-meta governance-recommendation decisions`
- `analysis-meta asset-authentication list` only inspects certification state and is not the recommendation workflow.
