# te-engage +channel-detail

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

查询单个 Engage 渠道详情。

映射命令: `te-cli te-engage +channel-detail`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--channel-id` | string | 是 | 渠道 ID |

## 返回值里的常见枚举

### `channelStatus`

- `0`: disabled
- `1`: enabled

### `channelType`

- `1`: `WEBHOOK`
- `2`: `APP_PUSH`
- `3`: `CLIENT_PUSH`
- `4`: `WECHAT`
- `5`: `DOU_YIN`

### `channelSubBizType`

常见值包括：

- `webhook`
- `fcm`
- `aurora`
- `apns`
- `client`
- `wechat_mini_game`
- `dou_yin_recommended_game_card`

### `enableTouchEvent`

- `0`: 关闭触达漏斗
- `1`: 开启触达漏斗

## 示例

```bash
te-cli te-engage +channel-detail --project-id 1 --channel-id <channel-id>
```
