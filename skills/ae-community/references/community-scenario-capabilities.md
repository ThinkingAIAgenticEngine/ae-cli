# Community Scenario Capabilities

Use this reference when the user needs a workflow that is not covered by one legacy curated
`community +...` command. The capabilities below are Gateway L3 unless explicitly shown as an L1/L2
command. Always discover and inspect the live capability before constructing input:

```bash
ae-cli capability search "<user intent>" --domain community
ae-cli capability inspect <capability-id>
ae-cli capability validate <capability-id> --input '<json>'
ae-cli capability run <capability-id> --input '<json>'
```

Use either `validate` or `dry-run` while correcting input; do not run both by default. Copy every
int64 ID exactly and keep it as a JSON integer or quoted string accepted by the inspected schema.

## Admission decisions

| Candidate area | Decision | Reason |
|---|---|---|
| Bounded full-text evidence | L1: `community evidence fetch` | Deduplicates up to 20 real locators, verifies response identity, and reports a text budget and per-item failures. |
| Space and source discovery | L2: `community spaces list`, `community sources list` | They remove ID guessing and close the reporting prerequisite chain with typed int64 flags. |
| Comments, workbench, visual analysis, tag/hotspot/risk/keyword queries | L3 capabilities | They have stable read contracts, but a static alias would add no value beyond discovery and schema inspection. |
| Comment image evidence | Reuse `community.content.post_detail` | Images belong to the post/video evidence contract; the independent comment result has no stable comment-image field. |
| Livestream report status | Reuse `community.content.livestream_analysis` | Its `status` is already the authoritative state: `0` processing, `1` finished, `2` ready, `3` error. |
| Tag refresh, report generation, keyword/risk/alert mutations | Do not add yet | The analysis workflows do not require mutation, and these writes do not yet have a stable Gateway dry-run contract. |
| Dedicated chat permission | Do not invent | No deployed chat-specific Apollo permission function exists. Trust the inspected capability metadata and never claim dedicated isolation. |

## Foundation: space, source, and channel IDs

```bash
ae-cli community spaces list
ae-cli community sources list --space-id <space-id>
ae-cli community +get_channel_info --space-id <space-id>
```

Use `community.space.get` only after selecting a space and when its metadata is needed. The L2
`community sources list` command is backed by `community.source.list`. Source discovery requires
data-configuration view permission; a permission error is not evidence that no sources exist.

## Workbench and saved reports

Use this chain for “what reports exist?”, “show the preset metric”, or “inspect this saved report”:

1. `community.dashboard.preset_catalog` discovers the eight stable preset keys.
2. `community.dashboard.preset_report` runs one preset for a date range and optional channels.
3. `community.visual.report_list` searches saved visual reports.
4. `community.visual.report_detail` returns the selected report's graph shape and saved config.

Do not treat the preset catalog as current dashboard layout. It is a side-effect-free catalog; it
does not initialize or modify dashboard state.

## Post and comment evidence closure

Use this sequence when a summary must be supported by raw discussion evidence:

1. `community.content.search_posts` finds candidate posts or videos.
2. `community.content.post_detail` returns the subject, media/image evidence, tags, and initial comments.
3. `community.content.list_comments` independently pages a flat comment list with stable reply/root identifiers; it does not return a complete reply tree.
4. Apply its date, sentiment, and `tag_filters` fields to narrow the evidence set.
5. Use `community.content.comments_summary` and `community.content.comment_tag_analysis` for aggregates.

Never claim that `list_comments` returns comment-level images. Cite post/video images from
`post_detail`, and cite flat comment text and returned stable comment IDs from `list_comments`.

## Livestream chain

1. Discover rooms with `community.content.livestream_rooms`.
2. List sessions with `community.content.livestream_list`, then inspect a session with
   `community.content.livestream_detail`.
3. Use `community.live.follower_trend` for daily room follower changes.
4. Use `community.content.livestream_analysis` for both the AI report and generation status.

If report status is `2` (`ready`), report that generation has not started. Do not trigger report
generation automatically; no stable read-only capability performs that write.

## Chat chain

The detailed identity and service-metric safeguards remain in `community-chat-analysis.md`.
Additional discovery routes are:

- `community.chat.top_keywords` for an explicit ranked keyword list;
- `community.chat.list_intent_rules` for configured intent meanings;
- `community.chat.list_servers` for server discovery before segmented comparisons.

Do not infer a server-by-room-type result from `list_servers`, and do not calculate service KPIs
without the complete staff roster required by the chat workflow.

## Metadata-driven visual analysis

Use this strict order:

1. `community.visual.metadata` returns supported filters, dimension properties, metrics, and static quotas.
2. `community.visual.filter_values` discovers actual values for a selected metadata field and date range.
3. Build `community.visual.analysis` input only from returned metadata. Include at least one `quotas`
   or `formulas` item.
4. Preserve the exact query and the raw axis `value` fields from the result.
5. Pass that query and selected raw values to `community.visual.drilldown` to retrieve source content.

Never invent `column_name`, `table_type`, calculation symbols, metric codes, group definitions, or
formula aliases. Labels are for presentation; drill-down uses raw axis values.

## Tag definition and refresh plan

Start from `community.content.corpus_tags`, select a real `tagId`, then call
`community.tag.detail` with both `game_id` and `tag_id`. The result contains the rule definition,
corpus range, `refreshStatus`, refresh type/interval/hour, and update timestamps. The capability
rejects a tag that belongs to a different space.

This is inspection only. Do not promise that a refresh was scheduled or run.

## Daily summary and topic evidence

1. `community.hot.summary_dates` discovers dates that actually have summaries.
2. `community.hot.daily_summary` returns the selected day's ranked hotspots and opinions.
3. `community.hot.hotspot_evidence` pages the source content behind one `hotspotId`.
4. `community.hot.topic_detail` gives topic aggregates.
5. `community.hot.topic_resources` closes the topic-to-content evidence loop for a selected date range.

Use available dates instead of repeatedly guessing dates with no generated summary.

## Risk configuration inspection

Use `community.risk.type_catalog` to discover supported rule templates, then
`community.risk.rules` for space-specific rules and `community.risk.alerts` for alert configuration.
Use `community.content.risk_content` only after that discovery when the user needs matching risky
content and trends. Keep rule configuration separate from detected content.

## Keyword discovery

`community.keyword.groups` lists configured main/sub-keyword relationships.
`community.keyword.ranking` returns high-frequency unmerged keywords for a date range. These are
read-only inspection abilities, not management writes; never claim a keyword or group was changed.

## Query and evidence quality

See [community-query-evidence.md](community-query-evidence.md) for the query contract, A100-only contributor drill-down, cumulative interaction semantics, and bounded evidence command. Do not treat formula base content as numerator evidence or assume that a result has a snapshot.
