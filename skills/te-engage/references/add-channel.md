# te-engage +add-channel

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

创建新的 Engage 渠道。

映射命令: `te-cli te-engage +add-channel`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--req` | json | 是 | 渠道创建请求 JSON 对象 |

## `--req` 对象字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `channelType` | number | 是 | 渠道类型 |
| `channelSubBizType` | string | 是 | 渠道子类型，例如 `webhook`、`fcm`、`aurora` |
| `channelName` | string | 是 | 渠道名称 |
| `pushIdType` | string | 是 | 推送目标 ID 字段名 |
| `config` | string | 是 | 渠道配置 JSON 字符串 |
| `enableTouchEvent` | number | 是 | 触达事件开关 |
| `eventClickName` | string | 是 | 点击事件名 |
| `eventDeliveryName` | string | 是 | 送达事件名 |
| `touchEventSource` | string | 是 | 触达事件来源 |

`projectId` 会由 CLI 自动写入 `--req` 对象中，无需重复手动填写；如果写了同名字段，最终以顶层 `--project-id` 为准。

## 枚举说明

### `req.channelType`

- `1`: `WEBHOOK`
- `2`: `APP_PUSH`
- `3`: `CLIENT_PUSH`
- `4`: `WECHAT`
- `5`: `DOU_YIN`

### `req.channelSubBizType`

常见可选值如下，通常应与 `channelType` 对应：

- `webhook`: Webhook 渠道
- `fcm`: App Push, Firebase Cloud Messaging
- `aurora`: App Push, Aurora
- `apns`: App Push, Apple Push Notification Service
- `client`: Client Push
- `wechat_mini_game`: 微信小游戏
- `dou_yin_recommended_game_card`: 抖音推荐游戏卡

### `req.enableTouchEvent`

- `0`: 关闭触达事件
- `1`: 开启触达事件

## 补充约束

- `req.config` 必须是 JSON 字符串，不是 JSON 对象。
- `req.channelSubBizType` 建议和实际渠道能力保持一致，例如 `channelType=1` 时通常使用 `webhook`。
- 如果需要送达/点击回传，建议同时检查 `eventDeliveryName`、`eventClickName` 和 `touchEventSource` 是否完整。

## 安全约束

此命令为 **写操作**，会创建新渠道。执行前应检查 `--req` 的字段是否完整。

## 示例

```bash
te-cli te-engage +add-channel --project-id 1 \
  --req '{"channelType":1,"channelSubBizType":"webhook","channelName":"demo","pushIdType":"user_id","config":"{}","enableTouchEvent":0,"eventClickName":"","eventDeliveryName":"","touchEventSource":""}'
```
