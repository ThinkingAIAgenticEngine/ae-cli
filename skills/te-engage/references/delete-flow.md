# te-engage +delete-flow

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

批量删除流程。

映射命令: `te-cli te-engage +delete-flow`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--flow-uuid-list` | json | 是 | Flow UUID JSON 数组 |

## 安全约束

此命令为 **写操作**，会删除流程。

## 示例

```bash
te-cli te-engage +delete-flow --project-id 1 --flow-uuid-list '["flow_uuid_1"]'
```
