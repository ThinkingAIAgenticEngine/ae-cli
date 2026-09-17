# Knowledge-guided analysis workflow

Use this workflow after knowledge-base retrieval when the pages will guide a
project-scoped business data analysis. The knowledge base determines which
saved asset to execute, which business definition applies, and which
conclusions are out of bounds. Current values still require an `ae-analysis`
data query.

This workflow does not define knowledge-base compilation rules. Do not use it
to create, upload, generate a schema for, compile, or delete a knowledge base.

Asset-authentication and metric-recommendation review is a separate workflow.
For requests to recommend authentication assets or metrics, use
`analysis-meta governance-recommendation export|submit|decisions` without
project-KB retrieval as a prerequisite.

## Establish source evidence

1. Apply the `ae-analysis` project gate before any project-scoped analysis
   command. Verify the host and exact project ID; a KB name, binding, or display
   name does not prove the live project identity. Do not probe a default or
   previously used project while resolving the requested one.
2. Use `ae-kb-discovery` to select the candidate. An explicitly named KB wins;
   otherwise prefer a compiled KB whose `bindings.targetType` is `project` and
   whose `targetId` exactly matches the verified project ID.
3. Follow the deterministic `+index -> +grep -> +read` procedure in
   [`query-workflow.md`](query-workflow.md). Only source-page content actually
   returned by `+read` counts as a KB hit. A list item, index title, grep
   snippet, or `+ask` synthesis alone is not enough to drive execution.
4. If `+ask` helps locate or synthesize multiple pages, read its cited source
   pages before executing data queries. Verify asset IDs, definitions, dynamic
   parameters, time rules, and limitations in the source text.
5. Search with the business object, metric, product area, and time wording from
   the user's question. Prefer a section that contains both an asset chain and
   its semantic definition; do not substitute an asset merely because its
   title is similar.

A compiled KB is a snapshot, not a live data source. Use it for routing,
semantics, and decision boundaries. Verify current asset existence, the current
saved definition, and current data with `ae-analysis`.

## Choose the most specific executable asset

A recall card's primary dashboard is a routing prior, not automatically the
final executable asset. Before building the execution contract, compare the
question with the linked asset pages and choose the smallest saved asset chain
that covers the requested output.

When a recall card points to a broad dashboard but the user requests a concrete
ranking, table, member/customer list, breakdown, or parameterized result, make
one targeted `+grep` call against the relevant detail-asset directory copied
from the KB index, such as `wiki/reports`. Search with the user's business
object, requested dimensions, measure, and output form. Read the best exact
candidate page before executing anything.

Rank candidates by semantic coverage, not by primary/backup position alone:

1. Prefer a page whose "questions answered", purpose, grain, dimensions,
   measures, and output fields directly cover every requested subquestion.
2. Prefer one parameterized saved report that produces all requested variants
   under one definition over several generic reports with different definitions.
3. Prefer an asset that exposes the requested business-facing dimensions and
   fields directly. Do not substitute an account ID when the question asks for
   member display names if a matching saved report exposes those names.
4. Then apply authority, certification, definition-state, and runtime-policy
   evidence. A certified broad dashboard does not outrank an equally governed
   report whose stated question and output are a more exact match.
5. Treat the recall card's primary order as mandatory only when the card
   explicitly states that alternatives must not be used for this question.

If two candidates encode materially different meanings of the same phrase,
such as one-way events versus combined inbound and outbound events, do not
blend them. Select the candidate whose stated question, output shape, and grain
best match the request, and disclose the chosen definition.

## Build the analysis execution contract

Before calling a data-query command, extract and retain this contract from the
pages actually read:

| Contract field | Required evidence |
|---|---|
| Business question | Metric, entity, dimensions, filters, comparison, and requested output |
| Asset chain | Exact type, ID, name, and parent-child relation for dashboards, reports, metrics, or other saved assets |
| Statistical definition | Event or metric, aggregation, distinct entity, dimensions, and filters |
| Saved parameters | Exact parameter names, value domains, defaults, selectors, and the requested overrides |
| Time contract | Fixed or dynamic window, inclusion of today, timezone, and whether an override is supported |
| Authored context | Folder, dashboard name, remarks, notes, and business filters, with their applicable scope |
| Decision boundaries | Case-only, frontend-only, adoption-only, not revenue, non-generalizable, expired, conflicting, or human-decision-required constraints |
| KB evidence | Exact KB name, page path, and section actually read |

Classify the contract before querying:

- `executable`: exact asset identity and semantics cover the question, with no
  unresolved conflict.
- `partially_executable`: evidence covers only some subquestions; query and
  answer only those parts.
- `blocked`: a required asset, metric, aggregation, entity, filter, parameter,
  time rule, or decision boundary is missing or conflicting; stop the affected
  query and report the gap.

Do not fill a contract gap with general knowledge, a similarly named asset, or
a technically valid query. When the task forbids clarification, return that the
available evidence cannot answer the affected part instead of choosing an
interpretation silently.

## Execute the exact saved-asset chain

An exact asset identified by a source page takes priority over fuzzy search and
ad-hoc analysis:

1. For a dashboard ID, call `analysis dashboard get` once with the verified
   project ID. Verify its name, child reports, `effective_settings`,
   `filter_config`, remarks, and notes, then execute the child report identified
   by the KB evidence.
2. For a report ID, call `analysis report get` with the verified project ID.
   Verify its model, metric, aggregation, dimensions, filters, saved parameters,
   and time definition before querying data.
3. Read the matching `ae-analysis` data-command reference before execution. Use
   [`report_data_run.md`](../../ae-analysis/references/report_data_run.md) for a
   bounded saved report result and
   [`dashboard_report_data_run.md`](../../ae-analysis/references/dashboard_report_data_run.md)
   when dashboard execution context is required. Use the corresponding export
   reference only for complete, unknown-size, over-limit, or long-running output.
4. For an SQL report, use `analysis report-data run` with only names present in
   the live report's `definition.params`, passed through `--sql-params`. Date
   changes must use the saved date/time parameter. Dashboard generic filter or
   time overrides do not apply to SQL reports.
5. For a non-SQL report, use the saved report or dashboard-report data command
   and only the supported filter, grouping, and time overrides documented by
   `ae-analysis`.
6. For a metric or another saved asset, use its exact identity and corresponding
   command. Never replace it with a same-name object.
7. Use the saved-asset discovery procedure from `ae-analysis` only when the KB
   page provides no exact identity. A discovered candidate still requires
   semantic equality, not title similarity.

If the user asks for multiple groupings that one saved dynamic report supports,
execute that same report once per required parameter variant. Keep the common
metric, time, environment, and other filters identical. Do not repeat an
identical data command merely to inspect output that was locally truncated;
capture or export the complete result through the supported data command.

The statement "the KB contains definitions but not current values" means that
the matched saved asset must be attempted first. It does not authorize jumping
directly to a reconstructed SQL or ad-hoc query. If the attempt cannot produce
a usable result, follow the explicit ordinary-analysis fallback below.

When the live definition agrees with the KB, use the query result as data
evidence and the KB page as routing, semantic, and boundary evidence.

## Preserve authored parameter semantics

- Copy exact saved parameter names and allowed values from `analysis report get`.
  Map the user's requested time, environment, member/company grouping, and
  limit to those parameters without renaming or reinterpreting them.
- A saved selector, lookup table, user group, or dashboard filter is part of the
  definition. Do not replace it with a convenient event property or a guessed
  equivalent. For example, a saved "formal environment" selector backed by a
  lookup table cannot be replaced with `is_dev=false` unless the KB or current
  saved definition explicitly establishes that equivalence.
- If a dependency used by the saved report is not expanded in the KB snapshot,
  execute the saved report as authored. Do not rebuild that dependency from
  partial KB text.
- Inspect the returned effective time, route, warnings, partial failures, and
  pagination/truncation signals before computing or presenting results.

If the live asset differs from the KB snapshot, determine whether the difference
affects the question. A difference in metric, aggregation, distinct entity,
filter, saved parameter, time window, or applicable scope is a conflict: stop
the affected conclusion, show the conflict, and do not silently choose one
definition or hide it with a replacement query.

## Fall back without hiding the knowledge-base result

None of these conditions alone authorizes an ad-hoc or SQL reconstruction:

- The exact saved asset has not yet been attempted.
- The exact saved asset returns an empty result.
- The exact asset has a validation, transport, capability, or definition
  execution failure.
- Only part of a multi-report or multi-variant request succeeds.
- Its definition contains a semantic conflict, label mismatch, or disagreement
  between the metric name and aggregation.
- It has a fixed historical window while the user asks about the current period,
  a recent period, or another date range.
- The page limits the evidence to one case, frontend behavior, adoption, one
  customer, or one version.
- The result is unexpected, while another similar asset would be easier to run.
- A direct SQL or ad-hoc query appears faster or easier to parameterize.

Handle these states without changing the contract:

- Empty result: report that the saved asset is empty under its complete saved
  context. Recheck effective parameters, time, warnings, and cache behavior on
  that asset when useful. A diagnostic query may explain the empty result, but
  it must be labeled separately and must not replace the empty saved-asset
  result.
- Validation or parameter error: re-read `analysis report get` and correct only
  the input mapping allowed by its saved definition. Do not translate the report
  into SQL.
- Partial success: retain successful saved-asset results and apply these rules
  independently to each failed part. Do not discard valid sub-results or replace
  the whole request with one reconstructed query.
- Permission denial: preserve the denied asset, error, and request ID. Do not
  retry the denied operation or use an undocumented lower-level API. The
  ordinary analysis fallback may still use another standard `ae-analysis`
  capability, whose permission is independently enforced by the backend.
  Permission denial on a dashboard or report is not, by itself, a prohibition
  on ad-hoc analysis. If the required events, metrics, properties, metadata,
  and ad-hoc capability are accessible through their documented commands, the
  fallback may query them under a separately stated temporary definition.
- Capability unavailable: report a capability gap only after the saved command
  actually returns the corresponding unavailable-capability evidence. Do not
  infer the gap from documentation or skip the attempt. A temporary fallback is
  possible only under the explicit entry and equivalence rules below.
- Transport or transient failure: retry the same saved-asset command only when
  the error contract recommends retry. If the failure persists, preserve its
  evidence and apply the explicit fallback rules below rather than switching
  paths silently.
- Semantic conflict: show the conflicting fields and their impact. A fallback
  may answer under a different, independently verified definition, but it must
  not claim to resolve the KB asset's conflict or present the result as
  definition-equivalent.
- Fixed historical window: answer only for that window. If it cannot answer a
  current-period question, state that it cannot be extrapolated.
- Limited applicability: keep the conclusion within the declared scope. Do not
  expand adoption into revenue or intent, one module into the whole product, or
  one case into all customers.

Technical success is not semantic correctness. A query that changes the
contract's event, metric, aggregation, entity, filter, parameter, time, or
applicable scope is not an equivalent validation.

## Degrade to the ordinary analysis path

The KB path is preferred, not exclusive. If the exact KB-selected asset cannot
produce the requested live result after a real attempt, continue as though no
executable KB asset had been found and follow the ordinary `ae-analysis`
"Existing business asset before ad-hoc" workflow:

1. Search for another accessible saved report or dashboard whose current live
   definition covers the request.
2. Verify semantic equality before using it. A title match is not enough.
3. If no saved definition matches, use ad-hoc analysis only when the normal
   `ae-analysis` rules permit it and the required event, properties, metric,
   aggregation, entity, filters, time, and timezone can be established.
4. Use only documented standard capabilities. Each fallback command remains
   subject to the backend's independent authorization checks.

Fallback is available when the KB-selected asset is missing from the live
project, inaccessible, empty for the requested scope, outside its supported
time or breakdown, or persistently fails after the documented correction or
retry path. The user does not need to restate the original data request merely
to allow this ordinary fallback.

Ad-hoc analysis must still satisfy the safety conditions below. SQL must also
satisfy the additional SQL constraints in `ae-analysis`.

1. The event, properties, metric, aggregation, distinct entity, filters, time
   window, and timezone must be established independently from readable KB
   evidence, another verified saved asset, or verified metadata. Do not infer
   hidden selectors or dependencies from the failed asset.
2. Do not describe a different definition as equivalent when metric,
   aggregation, entity, filter, parameter, time, or scope differs.
3. Do not use fallback to modify, repair, certify, or overwrite the KB-selected
   asset.
4. Do not use an undocumented API or suppress permission, conflict, empty-result,
   warning, or failure evidence from the KB path.

Present the KB path and fallback path separately. State why fallback occurred,
which alternative asset or ad-hoc definition produced the data, and every
material difference from the KB-selected definition. Never claim that the KB
asset produced a fallback result. An empty or denied KB result remains part of
the audit record even when the fallback succeeds.

## Answer with traceable boundaries

Make these three layers distinguishable in the final answer:

1. **Query result:** saved asset used, actual time window, metric value, filter
   scope, and effective execution settings.
2. **Knowledge basis:** KB name, page path, and section used, plus the asset,
   parameter, and semantic choices it constrained.
3. **Limits and unresolved issues:** fixed windows, limited applicability,
   definition conflicts, permissions, warnings, partial failures, or data gaps,
   and the questions they prevent you from answering.

Cite at least the KB name and page path for knowledge evidence. Use the asset
name and available link for data evidence rather than presenting a raw ID as the
primary label. Never present historical values copied from a KB page as a
current query result, and never present an inference as verified fact.
