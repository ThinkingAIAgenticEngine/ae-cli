# Project Semantic Knowledge Base Wiki

Asset-package export requires access to the target project. Neither the retired `project_semantic_enable` project switch nor the company switch for automatic knowledge-base discovery gates an explicit build or refresh. If project access or company KB permission is denied, report the error and stop; do not switch to a different project, scope, or export path.

Build one server-consumable project semantic source Wiki from one immutable Common asset-package snapshot and prove that the KB-compiled knowledge base can be browsed and consumed correctly. The asset package is the raw truth source. Default to a governed package; use an `all_visible` package only when the user explicitly asks for all assets or for uncertified assets to be included. The Agent summarizes the asset semantics once into editable Markdown sources; KB owns formal rule application, final compilation, source lifecycle, and incremental maintenance.

The first product goal is not an asset directory. The Wiki must teach the user and Agent how this project observes business: what business system it covers, who uses it, what business objects exist, how those objects relate, which judgment chains users follow, and which assets play primary, supporting, drilldown, or exclusion roles in those chains. Asset pages, report formulas and metadata pages hang under that business judgment model. A Wiki that only lists domains, reports, metrics, dimensions, recall cards, counts, or source containers is an incomplete project semantic KB even if it compiles.

## Boundary

- This command reference covers asset-package download, one Agent semantic-planning pass, deterministic Wiki-source rendering, validation, editable ZIP source upload, preset initialization/reuse, compilation, server readback, and retrieval acceptance.
- The default source scope is `governed`. If and only if the user explicitly requests all assets, use `all_visible`; keep uncertified assets visible but marked `certification_state=uncertified`, and do not present uncertified or conflicting assets as governed definitions.
- The retired governed project-semantic candidate/review/enable/release lifecycle is not part of this workflow. A retrieval taxonomy or Wiki page is not automatically a governed project semantic.
- The generated Wiki is a retrieval and evidence layer. Current counts, recent customers, and live usage still require report execution.
- Do not use `kb +import` for this loop. `kb +import` imports an already compiled read-only snapshot; this workflow needs editable source upload, valid formal rules, and `kb +compile`. Do not generate Schema in the normal build/refresh path.


## Usage and Intake Gate

When the user asks to build, update, refresh, rebuild, or sync a project semantic knowledge base from project assets, open this reference from `ae-analysis` and run the full loop here. Do not use this workflow for asset-certification or metric recommendations; those use `analysis-meta governance-recommendation export`.

CLI Agent performs the main semantic precompilation: understand definitions and SQL, author a project-level business model, complete asset meanings, domain judgment models, domain relationships, recall boundaries, SQL business summaries, and evidence-backed conflicts, then render Markdown sources. Scripts only handle deterministic work: validation, IDs, links, packaging, source-tree diffs, and removal of parser/placeholder noise. They must not author business positioning, business objects, judgment chains, business purpose, domain intent, SQL applicable questions, conflict interpretation, or visible rationale from templates. Upload those sources as an editable ZIP and let KB compile the final Wiki, integrate human context, maintain citations/navigation, and incrementally update affected pages. Never use `kb +import` for this workflow: a read-only snapshot cannot provide this source lifecycle.

## Company-only target and permission boundary

Use the `company-kb.mjs` wrapper below for project KB operations. It fixes scope to company, filters discovery to company results, verifies ZIP ownership before directory operations, and exits on any failed command. A company permission denial is terminal: report the server error and stop. Never create a personal KB, reuse a same-name personal KB, retry without scope, or continue to upload/schema/compile after failed creation.

Resolve host and project first. Use the authoritative server resolver, not the current user's visible KB list:

```bash
node <skill_dir>/scripts/project-semantic-knowledge-wiki/company-kb.mjs +resolve --project-id <project_id> --host <host>
```

The resolver considers all undeleted company KBs bound to the project across all build states, including disabled or inaccessible targets. One bound KB is reused for legacy compatibility. For several candidates, exactly one fixed `项目语义` business tag selects the target; zero tags returns `multiple/untagged`, several tags returns `multiple/tag_conflict`. With no project binding, only the exact authoritative project name `<project_name> 项目语义知识库` without another project binding is a legacy candidate, using the same tag rule. Never select by list order, modification time, or accessible subset. `restricted`, `disabled`, and `multiple` stop the workflow and require permission, activation, or tag correction; do not create or select a replacement. Query/auth/unsupported-endpoint errors are terminal; do not fall back to visible-list inference on older servers. Only `missing` permits creation. `available` supplies the exact `item.dbId` and `item.id` (slug); reuse that identity. An explicitly selected existing target or an automation's stored target ID must not be silently switched by tag changes.

The wrapper's `+new` always sends `--purpose project-semantic` with a project binding. The server validates the project, rechecks the target under the KB write lock, and presets the fixed `项目语义` tag even if omitted by the caller. It preserves additional tags up to the existing total limit of two; overflow is an error, never truncation. Ordinary company KB creation outside this semantic workflow retains its current behavior. The tag is purpose classification, not an access grant; labels and names are not authority for project ownership. Once target resolution succeeds, do not stop after local generation.

The KB description is part of Agent auto-loading and source selection, not a casual note. Always write a normal business-facing description that states the project, asset scope, and intended Agent use. Do not mention temporary implementation details such as ZIP, test version numbers, source-tree packaging, or local build names in the description. Use this template:

```text
<project_name><asset_scope_label>项目语义知识库，用于辅助 Agent 在分析前召回业务域、资产口径、SQL 报表语义和治理边界。
```

For example, using a fictional project name:

```text
示例项目已认证资产项目语义知识库，用于辅助 Agent 在分析前召回业务域、资产口径、SQL 报表语义和治理边界。
```

```bash
KB_RUN=skills/ae-analysis/scripts/project-semantic-knowledge-wiki/company-kb.mjs
node "$KB_RUN" +list --build-status compiled --host <host>
node "$KB_RUN" +new --name '<company_kb_name>' \
  --description '<project_name><asset_scope_label>项目语义知识库，用于辅助 Agent 在分析前召回业务域、资产口径、SQL 报表语义和治理边界。' \
  --project-id <project_id> --project-name '<project_name>' --host <host>
```

The wrapper executes the matching project/package CLI when present; standalone installed Skills retain `ae-cli` from PATH. Directory APIs lack a scope parameter, so it verifies the ZIP source belongs to the company KB before mutation. Permission denial stops the flow. An explicitly requested personal test uses the project CLI directly with `--scope personal` on scope-aware commands; this is never a permission fallback. Personal test KB creation follows the same description rule and must still use a business-facing description.

## Preset initialization, reuse and release acceptance

The canonical directly uploadable rules are `scripts/project-semantic-knowledge-wiki/default-compile-schema.md`. Maintain this user-visible document in Chinese while retaining literal paths and protocol field names. It defines durable compilation behavior, not project-specific facts. Review and AI-validate the exact preset bytes once before releasing a preset version; keep its hash and report as acceptance evidence. Do not run AI validation for every KB initialization or source refresh. Retain deterministic format, revision, content-hash, permissions and current-formal-hash checks.

`prepare-compile-schema.mjs` never applies rules or compiles. It returns `reuse` only after status and downloaded formal bytes agree that rules are valid. A pending new KB can contain a default placeholder even when no effective rules exist; preparation uploads the preset as a candidate and returns `review_import` with `compile_ready=false`. Download errors other than explicit missing-file errors, busy/recovery/review states and invalid established rules are terminal. Use a stable `--request-id` when resuming the same initialization; do not create a second candidate after an uncertain write.

For `review_import`, use the returned stable candidate ID with the project/package CLI. Read the entire candidate, full current-schema diff and any advisories. Then explicitly apply using the current revision, candidate hash and formal hash from that diff:

```bash
ae-cli kb +schema-import-content --import-id <returned_id> --host <host>
ae-cli kb +schema-import-diff --import-id <returned_id> --baseline current-schema --host <host>
ae-cli kb +schema-import-apply --import-id <returned_id> --revision <current_revision> \
  --hash <candidate_hash> --schema-hash <formal_hash_from_diff> --request-id <apply_id> --host <host>
```

Only if the diff reports formal absence use `--schema-absent` instead of `--schema-hash`. New KB placeholders are present files and require their actual hash. `--report-id` is optional; old callers may still supply it. A successful application must have `status=applied` with no settlement/recovery pending. Read status and formal bytes again before compilation. `BASE_CHANGED` requires a fresh review, never automatic hash refresh/replay. Do not overwrite valid custom rules just because their hash differs from the preset.

Preset release acceptance explicitly uses `ae-cli kb +schema-import-validate --import-id <id> --revision <revision> --hash <hash> --request-id <validation_id> --host <host>`, followed by `+schema-import-status` until the exact candidate has a complete passing report. Validate changed preset bytes again; do not carry a report across hashes. Keep this authoring check separate from the normal KB lifecycle. Test a first full publication and a real changed-source incremental publication with unchanged formal bytes.

Compatibility: existing explicit `company-kb.mjs +schema --custom-instructions-file default-compile-rules.md` remains supported for user-requested rule generation. `default-compile-rules.md` is legacy generation guidance, not the normal preset input. Old commands, scopes and model parameters are retained; no new Skill is introduced. Servers that still require per-candidate AI reports cannot use the fast application path and must be reported as unsupported until their contract is upgraded; do not silently fall back to generation.

## User-selected model

Resolve the requested model with `ae-cli agent +list-models --host <host>` and retain its exact Model.id. Pass the same `--model <model_ref>` to compilation, including incremental refreshes. AI rule validation is a separate preset-release acceptance step and accepts a model only when explicitly requested. Stop if the requested model is unavailable or ambiguous.

## Source directory contract

The first upload ZIP must create a real source tree. Empty directories are not a reliable contract, so each durable category contains a small `README.md` that declares filing rules and states that README files are not business evidence.

```text
sources/
  README.md
  project/
  assets/
    dashboards/
    reports/
    metrics/
    metadata/
  personal-semantics/
    background/
    preference/
    experience/
    asset-context/
  business/
  meetings/
  decisions/
  corrections/
  references/
```

CLI-managed asset facts go only under `sources/assets/**`. Adopted personal semantics exported by Common go under `sources/personal-semantics/**` by their `context_type`: `background`, `preference`, `experience`, or `asset_context` (`asset-context` path). Human material goes under the other top-level categories. Asset refreshes may add, replace, or remove files owned by the generated asset package under `sources/assets/**` and `sources/personal-semantics/**`; they must not delete user material in `project/`, `business/`, `meetings/`, `decisions/`, `corrections/`, or `references/`.

The intended compiled Wiki is organized by consumption, not by raw file shape:

```text
index.md
wiki/project-overview.md
wiki/common/
wiki/domains/
wiki/asset-index/
wiki/event-map/
wiki/governance/
```

The source tree only classifies material. Authority still comes from explicit facts: decisions require confirmer, status, date, and scope; corrections require target, corrected content, reason, date, and scope.

## First build: precompiled Markdown sources and KB compilation

1. Export one complete schema 3.0 governed asset package with `ae-cli project-semantic asset-package export --project-id <project_id> --asset-scope governed --output <package> --host <host>`. Require `truncated=false` and authenticated entry/dependency closure. Use `all_visible` only on explicit user request. The export always includes current `ADOPTED` personal semantics for this project in `sources/adopted-personal-semantics.jsonl`; do not add a switch to exclude them and do not run a second personal-semantic export.
   If the governed dashboard, report, and metric catalogs and adopted personal semantics are all empty, this is a valid new-project initialization. Do not ask the user to choose between an empty skeleton and all visible assets. Do not switch to `all_visible` or invent business facts. Run the empty-skeleton builder below, upload its ZIP through the same company-only wrapper, prepare/apply the preset as described below, compile full, and read back the project overview and governance boundary. Skip the semantic planning and normal builder steps below in this case. Resolve the model and company KB target as usual before upload.

   ```bash
   node skills/ae-analysis/scripts/project-semantic-knowledge-wiki/build-empty-skeleton.mjs \
     --asset-package <tmp>/project-assets --output <tmp>/empty-skeleton \
     --project-name '<project_name>'
   node "$KB_RUN" +add --name '<company_kb_name>' \
     --files '["<tmp>/empty-skeleton/empty-skeleton.zip"]' --host <host>
   node skills/ae-analysis/scripts/project-semantic-knowledge-wiki/prepare-compile-schema.mjs \
     --name '<company_kb_name>' --host <host> --output '<new-formal-rules-file>' --request-id '<initialization-id>'
   # If review_import is returned, review and apply the candidate below before compilation.
   # Wait for generated Schema status, then compile.
   node "$KB_RUN" +compile --name '<company_kb_name>' --mode full --model <model_ref> --host <host>
   ```
2. Preserve the local planning and rendering stages. Read the compact knowledge indexes, including dashboard notes, the adopted personal semantic source file, and only the normalized details needed for project positioning, business objects, object relationships, judgment chains, ambiguous grouping, conflicts, SQL semantics, personal context fusion, and recall-card choices. Author one snapshot-bound plan using [`project_semantic_knowledge_wiki_plan_schema.md`](project_semantic_knowledge_wiki_plan_schema.md). This is the run's only Agent synthesis pass. Do not create the plan with a generic script. Do not hardcode project names, business domains, asset IDs, event names, metric names, personal-semantic conclusions, or example decision chains into the workflow; examples are illustrative only, and the Agent must derive the current project's model from the current package. If many summaries share the same template with only names or fields changed, discard the plan and have the Agent reread the relevant asset definitions.
3. Render the locally precompiled material for review and generate Markdown sources. The review ZIP is a local artifact; upload the source ZIP from the next step:

   ```bash
   node skills/ae-analysis/scripts/project-semantic-knowledge-wiki/build-project-semantic-wiki.mjs \
     --asset-package <tmp>/project-assets \
     --semantic-plan <tmp>/project-semantic-wiki-plan.json \
     --output <tmp>/project-semantic-wiki \
     --archive <tmp>/project-semantic-wiki.zip \
     --project-name '<project_name>'
   ```

   When the exported package is `asset_scope=all_visible`, pass `--allow-all-visible` to the builder. Do not pass this flag unless the user explicitly requested all visible assets.
4. Review the local project business model, domain judgment models, asset meanings, SQL summaries, adopted personal-semantic fusion, domains, conflicts, and recall cards. The project overview must start with business positioning, business objects, object relationships, judgment chains, and non-goals; asset counts and snapshot metadata come later. Business-domain sources must contain the judgment model plus the short `Agent 使用摘要` for first-hop routing: business state judged, objects, signals, decision path, asset roles, primary analysis goals, preferred entries, main events, main metrics, drilldown dimensions, and boundaries. Adopted personal semantics must be fused by type: `background` can enrich project background and domain context, `preference` can shape preferred routing and answer style, `experience` can add proven analysis heuristics and caveats, and `asset_context` can annotate concrete reports/dashboards/metrics only when the referenced asset still exists. Preserve the source person's display name and source/update time from the payload in the local source page provenance; never expose backend identifiers such as `open_id` in KB Markdown. Non-SQL report summaries must not repeat the same generated sentence as both purpose and applicable question; they should expose the report's business use, usable questions, metrics/outputs, drilldown dimensions, filters and boundaries from structured asset evidence, and use "return to source report to confirm" wording for missing fields instead of parser-style `未识别/未发现` placeholders. SQL report sources must also use one `Agent 使用摘要`, but that single section must contain the complete Agent-authored SQL semantics: purpose, parameters, output fields, grain, filters, limits, question boundaries, and evidence locator. This section must be business language an Agent can use directly, not parser labels such as `SQL 输出字段`, `来源表达式`, `${Selector:...}`, `${PartDate:...}`, `C00`, raw SQL fragments, or visible build-process phrases such as `CLI Agent 基于同一资产快照生成`, `摘要来源`, `semantic_plan`, `builder`, `parser fallback`. All business analysis should be completed here; missing evidence remains explicitly unknown. Precompile affected assets, personal-semantic source pages, and their dependent domains/cards only on refresh; reuse unchanged semantic plan entries.
5. Package the builder's Markdown sources. Raw JSON indexes and raw SQL remain in the local review/evidence package; the KB input contains the precompiled meanings and structured calculation facts.

Package the builder's prepared Markdown sources into the source tree:

```bash
node skills/ae-analysis/scripts/project-semantic-knowledge-wiki/package-wiki-source-zip.mjs \
  --source-dir <output>-kb-upload-sources \
  --tree-output <output>-kb-source-tree \
  --manifest-output <output>-kb-source-tree-manifest.json \
  --output <new-archive>.zip
```

Then upload and run KB compilation:

```bash
node "$KB_RUN" +add --name '<company_kb_name>' --files '["<new-archive>.zip"]' --host <host>
node skills/ae-analysis/scripts/project-semantic-knowledge-wiki/prepare-compile-schema.mjs \
  --name '<company_kb_name>' --host <host> --output '<new-formal-rules-file>' --request-id '<initialization-id>'
# review_import requires full candidate/diff review and explicit application; reuse is already compile-ready.
node "$KB_RUN" +compile --name '<company_kb_name>' --mode full --model <model_ref> --host <host>
```

Poll `+status`; never poll by generating Schema again. Rule initialization or compilation failure stops the flow; do not switch to snapshot import. Start with a few representative assets before attempting the complete package.

## Refresh: update changed Markdown sources

When refreshing an empty skeleton, export a fresh governed package first. If both source classes are still empty, do not rewrite or recompile an unchanged skeleton. If governed entry assets have appeared, synthesize the first evidence-based semantic plan and run the normal builder. Read the skeleton's remote `sources/project/<namespace>-refresh-state.md` and pass it to the source-tree packager as `--previous-refresh-state`. Its taxonomy version intentionally differs from the populated Wiki, so the packager requests `compile_mode=full` and explicit rule-compatibility review. Reuse valid compatible rules; do not regenerate Schema. Apply the resulting add/replace/remove actions to the existing company ZIP with revision checks, including removal of obsolete empty-state sources; preserve human sources and unrelated ZIP paths. Never create a second KB or reuse the empty skeleton's unknown statements as business facts. If only adopted personal semantics appear while entry assets remain empty, do not run the asset builder or claim the skeleton is current; report that the personal-only source path is not yet supported.

Regenerate the local Wiki using the existing semantic-plan contract. On refresh, reuse unchanged semantic-plan entries and unchanged adopted-personal-semantic fusion entries instead of asking the Agent to rewrite them. The builder persists the reusable semantic plan and fragment-level state in `sources/project/<namespace>-refresh-state.md`, and records each Markdown source's fragment dependencies. A changed recall card, SQL summary, domain model, adopted personal semantic, appendix, or project model affects only sources that reference that fragment; never treat the whole semantic-plan file hash as a full-source rewrite trigger. When the asset package snapshot hash changes but the existing plan is intentionally reused, pass `--allow-semantic-plan-snapshot-drift`; the builder still validates current project, domain, asset, adopted personal semantic, recall-card and SQL-report references against the new package and stops if the closure no longer matches. Do not use this flag for first build or to bypass real asset additions/removals. Use normalized content hashes from the builder's upload manifests so snapshot-only header changes do not rewrite every asset:

```bash
node skills/ae-analysis/scripts/project-semantic-knowledge-wiki/build-project-semantic-wiki.mjs \
  --asset-package <tmp>/project-assets-next \
  --semantic-plan <previous-or-updated-semantic-plan.json> \
  --output <next>/project-semantic-wiki \
  --archive <next>/project-semantic-wiki.zip \
  --project-name '<project_name>' \
  --allow-semantic-plan-snapshot-drift
```

```bash
node skills/ae-analysis/scripts/project-semantic-knowledge-wiki/package-wiki-source-zip.mjs \
  --source-dir <next>-kb-upload-sources \
  --tree-output <next>-kb-source-tree \
  --manifest-output <next>-kb-source-tree-manifest.json \
  --previous-refresh-state <remote-refresh-state.md> \
  --embed-refresh-state-baseline \
  --baseline-source-id <zip_source_id> \
  --baseline-content-revision <current_content_revision> \
  --baseline-published-version-id <published_version_id>
```

The normal refresh baseline is remote managed state, not the local filesystem. Read `+list-sources` once to get the ZIP source ID and current `contentRevision`, then read the small `sources/project/<namespace>-refresh-state.md` index. For schema `2.0`, read each listed `-part-NNN.md` into the same local directory using the exact filenames; never read the whole ZIP or concatenate the parts in an Agent tool response. The packager verifies each part, the complete payload, and the stored manifest before planning changes. A legacy single-file base64 state remains readable. The state contains the previous semantic plan, fragment state, source-tree manifest, source ID, content revision, published version ID, and manifest hash. If `contentRevision` matches the saved baseline, use `--previous-refresh-state` and compare against the saved source-tree manifest; do not page through every remote file and do not run full `+source-read` over the ZIP. A machine-state-only migration can advance the ZIP revision without changing business sources. If the revision differs, treat the baseline as potentially stale but still start from `--previous-refresh-state`; verify only paths that would be written or removed before mutating them, and escalate to a full source-tree read only when the refresh state is missing, corrupt, or cannot explain the required conflict check. A local `<previous>-kb-source-tree-manifest.json` with `--previous-manifest` is a compatibility fallback for manual repair runs, not the scheduled path.

The returned plan contains add/replace/remove actions and unchanged paths under `sources/...`, with `skip` or `incremental` compilation. Adopted personal semantics use the same source-tree manifest, stable ZIP-relative paths, content hashes, conflict checks, and add/replace/remove actions as asset sources; do not maintain a separate personal-semantic delta file or a second upload flow. When a previously adopted personal semantic is edited, its review status becomes `NONE`, it disappears from the next adopted source export, and the next refresh removes or rewrites only the generated paths whose fragment dependency points to that source. `--previous-tree-root` lets a repair run re-hash the last applied local baseline with the current normalizer, so harmless compiler/normalization-rule changes do not create a one-time false delta. Do not replace an existing ZIP parent. Before each write, verify the target remote bytes still match the action's `previous_content_hash`; for the v2 index and part files this is the raw file SHA-256, while legacy sources use the existing normalized content hash. Preserve unexpected manual edits and stop on conflicts. Apply the index and every listed part action; a machine-state-only change keeps `compile_mode=skip`. Compare by the stable ZIP-relative `sources/...` path. Do not replace the ZIP parent or re-upload every file. Do not run the old flat-source uploader or `plan-kb-source-sync.mjs`.

For each changed path, obtain the current revision and perform one existing command through the wrapper:

```bash
node "$KB_RUN" +source-ls --name '<company_kb_name>' --id <zip_source_id> --path '' --host <host>
node "$KB_RUN" +source-put --name '<company_kb_name>' --id <zip_source_id> \
  --path sources/assets/reports/pskb-p5-report-123.md --file <local-file> --action replace --expected-revision <revision> --host <host>
node "$KB_RUN" +source-rm --name '<company_kb_name>' --id <zip_source_id> \
  --path <removed-generated-path> --expected-revision <revision> --host <host>
```

Only remove files owned by this generated asset package. Preserve unrelated source material and unexpected manual edits; stop on conflicts. Keep deletion confirmation unless the exact refresh deletion scope is already authorized. Execute sequentially using returned revisions; a 409 requires fresh discovery and review, not blind retry. Failed writes stop compilation. On resume, compare current remote bytes again so already successful writes are not replayed. Unchanged files are not written. Apply changed Markdown manifest/index sources from the plan too; keep the JSON sync manifest local. A refresh-state-only baseline update is a managed-state write and does not by itself require compilation.

After all source-tree changes succeed, use the source-tree packager's `compile_mode`. `skip` needs no preparation, upload, AI validation or compilation unless explicitly requested. Otherwise run `prepare-compile-schema.mjs` with a fresh output path: valid formal rules return `schema_action=reuse` and `compile_ready=true` without generation, upload, application or AI validation. Call `+compile --mode incremental --model <model_ref>` once for `incremental`, or `+compile --mode full --model <model_ref>` once for `full`. A full rebuild, source-change volume or navigation migration does not trigger Schema generation. `navigation_taxonomy_migration.requires_schema_review=true` requires checking that the formal rules support the new navigation; an incompatible older preset needs an explicit reviewed rule upgrade, never automatic replacement. The legacy `requires_schema_force` field remains false; legacy `schema_force_reasons` explain full-build reasons only. Preserve human sources and unrelated ZIP paths. Normal content updates still use incremental mode.

Compiled navigation must follow the five layers: project overview, shared project knowledge, business domains, event and asset catalog, and governance with provenance. Recall cards belong under domains. The homepage should contain a small set of representative titled entries only, not every report/dashboard file or bare numeric IDs. Individual assets belong in their category index or domain context, with title-first link text and IDs as supporting identity. Public event groups are lookup indexes, not business domains.

## Acceptance and readback

Completion requires `status=wiki_compiled`, `buildStatus=compiled`, no failed or partial sources, and complete publication when exposed. Verify both a first build and an actual changed-source incremental compile; a local preview or successful upload is not acceptance.

Use company-scoped retrieval through the wrapper:

```bash
node "$KB_RUN" +index --name '<company_kb_name>' --host <host>
node "$KB_RUN" +grep --name '<company_kb_name>' --query '<business question or marker>' --paths '["<path copied from index>"]' --host <host>
node "$KB_RUN" +read --name '<company_kb_name>' --path '<path copied from index or grep>' --host <host>
```

Do not assume the old local Wiki layout. Inspect actual server paths. Check the project overview can answer: what business system this project observes, who uses it, what business objects exist, how objects relate, what decision chains exist, which assets attach to each chain, and what cannot be answered without live execution. Then check domain judgment models, asset IDs, SQL/calculation fidelity, certification, missing facts, cross-source conflict handling and provenance. Smoke-test a representative reusable asset. After refresh, verify additions, changed current definitions, removal of obsolete assertions and preservation of unchanged facts. Historical definitions may remain only when explicitly marked historical and evidenced. Publish statistics such as `reusedPages` are evidence; incremental mode alone does not prove lower model cost.

Report target scope/name, requested model, ZIP source ID/revision, compile status/version, source counts and quality findings. Record observed compile duration and usage; small-sample success does not prove a full package will stay below turn limits.

## Authority and retrieval rules

Each asset page must expose:

```yaml
authority_role: canonical | dependency_only | appendix
certification_state: certified | uncertified
definition_state: valid | conflict | unknown
runtime_policy: allow | warn | block
standalone_recall: true | false
canonical_asset_id: report:1234 | null
```

- `authenticated=true` maps only to `certification_state=certified`; it never overrides a definition conflict. In explicit `all_visible` mode, unauthenticated assets remain visible as `certification_state=uncertified` and must not be described as approved/governed semantics.
- A detectable conflict always yields `runtime_policy=block` and `standalone_recall=false` until reviewed.
- An unauthenticated child retained through a certified parent is `dependency_only`; its verified definition and dependencies may answer definition or relationship questions. It cannot independently establish a business state or current number. When direct retrieval is unavailable, inspect the authorized parent and state the remaining gap.
- Technical appendix, duplicate, demo, reproduction, and targeted-diagnostic assets are blocked from standalone recall.
- Ranking order is: project/permission/status filter -> recall card -> canonical and valid assets -> certification -> semantic relevance and usage. Raw evidence never participates in first-round broad recall.

## SQL report rules

Every SQL report requires structured semantics grounded in the packaged SQL and parameters. The compiled Wiki must include one CLI Agent-authored `## Agent 使用摘要` for every SQL report. That single section is the primary SQL business source; do not create a second SQL-specific summary section. The local review retains `sql_semantic_facts` and raw SQL for audit. KB consumes the precompiled meanings and only reopens analysis for concrete inconsistencies or new human evidence. Apply the durable `default-compile-schema.md` preset to preserve:
- business purpose;
- input parameters and their meaning;
- output fields;
- statistical grain;
- key filters and exclusions;
- default limits or saved time constraints;
- applicable questions;
- non-applicable questions;
- evidence locator.

The builder rejects a plan that omits any SQL report or contains mechanically generated SQL summaries that expose parser placeholders instead of Agent-authored business semantics. If the evidence cannot support one of these fields, state `unknown` explicitly and set the report to `definition_state=unknown`; the report cannot be presented as a determined business caliber. Never infer a formula, unit, join relationship, or parameter meaning from a report title alone. CLI owns the main semantic analysis; KB owns final integration and incremental maintenance. Preserve unknown and blocked authority states unless explicit evidence resolves them.

## Existing flat-source knowledge bases

For an existing managed source-tree knowledge base, `navigation_taxonomy_version` missing or below `2.0` triggers the full Wiki rebuild on its next refresh. Source-tree refresh uses the recorded ZIP source ID and directory mutations above; it never deletes human-authored sources. Read-only snapshots and unmanaged flat sources have no verified managed baseline and must be reviewed separately before migration.
