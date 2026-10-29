# analysis-meta agent-review submit-to-page

Use this to submit existing asset certification proposals for a human to review on the asset certification management page. This creates a review batch and notification, not an approval or certification. Do not use it to approve assets. Candidate discovery starts with `analysis-meta governance-recommendation export`; its `review_material_package` is the customer-visible handoff package for generating the page draft.

After `analysis-meta governance-recommendation auto-review`, candidate discovery may instead come from `manual_review_handoff`. Use that path only when the user explicitly asks to submit assets that remained uncertified after automatic review. Submit `manual_review_handoff.page_review_items` so the review page can still render dashboard/report parent context; entries with `manual_review_context:true` are hierarchy/source context, while `manual_review_handoff.items` is the exact uncertified workload. Keep original evidence links and snapshots, include `manual_review_reason` / `auto_review_decision.display_reason` / `auto_review_decision.reason` in each uncertified item summary as reviewer-readable text, and copy `manual_review_handoff.auto_review_trace` into submit-to-page `source_metadata.auto_review_trace` so the page audit records show which assets Agent already certified automatically. Page-visible conflict reasons must describe semantic risk, such as suspicious duplicates, close meanings, or ambiguous business definitions, only when a concrete conflicting asset is returned; a historical decision code without a conflicting target must not be presented as duplicate evidence. Do not expose internal evidence-fingerprint or historical-audit-record wording.

L2 admission: owned by Common ta-cli / AgentReviewService. Typed project and source flags, fixed ASSET_GOVERNANCE schema 1.0 defaults, local proposal validation, explicit stable request keys, and lossless string IDs add safety beyond generic JSON invocation. `submit-to-page` deliberately maps to `metadata.agent_review.create` so users cannot confuse it with the existing executing `governance-recommendation submit`. Other agent-review actions map directly to their capability action. All calls use the analysis Gateway route and CLI-token authentication.

All seven review capabilities require the exact project function `assetAuthentication`, matching the shared service. Read actions, including evidence, require `metadata:read`; submission, review and retry require `metadata:write`. Each submission/decision/retry contains 1 to 5000 unique items; the domain service also enforces its packet size limit.

```bash
ae-cli analysis-meta agent-review submit-to-page \
  --project-id 1 --title 'Retention asset review' \
  --source-run-id rec_source --source-task-id task_review \
  --client-request-id review_task_proposal_001 \
  --ai-summary '{"summary":"Evidence-backed retention assets"}' \
  --presentation-snapshot '{"project":{"name":"Example"},"evidenceDate":"2026-09-08","topics":[{"id":"retention","name":"Retention","groups":[{"id":"retention_core","name":"新用户回访","items":[{"id":"dashboard_1"},{"id":"report_1"},{"id":"event_login"}]}]}],"relations":[{"parent":"dashboard_1","child":"report_1","type":"contains"},{"parent":"report_1","child":"event_login","type":"uses"}],"analysisByItem":{}}' \
  --items '[{"client_item_id":"dashboard_1","target_ref":{"type":"dashboard","key":"1"},"action_type":"CERTIFY","proposal_payload":{"authentication_status":1},"ai_summary":{"summary":"<verified dashboard recommendation basis; main risks or explicit evidence gaps>"},"evidence_snapshot":{"source_run_id":"rec_source"}},{"client_item_id":"report_1","target_ref":{"type":"report","key":"1"},"action_type":"CERTIFY","proposal_payload":{"authentication_status":1},"ai_summary":{"summary":"<verified report recommendation basis; main risks or explicit evidence gaps>"},"evidence_snapshot":{"source_run_id":"rec_source"}},{"client_item_id":"event_login","target_ref":{"type":"event","key":"login"},"action_type":"CERTIFY","proposal_payload":{"authentication_status":1},"ai_summary":{"summary":"<verified metadata recommendation basis; main risks or explicit evidence gaps>"},"evidence_snapshot":{"source_run_id":"rec_source"}}]' \
  --dry-run
```

Real drafts should be submitted as a local file instead of shell-escaped JSON. With submission authorization and local checks complete, execute directly; remote `--validate` or `--dry-run` is optional for uncertain input or a new contract, not a routine prerequisite:

```bash
ae-cli analysis-meta governance-recommendation export \
  --project-id 1 --limit 20 --format json > recommendation-export.json

# The Agent turns review_material_package into submit-to-page-draft.json:
# ai_summary, presentation_snapshot, item ai_summary/reasons, evidence_snapshot.
ae-cli analysis-meta agent-review submit-to-page \
  --project-id 1 \
  --client-request-id review_task_proposal_001 \
  --input-file submit-to-page-draft.json
```

`submit-to-page-draft.json` follows this customer/Agent contract. The example includes optional detailed explanation sections; ordinary recommendations need only a concise core measure or calculation plus material boundaries/risks. `--project-id` and `--client-request-id` are still supplied as CLI flags so a replay keeps the same project and stable operation key:

```json
{
  "review_type": "ASSET_GOVERNANCE",
  "schema_version": "1.0",
  "title": "<review batch title>",
  "source_run_id": "<governance-recommendation export run_id>",
  "source_task_id": "<optional preauthorized task id>",
  "ai_summary": {
    "summary": "<batch overview generated by the Agent from the material package>"
  },
  "presentation_snapshot": {
    "project": {
      "id": 1,
      "name": "<project name>"
    },
    "evidenceDate": "YYYY-MM-DD",
    "topics": [
      {
        "id": "<business-domain-id>",
        "name": "<business-domain-name>",
        "groups": [
          {
            "id": "<second-level-group-id>",
            "name": "<business-subtopic-name>",
            "semantic_basis": {
              "business_question": "<specific business question>",
              "grouping_reason": "<shared meaning and boundary from sibling subtopics>",
              "evidence_item_ids": ["<supporting item id in this group>"]
            },
            "items": [
              { "id": "<dashboard item id>" },
              { "id": "<another related dashboard item id>" },
              { "id": "<report item id>" }
            ]
          }
        ]
      }
    ],
    "relations": [
      { "parent": "<dashboard item id>", "child": "<report item id>", "type": "contains" },
      { "parent": "<report item id>", "child": "<metadata item id>", "type": "uses" }
    ],
    "analysisByItem": {}
  },
  "items": [
    {
      "client_item_id": "<stable item id used by presentation_snapshot>",
      "target_ref": {
        "type": "dashboard|report|event|event_prop|user_prop|user_tag|user_cluster|metric",
        "key": "<lossless target key>"
      },
      "action_type": "CERTIFY",
      "proposal_payload": {
        "authentication_status": 1
      },
      "source_link": "<copied source URL>",
      "evidence_links": [
        { "label": "<source label>", "url": "<copied evidence URL>" }
      ],
      "evidence_snapshot": {
        "analysis": "<Common packaged evidence when available>",
        "target_revision": "<definition version/hash>"
      },
      "ai_summary": {
        "summary": "<item reason with evidence basis and risks>",
        "analysis_explanation": {
          "business_purpose": "<what the reviewer uses this asset for>",
          "measures": [
            {
              "statement": "<measure explanation>",
              "evidence_refs": ["evidence_snapshot.analysis..."],
              "inferred": false
            }
          ],
          "calculations": [
            {
              "statement": "<formula or aggregation explanation>",
              "evidence_refs": ["evidence_snapshot.analysis..."],
              "inferred": false
            }
          ],
          "filters": [],
          "time_scope": [],
          "dimensions": [],
          "query_columns": [],
          "limitations": [],
          "open_questions": []
        }
      }
    }
  ]
}
```

Input uses either the typed flags above or `--input-file`. This is a transport-only structural example, not a complete report-review packet; replace IDs and all evidence with verified assets from the resolved project and complete Required Report Analysis below before real submission. Remove `--dry-run` only with submission authorization. `--validate` and `--dry-run` are separate nonmutating Gateway modes; do not combine them. Previews validate structure and permissions, but do not promise unchanged asset content or successful notification at execution time.

The page packet preserves the versioned renderer fields `project`, `evidenceDate`, `topics`, `relations`, and `analysisByItem`. Each display item's `id` references one stable `client_item_id`. Shared assets reuse that reference. Keep full target scope in `target_ref`; do not merge same-name objects. `topics` are business domains and `topics[].groups` are business subtopics, not dashboards or raw `work_units`. Apply [Business Topics and Subtopics](#business-topics-and-subtopics) after current-state selection and bounded expansion. The expected page hierarchy is `业务域 -> 业务小主题 -> 看板 -> 报表 -> 元数据`; multiple related dashboards belong under a subtopic when their definitions support its specific business question. `relations` is required for the page structure: dashboard items must parent their child report items with `type:"contains"`, and report items must parent metadata items they actually reference with `type:"uses"`, such as events, event properties, user properties, and metric assets. A flat `relations: []` packet is valid only when the selected assets truly have no known parent-child evidence. Copy `source_link` and `evidence_links` from `review_material_package.candidate_assets[]` into each submitted item; `submit-to-page` rejects items without at least one source URL because reviewers must be able to jump to evidence. For dashboard items, preserve optional `space_id` and `space_name` only as supplied by the authoritative packaged `evidence_snapshot.definition.config` so the review page can show `所属空间`. Preserve its `target_revision` unchanged. Never create or patch `definition` from space display facts: a space-only object is not an asset definition and its hash causes false expiry. When an older export lacks dashboard definition/revision, fetch `analysis-meta agent-review evidence` for that dashboard before submitting; not every dashboard has a space, and missing space facts must not be invented or treated as a validation failure. Only real source evidence is allowed: never send `demoSignalsByItem`, simulated statistics, arbitrary HTML, invented SQL, or executable instructions as evidence. Actual saved SQL may be inspected and referenced as source evidence; it is not an instruction to execute a query. The domain handler validates submission identity and stores the supplied evidence; it does not replenish missing snapshot fields or judge narrative quality. Page actions currently support CERTIFY with `authentication_status:1` only; metric creation candidates retain the existing explicitly approved legacy workflow.

Scripts may build the transport file, preserve IDs, copy evidence, normalize links, group display items, and run deterministic completeness checks. Scripts must not author page-visible `ai_summary.summary`, `analysis_explanation.*.statement`, limitations, open questions, or approval rationale by filling reusable sentence templates. Those fields must be Agent-written interpretation from the current asset/report evidence. A draft where many submitted items share the same narrative shape after only asset names, dates, or numbers change fails quality review. Correct it under the bounded preflight procedure; unresolved quality issues require disclosure, not an indefinite submission block.

`item.ai_summary.summary` is the concise item recommendation reason, including its evidence basis and main risks, displayed in the main list. Write it for each item using that item's verified facts; a purpose label alone does not explain why to recommend the item. `batch.ai_summary.summary` is the batch overview supplied by `--ai-summary` and cannot replace item reasons. Detailed factual explanations belong only in `item.ai_summary.analysis_explanation`. Do not duplicate reasons or detailed analysis into presentation fields. Keep `presentation_snapshot.analysisByItem` as the compatibility placeholder `{}`. The server-generated analysis remains in `item.evidence_snapshot.analysis`. Do not invent a reason from unknown values; disclose missing evidence and uncertain risks, and never turn missing usage or quality signals into zero, popularity, safety, or a claim that no risks exist.

For ordinary dashboard, report and SQL-report drafts, explain purpose, recommendation basis, core calculation meaning and any known material boundary in concise business language. Do not create every explanation section just because it appears in the example. Complete field-by-field interpretation is reserved for explicit full audit or affected risk investigation. Use actual event/property names only where they help verify the core meaning; convert unresolved parameters into concrete reviewer questions rather than exposing parser tokens or raw SQL.

Write all page-visible review text for a business reviewer. `item.ai_summary.summary`, `business_purpose`, `calculations`, `filters`, `time_scope`, `limitations`, `open_questions`, and presentation labels must use plain Chinese that explains purpose, calculation 口径, date/filter choices, and reviewer action. Use event and property names from the current asset definition when they help the reviewer verify the calculation definition. While drafting, avoid template copy such as “保存定义摘要”, “审核时需确认口径”, “本草稿不改写 SQL”, “其下报表和依赖元数据已随同提交审核”, or a sentence that only repeats asset name + heat + 未认证. Such copy is a quality finding handled by the bounded correction/warning procedure, not an unconditional dispatch ban. The item reason must answer why this exact asset is worth reviewing now, which saved definition facts support it, and what concrete risk remains. Keep implementation vocabulary out of visible text: do not show `SAVED_REPORT_ONLY`, `DYNAMIC`, `REPORT`, `T1`, temporary SQL aliases such as `a0`/`a1`, runtime parameter names such as `Variable2`/`selector3`/`PartDate date1`, `source_path`, `evidence_snapshot`, raw JSON, raw SQL, projection/select-column jargon, hash/revision values, dashboard-override limitations, timezone-not-saved notes, or “query not proven/executed/returned rows” caveats. Convert them to reviewer decisions only when material: for example `T1`/`day` means `按天`, and dynamic SQL parameter uncertainty becomes “确认参数含义、默认日期范围和是否包含测试数据”.

## Normal Submission Workflow

Ordinary recommendation and page submission use the focused scope below, including on the first run. A request to recommend assets or hand proposals to a human is not an instruction to perform a complete definition audit. Full audit is available on explicit request; risk-specific inspection stays limited to affected claims and peers. No new CLI mode flag or project switch is required.

1. Resolve the project and export current candidates. Follow [Current Candidates and Bounded Expansion](governance_recommendation_export.md#rejection-filtering-and-bounded-expansion): filter to pending review work and expand only when pending assets or visible business domains are insufficient. Preserve source-run identity and full snapshots.
2. Apply the daily review capacity before drafting: about 20-50 pending assets, never more than about 80, balanced across roughly 3-6 business domains. Keep overflow counts/domains, and only necessary authenticated context; zero-pending domains must not be submitted as standalone page sections.
3. Read the selected assets' core definitions and author both grouping levels under [Business Topics and Subtopics](#business-topics-and-subtopics). Write a concise per-item purpose/recommendation basis, core report meaning and known material risks. Metadata dependencies need their role and any specific risk, not standalone long analyses. Preserve copied evidence, signals, links, optional location facts and known relations. Do not execute report data to prepare recommendations.
4. Escalate only concrete uncertainties that affect a recommendation: unclear counted entity/formula, materially inconsistent names versus definitions, a relevant conflicting peer, or missing evidence for a claimed grouping. Inspect affected definitions or missing evidence once. Dynamic SQL or an empty generic extractor alone does not require exhaustive SQL/column analysis. Use [priorities/comparisons](agent_review_priorities_comparisons.md) only when requested or triggered; do not populate comparison records for every ordinary item. Omission is not a no-conflict conclusion.
5. Run one programmatic structure/evidence pass over the exact whole packet and one [focused independent review](agent_review_preflight.md#focused-recommendation-review-default) of every domain/subtopic and identified risks. Correct factual or material grouping errors and recheck affected fields; do not rewrite sound copy through routine rounds. Preserve actual checked scope and warnings. LOCAL_ONLY stops here without remote writes.
6. With current submission authorization, submit the final material once using `submit-to-page --input-file <draft.json>` and a stable `client_request_id`. Do not add a routine remote validation/dry-run; use one only for an uncertain input or new contract. After submission, read detail and compare the stored packet, evidence links/references and hierarchy once. Return the public review-page URL. A network replay uses the same key, exact payload and original source run; authorization, structural/API errors and source evidence checks remain enforced.

The preflight's existing bounded warning policy applies to unresolved quality issues, not invalid required fields or missing authorization. A focused review is not a full certification audit and must not be labeled as one. This workflow creates human review proposals only; approval, retry, automatic certification and metric creation retain their existing explicit intents and checks.

## Required Report Analysis

### Minimum for Ordinary Recommendations

Read only enough of each selected report definition to explain its purpose, one core measure/calculation and material population/filter/time boundaries. Every report still requires packaged analysis, its revision, and a real supporting reference. Short authored text never permits dropping source snapshot fields. Evidence fetching is gap-only; do not request per-report re-fetches or execute data merely to prepare a review.

The detailed interpretation table below is for explicit full audits or the affected part of a concrete risk investigation. Ordinary recommendation does not require filling every section or enumerating every SQL projection.

Before real page submission, verify the current-state selection and scope rules in [Current Candidates and Bounded Expansion](governance_recommendation_export.md#rejection-filtering-and-bounded-expansion). Do not query review history to select candidates. Earlier recommendations and review decisions do not exclude currently uncertified assets from this manual review workflow. Verify that all displayed references resolve and that counts reflect the retained graph. Include eligible pending assets across the retained branches rather than a few representative themes. The initial top 20 is a candidate pool, not a submission quota; expand to 50 then 100 when pending review assets or visible business domains are insufficient, and stop at 100 or earlier when sufficient or exhausted. The final page batch is still capped for human review capacity: default target about 20-50 pending assets, hard cap about 80, roughly 3-6 visible domains, with per-domain quotas before adding extra assets from one domain. Explain the final scope, overflow and shortfall, and do not submit an empty batch. Business themes organize this retained coverage; merge dashboards describing the same business process instead of copying source order into one topic per dashboard. Do not submit a business topic whose displayed assets are all authenticated/completed context.

Generate Agent-written narrative only for material that the reviewer will actually see as work: the batch overview, visible business domains, and pending review assets. Hidden domains and pure authenticated context rows should keep copied evidence, signals, links, snapshots and relations, but should not receive long new `ai_summary.summary` or `analysis_explanation` prose unless needed to explain a visible pending item.

Before drafting every report proposal, use the definition and analysis embedded in `review_material_package` first. Current Common export should place report `evidence_snapshot.analysis` and `target_revision`, plus dashboard authoritative `evidence_snapshot.definition` and `target_revision`, under `review_material_package.candidate_assets`. Call `analysis-meta agent-review evidence` only for missing/stale analysis or a specific evidence gap. Do not ask customers to manually run `analysis report get` for every report. A report title or prior AI summary cannot replace the definition; missing required core evidence is a material gap, not a reason to invent an explanation.

After reading each report from the material package, draft its concise core interpretation from packaged analysis. Store AI interpretation in `item.ai_summary.analysis_explanation`, not the authoritative `evidence_snapshot.analysis`. Common create stores the submitted packet for page review; it does not repair a missing Agent calculation explanation during create. Agent-supplied SQL, hashes or a `verified` flag cannot manufacture server evidence.

Before a real `submit-to-page` call, run a local completeness check over the exact payload: every report item must contain current `evidence_snapshot.analysis`, and must contain reviewer-readable `item.ai_summary.analysis_explanation.calculations` or `item.ai_summary.analysis_explanation.measures`. A purpose-only report summary is incomplete; missing required analysis or resolvable evidence references still fails structural validation. Do not invent either to force submission. Dashboard items may summarize the child reports, but their own missing calculation analysis is not a blocker because the actual calculation belongs to the reports below the dashboard.

The focused independent Agent review must include narrative-quality checks before dispatch for the selected grouping evidence and risk items: identify unsupported claims and repeated limitation/open-question text that hides a specific evidence gap. Do not expand it into an exhaustive per-item prose audit or require cosmetic repairs. Full audits check every retained explanation. At most 3 correction/re-review attempts remain available for material findings; this is a ceiling, not a required sequence. Follow preflight's warning continuation and LOCAL_ONLY boundaries, without relabeling incomplete/full-audit scope as passed.

### Full Audit Detail (On Explicit Request or Affected Risk Only)

For a full audit, read actual model/SQL definitions and apply the following field-level requirements. In an ordinary recommendation, inspect only fields needed for the core explanation, grouping or identified risk.

Use arrays of `{ "statement": "...", "evidence_refs": ["..."], "inferred": false }` for the following explanation sections. The statements are AI interpretations; factual clauses require exact, Common-verifiable paths rooted at `evidence_snapshot.analysis`. Use only paths present in the current evidence response that support the retrieved source facts; do not invent field names, array indexes, aliases, or references. `source_path` identifies provenance and is not automatically an AI evidence reference. After submission, read detail and check that those paths resolve in the server-returned snapshot. An unresolved path is missing evidence, not a verified fact. For `DYNAMIC` SQL, follow the original-text-only rules in [agent_review_evidence.md](agent_review_evidence.md); do not manufacture parsed projections or runtime values.

| Section         | Required interpretation when source evidence is available                                                                                                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `measures`      | Explain every statistical measure: what is counted or aggregated, its unit and population, and whether it counts rows, events, or distinct users. Do not infer business meaning from an alias alone.                                                                                                 |
| `dimensions`    | Explain actual grouping, breakdown, grain, and dimension expressions, keeping technical keys and display names distinct.                                                                                                                                                                             |
| `calculations`  | Explain actual formulas and aggregation steps, including numerators, denominators, distinctness, conditional logic, null handling, windows, or join effects where present in the source. Do not invent an unstated calculation rule.                                                                 |
| `filters`       | Explain saved predicates, their AND/OR relationships and scope, and the difference between row filters and post-aggregation filters where applicable. Missing filters do not prove that the query has no constraints.                                                                                |
| `time_scope`    | Explain the saved time field, range or relative window, timezone, time grain, and date parameters only where verified. Separate report query time from asset-usage statistics windows. Unbound runtime parameters remain unresolved.                                                                 |
| `query_columns` | For SQL reports, explain each SELECT projection in source order: the verified alias or unnamed expression, calculation, and supported source lineage. Projection columns are not all columns of the source tables. Preserve duplicate aliases and positional identity; do not merge columns by name. |

Keep `business_purpose`, `reading`, and `limitations` alongside these sections; purpose alone is insufficient. Mark genuine business interpretation as `inferred:true` and retain the evidence behind it. Put unavailable definitions, unsupported model extraction, SQL parse failures, unexpanded `SELECT *`, unresolved parameters, or unknown units/lineage in `limitations` or `open_questions`; leave unsupported factual sections empty instead of filling them with plausible prose. Do not expand wildcard columns from guesses or present a best-effort parse as complete. A constant-only acceptance query is test evidence, not a real business statistic.

Never guess or rewrite saved SQL, projected columns, or formulas to make a recommendation look complete. Reading a definition, obtaining deterministic analysis, passing validation/dry-run, or creating a review batch does not prove the query ran successfully, produced real rows, or certified the asset. Actual success claims require their corresponding execution result and review records. Missing analysis evidence must be disclosed rather than replaced with a purpose-only claim of complete review.

Before writing, consult the user's current intent. Submission can be offered once; declining produces no write. Prior explicit submission authorization does not require repeated permission. A preauthorized unattended task only submits proposals and never approves, retries certification, invokes legacy submit, or creates metrics.

Persist the exact payload, `client_request_id` and returned batch ID in task state. Network replay uses the same key and exact payload, including the original `source_run_id`. Same key with different content is a conflict, not a reason to generate a new key. A deliberate new authorized recommendation uses a new request key and may contain assets recommended previously; do not require evidence changes or inspect old batches before recommending them again. Historical review records remain available for audit only. Notification delivery is owned by Common; the Agent does not send another notification separately.

Output is the review detail, including string `id`, `review_url`, `review_page_url`, `status`, `notification_state`, versioned `items`, and `reused`. `review_page_url` is the user-facing page URL. `review_url` is kept for server compatibility and may be relative. An exact request replay returns its original batch. A new request can retain a new batch identity while reusing prior proposals: item-level `reused_batch_id` and `reused_item_id` identify the originals without dropping any requested items. Preserve both as decimal strings. `reused:true` alone does not prove the returned batch ID is an older batch. A fully reused batch can report `status:REUSED` and `notification_state:NOT_REQUIRED`; do not send another notification. Creation success is not proof of approval or certification. Return the link once for a newly actionable batch, distinguish notification failure, and read `detail` / `records` after a meaningful change.

## Topic Semantic Evidence

### Business Topics and Subtopics

The intended page hierarchy is `业务域 -> 业务小主题 -> 看板 -> 报表 -> 元数据`: the left navigation is a broad business domain, and the right group heading is a narrower business question that can collect multiple related dashboards. Dashboard names belong on asset rows. A two-level layout whose second level simply repeats the source dashboard list has not completed business classification.

Before assembling transport JSON, the Agent must interpret the selected reports' actual definitions and propose both grouping levels. Record each subtopic's business question, member evidence chains, and why it differs from sibling subtopics. Compare reports across source dashboards within the selected scope: merge complementary views of the same question, and identify materially different questions within a source dashboard instead of inheriting its container boundary. Keep report/metadata dependencies, source links and scoped asset identities intact; never fabricate relations or duplicate certification items to force a taxonomy. If shared placement cannot be represented faithfully, record that presentation gap for review.

For each new topic and each `topics[].groups[]` subtopic include Agent-authored `semantic_basis`:

- `business_question`: the broad domain question or, for a subtopic, the specific question its members jointly answer.
- `grouping_reason`: definition-based reasons for the included members and the boundary from sibling groups. For a subtopic covering multiple dashboards, explain their complementary roles. For a single-dashboard subtopic, explain why other selected dashboards do not answer the same question; lack of other supported candidates is a valid scope limitation.
- `evidence_item_ids`: nonempty references to displayed items in that same topic or group respectively. Use representative core report definitions and supporting metadata to justify the business meaning, including evidence for every represented dashboard; a dashboard title alone is insufficient. Select the few definitions needed to support the question and boundaries, rather than listing every child report to imitate full-audit coverage.

Scripts may assemble an Agent-authored membership plan and validate references. They must not derive subtopics by looping over dashboards, copying dashboard names/IDs or `work_units`, adding a business-sounding prefix, or mechanically merging adjacent dashboards. Renaming a one-dashboard group does not repair its membership. Do not force unrelated dashboards together to meet a minimum count, or reject a legitimate business name merely because it equals an asset title.

For example, within a customer-adoption domain, a subtopic about sustained use could combine a daily/weekly activity dashboard and a cohort-retention dashboard when their definitions support that question, while feature breadth belongs to a different subtopic. This illustrates semantic membership, not a fixed taxonomy or required number of dashboards. When meaning is unsupported, use `待确认业务主题` with the concrete missing evidence rather than inventing a category.

[Independent Agent preflight](agent_review_preflight.md) must cover every domain and subtopic, explicitly assessing missed cross-dashboard merges and unsupported splits. All or most groups matching dashboards one-to-one is a review signal, not an automatic name/count rejection. A PASS for either focused or full scope requires evidence-backed grouping and recorded coverage at both levels; focused scope does not claim exhaustive item-definition review. These assessments share the existing correction budget and warning-continuation policy.

The `semantic_basis` fields remain optional in transport for legacy compatibility. When supplied, CLI validation checks nonempty explanation fields and same-topic/same-group evidence references; it does not judge meaning, require two dashboards per group, or reject source-name equality. Existing Common stores the nested presentation object and the page already renders multiple dashboard roots in a group, so this contract requires no server schema or frontend change. Updating this Skill does not reorganize an already stored batch.
