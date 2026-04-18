# te-engage +manage-flow

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

批量管理流程状态或审批动作。

映射命令: `te-cli te-engage +manage-flow`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--action` | string | 是 | 操作类型 |
| `--flow-list` | json | 否 | 审批列表 JSON 数组 |
| `--pause-flow-list` | json | 否 | 暂停列表 JSON 数组 |
| `--flow-id-list` | json | 否 | Flow ID JSON 数组 |
| `--reason` | string | 否 | 审批原因 |

## 枚举说明

### `--action`

- `approve`: 审批通过，需配合 `--flow-list`
- `deny`: 审批拒绝，需配合 `--flow-list`
- `cancel`: 撤销审批，需配合 `--flow-list`
- `pause`: 暂停流程，需配合 `--pause-flow-list`
- `recover`: 恢复流程，需配合 `--flow-id-list`
- `end`: 结束流程，需配合 `--flow-id-list`

## JSON 参数说明

### `--flow-list`

用于 `approve`、`deny`、`cancel` 这类审批动作。数组元素为对象：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `flowUuid` | string | 是 | Flow UUID |
| `reason` | string | 否 | 单条审批原因 |

示例：

```json
[
  { "flowUuid": "flow_uuid_1", "reason": "approve by ops" }
]
```

### `--pause-flow-list`

用于 `pause` 动作。数组元素为对象：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `flowId` | string | 是 | Flow ID |
| `flowInstanceProcessType` | number | 否 | 流程实例处理方式 |

`flowInstanceProcessType` 枚举：

- `1`: normal，正常暂停
- `2`: force exit，强制退出实例

示例：

```json
[
  { "flowId": "flow_id_1", "flowInstanceProcessType": 1 }
]
```

### `--flow-id-list`

用于 `recover`、`end` 这类按 ID 批量操作的场景：

```json
["flow_id_1", "flow_id_2"]
```

## 安全约束

此命令为 **写操作**，会改变流程状态。

不同 `action` 需要的参数不同：

- `approve` / `deny` / `cancel`：必须传 `--flow-list`
- `pause`：必须传 `--pause-flow-list`
- `recover` / `end`：必须传 `--flow-id-list`

## 示例

```bash
te-cli te-engage +manage-flow --project-id 1 --action end --flow-id-list '["flow_id_1"]'
```
