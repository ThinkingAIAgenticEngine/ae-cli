# te-community get_topic_detail

> **前置条件:** 阅读 [`../te-shared/SKILL.md`](../te-shared/SKILL.md)

指定话题的深度统计：内容/回复总数、情感分布、分渠道每日趋势、热词。

映射命令: `te-cli community get_topic_detail`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--space-id` | number | 是 | 社区空间 ID |
| `--game-id` | number | 是 | 游戏/空间标识 |
| `--topic-id` | string | 是 | 话题 ID，从 get_hot_topics 获取 |
| `--start-time` | string | 是 | 统计开始日期，格式 yyyy-MM-dd，优先使用话题的开始时间 |
| `--end-time` | string | 是 | 统计结束日期，格式 yyyy-MM-dd，优先使用话题的结束时间 |

## 示例

```bash
# 获取话题详情
te-cli community get_topic_detail \
  --space-id 1 --game-id 1 \
  --topic-id <topic-id> \
  --start-time 2024-01-01 --end-time 2024-01-07
```
