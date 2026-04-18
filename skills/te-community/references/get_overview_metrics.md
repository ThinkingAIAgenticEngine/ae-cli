# te-community get_overview_metrics

> **前置条件:** 阅读 [`../te-shared/SKILL.md`](../te-shared/SKILL.md)

时间范围内的整体社区指标：发帖/回复数、情感计数、分渠道明细。

映射命令: `te-cli community get_overview_metrics`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--space-id` | number | 是 | 社区空间 ID |
| `--game-id` | number | 是 | 游戏/空间标识 |
| `--channel-id-list` | string | 否 | 渠道 ID 列表，逗号分隔 |
| `--start-time` | string | 是 | 统计开始时间，格式 yyyy-MM-dd |
| `--end-time` | string | 是 | 统计结束时间，格式 yyyy-MM-dd |

## 示例

```bash
# 获取整体指标
te-cli community get_overview_metrics \
  --space-id 1 --game-id 1 \
  --start-time 2024-01-01 --end-time 2024-01-07
```
