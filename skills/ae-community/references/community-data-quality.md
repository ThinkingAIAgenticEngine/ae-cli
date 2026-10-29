# Community data quality and source authority

Read this reference before interpreting a material change, an event announcement, or propagation. Apply checks relevant to the question; do not repeat every limitation in every answer. Discover the actual schema and use only returned fields. These rules do not add collection-health, verification, or cleaning APIs.

## One Agent, discoverable capabilities

The preset community Agent is the designated user-facing Agent entry for community capabilities. This product skill and the approved community scenario skills supply its execution workflows. Select the relevant workflow for the task; do not ask users to switch between separate community Agents or run every scenario at once.

Use installed CLI help, Capability Gateway discovery, and matching skill references when capabilities change. A prompt's example list is not a permanent capability ceiling. Local development code is not proof of deployed availability. Keep server authorization and actual resource ownership checks in effect.

## Data lag, missing records, and processing

Before explaining a change, check the requested channels, resource types, dates, and visible coverage. Use available latest-content times, collection or processing status only when their meaning is established.

- Separate source publication time, record crawl/update time, individual metric observation time, and this query's execution time. Missing timestamps or watermarks remain unknown. Do not invent a fixed delay or a health endpoint.
- Post/video detail `lastUpdateTime` comes from the content's last-crawl column. It is not evidence that every interaction metric was refreshed. Generic update timestamps do not prove collection or processing completion.
- A quiet recent window, a missing channel, empty summary, or fewer analyzed tags may reflect incomplete arrival or processing. Report the currently observed change; investigate coverage before claiming declining interest, churn, no anomaly, or an ingestion failure.
- Prefer periods with comparable coverage and sufficient observation time. If completeness cannot be established, state that business change and data lag cannot yet be distinguished. Do not silently exclude a missing channel and keep the original denominator.
- Reading all visible pages does not prove complete upstream collection. No data, unknown totals, partial processing, failed requests, and confirmed zero values are distinct states.

## Suspected irrelevant data

The current product baseline has no automatic dirty-data detection. Summaries, titles, and tags can reveal potentially unrelated material or conflicting context, but they are discovery hints. List summaries may be truncated and generated summaries may lose context.

1. Flag a candidate as suspected irrelevant, with the specific reason.
2. Read the original source and relevant context within a bounded evidence budget.
3. Keep confirmed exclusions and unresolved candidates separate from the original query population.
4. Report which records were reviewed and why a record was excluded from this analysis. Do not claim that records were deleted, the service filter changed, or the entire dataset was cleaned.

Do not discard negative feedback, short comments, unfamiliar slang, or an entire platform by default. Check duplicate identity using resource type, channel, and UUID; the same title alone is not proof of duplication. Sample filtering cannot establish the whole dataset's relevance rate or a corrected full-population count.

## Event authority and game-community rumors

Players can fabricate announcements or imitate official wording. For updates, campaigns, compensation, shutdowns, and partnerships, verify the originating source and the exact product, region/server, date, and version.

- **Official confirmation:** a reliably identified official source directly supports the particular claim. One valid official statement is sufficient evidence for what it actually says.
- **Independent corroboration:** credible independent sources support the same claim. This increases confidence but must not be relabeled as official confirmation.
- **Unverified rumor:** a lone report, unknown identity, common-source reposts, or conflicting accounts. Mark it unverified; a single report is not automatically false, and failure to find an announcement is not disproof.

Multiple accounts copying one screenshot or quoting one post are not independent sources. Distinguish evidence that a rumor is spreading from evidence that the alleged event actually happened.

The system's existing official-content marker does not itself prove platform verification or factual accuracy. Author name, follower count, sentiment, and risk labels are not authenticity evidence. If the current tools cannot verify identity or visit the original source, state that limit rather than inventing a verification result. Preserve the source, publication time, and reason behind a credibility judgment.

## Interaction freshness and propagation

Interaction values can be missing or stop updating; indefinite tracking is not guaranteed.

- Missing values are not zero. An unchanged count is not proof that propagation stopped. A new query time is not proof of a new metric observation.
- Latest cumulative likes, comments, or shares are not period increments. Without comparable historical observations, do not claim growth velocity, final reach, or rank changes from differences between cumulative values.
- Current detail/capability outputs do not establish per-metric refresh coverage. Even a combined latest collection time, when a surface exposes it, may be only the maximum across metrics rather than a common observation time for all metrics.
- For comparisons, state the platform metric definition, content age, and known refresh coverage. Do not combine different platforms or incompatible coverage into a precise propagation ranking without explaining the limitation.
- When coverage is insufficient, describe recorded interactions and individual examples. Do not infer whether collection stopped, upstream values stopped changing, or data is missing unless there is evidence.

## Internal navigation

Preserve working internal navigation when adding or revising capabilities. Only use a verified route and trusted frontend base URL with complete identifiers; the API host is not automatically the frontend base.

For post/video detail, URL-encode the path and query values separately:

```text
<frontend-base>/#/sentiment/media-feed/detail/<uuid>?resourceType=<0-or-1>&channelId=<channel-id>&spaceId=<space-id>
```

New flat comments use `root_uuid` and `root_resource_type` for this link. `parent_uuid` is a parent comment, not necessarily the root content. Keep `reply_uuid` and the quote alongside the link: the current route opens the root post/video and does not locate an individual comment. Existing DTOs may use different field names; read their documented semantics.

Distinguish a platform-internal detail link from an original external URL. Use only returned original URLs. Do not guess other modules' routes from this template, generate a comment type `5` detail route, or treat a link as proof that the recipient has access.

For query and evidence mechanics, see [community-query-evidence.md](community-query-evidence.md). For deployed scenario routing, see [community-scenario-capabilities.md](community-scenario-capabilities.md).
