# te-engage +config_item_strategy_comparison

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Compare multiple strategies under the same config item.

Mapped command: `ae-cli engage +config_item_strategy_comparison`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--config_id` | string | Yes | config item ID |
| `--strategy_id_list` | json | Yes | strategy ID JSON array with at least two entries |
| `--request_id` | string | No | query requestId |
| `--show_time_zone` | number | No | display timezone offset |

## Examples

```bash
ae-cli engage +config_item_strategy_comparison \
  --project_id 1 --config_id cfg_123 \
  --strategy_id_list '["strategy_a","strategy_b"]'
```
