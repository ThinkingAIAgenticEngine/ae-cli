# te-engage +delete-config-channel

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

删除配置通道。

映射命令: `te-cli te-engage +delete-config-channel`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--channel-id` | string | 是 | 配置通道 ID |

## 安全约束

此命令为 **写操作**，会删除配置通道。

## 示例

```bash
te-cli te-engage +delete-config-channel --project-id 1 --channel-id <channel-id>
```
