# te-engage +config-channel-detail

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

查询配置通道详情。

映射命令: `te-cli te-engage +config-channel-detail`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--channel-id` | string | 是 | 配置通道 ID |

## 返回值里的常见枚举

### `channelType`

- `0`: `WEBHOOK`
- `1`: `CLIENT`

### `channelStatus`

- `1`: enabled
- `2`: disabled

## 示例

```bash
te-cli te-engage +config-channel-detail --project-id 1 --channel-id <channel-id>
```
