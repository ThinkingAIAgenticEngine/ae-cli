# te-engage +channel-list

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

查询项目下的 Engage 渠道列表。

映射命令: `te-cli te-engage +channel-list`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--provider-list` | json | 否 | Provider 列表 JSON 数组 |
| `--channel-status` | number | 否 | 渠道状态过滤 |

## 枚举说明

### `--channel-status`

- `0`: disabled
- `1`: enabled

### `--provider-list`

可传的 provider / channelSubBizType 常见值：

- `webhook`
- `fcm`
- `aurora`
- `apns`
- `client`
- `wechat_mini_game`
- `dou_yin_recommended_game_card`

## 示例

```bash
te-cli te-engage +channel-list --project-id 1
te-cli te-engage +channel-list --project-id 1 --provider-list '["webhook","fcm"]'
```
