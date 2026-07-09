# ae-engage +flow_node_config_schema


Query the configuration schema for one flow node type before constructing a `save_flow` node config.

Mapped command: `ae-cli engage +flow_node_config_schema`

## Flags

| Flag | Type | Required | Description |
|------|------|------|------|
| `--node_type` | string | Yes | Flow node type |

## When To Use

Call this before writing any non-trivial `save_flow` `nodes[].config` or `nodeConfigs[].config`. The response is the source of truth for:

- `required` and `conditional_required` fields
- defaulted fields that can be omitted from draft input
- enum values and allowed modes
- `minimal_valid`, `full_valid`, and `common_invalid` examples
- submit-time requirements for stricter `save_submit_flow` validation

Do not use this command to build an old full `FlowSaveReqDTO`, `nodeList`, or `edgeList`. `save_flow` uses compact `nodes` / `edges`.

## Recent Save Flow Notes

- `event_trigger` supports `targetUserType=1` custom and `targetUserType=3` all users; existing cluster `targetUserType=2` is not supported for this node.
- `event_trigger` and `event_judge` A-segment trigger rules are non-branch rules and use `periodStart`, `periodEnd`, and `periodTimeSymbol`.
- `event_split_flow` branch rules use `delayTime` and `delayTimeSymbol`; `branchType=1` also needs `targetClusterType`, and non-all-user branches need `clusterKey`.
- Push nodes default `processType=1`, `enableChannelTouchLimits=0`, and `isOccasionUp=false`.
- The validator normalizes compatible inputs before schema validation: apostrophe-prefixed field aliases, case-insensitive property aliases, `enableChannelTouchLimits` booleans, string `"0"`/`"1"` QP relations inside `targetClusterQp`, and `clusterPredictCount: null`.
- For push nodes, `contentList[].content` should be a JSON array; the validator also accepts a JSON-stringified array for compatibility. For push `OBJ_ARRAY` params, `value` must still be a JSON array and `objArray` must be copied from `query_channel_detail data.config.paramsList[].objArray`.

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

## Examples

```bash
ae-cli engage +flow_node_config_schema --node_type message_push
```

Typical flow:

```bash
ae-cli engage +flow_node_config_schema --node_type event_trigger
ae-cli engage +validate_flow_node_config \
  --node_type event_trigger --operation_mode save_flow --config '<config-json-string>'
```
