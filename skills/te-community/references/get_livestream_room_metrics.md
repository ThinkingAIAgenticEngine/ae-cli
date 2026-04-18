# te-community get_livestream_room_metrics

> **前置条件:** 阅读 [`../te-shared/SKILL.md`](../te-shared/SKILL.md)

单个直播间的核心指标和年度日历：概览 KPI 加上每日直播时长日历。

映射命令: `te-cli community get_livestream_room_metrics`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--space-id` | number | 是 | 社区空间 ID |
| `--game-id` | number | 是 | 游戏/空间标识 |
| `--channel-id` | number | 是 | 渠道 ID，从 get_livestream_rooms 获取 |
| `--room-id` | string | 是 | 房间 ID，从 get_livestream_rooms 获取 |
| `--year` | string | 否 | 年份，格式 yyyy，默认为当前年份 |

## 示例

```bash
# 获取直播间年度指标
te-cli community get_livestream_room_metrics \
  --space-id 1 --game-id 1 \
  --channel-id 1 --room-id <room-id> --year 2024
```
