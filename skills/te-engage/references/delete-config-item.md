# te-engage +delete-config-item

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

删除配置项。

映射命令: `te-cli te-engage +delete-config-item`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--config-id` | string | 是 | 配置项 ID |
| `--open-id` | string | 是 | 操作人 open ID |

## 安全约束

此命令为 **写操作**，会删除配置项。

## 示例

```bash
te-cli te-engage +delete-config-item --project-id 1 --config-id cfg_123 --open-id ou_xxx
```
