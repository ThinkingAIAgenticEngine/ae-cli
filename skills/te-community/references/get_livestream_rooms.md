# te-community get_livestream_rooms

> **前置条件:** 阅读 [`../te-shared/SKILL.md`](../te-shared/SKILL.md)

按时间范围和渠道搜索直播间，返回房间列表及统计。

映射命令: `te-cli community get_livestream_rooms`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--space-id` | number | 是 | 社区空间 ID |
| `--game-id` | number | 是 | 游戏/空间标识 |
| `--channel-id-list` | string | 否 | 渠道 ID 列表，逗号分隔 |
| `--start-time` | string | 否 | 统计开始时间，格式 yyyy-MM-dd |
| `--end-time` | string | 否 | 统计结束时间，格式 yyyy-MM-dd |

## 示例

```bash
# 搜索直播间
te-cli community get_livestream_rooms \
  --space-id 1 --game-id 1 \
  --start-time 2024-01-01 --end-time 2024-01-07
```
