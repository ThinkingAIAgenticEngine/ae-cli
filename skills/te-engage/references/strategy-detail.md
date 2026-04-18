# te-engage +strategy-detail

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

查询单个策略详情。

映射命令: `te-cli te-engage +strategy-detail`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--config-id` | string | 是 | 配置项 ID |
| `--strategy-uuid` | string | 是 | 策略 UUID |

## 返回值里的常见枚举

### `status`

- `0`: `DRAFT`
- `1`: `ONLINE`
- `2`: `SUSPEND`
- `3`: `OFFLINE`

### `mappingStatus`

- `0`: `DRAFT`
- `1`: `APPROVE`
- `2`: `DENY`
- `3`: `REGISTERING`
- `4`: `REGISTER_FAIL`
- `5`: `WAITING`
- `6`: `ONLINE`
- `7`: `SUSPEND`
- `8`: `OFFLINE`

### `targetClusterType`

- `0`: `ALL_USERS`
- `1`: `CUSTOM_CLUSTER`
- `2`: `SINGLE_USER`

### `realtime`

- `0`: physical cluster，物理人群
- `1`: virtual cluster，虚拟人群

### `triggerType`

- `0`: `SCHEDULED_SINGLE`
- `1`: `SCHEDULED_RECURRING`
- `2`: `MANUAL`

### `versionType`

- `0`: history version，历史版本
- `1`: current version，当前版本
- `2`: update content version，更新内容版本

### `channelType`

- `1`: `WEBHOOK`
- `2`: `APP_PUSH`
- `3`: `CLIENT_PUSH`
- `4`: `WECHAT`
- `5`: `DOU_YIN`

## 示例

```bash
te-cli te-engage +strategy-detail --project-id 1 --config-id cfg_123 --strategy-uuid uuid_123
```
