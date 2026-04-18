# te-engage +update-channel-status

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

更新 Engage 渠道状态。

映射命令: `te-cli te-engage +update-channel-status`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--channel-id` | string | 是 | 渠道 ID |
| `--status` | number | 是 | 渠道状态 |

## 枚举说明

### `--status`

- `0`: disabled
- `1`: enabled

## 安全约束

此命令为 **写操作**，执行前应确认用户明确希望变更渠道状态。

## 示例

```bash
te-cli te-engage +update-channel-status --project-id 1 --channel-id <channel-id> --status 1
```
