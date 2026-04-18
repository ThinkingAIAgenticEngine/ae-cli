# te-engage +flow_node_detail_report

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Query the detailed report for a single flow node.

Mapped command: `ae-cli engage +flow_node_detail_report`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--node_uuid` | string | Yes | node UUID |
| `--start_time` | string | Yes | Start date |
| `--end_time` | string | Yes | End date |
| `--flow_id` | string | No | Flow ID |
| `--flow_uuid` | string | No | Flow UUID |
| `--request_id` | string | No | Query requestId |
| `--push_language_code` | string | No | push language code |
| `--branch_id` | string | No | branch ID |
| `--indicator_name` | string | No | indicator name |
| `--data_dim_type` | string | No | data dimension type |
| `--show_time_zone` | string | No | display timezone offset |

## Enum Notes

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

- `--flow_id` and `--flow_uuid`, at least one must be provided.
- `--start_time`、`--end_time` use `yyyy-MM-dd`.

## Examples

```bash
ae-cli engage +flow_node_detail_report \
  --project_id 1 --flow_uuid flow_uuid_123 --node_uuid node_123 \
  --start_time 2026-04-01 --end_time 2026-04-07
```
