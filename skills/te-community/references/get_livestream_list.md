# te-community get_livestream_list

> **前置条件:** 阅读 [`../te-shared/SKILL.md`](../te-shared/SKILL.md)

获取房间的直播场次列表（录播记录）。

映射命令: `te-cli community get_livestream_list`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--space-id` | number | 是 | 社区空间 ID |
| `--game-id` | number | 是 | 游戏/空间标识 |
| `--channel-id` | number | 否 | 渠道 ID，从 get_livestream_rooms 获取 |
| `--room-id` | string | 否 | 房间 ID，从 get_livestream_rooms 获取 |
| `--start-time` | string | 否 | 统计开始时间，格式 yyyy-MM-dd |
| `--end-time` | string | 否 | 统计结束时间，格式 yyyy-MM-dd |

## 示例

```bash
# 获取直播列表
te-cli community get_livestream_list \
  --space-id 1 --game-id 1 --channel-id 1
```
