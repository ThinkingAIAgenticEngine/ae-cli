# te-community get_hot_topics

> **前置条件:** 阅读 [`../te-shared/SKILL.md`](../te-shared/SKILL.md)

时间范围内的热门话题排行榜。

映射命令: `te-cli community get_hot_topics`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--space-id` | number | 是 | 社区空间 ID |
| `--game-id` | number | 是 | 游戏/空间标识 |
| `--start-time` | string | 否 | 话题统计开始时间，格式 yyyy-MM-dd |
| `--end-time` | string | 否 | 话题统计结束时间，格式 yyyy-MM-dd |
| `--order-by` | number | 否 | 排序：0按热度desc、1按开始时间desc |

## 示例

```bash
# 获取热榜话题
te-cli community get_hot_topics \
  --space-id 1 --game-id 1 \
  --start-time 2024-01-01 --end-time 2024-01-07
```
