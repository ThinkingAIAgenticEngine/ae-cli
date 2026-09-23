# Project Semantic Knowledge Base Wiki

Asset-package export requires access to the target project. Neither the retired `project_semantic_enable` project switch nor the company switch for automatic knowledge-base discovery gates an explicit build or refresh. If project access or company KB permission is denied, report the error and stop; do not switch to a different project, scope, or export path.

Build one server-consumable project semantic source Wiki from one immutable Common asset-package snapshot and prove that the KB-compiled knowledge base can be browsed and consumed correctly. The asset package is the raw truth source. Default to a governed package; use an `all_visible` package only when the user explicitly asks for all assets or for uncertified assets to be included. The Agent summarizes the asset semantics once into editable Markdown sources; KB owns schema generation, final compilation, source lifecycle, and incremental maintenance.

The first product goal is not an asset directory. The Wiki must teach the user and Agent how this project observes business: what business system it covers, who uses it, what business objects exist, how those objects relate, which judgment chains users follow, and which assets play primary, supporting, drilldown, or exclusion roles in those chains. Asset pages, report formulas and metadata pages hang under that business judgment model. A Wiki that only lists domains, reports, metrics, dimensions, recall cards, counts, or source containers is an incomplete project semantic KB even if it compiles.

## Boundary

- This command reference covers asset-package download, one Agent semantic-planning pass, deterministic Wiki-source rendering, validation, editable ZIP source upload, schema generation, compilation, server readback, and retrieval acceptance.
- The default source scope is `governed`. If and only if the user explicitly requests all assets, use `all_visible`; keep uncertified assets visible but marked `certification_state=uncertified`, and do not present uncertified or conflicting assets as governed definitions.
- The retired governed project-semantic candidate/review/enable/release lifecycle is not part of this workflow. A retrieval taxonomy or Wiki page is not automatically a governed project semantic.
- The generated Wiki is a retrieval and evidence layer. Current counts, recent customers, and live usage still require report execution.
- Do not use `kb +import` for this loop. `kb +import` imports an already compiled read-only snapshot; this workflow needs source upload followed by `kb +schema` and `kb +compile`.


## Usage and Intake Gate

When the user asks to build, update, refresh, rebuild, or sync a project semantic knowledge base from project assets, open this reference from `ae-analysis` and run the full loop here. Do not use this workflow for asset-certification or metric recommendations; those use `analysis-meta governance-recommendation export`.

CLI Agent performs the main semantic precompilation: understand definitions and SQL, author a project-level business model, complete asset meanings, domain judgment models, domain relationships, recall boundaries, SQL business summaries, and evidence-backed conflicts, then render Markdown sources. Scripts only handle deterministic work: validation, IDs, links, packaging, source-tree diffs, and removal of parser/placeholder noise. They must not author business positioning, business objects, judgment chains, business purpose, domain intent, SQL applicable questions, conflict interpretation, or visible rationale from templates. Upload those sources as an editable ZIP and let KB compile the final Wiki, integrate human context, maintain citations/navigation, and incrementally update affected pages. Never use `kb +import` for this workflow: a read-only snapshot cannot provide this source lifecycle.

## Company-only target and permission boundary

Use the `company-kb.mjs` wrapper below for project KB operations. It fixes scope to company, filters discovery to company results, verifies ZIP ownership before directory operations, and exits on any failed command. A company permission denial is terminal: report the server error and stop. Never create a personal KB, reuse a same-name personal KB, retry without scope, or continue to upload/schema/compile after failed creation.

Resolve host and project first. Search company KBs across `compiled`, `idle`, `pending`, `compiling`, and `failed` build states with `+list --build-status <state>`. Deduplicate by identity. Prefer an exact project binding, otherwise the deterministic name `<project_name> 项目语义知识库`. If several company KBs match, ask for the exact target. Personal KBs are never candidates. If no company target exists, create one with the project binding. Do not ask the user to choose between "existing" and "new" when the target is unambiguous. Once target resolution succeeds, do not stop after local generation.

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

The wrapper executes the installed `ae-cli`. Directory APIs lack a scope parameter, so it verifies the ZIP source belongs to the company KB before mutation. Permission denial stops the flow. An explicitly requested personal test uses the project CLI directly with `--scope personal` on scope-aware commands; this is never a permission fallback. Personal test KB creation follows the same description rule and must still use a business-facing description.

## User-selected model

Resolve the requested model with `ae-cli agent +list-models --host <host>` and retain its exact Model.id. Pass the same `--model <model_ref>` to Schema and compile, including incremental refreshes. Stop if the requested model is unavailable or ambiguous.

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
  business/
  meetings/
  decisions/
  corrections/
  references/
```

CLI-managed asset facts go only under `sources/assets/**`. Human material goes under the other top-level categories. Asset refreshes may add, replace, or remove files owned by the generated asset package; they must not delete user material in `project/`, `business/`, `meetings/`, `decisions/`, `corrections/`, or `references/`.

The intended compiled Wiki is organized by consumption, not by raw file shape:

```text
index.md
wiki/project/
wiki/domains/
wiki/semantics/
wiki/assets/
wiki/decisions/
wiki/review/
```

The source tree only classifies material. Authority still comes from explicit facts: decisions require confirmer, status, date, and scope; corrections require target, corrected content, reason, date, and scope.

## First build: precompiled Markdown sources and KB compilation

1. Export one complete schema 3.0 governed asset package with `ae-cli project-semantic asset-package export --project-id <project_id> --asset-scope governed --output <package> --host <host>`. Require `truncated=false` and authenticated entry/dependency closure. Use `all_visible` only on explicit user request.
2. Preserve the local planning and rendering stages. Read the compact knowledge indexes, including dashboard notes, and only the normalized details needed for project positioning, business objects, object relationships, judgment chains, ambiguous grouping, conflicts, SQL semantics, and recall-card choices. Author one snapshot-bound plan using [`project_semantic_knowledge_wiki_plan_schema.md`](project_semantic_knowledge_wiki_plan_schema.md). This is the run's only Agent synthesis pass. Do not create the plan with a generic script. Do not hardcode project names, business domains, asset IDs, event names, metric names, or example decision chains into the workflow; examples are illustrative only, and the Agent must derive the current project's model from the current package. If many summaries share the same template with only names or fields changed, discard the plan and have the Agent reread the relevant asset definitions.
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
4. Review the local project business model, domain judgment models, asset meanings, SQL summaries, domains, conflicts, and recall cards. The project overview must start with business positioning, business objects, object relationships, judgment chains, and non-goals; asset counts and snapshot metadata come later. Business-domain sources must contain the judgment model plus the short `Agent 使用摘要` for first-hop routing: business state judged, objects, signals, decision path, asset roles, primary analysis goals, preferred entries, main events, main metrics, drilldown dimensions, and boundaries. Non-SQL report summaries must not repeat the same generated sentence as both purpose and applicable question; they should expose the report's business use, usable questions, metrics/outputs, drilldown dimensions, filters and boundaries from structured asset evidence, and use "return to source report to confirm" wording for missing fields instead of parser-style `未识别/未发现` placeholders. SQL report sources must also use one `Agent 使用摘要`, but that single section must contain the complete Agent-authored SQL semantics: purpose, parameters, output fields, grain, filters, limits, question boundaries, and evidence locator. This section must be business language an Agent can use directly, not parser labels such as `SQL 输出字段`, `来源表达式`, `${Selector:...}`, `${PartDate:...}`, `C00`, raw SQL fragments, or visible build-process phrases such as `CLI Agent 基于同一资产快照生成`, `摘要来源`, `semantic_plan`, `builder`, `parser fallback`. All business analysis should be completed here; missing evidence remains explicitly unknown. Precompile affected assets and their dependent domains/cards only on refresh; reuse unchanged semantic plan entries.
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
node "$KB_RUN" +schema --name '<company_kb_name>' --model <model_ref> \
  --custom-instructions-file skills/ae-analysis/scripts/project-semantic-knowledge-wiki/default-compile-rules.md --host <host>
node "$KB_RUN" +status --name '<company_kb_name>' --host <host>
# Run only after schema generation succeeds.
node "$KB_RUN" +compile --name '<company_kb_name>' --mode full --model <model_ref> --host <host>
```

Poll `+status`; never poll by resubmitting Schema. Schema/compile failure stops the flow; do not switch to snapshot import. Start with a few representative assets before attempting the complete package.

## Refresh: update changed Markdown sources

Regenerate the local Wiki using the existing semantic-plan contract. On refresh, reuse unchanged semantic-plan entries instead of asking the Agent to rewrite them. The builder persists the reusable semantic plan and fragment-level state in `sources/project/<namespace>-refresh-state.md`, and records each Markdown source's fragment dependencies. A changed recall card, SQL summary, domain model, appendix, or project model affects only sources that reference that fragment; never treat the whole semantic-plan file hash as a full-source rewrite trigger. When the asset package snapshot hash changes but the existing plan is intentionally reused, pass `--allow-semantic-plan-snapshot-drift`; the builder still validates current project, domain, asset, recall-card and SQL-report references against the new package and stops if the closure no longer matches. Do not use this flag for first build or to bypass real asset additions/removals. Use normalized content hashes from the builder's upload manifests so snapshot-only header changes do not rewrite every asset:

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

The normal refresh baseline is remote managed state, not the local filesystem. Read `+list-sources` once to get the ZIP source ID and current `contentRevision`, then read only `sources/project/<namespace>-refresh-state.md`. The refresh state hidden payload contains the previous semantic plan, fragment state, source-tree manifest, source ID, content revision, published version ID, and manifest hash. If `contentRevision` matches the saved baseline, use `--previous-refresh-state` and compare against the saved source-tree manifest; do not page through every remote file and do not run full `+source-read` over the ZIP. If it differs, treat the baseline as potentially stale but still start from `--previous-refresh-state`; verify only paths that would be written or removed before mutating them, and escalate to a full source-tree read only when the refresh state is missing, corrupt, or cannot explain the required conflict check. A local `<previous>-kb-source-tree-manifest.json` with `--previous-manifest` is a compatibility fallback for manual repair runs, not the scheduled path.

The returned plan contains add/replace/remove actions and unchanged paths under `sources/...`, with `skip` or `incremental` compilation. `--previous-tree-root` lets a repair run re-hash the last applied local baseline with the current normalizer, so harmless compiler/normalization-rule changes do not create a one-time false delta. Do not replace an existing ZIP parent. Before each write, verify the target remote bytes still match the saved source-tree manifest hash for that path; preserve unexpected manual edits and stop on conflicts. After successful writes, replace the managed refresh-state source with the new payload produced by `--embed-refresh-state-baseline` so the next run remains independent of local state. Compare by the stable ZIP-relative `sources/...` path. Do not replace the ZIP parent or re-upload every file. Do not run the old flat-source uploader or `plan-kb-source-sync.mjs`.

For each changed path, obtain the current revision and perform one existing command through the wrapper:

```bash
node "$KB_RUN" +source-ls --name '<company_kb_name>' --id <zip_source_id> --path '' --host <host>
node "$KB_RUN" +source-put --name '<company_kb_name>' --id <zip_source_id> \
  --path sources/assets/reports/pskb-p5-report-123.md --file <local-file> --action replace --expected-revision <revision> --host <host>
node "$KB_RUN" +source-rm --name '<company_kb_name>' --id <zip_source_id> \
  --path <removed-generated-path> --expected-revision <revision> --host <host>
```

Only remove files owned by this generated asset package. Preserve unrelated source material and unexpected manual edits; stop on conflicts. Keep deletion confirmation unless the exact refresh deletion scope is already authorized. Execute sequentially using returned revisions; a 409 requires fresh discovery and review, not blind retry. Failed writes stop compilation. On resume, compare current remote bytes again so already successful writes are not replayed. Unchanged files are not written. Apply changed Markdown manifest/index sources from the plan too; keep the JSON sync manifest local. A refresh-state-only baseline update is a managed-state write and does not by itself require compilation.

After all source-tree changes succeed, call `+compile --mode incremental --model <model_ref>` exactly once. Reuse the existing Schema. Do not force full compilation based only on file count or percentage. No file changes means skip compilation unless the user explicitly requests rebuilding or compiler rules have changed. Schema/authority/taxonomy rule changes require an explicit rebuild decision; normal source updates do not.

Compiled navigation must stay decision-oriented. The generated Wiki homepage should first point to the project business model, then business domains, recall cards, category indexes, governance/review pages, and a small set of representative titled entries only. It should not list every report/dashboard file or bare numeric IDs. Individual assets belong in their category index or domain context, with title-first link text and IDs as supporting identity.

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
- An unauthenticated child retained through a certified parent is `dependency_only`; it can support its parent but cannot independently become the answer.
- Technical appendix, duplicate, demo, reproduction, and targeted-diagnostic assets are blocked from standalone recall.
- Ranking order is: project/permission/status filter -> recall card -> canonical and valid assets -> certification -> semantic relevance and usage. Raw evidence never participates in first-round broad recall.

## SQL report rules

Every SQL report requires structured semantics grounded in the packaged SQL and parameters. The compiled Wiki must include one CLI Agent-authored `## Agent 使用摘要` for every SQL report. That single section is the primary SQL business source; do not create a second SQL-specific summary section. The local review retains `sql_semantic_facts` and raw SQL for audit. KB consumes the precompiled meanings and only reopens analysis for concrete inconsistencies or new human evidence. Apply `default-compile-rules.md` to preserve:
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

Do not automatically migrate existing flat sources or read-only snapshots. Keep existing user material and resolve a separate migration scope when necessary. Source-tree refresh uses the recorded ZIP source ID and directory mutations above.
