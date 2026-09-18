# Project semantic knowledge base compile rules

These rules guide Schema generation for project semantic knowledge bases built from source tree ZIP uploads.

- Generate durable compile rules only. Do not copy platform working directory names, absolute filesystem paths, temporary extraction paths, source IDs, run IDs, or local machine paths into the generated rules.
- Refer to the uploaded material as "the ZIP source tree" or "files under the source tree root". Use stable source-tree paths such as `sources/assets/reports/...` only when a rule must mention a category.
- Treat `sources/README.md` and category `README.md` files as filing guides. They define where future material belongs; they are not business evidence.
- CLI-managed asset facts live under `sources/assets/**`. Human project background, business rules, meetings, decisions, corrections, and references live outside `sources/assets/**`; asset refresh must not delete or override those human inputs.
- Organize generated Wiki pages for knowledge consumption, not by mirroring every source file. Use project overview, business domains, reusable semantics, assets, decisions, and review pages.
- Do not infer business meaning from titles alone. Preserve unknowns, conflicts, source scope, certification state, and provenance when evidence is incomplete.
- Corrections and decisions override other material only when they state target, content, date, status, and applicable scope.


## Navigation and page naming

The generated top-level `index.md` must be a decision-oriented navigation page. It may contain only module navigation, common-entry guidance, and a compact category/count overview. Do not append a complete page list, sitemap, individual asset files, metadata property pages, numeric report IDs, numeric dashboard IDs, source container IDs, or raw source filenames to the top-level page. Top-level navigation should link to project overview, business domains, recall cards, asset category indexes, decisions, and review pages. List individual assets only inside the matching asset index page, domain page, dashboard page, source-container page, or search result context. If the compiler wants to expose a full sitemap, put it under `wiki/index.md` or category index pages, never in root `index.md`.

When linking to an individual asset, use its business title as the visible link text and keep the numeric ID only as supporting identity beside the title, for example `示例报表（report 1001）`. Do not render bare numeric links such as `1001` as navigation items.

## Precompiled source contract

CLI Agent has already performed the main semantic compilation for ALL assets: business meanings, SQL interpretation, calculation definitions, relationships, domains, recall boundaries, and conflict findings. These are editable source documents, not an imported final Wiki snapshot. Reuse their complete prose and calculation facts. Do not repeat project-wide extraction, SQL parsing, semantic planning, or per-field rewriting.

Business-domain pages include an `Agent 使用摘要` for first-hop routing. Preserve it as the concise answer source for "what does this domain solve", "which events/metrics are mainly used", and "which dimensions should the agent drill down by". Do not replace it with a raw report list or regenerate it from every report page unless newer scoped evidence explicitly changes the summary.

KB must compile and publish the final Wiki: preserve prepared asset sections, map source references to Wiki links, build concise titled navigation, and integrate project background, meetings, decisions and corrections. Batch independent page writes and link checks. Do not read each source repeatedly or regenerate unchanged pages.

For SQL assets, preserve the complete Agent-authored purpose, parameters, output fields, grain, filters, limits, applicable/non-applicable questions and evidence locator in the report page's single `Agent 使用摘要`. Raw SQL/index JSON stays in the local evidence package; do not attempt to fetch it or infer omitted details. Missing facts remain unknown. Preserve certification, dependency-only status, conflicts and blocked recall; do not dismiss safety states as stale placeholders.

During incremental compilation, inspect changed sources and their existing dependent pages. Update affected asset pages, indexes and cross-source conclusions; retain unrelated pages. Remove obsolete current assertions when a source changes or is removed. Integrate human evidence according to explicit scope, status and authority, never recency alone. Scope differences belong separately from same-scope contradictions. Preserve provenance to the actual uploaded source.
