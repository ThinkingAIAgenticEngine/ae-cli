---
name: ae-analysis
version: 4.0.2
description: "Use ae-cli for AE/TE analysis-side data questions and asset operations: reports, dashboards, ad-hoc models, drilldown, detail data, alerts, clusters, tags, metrics, metadata, project configuration, tracking plans, projects, and resource links. Use when the user asks to query data, explain a change, export evidence, or inspect/create/update analysis assets."
---

# ae-analysis

This is the single entry skill for analysis intent and command execution.

## Before any command

1. If the command family is already known, open its dedicated reference directly. Otherwise search only the matching row in [`references/command_index.md`](references/command_index.md) (for example with `rg`); do not read the exhaustive index end to end.
2. Read the selected command's dedicated reference before composing it:
   - `+list_events` -> `references/list_events.md`
   - `analysis dashboard list` -> `references/dashboard_list.md`
   - replace hyphens with underscores in gateway filenames.
3. For an AI-facing ad-hoc definition, also read [`references/ai_models.md`](references/ai_models.md).
4. For cluster/tag `--definition-request`, also read the matching [`references/user_cluster_models.md`](references/user_cluster_models.md) or [`references/user_tag_models.md`](references/user_tag_models.md). Shared primitives live in [`references/audience_models.md`](references/audience_models.md).
5. For analysis data retrieval, choose `run` or `export` using [`references/analysis_data_retrieval.md`](references/analysis_data_retrieval.md).

The generated command index is exhaustive. This file contains routing and workflow rules only; do not duplicate a hand-maintained command inventory here.

## Boundaries and priority

Use this skill for these CLI services:

- `analysis`: reports, dashboards, BI panels, ad-hoc analysis, drilldown, detail data, alerts, clusters, tags, and async runs/artifacts.
- `analysis-meta`: gateway metadata assets, events, properties, virtual metadata, metrics, data tables, exchange rules, and super metadata.
- `analysis_meta`: metadata governance, metrics, virtual metadata, project config, tracking plans, mark times, and entity catalog.
- `analysis_common`: project discovery and resource links.

For metadata gateway detail outside the commands in the generated index, use the metadata skill. For Engage, DataOps, or Community work, use the corresponding skill.

Use `ae-cli` first. Fall back to te-mcp only for command-not-found, not-supported/not-implemented, a confirmed capability gap, or repeated failures that are not caused by parameters, types, time formats, permissions, timeout choice, or payload construction. State the fallback reason. A validation error or `need_clarification` is a reason to correct the input, not to switch tools.

For tags and audience clusters, use the native `analysis user-tag ...` and `analysis user-cluster ...` gateway commands.

## Global AE CLI Rules

Command forms:

```bash
ae-cli analysis +<command> [options]
ae-cli analysis_meta +<command> [options]
ae-cli analysis_common +<command> [options]
ae-cli analysis <resource> <action> [options]
ae-cli analysis-meta <resource> <action> [options]
ae-cli capability search|inspect|validate|dry-run|run [options]
```

- Legacy `+` commands use underscore flags such as `--project_id`.
- Gateway commands use kebab-case flags such as `--project-id`; the CLI sends snake_case JSON.
- JSON values must be JSON string literals.
- Global flags include `--host`, `--format json|table`, `--jq`, `--validate`, `--dry-run`, and `--yes`. Use `--validate` alone to normalize complex capability input; use `--dry-run` alone for execution or risk preview.
- JSON is the default machine-readable output. On failure, preserve the structured error and non-zero exit.
- Never invent command names, flags, payload fields, projects, resource IDs, asset names, event/property names, metric definitions, or dates.
- 中文时间表达必须按固定语义映射：最近7天/近7天 -> `mode=recent` -> QP `recentDay=0-7`，含今天；过去7天/前7天 -> `mode=previous` -> QP `recentDay=1-7`，不含今天。用户明确说明是否包含今天时，以该说明为准。完整映射见 [`references/ai_models.md`](references/ai_models.md)。

`CAPABILITY_NOT_FOUND` means the current host does not expose that gateway capability; changing parameters will not fix it. A permission error stops any dependent chain. A 404 while inspecting an async run is a route/deployment failure; do not poll the same ID forever.

Interpret gateway envelopes by state:

- `ok: true` with empty data is success and means no matching data. Never relabel an empty report/dashboard result as query failure.
- `ok: true` with `meta.partial: true` is partial success. Use the successful data and explicitly report `meta.failures`; do not fail the whole batch or hide failed items.
- `ok: false` is failure. Preserve `error.code`, `error.message`, and `meta.request_id`, `meta.invocation_id`, `meta.stage`, and `meta.failures` when present.
- Do not retry an unchanged failed command or guess alternative payload shapes. Retry only after applying concrete validation/clarification guidance or correcting a verified transient condition.

For every gateway command that exposes `--request-id`, ae-cli generates a `request_id` and prints it to stderr before dispatch when the caller omits it. Preserve that ID with the final envelope and diagnostics. Pass an explicit `--request-id cli_<32 lowercase hex>` only when a caller-owned correlation ID is required.

### Execution invariants

- Probe the first page exactly once. Verify `ok`, the documented data shape, and the effective `limit` before starting a pagination loop.
- For paginated directory results, continue only with the returned `next_offset` while `has_more` is true. Never calculate a speculative offset, repeat the current page, or declare the list complete before `has_more` is false.
- Track the normalized command, input, and announced `request_id` for every invocation. Never resubmit an identical invocation while it is still in flight; wait for the current process, or inspect its returned `run_id` when it is asynchronous.
- Retry only the items named in `meta.failures`, and only when their `retryable` value and `next_action` permit it. Never retry successful or empty items from the same batch.
- For black-box coverage audits, maintain an explicit module × model × outcome matrix. Mark coverage complete only from observed responses; missing assets, permissions, or fixtures are environment gaps, not passing coverage.

## Mandatory routing

### Project gate

Before a project-scoped command:

1. Reuse a project only when its ID and host/environment were already verified in the same continuous conversation.
2. Otherwise call `analysis_common +list_projects` and resolve the supplied ID/name.
3. If there are multiple plausible projects, the host is unclear, or no project matches, show the candidates and ask; never guess.
4. Re-verify after the user changes project, host, or environment.

### C. FUZZY_SEARCH_FALLBACK

For saved-asset operations on reports, dashboards, metrics, clusters, tags, and alerts, use the relevant list/search command first unless an exact ID or canonical asset name was already verified. Search the user's phrase, broaden it up to two times, then list all candidates. If no resource exists, stop instead of fabricating one.

Do not pre-list events or properties before constructing an AI-facing intent model. Pass the user's wording directly in `definition`; the backend resolves it and returns `resolved` evidence. Call event/property metadata commands only when the user explicitly asks to inspect metadata, the compiler returns `need_clarification` with candidates, or the compiler reports an explicit metadata-resolution capability gap.

### Existing business asset before ad-hoc

When the request can map to a saved business definition:

1. Extract metric, dimensions, filters, time window, and comparison semantics.
2. Search reports; use dashboard search only to discover candidate embedded reports.
3. Read the candidate definition and verify semantic equality, not merely a similar name.
4. Use report/dashboard data when the definition matches.
5. Use `analysis adhoc run|export` when no definition matches, the user explicitly requests ad-hoc exploration, or custom grouping/filtering is required.

Do not call removed QP builders or schema helpers for ad-hoc analysis. `--definition` is the AI-facing contract from `ai_models.md`, not raw QP or a frontend DTO.

### Result data versus metadata

- Metric value, trend, comparison, or anomaly -> saved report/dashboard first, then ad-hoc data.
- Metric definition search/create/update -> metadata commands.
- Event/entity rows -> `event-detail run|export` or `entity-detail run|export`.
- User members from a query result -> follow the returned `query_context_id` and `sources[].target_contract`; never reconstruct raw QP.
- Cluster/tag definition -> matching gateway cluster/tag commands and matching model reference.
- Alert/configuration/tracking-plan requests -> dedicated legacy command reference from the index.

### Run, export, and follow-up

- `run` is a bounded inline preview for known-small work that can complete within the synchronous limits.
- `export` is for complete, unknown-size, over-limit, or long-running results. It returns `run_id` and `artifact_id`.
- Inspect with `analysis run inspect`, download with `analysis artifact download`, and cancel with `analysis query cancel`. Do not call raw lifecycle URLs.
- Drilldown requires the context IDs and target contracts returned by a supported data result. If they are absent, report that drilldown/result-cluster creation is unavailable.

### Writes and destructive operations

Write only with explicit user intent. Use `--validate` alone while correcting complex input, or `--dry-run` alone to inspect the resolved request and execution impact; do not stack both by default. Execute `read` and ordinary `write` commands without `--yes`. For `high-risk-write`, dry-run first, summarize the target and impact, wait for explicit user confirmation, and only then execute the unchanged command with `--yes`.

Project-space and folder create/delete/share are L3 capabilities rather than curated `analysis` commands. Read the matching command reference, then use `ae-cli capability inspect|dry-run|run`; discover `*.members` through `capability search|inspect|run` and [`references/analysis_gateway_assets.md`](references/analysis_gateway_assets.md). For `risk=high-risk-write`, dry-run first, summarize the impact, and execute with `--yes` only after a later explicit confirmation.

After a successful create/update, if a resource ID and supported resource type are available, call `analysis_common +get_resource_url` and return the link. Explicitly state when link generation is skipped because no resource ID exists or when it fails.

## Analysis workflow

For a data question:

1. Clarify only missing facts that change the query: KPI, scope, time window, dimensions, filters, and baseline.
2. Pass the project gate.
3. For AI-facing intent models, let the backend resolve event/property wording and consume `resolved`; discover metadata directly only for explicit metadata inspection, compiler clarification, or a reported resolution capability gap.
4. Check existing reports/dashboards when applicable.
5. Run or export one reproducible query path.
6. For anomalies, compare consistent scopes, rank drivers, then drill down to users/events only when result contexts permit it.
7. Return conclusion, evidence, limitations, and a concrete next action.

For attribution, use the algorithms and self-checks in [`references/analysis_interpretation.md`](references/analysis_interpretation.md). The main driver is determined by absolute contribution, not the largest relative growth rate.

## Output requirements

- Lead with the conclusion.
- Include the metric, time window, dimension/filter scope, value, and baseline needed to reproduce it.
- Separate observed evidence from inferred causes and state uncertainty.
- For attribution, include total absolute/percentage change and dimension contributions sorted by absolute delta; verify the contribution sum.
- Do not return an unexplained raw table.
- State missing data, definition, permission, or capability constraints explicitly.

## Maintenance

When commands change, update source command metadata and the dedicated reference, then run:

```bash
npm run generate:analysis-skill
npm run verify:analysis-skill
npm run verify:analysis-tools
```

The verification fails for missing command references, retired/orphan command references, or a stale generated index.
