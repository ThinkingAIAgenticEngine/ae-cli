---
name: ae-community
version: 2.0.0
description: "AE community analysis: post search, comment sentiment, topic trends, risky content, livestream data."
---

# ae-community

The AE Community domain provides social data analysis: post/video search, comment analytics, sentiment and topics, risk monitoring, and livestream metrics. Commands run as **`ae-cli community +<subcommand>`** — every community subcommand uses the **`+` prefix**.

| Route (MCP) | CLI service | Responsibility |
|-------------|-------------|----------------|
| `community_content` | `community` | Posts, comments, corpus tags, search, livestream content, risk content |
| `community_analysis` | `community` | Channel list, overview metrics, sentiment, tag trends |
| `community_hot` | `community` | Daily summary, hot topics, topic drill-down |

---

## Global AE CLI Rules

AE CLI (`ae-cli`) is the command-line tool for the AE / TE / ThinkingEngine analysis platform. For AE analysis-side requests, prefer `ae-cli` and this skill's reference docs over model memory.

Global parameters:

| Parameter | Description |
|---|---|
| `--format <json\|table>` | Output format. Default is JSON. |
| `--jq <expr>` | jq filter expression for JSON output. |
| `--host <url>` | Override the active AE host. Available on every command and may be placed after the subcommand, e.g. `ae-cli community +<command> --host <url>`. |

Output and errors:
- Successful commands return machine-readable JSON by default.
- Failed commands return `{ "ok": false, "error": { "type": "...", "message": "...", "hint": "..." } }` and exit non-zero.

Safety constraints:
- Read commands can execute directly after required IDs and references are verified.
- Write commands require explicit user intent and normally keep the confirmation prompt.
- Never invent command names, flags, JSON payloads, `project_id`, resource IDs, field names, event names, property names, metric definitions, or date formats. Read the matching command reference and discover real project metadata first.
- **NEVER fabricate or guess resource names** (reports, dashboards, events, properties, metrics, clusters, tags, alerts). Always use list commands to discover real resources first. If a resource is not found after fuzzy search and full list fallback, explicitly tell the user "resource not found" and stop - do not proceed with fabricated names.

**Community** commands use the domain `community` (this skill). Other AE domains include: `analysis` (analysis), `analysis_audience` (audience), `analysis_meta` (metadata), `analysis_common` (common), `operation` (operations).

---

## Overview

Typical use cases:

- Search and inspect posts or videos, then drill into detail and comment analytics
- Track sentiment, keywords/tags, and macro overview metrics by time range
- Monitor risky or moderated content
- Analyze livestream rooms, sessions, and AI-generated session reports
- Produce daily/weekly/activity-style reports via composite references under `references/community-*.md`

For per-command flags and copy-paste examples, use the files in [`references/`](references/).

---

## Parameter conventions

| Item | Description |
|------|-------------|
| `--space-id` | Community space ID (number) |
| `--game-id` | Game / space identifier (number) |
| `--channel-id` / `--channel-id-list` | Often required after you know channel IDs (see **Channel ID prerequisite** below) |
| Globals | Same as other domains: `--host`, `--mcp-url`, `--format`, `--jq`, `--dry-run`, `--yes` |

- **Lists (comma-separated):** e.g. `--channel-id-list 1,2,3`, `--keywords a,b`, `--sentiment-types 0,1`
- **Dates:** `yyyy-MM-dd` for range endpoints (e.g. `--start-time`, `--end-time`, `--date`)

---

## Core concepts

### Channel ID prerequisite (`+get_channel_info`)

Many commands need **`--channel-id`** or **`--channel-id-list`** (post detail, comment summaries, live lists, channel-scoped search). If you only have `--space-id` / `--game-id`, run:

```bash
ae-cli community +get_channel_info --space-id <id> --game-id <id>
```

Then use returned channel IDs in follow-up commands. Details: [`references/get_channel_info.md`](references/get_channel_info.md).

---

## Scenario routing

Route users to composite workflows when intent matches:

| User intent | Start here |
|-------------|------------|
| Single-day ops brief, T-1 vs T-2 | [`community-daily-report.md`](references/community-daily-report.md) |
| Weekly roll-up | [`community-weekly-report.md`](references/community-weekly-report.md) |
| Activity / campaign insight | [`community-activity-analysis.md`](references/community-activity-analysis.md) |
| One character / IP deep dive | [`community-character-analysis.md`](references/community-character-analysis.md) |
| Single topic timeline + actions | [`community-hottopic-insight.md`](references/community-hottopic-insight.md) |
| Official post taxonomy | [`community-analyzing-official-content.md`](references/community-analyzing-official-content.md) |
| Comment thread deep dive | [`community-analyzing-theme-comment.md`](references/community-analyzing-theme-comment.md) |

---

## Common scenarios

### 1. Search and content drill-down

```bash
ae-cli community +search_posts --space-id 1 --game-id 1 \
  --start-time 2026-04-01 --end-time 2026-04-07

ae-cli community +get_post_detail --space-id 1 --game-id 1 \
  --channel-id 1 --uuid <uuid> --resource-type 0

ae-cli community +get_comments_summary --space-id 1 --game-id 1 \
  --channel-id 1 --uuid <uuid>
```

### 2. Analysis and sentiment

```bash
ae-cli community +get_channel_info --space-id 1 --game-id 1

ae-cli community +get_overview_metrics --space-id 1 --game-id 1 \
  --start-time 2026-04-01 --end-time 2026-04-07

ae-cli community +get_sentiment_overview --space-id 1 --game-id 1 \
  --start-time 2026-04-01 --end-time 2026-04-07
```

### 3. Hot topics and daily snapshot

```bash
ae-cli community +get_hot_topics --space-id 1 --game-id 1

ae-cli community +get_daily_summary --space-id 1 --game-id 1 --date 2026-04-01
```

### 4. Livestream

```bash
ae-cli community +get_livestream_list --space-id 1 --game-id 1

ae-cli community +get_livestream_detail --space-id 1 --game-id 1 --stream-id <id>

ae-cli community +get_livestream_analysis --space-id 1 --game-id 1 --stream-id <id>
```

---

## Dry-run debugging

```bash
ae-cli --dry-run community +get_channel_info --space-id 1 --game-id 1
ae-cli --dry-run community +search_posts --space-id 1 --game-id 1 \
  --start-time 2026-04-01 --end-time 2026-04-07
```

---

## References (per-command)

| Topic | Document |
|-------|----------|
| Channel list (prerequisite) | [`get_channel_info.md`](references/get_channel_info.md) |
| Search posts/videos | [`search_posts.md`](references/search_posts.md) |
| Post/video detail | [`get_post_detail.md`](references/get_post_detail.md) |
| Corpus tags / `tagCode` | [`get_corpus_tags.md`](references/get_corpus_tags.md) |
| Comment summary | [`get_comments_summary.md`](references/get_comments_summary.md) |
| Comment tag analysis | [`get_comment_tag_analysis.md`](references/get_comment_tag_analysis.md) |
| Sentiment overview | [`get_sentiment_overview.md`](references/get_sentiment_overview.md) |
| Overview metrics | [`get_overview_metrics.md`](references/get_overview_metrics.md) |
| Hot topics | [`get_hot_topics.md`](references/get_hot_topics.md) |
| Topic detail | [`get_topic_detail.md`](references/get_topic_detail.md) |
| Tag trends | [`get_tag_trends.md`](references/get_tag_trends.md) |
| Daily summary | [`get_daily_summary.md`](references/get_daily_summary.md) |
| Risk content | [`get_risk_content.md`](references/get_risk_content.md) |
| Live rooms / list / detail / analysis / overview / room metrics | [`get_livestream_rooms.md`](references/get_livestream_rooms.md), [`get_livestream_list.md`](references/get_livestream_list.md), [`get_livestream_detail.md`](references/get_livestream_detail.md), [`get_livestream_analysis.md`](references/get_livestream_analysis.md), [`get_livestream_overview.md`](references/get_livestream_overview.md), [`get_livestream_room_metrics.md`](references/get_livestream_room_metrics.md) |

---

## Command groups

Commands below are shown **without** the `ae-cli community` prefix; all use the `+` prefix on the CLI.

### Content (`community_content`)

`+get_livestream_list`, `+get_livestream_detail`, `+get_livestream_analysis`, `+get_post_detail`, `+get_comments_summary`, `+get_comment_tag_analysis`, `+get_corpus_tags`, `+get_risk_content`, `+search_posts`, `+get_livestream_overview`, `+get_livestream_rooms`, `+get_livestream_room_metrics`

### Analysis (`community_analysis`)

`+get_channel_info`, `+get_overview_metrics`, `+get_sentiment_overview`, `+get_tag_trends`

### Hot (`community_hot`)

`+get_daily_summary`, `+get_hot_topics`, `+get_topic_detail`

---

## Composite scenario skills

Structured multi-step reports (MCP tool chains) — open the linked reference for full workflows.

| Skill | Purpose |
|-------|---------|
| [`community-activity-analysis.md`](references/community-activity-analysis.md) | Activity / marketing event insight |
| [`community-daily-report.md`](references/community-daily-report.md) | Daily express (T-1 vs T-2) |
| [`community-character-analysis.md`](references/community-character-analysis.md) | Character / IP deep analysis |
| [`community-hottopic-insight.md`](references/community-hottopic-insight.md) | Single-topic evolution and actions |
| [`community-weekly-report.md`](references/community-weekly-report.md) | Weekly operations summary |
| [`community-analyzing-official-content.md`](references/community-analyzing-official-content.md) | Official content taxonomy |
| [`community-analyzing-theme-comment.md`](references/community-analyzing-theme-comment.md) | Themed comment-area analysis |

---

## Write operations

Most community commands are **read-only**. If new write-capable commands are added later, confirm user intent and use `--yes` where the CLI marks **`risk: write`**.
