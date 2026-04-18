# te-community get_tag_trends

> **前置条件:** 阅读 [`../te-shared/SKILL.md`](../te-shared/SKILL.md)

每日标签趋势：给定标签码和时间范围，返回各标签值的计数和时间序列。

映射命令: `te-cli community get_tag_trends`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--space-id` | number | 是 | 社区空间 ID |
| `--game-id` | number | 是 | 游戏/空间标识 |
| `--tag-code` | string | 是 | 标签码，从 get_corpus_tags 获取 |
| `--channel-id-list` | string | 否 | 渠道 ID 列表，逗号分隔 |
| `--start-time` | string | 否 | 统计开始时间，格式 yyyy-MM-dd |
| `--end-time` | string | 否 | 统计结束时间，格式 yyyy-MM-dd |

## 示例

```bash
# 获取标签趋势
te-cli community get_tag_trends \
  --space-id 1 --game-id 1 \
  --tag-code "game_version" \
  --start-time 2024-01-01 --end-time 2024-01-07
```
