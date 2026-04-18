# te-engage +add_channel

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Create a new Engage channel.

Mapped command: `ae-cli engage +add_channel`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--req` | json | Yes | Channel creation request JSON object |

## `--req` Object Fields

| Field | Type | Required | Description |
|------|------|------|------|
| `channelType` | number | Yes | channel type |
| `channelSubBizType` | string | Yes | channel subtype, for example `webhook`、`fcm`、`aurora` |
| `channelName` | string | Yes | channel name |
| `pushIdType` | string | Yes | push target ID field name |
| `config` | string | Yes | channel config JSON string |
| `enableTouchEvent` | number | Yes | touch event switch |
| `eventClickName` | string | Yes | click event name |
| `eventDeliveryName` | string | Yes | delivery event name |
| `touchEventSource` | string | Yes | touch event source |

`projectId` is automatically written into the `--req` object by the CLI, so you do not need to fill it manually. If you provide a field with the same name, the top-level `--project_id` takes precedence.

## Enum Notes

### `req.channelType`

- `1`: `WEBHOOK`
- `2`: `APP_PUSH`
- `3`: `CLIENT_PUSH`
- `4`: `WECHAT`
- `5`: `DOU_YIN`

### `req.channelSubBizType`

Common values are listed below and should usually match `channelType`:

- `webhook`: Webhook channel
- `fcm`: App Push, Firebase Cloud Messaging
- `aurora`: App Push, Aurora
- `apns`: App Push, Apple Push Notification Service
- `client`: Client Push
- `wechat_mini_game`: WeChat mini game
- `dou_yin_recommended_game_card`: Douyin recommended game card

### `req.enableTouchEvent`

- `0`: disable touch events
- `1`: enable touch events

## Additional Constraints

- `req.config` must be a JSON string, not a JSON object.
- `req.channelSubBizType` should match the actual channel capability; for example, when `channelType=1`, `webhook` is usually used.
- If delivery or click callbacks are required, also check that `eventDeliveryName`, `eventClickName`, and `touchEventSource` are complete.

## Safety Constraints

This command is a **write operation** and creates a new channel. Check that the `--req` fields are complete before executing.

## Examples

```bash
ae-cli engage +add_channel --project_id 1 \
  --req '{"channelType":1,"channelSubBizType":"webhook","channelName":"demo","pushIdType":"user_id","config":"{}","enableTouchEvent":0,"eventClickName":"","eventDeliveryName":"","touchEventSource":""}'
```
