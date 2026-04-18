# te-engage +flow_ab_split_node_report

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Query the AB split node report.

Mapped command: `ae-cli engage +flow_ab_split_node_report`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--report_type` | string | Yes | report type: `overview` or `detail` |
| `--node_uuid` | string | Yes | AB node UUID |
| `--start_time` | string | Yes | Start date |
| `--end_time` | string | Yes | End date |
| `--flow_id` | string | No | Flow ID |
| `--flow_uuid` | string | No | Flow UUID |
| `--request_id` | string | No | Query requestId |
| `--push_language_code` | string | No | push language code |
| `--indicators_uuid` | string | No | indicator UUID |
| `--show_time_zone` | string | No | display timezone offset |

## Enum Notes

### `--report_type`

- `overview`: AB split node overview report
- `detail`: AB split node detail report

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
- `--start_time`、`--end_time` use `yyyy-MM-dd`.

## Examples

```bash
ae-cli engage +flow_ab_split_node_report \
  --project_id 1 --flow_uuid flow_uuid_123 --node_uuid node_123 \
  --report_type overview --start_time 2026-04-01 --end_time 2026-04-07
```
