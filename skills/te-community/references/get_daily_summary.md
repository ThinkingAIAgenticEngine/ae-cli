# te-community get_daily_summary

> **前置条件:** 阅读 [`../te-shared/SKILL.md`](../te-shared/SKILL.md)

指定日期的社区日报：热榜排名和精选观点（正面/负面）。

映射命令: `te-cli community get_daily_summary`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--space-id` | number | 是 | 社区空间 ID |
| `--game-id` | number | 是 | 游戏/空间标识 |
| `--date` | string | 是 | 日期，格式 yyyy-MM-dd |

## 示例

```bash
# 获取日报
te-cli community get_daily_summary \
  --space-id 1 --game-id 1 --date 2024-01-01
```
