# te-community get_livestream_overview

> **前置条件:** 阅读 [`../te-shared/SKILL.md`](../te-shared/SKILL.md)

直播概览趋势：活跃房间数、场次数量、互动数和直播时长。

映射命令: `te-cli community get_livestream_overview`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--space-id` | number | 是 | 社区空间 ID |
| `--game-id` | number | 是 | 游戏/空间标识 |
| `--start-time` | string | 否 | 统计开始时间，格式 yyyy-MM-dd |
| `--end-time` | string | 否 | 统计结束时间，格式 yyyy-MM-dd |

## 示例

```bash
# 获取直播概览
te-cli community get_livestream_overview \
  --space-id 1 --game-id 1 \
  --start-time 2024-01-01 --end-time 2024-01-07
```
