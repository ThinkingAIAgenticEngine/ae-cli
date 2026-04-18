# te-engage +add-approver

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

批量添加审批人。

映射命令: `te-cli te-engage +add-approver`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--approvers` | json | 是 | 审批人 open ID JSON 数组 |

## 安全约束

此命令为 **写操作**，会修改项目审批人配置。

## 示例

```bash
te-cli te-engage +add-approver --project-id 1 --approvers '["ou_xxx","ou_yyy"]'
```
