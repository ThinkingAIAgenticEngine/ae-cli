# te-engage +task_data_detail

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Query the task detailed data report.

Mapped command: `ae-cli engage +task_data_detail`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--task_id` | string | Yes | task ID |
| `--task_type` | string | Yes | task type: `normal` or `trigger` |
| `--detail_type` | string | Yes | detail type |
| `--start_time` | string | Yes | Start date |
| `--end_time` | string | Yes | End date |
| `--request_id` | string | No | Query requestId |
| `--push_language_code` | string | No | push language code |
| `--task_instance_id` | string | No | task instance ID |
| `--data_dim_type` | string | No | data dimension type |
| `--retention_type` | string | No | retention type |
| `--data_view_type` | number | No | Trigger task view type |
| `--show_time_zone` | string | No | display timezone offset |

## Enum Notes

### `--task_type`

- `normal`: normal task
- `trigger`: trigger task

### `--detail_type`

- `time`: view by time
- `instance`: view by instance
- `instance_daily`: view day-by-day details for a single instance

### `--data_dim_type`

- `uv`: count by unique users
- `pv`: count by events/occurrences

### `--retention_type`

- `retention`: retention analysis
- `lost`: churn analysis

### `--data_view_type`

Only valid when `--task_type` is `trigger` and `--detail_type` is `time`:

- `2`: date view
- `3`: trigger view

### `--push_language_code`

Common values include:

- `default`
- `en`
- `zh-Hans`
- `zh-Hant`
- `ja`
- `ko`

## Parameter Constraints

- When `--task_type` is `trigger`, `--detail_type` can only be `time`.
- When `--detail_type` is `instance_daily`, you must include `--task_instance_id`.
- `--start_time`、`--end_time` use `yyyy-MM-dd`.

## Examples

```bash
ae-cli engage +task_data_detail \
  --project_id 1 --task_id task_123 \
  --task_type normal --detail_type time \
  --start_time 2026-04-01 --end_time 2026-04-07
```
