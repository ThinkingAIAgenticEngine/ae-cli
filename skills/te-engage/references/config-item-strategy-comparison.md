# te-engage +config-item-strategy-comparison

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

对同一配置项下的多个策略进行对比。

映射命令: `te-cli te-engage +config-item-strategy-comparison`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--config-id` | string | 是 | 配置项 ID |
| `--strategy-id-list` | json | 是 | 策略 ID JSON 数组，至少两个 |
| `--request-id` | string | 否 | 查询 requestId |
| `--show-time-zone` | number | 否 | 展示时区偏移 |

## 示例

```bash
te-cli te-engage +config-item-strategy-comparison \
  --project-id 1 --config-id cfg_123 \
  --strategy-id-list '["strategy_a","strategy_b"]'
```
