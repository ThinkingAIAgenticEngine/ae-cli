# te-community get_sentiment_overview

> **前置条件:** 阅读 [`../te-shared/SKILL.md`](../te-shared/SKILL.md)

情感分布和热词概览：按情感类型返回关键词及其趋势，以及整体关键词排名。

映射命令: `te-cli community get_sentiment_overview`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--space-id` | number | 是 | 社区空间 ID |
| `--game-id` | number | 是 | 游戏/空间标识 |
| `--channel-id-list` | string | 否 | 渠道 ID 列表，逗号分隔 |
| `--start-time` | string | 是 | 统计开始时间，格式 yyyy-MM-dd |
| `--end-time` | string | 是 | 统计结束时间，格式 yyyy-MM-dd |
| `--is-merged` | boolean | 否 | 是否聚合合并关键词 |
| `--limit` | number | 否 | 最大返回关键词数 |

## 示例

```bash
# 情感概览
te-cli community get_sentiment_overview \
  --space-id 1 --game-id 1 \
  --start-time 2024-01-01 --end-time 2024-01-07

# 限制返回数量
te-cli community get_sentiment_overview \
  --space-id 1 --game-id 1 \
  --start-time 2024-01-01 --end-time 2024-01-07 \
  --limit 50
```
