# te-engage +strategy-list

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

查询策略列表。

映射命令: `te-cli te-engage +strategy-list`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--config-id` | string | 否 | 配置项 ID |
| `--strategy-uuid-list` | json | 否 | 策略 UUID JSON 数组 |

## 示例

```bash
te-cli te-engage +strategy-list --project-id 1 --config-id cfg_123
```
