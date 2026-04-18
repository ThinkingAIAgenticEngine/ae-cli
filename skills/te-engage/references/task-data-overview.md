# te-engage +task_data_overview

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Query the funnel-style task data overview.

Mapped command: `ae-cli engage +task_data_overview`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--task_id` | string | Yes | task ID |
| `--task_type` | string | Yes | task type: `normal` or `trigger` |
| `--request_id` | string | No | Query requestId |
| `--push_language_code` | string | No | push language code |
| `--data_dim_type` | string | No | data dimension type |
| `--show_time_zone` | string | No | display timezone offset |

## Enum Notes

### `--task_type`

- `normal`: normal task
- `trigger`: trigger task

### `--data_dim_type`

- `uv`: count by unique users
- `pv`: count by events/occurrences

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
ae-cli engage +task_data_overview --project_id 1 --task_id task_123 --task_type normal
```
