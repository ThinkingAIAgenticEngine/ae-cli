# te-engage +task_metric_detail

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Query the metric-oriented detail report for a task.

Mapped command: `ae-cli engage +task_metric_detail`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--task_id` | string | Yes | task ID |
| `--task_type` | string | Yes | task type: `normal` or `trigger` |
| `--start_time` | string | Yes | Start date |
| `--end_time` | string | Yes | End date |
| `--request_id` | string | No | query requestId |
| `--push_language_code` | string | No | push language code |
| `--metric_id_list` | json | No | metric ID JSON array |
| `--group_type` | number | No | group type |
| `--show_time_zone` | string | No | Display timezone offset |

## Enum Notes

### `--task_type`

- `normal`: normal task
- `trigger`: trigger task

### `--group_type`

- `1`: group by batch
- `2`: group by date
- `3`: group by trigger
- `4`: group by experiment result

### `--push_language_code`

Common values include:

- `default`
- `en`
- `zh-Hans`
- `zh-Hant`
- `ja`
- `ko`

## Examples

```bash
ae-cli engage +task_metric_detail \
  --project_id 1 --task_id task_123 --task_type normal \
  --start_time 2026-04-01 --end_time 2026-04-07 \
  --metric_id_list '["metric_1"]'
```
