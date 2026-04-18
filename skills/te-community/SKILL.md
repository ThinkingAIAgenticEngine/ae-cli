---
name: te-community
version: 1.0.0
description: "TE community analysis: post search, comment sentiment, topic trends, risky content, livestream data"
metadata:
  requires:
    bins: ["ae-cli"]
  cliHelp: "ae-cli community --help"
---

# te-community

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../te-shared/SKILL.md) to learn about authentication, global parameters and security constraints.

## Overview

The `te-community` domain provides community social media data analysis capabilities, including post search, comment sentiment analysis, topic trends, risk content monitoring and livestream data.

Commands are invoked via `ae-cli community <command>`. **This document is mainly for navigation**: For specific usage, examples and Flags, see **`references/`** and each composite analysis reference below.

## Common parameters

| Parameters | Description |
|------|------|
| `--space-id` | Community space ID |
| `--game-id` | Game/space identification |

## Channel ID prerequisite: `get_channel_info`

A large number of subcommands rely on **`--channel-id`** or **`--channel-id-list`** (e.g. post details, comment summaries, live session lists, and channel-filtered search). If you only have `space-id` / `game-id` and do not yet know channel IDs, call `ae-cli community get_channel_info` first to retrieve channel IDs and names, then run follow-up commands. See [get_channel_info](references/get_channel_info.md) for details.

## Array parameter format

Multi-valued parameters are separated by commas:
```
--channel-id-list 1,2,3
--keywords tag1,tag2
--sentiment-types 0,1
```

## Date format

All date parameters use `yyyy-MM-dd` format, such as `--start-time 2024-01-01`.

## Reference documentation (subcommand navigation)

Open the corresponding file as needed to view instructions and examples (one page per command):

- Search posts or videos by keyword/time period: [search_posts](references/search_posts.md)
- Got the `post-id`, view the details of a single piece of content: [get_post_detail](references/get_post_detail.md)
- Query the list of available analysis tags: [get_corpus_tags](references/get_corpus_tags.md)
- Quickly view the overall sentiment and summary of the comment area: [get_comments_summary](references/get_comments_summary.md)
- Analyze the distribution and proportion of comment tags: [get_comment_tag_analysis](references/get_comment_tag_analysis.md)
- View sentiment trends (by time period): [get_sentiment_overview](references/get_sentiment_overview.md)
- View the community overview (posts, interactions, etc.): [get_overview_metrics](references/get_overview_metrics.md)
- Identify current hot topics: [get_hot_topics](references/get_hot_topics.md)
- Drill down to view the details of a topic: [get_topic_detail](references/get_topic_detail.md)
- Observe trends for specific tags: [get_tag_trends](references/get_tag_trends.md)
- Generate/view single-day community summary (daily): [get_daily_summary](references/get_daily_summary.md)
- Troubleshoot risk content and security compliance issues: [get_risk_content](references/get_risk_content.md)
- Get the list of livestream rooms and determine the room range: [get_livestream_rooms](references/get_livestream_rooms.md)
- View the live session history list: [get_livestream_list](references/get_livestream_list.md)
- Check the details of a livestream session: [get_livestream_detail](references/get_livestream_detail.md)
- Livestream session AI analysis report (highlight slices and emotional views): [get_livestream_analysis](references/get_livestream_analysis.md)
- Check the overall performance of the livestream module within the time period: [get_livestream_overview](references/get_livestream_overview.md)
- View the annual metrics of a single livestream room: [get_livestream_room_metrics](references/get_livestream_room_metrics.md)
- Get the channel list and basic channel information: [get_channel_info](references/get_channel_info.md)

## Advanced analysis skills

The following skills are called based on the MCP tool chain combination and are used to generate structured in-depth analysis.

### community-activity-analysis (activity-specific operation insight analysis)

In-depth evaluation of in-game activities or marketing events, including exposure impact, community sentiment, UGC ecosystem response, and long-tail effects.

For details, see: [`references/community-activity-analysis.md`](references/community-activity-analysis.md)

---

### community-daily-report (Daily Express)

Generate a concise "User Operations Daily Brief" covering single-day macro trends, breaking sentiment signals, and safety/compliance risks, with day-over-day comparison (T-1 vs T-2).

For details, see: [`references/community-daily-report.md`](references/community-daily-report.md)

---

### community-character-analysis (character-specific in-depth analysis)

In-depth analysis of specific game character ecology, players' emotional motivations and core needs, focusing on root causes rather than superficial phenomena.

For details, see: [`references/community-character-analysis.md`](references/community-character-analysis.md)

---

### community-hottopic-insight (topic analysis)

Build a "time -> event -> sentiment" evolution chain around a single topic and output an executive summary, key discussion clusters, sentiment slices, channel insights, and action recommendations.

For details, see: [`references/community-hottopic-insight.md`](references/community-hottopic-insight.md)

---

### community-weekly-report (weekly summary of community operations)

Summarize the data for the week, focus on connecting the core escalating discussion events of the week based on the "Daily Summary", and output a "Community Operations Weekly Summary Report."

For details, see: [`references/community-weekly-report.md`](references/community-weekly-report.md)

---

### community-analyzing-official-content (official content analysis)

Analyze recently published official content for a specified game in the community module, then classify and summarize it using the predefined categories.

For details, see: [`references/community-analyzing-official-content.md`](references/community-analyzing-official-content.md)

---

### community-analyzing-theme-comment (in-depth analysis of the theme comment area)

Conduct in-depth analysis of comments on specified posts or videos, then produce a report covering trend shifts, viewpoint distribution, and key takeaways.

For details, see: [`references/community-analyzing-theme-comment.md`](references/community-analyzing-theme-comment.md)
