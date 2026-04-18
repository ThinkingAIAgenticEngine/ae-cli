# te-community get_comments_summary

> **前置条件:** 阅读 [`../te-shared/SKILL.md`](../te-shared/SKILL.md)

获取帖子的评论分析摘要，包括情感分布和时间趋势。仅返回聚合统计，无原始评论列表。

映射命令: `te-cli community get_comments_summary`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--space-id` | number | 是 | 社区空间 ID |
| `--game-id` | number | 是 | 游戏/空间标识 |
| `--channel-id` | number | 是 | 渠道 ID |
| `--uuid` | string | 是 | 内容 UUID |
| `--start-time` | string | 否 | 评论发布时间下限，格式 yyyy-MM-dd，默认为帖子的发布时间 |
| `--end-time` | string | 否 | 评论发布时间上限，格式 yyyy-MM-dd |

## 示例

```bash
# 获取评论摘要
te-cli community get_comments_summary \
  --space-id 1 --game-id 1 \
  --channel-id 1 --uuid <uuid>

# 指定时间范围
te-cli community get_comments_summary \
  --space-id 1 --game-id 1 \
  --channel-id 1 --uuid <uuid> \
  --start-time 2024-01-01 --end-time 2024-01-07
```
