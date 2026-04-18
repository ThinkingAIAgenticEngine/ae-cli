# te-engage +validate_flow_node_config

> **Prerequisite:** Read [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

Validate a single node configuration before saving a flow.

Mapped command: `ae-cli engage +validate_flow_node_config`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--node_type` | string | Yes | node type |
| `--config` | string | Yes | node config JSON string |
| `--operation_mode` | string | Yes | validation mode |

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

### `--operation_mode`

- `save_flow`
- `save_submit_flow`

## Examples

```bash
ae-cli engage +validate_flow_node_config \
  --node_type message_push --operation_mode save_flow --config '{}'
```
