# te-engage +flow_node_config_schema

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Query the configuration schema for a flow node type.

Mapped command: `ae-cli engage +flow_node_config_schema`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--node_type` | string | Yes | node type |

## Enum Notes

### `--node_type`

Common node types include:

- `single_trigger`
- `repeat_trigger`
- `event_trigger`
- `feature_judge`
- `event_judge`
- `message_push`
- `wechat_push`
- `webhook_push`
- `config_push`
- `tag`
- `time_control`
- `feature_split_flow`
- `event_split_flow`
- `trigger_prop_split_flow`
- `percent_split_flow`
- `ab_split_flow`
- `race_split_flow`
- `exit_flow`

## Examples

```bash
ae-cli engage +flow_node_config_schema --node_type message_push
```
