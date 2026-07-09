# ae-engage +validate_flow_node_config


Validate and normalize a single node configuration before placing it into a `save_flow` request.

Mapped command: `ae-cli engage +validate_flow_node_config`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--node_type` | string | Yes | Flow node type |
| `--config` | string | Yes | Node config JSON object encoded as a string |
| `--operation_mode` | string | Yes | Validation mode |

## When To Use

Use this after `+flow_node_config_schema` and before passing a config into `+save_flow`.

The command validates one node config only; it does not validate the full canvas topology. It returns:

- `valid`: whether the candidate config passed validation
- `normalizedConfigObject`: backend-normalized config with defaulted fields
- `errors`: hard validation failures to fix before calling `+save_flow`
- `warnings`: issues that depend on live channel/template/config data

Use `--operation_mode save_flow` for the current exposed MCP protocol. Use `save_submit_flow` only when you intentionally want stricter submit-time checks.

Important current rules:

- `event_trigger` / `event_judge` A segment: use `periodStart`, `periodEnd`, `periodTimeSymbol`; do not use branch-style `delayTime`.
- `event_split_flow` branch segment: use `delayTime`, `delayTimeSymbol`, `targetClusterType`; omit `triggerRule` on default branches.
- `event_trigger targetUserType=2` is invalid.
- Push `OBJ_ARRAY.value` must be a JSON array, not a stringified array.
- Push `contentList[].content` should be a JSON array, but a JSON-stringified array is accepted for compatibility.
- Compatible inputs are normalized before validation: apostrophe-prefixed field aliases, case-insensitive property aliases, `enableChannelTouchLimits` booleans, string `"0"`/`"1"` QP relations inside `targetClusterQp`, and `clusterPredictCount: null`.
- Missing defaults such as `clusterPredictCount`, `clusterPredictTime`, `processType`, and `zoneoffset` may be filled in `normalizedConfigObject`.

## Enum Notes

### `--node_type`

Schema-backed node types include:

- `single_trigger`
- `repeat_trigger`
- `event_trigger`
- `feature_judge`
- `event_judge`
- `message_push`
- `wechat_push`
- `webhook_push`
- `time_control`
- `feature_split_flow`
- `event_split_flow`
- `ab_split_flow`
- `exit_flow`

### `--operation_mode`

- `save_flow`
- `save_submit_flow`

## Examples

```bash
ae-cli engage +validate_flow_node_config \
  --node_type message_push --operation_mode save_flow --config '{}'
```
