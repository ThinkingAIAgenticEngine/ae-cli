# te-engage +validate-flow-node-config

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

在保存流程前校验单个节点配置。

映射命令: `te-cli te-engage +validate-flow-node-config`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--node-type` | string | 是 | 节点类型 |
| `--config` | string | 是 | 节点配置 JSON 字符串 |
| `--operation-mode` | string | 是 | 校验模式 |

## 枚举说明

### `--node-type`

常见节点类型包括：

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

### `--operation-mode`

- `save_flow`
- `save_submit_flow`

## 示例

```bash
te-cli te-engage +validate-flow-node-config \
  --node-type message_push --operation-mode save_flow --config '{}'
```
