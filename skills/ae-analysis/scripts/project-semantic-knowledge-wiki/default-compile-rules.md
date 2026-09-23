# Project semantic knowledge base compile rules

These rules guide Schema generation for project semantic knowledge bases built from source tree ZIP uploads.

- Generate durable compile rules only. Do not copy platform working directory names, absolute filesystem paths, temporary extraction paths, source IDs, run IDs, or local machine paths into the generated rules.
- Refer to the uploaded material as "the ZIP source tree" or "files under the source tree root". Use stable source-tree paths such as `sources/assets/reports/...` only when a rule must mention a category.
- Treat `sources/README.md` and category `README.md` files as filing guides. They define where future material belongs; they are not business evidence.
- CLI-managed asset facts live under `sources/assets/**`. Human project background, business rules, meetings, decisions, corrections, and references live outside `sources/assets/**`; asset refresh must not delete or override those human inputs.
- Organize generated Wiki pages for knowledge consumption, not by mirroring every source file. Use project overview, business domains, reusable semantics, assets, decisions, and review pages.
- The project overview must start with the project-level business model: business positioning, audience roles, business objects, object relationships, decision chains, asset roles in those chains, and non-goals. Asset counts, snapshot hashes, source package metadata and build logs belong after that model. Do not reduce the overview to a directory, asset inventory, or build summary.
- Do not infer business meaning from titles alone. Preserve unknowns, conflicts, source scope, certification state, and provenance when evidence is incomplete.
- Corrections and decisions override other material only when they state target, content, date, status, and applicable scope.


## Navigation and page naming

The generated top-level `index.md` must be a decision-oriented navigation page. It may contain only module navigation, common-entry guidance, and a compact category/count overview. Do not append a complete page list, sitemap, individual asset files, metadata property pages, numeric report IDs, numeric dashboard IDs, source container IDs, or raw source filenames to the top-level page. Top-level navigation should link to project overview, business domains, recall cards, asset category indexes, decisions, and review pages. List individual assets only inside the matching asset index page, domain page, dashboard page, source-container page, or search result context. If the compiler wants to expose a full sitemap, put it under `wiki/index.md` or category index pages, never in root `index.md`.

When linking to an individual asset, use its business title as the visible link text and keep the numeric ID only as supporting identity beside the title, for example `示例报表（report 1001）`. Do not render bare numeric links such as `1001` as navigation items.

## Precompiled source contract

CLI Agent has already performed the main semantic compilation for ALL assets: business meanings, SQL interpretation, calculation definitions, relationships, domains, recall boundaries, and conflict findings. These are editable source documents, not an imported final Wiki snapshot. Reuse their complete prose and calculation facts. Do not repeat project-wide extraction, SQL parsing, semantic planning, or per-field rewriting.

Business-domain pages include a judgment model and an `Agent 使用摘要` for first-hop routing. Preserve them as the concise answer source for "what business state does this domain judge", "which objects/signals/decision path should the Agent follow", "which assets are primary/supporting/drilldown/excluded", "what does this domain solve", "which events/metrics are mainly used", and "which dimensions should the agent drill down by". Do not replace them with a raw report list or regenerate them from every report page unless newer scoped evidence explicitly changes the summary.

Reject or repair any generated Wiki shape where the root, overview, or business-domain pages only list questions, events, metrics, dimensions, reports, dashboards or counts without explaining the business judgment chain that makes those assets useful. Examples in source instructions are illustrative only; never hardcode project-specific business domains, assets, metrics, event names or decision chains into the compiled Wiki.

KB must compile and publish the final Wiki: preserve prepared asset sections, map source references to Wiki links, build concise titled navigation, and integrate project background, meetings, decisions and corrections. Batch independent page writes and link checks. Do not read each source repeatedly or regenerate unchanged pages.

For SQL assets, preserve the complete Agent-authored purpose, parameters, output fields, grain, filters, limits, applicable/non-applicable questions and evidence locator in the report page's single `Agent 使用摘要`. Raw SQL/index JSON stays in the local evidence package; do not attempt to fetch it or infer omitted details. Missing facts remain unknown. Preserve certification, dependency-only status, conflicts and blocked recall; do not dismiss safety states as stale placeholders. Keep build-process markers out of visible Wiki prose: do not expose `CLI Agent`, `摘要来源`, `semantic_plan`, parser fallback labels, or builder/debug terminology as user-facing business content.

For non-SQL report pages, preserve the `Agent 使用摘要` as a usable business routing summary, not a mechanical parser echo. The purpose and applicable-question bullets must not be identical. Metric, dimension and filter sections should preserve structured evidence when present and use source-confirmation wording for unavailable facts. Do not introduce broad placeholder phrases such as `未识别到稳定下钻维度` or `未发现明确过滤` when a safer "open the source report to confirm" boundary is already present.

During incremental compilation, inspect changed sources and their existing dependent pages. Update affected asset pages, indexes and cross-source conclusions; retain unrelated pages. Remove obsolete current assertions when a source changes or is removed. Integrate human evidence according to explicit scope, status and authority, never recency alone. Scope differences belong separately from same-scope contradictions. Preserve provenance to the actual uploaded source.
