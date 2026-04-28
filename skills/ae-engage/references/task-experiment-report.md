# ae-engage +task_experiment_report

> **Prerequisite:** Read [`../../ae-shared/SKILL.md`](../../ae-shared/SKILL.md)

Query the task experiment report.

Mapped command: `ae-cli engage +task_experiment_report`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--task_id` | string | Yes | task ID |
| `--report_type` | string | Yes | report type: `overview` or `detail` |
| `--start_time` | string | Yes | Start date |
| `--end_time` | string | Yes | End date |
| `--request_id` | string | No | query requestId |
| `--push_language_code` | string | No | push language code |

## Enum Notes

### `--report_type`

- `overview`: experiment overview
- `detail`: experiment detail

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
ae-cli engage +task_experiment_report \
  --project_id 1 --task_id task_123 \
  --report_type overview --start_time 2026-04-01 --end_time 2026-04-07
```
