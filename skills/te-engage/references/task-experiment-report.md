# te-engage +task-experiment-report

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

查询任务实验报表。

映射命令: `te-cli te-engage +task-experiment-report`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--task-id` | string | 是 | 任务 ID |
| `--task-type` | string | 是 | 任务类型：`normal` 或 `trigger` |
| `--report-type` | string | 是 | 报表类型：`overview` 或 `detail` |
| `--start-time` | string | 是 | 开始日期 |
| `--end-time` | string | 是 | 结束日期 |
| `--request-id` | string | 否 | 查询 requestId |
| `--push-language-code` | string | 否 | 推送语言代码 |

## 枚举说明

### `--task-type`

- `normal`: 普通任务
- `trigger`: 触发式任务

### `--report-type`

- `overview`: 实验概览
- `detail`: 实验明细

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
te-cli te-engage +task-experiment-report \
  --project-id 1 --task-id task_123 --task-type normal \
  --report-type overview --start-time 2026-04-01 --end-time 2026-04-07
```
