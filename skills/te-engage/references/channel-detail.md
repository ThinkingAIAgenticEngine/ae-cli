# te-engage +channel_detail

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Query the details of a single Engage channel.

Mapped command: `ae-cli engage +channel_detail`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--channel_id` | string | Yes | channel ID |

## Common enums in the response

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

Common values include:

- `webhook`
- `fcm`
- `aurora`
- `apns`
- `client`
- `wechat_mini_game`
- `dou_yin_recommended_game_card`

### `enableTouchEvent`

- `0`: disable the touch funnel
- `1`: enable the touch funnel

## Examples

```bash
ae-cli engage +channel_detail --project_id 1 --channel_id <channel_id>
```
