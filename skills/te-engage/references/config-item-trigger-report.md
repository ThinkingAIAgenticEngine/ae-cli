# te-engage +config-item-trigger-report

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

查询配置项的发布与触发趋势报表。

映射命令: `te-cli te-engage +config-item-trigger-report`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--config-id` | string | 是 | 配置项 ID |
| `--start-time` | string | 是 | 开始日期 |
| `--end-time` | string | 是 | 结束日期 |
| `--request-id` | string | 否 | 查询 requestId |
| `--template-id-list` | json | 否 | 模板 ID JSON 数组 |
| `--strategy-id-list` | json | 否 | 策略 ID JSON 数组 |
| `--show-time-zone` | number | 否 | 展示时区偏移 |
| `--analyze-report-internal-query` | boolean | 否 | 内部分析开关 |

## 枚举说明

### `--analyze-report-internal-query`

- `true`: 使用内部 analysis-report 查询路径
- `false`: 使用默认查询路径

## 参数约束

- `--template-id-list` 和 `--strategy-id-list` 不能同时传。
- 两者都不传时，查询配置项级别数据。
- `--start-time`、`--end-time` 使用 `yyyy-MM-dd`。

## 示例

```bash
te-cli te-engage +config-item-trigger-report \
  --project-id 1 --config-id cfg_123 \
  --start-time 2026-04-01 --end-time 2026-04-07
```
