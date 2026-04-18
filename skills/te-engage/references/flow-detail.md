# te-engage +flow-detail

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

查询流程详情。

映射命令: `te-cli te-engage +flow-detail`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--flow-uuid` | string | 是 | Flow UUID |

## 返回值里的常见枚举

### `status`

- `0`: `DRAFT`
- `1`: `WAITING`
- `2`: `RUNNING`
- `3`: `PENDING`
- `4`: `COMPLETE`

### `mappingStatus`

- `0`: `DRAFT`
- `1`: `APPROVE`
- `2`: `DENY`
- `3`: `REGISTERING`
- `4`: `REGISTER_FAIL`
- `5`: `WAITING`
- `6`: `RUNNING`
- `7`: `PENDING`
- `8`: `COMPLETE`

### `versionType`

- `0`: history version，历史版本
- `1`: current version，当前版本
- `2`: update content version，更新内容版本
- `3`: new version，新版本
- `4`: test version，测试版本

### `entryTriggerType`

- `0`: scheduled single trigger，单次定时触发
- `1`: scheduled recurring trigger，周期定时触发
- `2`: event trigger，事件触发

### `nodeList[].type`

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

## 示例

```bash
te-cli te-engage +flow-detail --project-id 1 --flow-uuid flow_uuid_123
```
