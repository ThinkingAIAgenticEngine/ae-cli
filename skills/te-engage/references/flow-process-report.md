# te-engage +flow_process_report

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Query the process-level report for a flow.

Mapped command: `ae-cli engage +flow_process_report`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--report_type` | string | Yes | report type |
| `--flow_id` | string | No | Flow ID |
| `--flow_uuid` | string | No | Flow UUID |
| `--request_id` | string | No | Query requestId |
| `--push_language_code` | string | No | push language code |
| `--data_dim_type` | string | No | data dimension type |
| `--start_time` | string | No | Start date |
| `--end_time` | string | No | End date |
| `--show_time_zone` | string | No | display timezone offset |

## Enum Notes

### `--report_type`

- `overview`: flow overview
- `detail`: flow detail
- `exit_detail`: exit detail
- `push_detail`: push detail

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

## Parameter Constraints

- `--flow_id` At least one of `--flow_id` and `--flow_uuid` must be provided.
- When `--report_type` is `detail`, `exit_detail`, or `push_detail`, both `--start_time` and `--end_time` are required.
- When `--report_type` is `overview`, you may omit time or provide `--start_time` and `--end_time` as a pair.

## Examples

```bash
ae-cli engage +flow_process_report --project_id 1 --flow_uuid flow_uuid_123 --report_type overview
```
