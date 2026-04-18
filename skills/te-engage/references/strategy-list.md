# te-engage +strategy_list

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Query the strategy list.

Mapped command: `ae-cli engage +strategy_list`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--project_id` / `-p` | number | Yes | Project ID |
| `--config_id` | string | No | config item ID |
| `--strategy_uuid_list` | json | No | strategy UUID JSON array |

## Examples

```bash
ae-cli engage +strategy_list --project_id 1 --config_id cfg_123
```
