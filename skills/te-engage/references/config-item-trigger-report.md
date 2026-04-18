# te-engage +config_item_trigger_report

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Query the publish and trigger trend report for a config item.

Mapped command: `ae-cli engage +config_item_trigger_report`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--config_id` | string | Yes | config item ID |
| `--start_time` | string | Yes | Start date |
| `--end_time` | string | Yes | End date |
| `--request_id` | string | No | query requestId |
| `--template_id_list` | json | No | template ID JSON array |
| `--strategy_id_list` | json | No | strategy ID JSON array |
| `--show_time_zone` | number | No | display timezone offset |
| `--analyze_report_internal_query` | boolean | No | internal analysis switch |

## Enum Notes

### `--analyze_report_internal_query`

- `true`: use the internal analysis-report query path
- `false`: use the default query path

## Parameter Constraints

- `--template_id_list` and `--strategy_id_list` cannot be used together.
- If neither is provided, query config-item-level data.
- `--start_time`、`--end_time` use `yyyy-MM-dd`.

## Examples

```bash
ae-cli engage +config_item_trigger_report \
  --project_id 1 --config_id cfg_123 \
  --start_time 2026-04-01 --end_time 2026-04-07
```
