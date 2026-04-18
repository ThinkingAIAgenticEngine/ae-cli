# te-engage +modify-flow-base-info

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

修改流程画布的基础信息。

映射命令: `te-cli te-engage +modify-flow-base-info`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--flow-uuid` | string | 是 | Flow UUID |
| `--flow-name` | string | 否 | 新流程名称 |
| `--flow-desc` | string | 否 | 新流程描述 |
| `--group-id` | number | 否 | 新分组 ID |

## 安全约束

此命令为 **写操作**，会修改流程基础信息。

## 示例

```bash
te-cli te-engage +modify-flow-base-info --project-id 1 --flow-uuid flow_uuid_123 --flow-name "新名称"
```
