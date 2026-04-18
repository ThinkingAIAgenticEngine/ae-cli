# te-engage +update-config-channel-status

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

更新配置通道状态。

映射命令: `te-cli te-engage +update-config-channel-status`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--channel-id` | string | 是 | 配置通道 ID |
| `--channel-status` | number | 是 | 配置通道状态 |

## 枚举说明

### `--channel-status`

- `1`: enabled
- `2`: disabled

## 安全约束

此命令为 **写操作**，会修改配置通道状态。

## 示例

```bash
te-cli te-engage +update-config-channel-status --project-id 1 --channel-id <channel-id> --channel-status 1
```
