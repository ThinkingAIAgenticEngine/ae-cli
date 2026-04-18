# te-engage +task-metric-detail

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

查询任务指标导向的明细报表。

映射命令: `te-cli te-engage +task-metric-detail`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--task-id` | string | 是 | 任务 ID |
| `--task-type` | string | 是 | 任务类型：`normal` 或 `trigger` |
| `--start-time` | string | 是 | 开始日期 |
| `--end-time` | string | 是 | 结束日期 |
| `--request-id` | string | 否 | 查询 requestId |
| `--push-language-code` | string | 否 | 推送语言代码 |
| `--metric-id-list` | json | 否 | 指标 ID JSON 数组 |
| `--group-type` | number | 否 | 分组类型 |
| `--show-time-zone` | string | 否 | 展示时区偏移 |

## 枚举说明

### `--task-type`

- `normal`: 普通任务
- `trigger`: 触发式任务

### `--group-type`

- `1`: 按批次分组
- `2`: 按日期分组
- `3`: 按触发分组
- `4`: 按实验效果分组

### `--push-language-code`

常见值包括：

- `default`
- `en`
- `zh-Hans`
- `zh-Hant`
- `ja`
- `ko`

## 示例

```bash
te-cli te-engage +task-metric-detail \
  --project-id 1 --task-id task_123 --task-type normal \
  --start-time 2026-04-01 --end-time 2026-04-07 \
  --metric-id-list '["metric_1"]'
```
