---
name: te-community
version: 1.0.0
description: "TE 社区分析：帖子搜索、评论情感、话题趋势、风险内容、直播数据"
metadata:
  requires:
    bins: ["te-cli"]
  cliHelp: "te-cli community --help"
---

# te-community

> **前置条件:** 阅读 [`../te-shared/SKILL.md`](../te-shared/SKILL.md) 了解认证、全局参数和安全约束。

## 概述

`te-community` 域提供社区社交媒体数据分析能力，包括帖子搜索、评论情感分析、话题趋势、风险内容监控和直播数据。

命令通过 `te-cli community <command>` 调用。**本文件以导航为主**：具体用法、示例与 Flags 见下方 **`references/`** 与各复合分析 reference。

## 通用参数

| 参数 | 说明 |
|------|------|
| `--space-id` | 社区空间 ID |
| `--game-id` | 游戏/空间标识 |

## 渠道 ID 前置：`get_channel_info`

大量子命令依赖 **`--channel-id`** 或 **`--channel-id-list`**（例如帖子详情、评论摘要、直播会话列表、按渠道筛选的搜索等）。在只有 `space-id` / `game-id`、尚未知道渠道编号时，**建议先调用** `te-cli community get_channel_info` 拿到各渠道的 ID 与名称，再执行后续命令。详见 [get_channel_info](references/get_channel_info.md)。

## 数组参数格式

多值参数使用 **逗号分隔**：
```
--channel-id-list 1,2,3
--keywords tag1,tag2
--sentiment-types 0,1
```

## 日期格式

所有日期参数使用 `yyyy-MM-dd` 格式，如 `--start-time 2024-01-01`。

## 参考文档（子命令导航）

按需打开对应文件即可查看说明与示例（单命令一页）：

- 按关键词/时间段搜索帖子或视频：[search_posts](references/search_posts.md)
- 已拿到 `post-id`，查看单条内容详情：[get_post_detail](references/get_post_detail.md)
- 查询可用分析标签列表：[get_corpus_tags](references/get_corpus_tags.md)
- 快速查看评论区整体情绪与摘要：[get_comments_summary](references/get_comments_summary.md)
- 分析评论标签分布与占比：[get_comment_tag_analysis](references/get_comment_tag_analysis.md)
- 查看情感走势（按时间段）：[get_sentiment_overview](references/get_sentiment_overview.md)
- 查看社区大盘总览（发帖、互动等）：[get_overview_metrics](references/get_overview_metrics.md)
- 识别当前热榜话题：[get_hot_topics](references/get_hot_topics.md)
- 下钻查看某个话题详情：[get_topic_detail](references/get_topic_detail.md)
- 观察特定标签的趋势变化：[get_tag_trends](references/get_tag_trends.md)
- 生成/查看单日社区摘要（日报）：[get_daily_summary](references/get_daily_summary.md)
- 排查风险内容与安全合规问题：[get_risk_content](references/get_risk_content.md)
- 获取直播间列表并确定房间范围：[get_livestream_rooms](references/get_livestream_rooms.md)
- 查看直播间历史会话列表：[get_livestream_list](references/get_livestream_list.md)
- 查看某场直播会话明细：[get_livestream_detail](references/get_livestream_detail.md)
- 直播场次 AI 分析报告（亮点切片与情感观点）：[get_livestream_analysis](references/get_livestream_analysis.md)
- 查看直播模块在时间段内的整体表现：[get_livestream_overview](references/get_livestream_overview.md)
- 查看单直播间年度指标：[get_livestream_room_metrics](references/get_livestream_room_metrics.md)
- 获取渠道列表与渠道基础信息：[get_channel_info](references/get_channel_info.md)

## 高级分析技能

以下技能基于 MCP 工具链组合调用，用于生成结构化的深度分析报告。

### community-activity-analysis（活动专项运营洞察分析）

深度评估游戏内活动或营销事件的曝光效果、社区口碑、二创生态及长尾影响。

详见：[`references/community-activity-analysis.md`](references/community-activity-analysis.md)

---

### community-daily-report（每日快报）

生成单日大盘、突发舆情与安全合规风控的短平快《用户运营每日快报》，支持环比对比（T-1 与 T-2）。

详见：[`references/community-daily-report.md`](references/community-daily-report.md)

---

### community-character-analysis（角色专项深度分析）

深度剖析特定游戏角色的社区生态、玩家情感动因、核心诉求。

详见：[`references/community-character-analysis.md`](references/community-character-analysis.md)

---

### community-hottopic-insight（话题分析报告）

自动调用 MCP 工具收集语料，智能识别行业属性，输出包含核心摘要、舆情概览及事件脉络、核心热点讨论、情绪切片、社媒渠道洞察及运营建议的结构化《舆情分析》。

详见：[`references/community-hottopic-insight.md`](references/community-hottopic-insight.md)

---

### community-release-analysis（版本运营分析复盘）

提取整个版本周期内的大盘数据、热点榜单、舆情脉络与风控趋势，输出深度的《版本运营分析复盘报告》。

详见：[`references/community-release-analysis.md`](references/community-release-analysis.md)

---

### community-weekly-report（社区运营周度总结）

汇总统揽一周数据，重点基于"每日摘要"串联本周核心发酵事件，输出《社区运营周度总结报告》。

详见：[`references/community-weekly-report.md`](references/community-weekly-report.md)

---

### community-analyzing-official-content（官方内容分析）

分析指定游戏在社区模块中近期发布的官方内容，按照既定分类进行梳理和总结。

详见：[`references/community-analyzing-official-content.md`](references/community-analyzing-official-content.md)

---

### community-analyzing-theme-comment（主题评论区深度分析）

对指定帖子或视频的评论区进行深度分析，生成包含评论走势、观点分布和总结的深度分析报告。

详见：[`references/community-analyzing-theme-comment.md`](references/community-analyzing-theme-comment.md)
