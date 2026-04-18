# te-engage +manage-strategy

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

批量管理策略状态或审批动作。

映射命令: `te-cli te-engage +manage-strategy`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--config-id` | string | 是 | 配置项 ID |
| `--action` | string | 是 | 操作类型 |
| `--strategy-uuid-list` | json | 否 | 策略 UUID JSON 数组 |
| `--strategy-list` | json | 否 | 审批条目 JSON 数组 |
| `--reason` | string | 否 | 审批原因 |

## 枚举说明

### `--action`

- `online`: 上线策略，需配合 `--strategy-uuid-list`
- `offline`: 下线策略，需配合 `--strategy-uuid-list`
- `suspend`: 暂停策略，需配合 `--strategy-uuid-list`
- `delete`: 删除策略，需配合 `--strategy-uuid-list`
- `approve`: 审批通过，需配合 `--strategy-list`
- `deny`: 审批拒绝，需配合 `--strategy-list`
- `cancel`: 撤销审批，需配合 `--strategy-list`

## JSON 参数说明

### `--strategy-uuid-list`

用于 `online`、`offline`、`suspend`、`delete` 这类直接按 UUID 批处理的动作。

```json
["uuid_1", "uuid_2"]
```

### `--strategy-list`

用于 `approve`、`deny`、`cancel` 这类审批动作。数组中每一项都是一个对象：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `strategyUuid` | string | 是 | 策略 UUID |
| `reason` | string | 否 | 针对该策略的审批原因 |

示例：

```json
[
  { "strategyUuid": "uuid_1", "reason": "approve by ops" }
]
```

## 安全约束

此命令为 **写操作**，会改变策略状态。

不同 `action` 需要的参数不同：

- `online` / `offline` / `suspend` / `delete`：必须传 `--strategy-uuid-list`
- `approve` / `deny` / `cancel`：必须传 `--strategy-list`

## 示例

```bash
te-cli te-engage +manage-strategy \
  --project-id 1 --config-id cfg_123 --action online \
  --strategy-uuid-list '["uuid_1"]'
```
