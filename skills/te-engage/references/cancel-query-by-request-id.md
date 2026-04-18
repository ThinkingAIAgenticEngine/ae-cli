# te-engage +cancel-query-by-request-id

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

按 requestId 取消正在执行的数据查询。

映射命令: `te-cli te-engage +cancel-query-by-request-id`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--request-id` | string | 是 | 查询 requestId |

## 安全约束

此命令为 **写操作**，会取消已有查询。

## 示例

```bash
te-cli te-engage +cancel-query-by-request-id --request-id 00000000-0000-0000-0000-000000000000
```
