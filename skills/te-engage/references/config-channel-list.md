# te-engage +config-channel-list

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

查询配置通道列表。

映射命令: `te-cli te-engage +config-channel-list`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--channel-type` | number | 否 | 配置通道类型 |

## 枚举说明

### `--channel-type`

- `0`: `WEBHOOK`
- `1`: `CLIENT`

## 示例

```bash
te-cli te-engage +config-channel-list --project-id 1
```
