# te-engage +manage-task

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

执行任务生命周期动作，例如发送、暂停、结束或审批。

映射命令: `te-cli te-engage +manage-task`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--task-id` | string | 是 | 任务 ID |
| `--action` | string | 是 | 操作类型 |
| `--reason` | string | 否 | 审批类操作原因 |

## 枚举说明

### `--action`

- `send`: 立即发送，通常用于手动触发且处于 waiting 状态的任务
- `pause`: 暂停运行中的任务
- `end`: 结束运行中或暂停中的任务
- `approve`: 审批通过
- `deny`: 审批拒绝
- `cancel`: 撤销审批

## 安全约束

此命令为 **写操作**，会改变任务状态。

## 示例

```bash
te-cli te-engage +manage-task --project-id 1 --task-id task_123 --action pause
```
