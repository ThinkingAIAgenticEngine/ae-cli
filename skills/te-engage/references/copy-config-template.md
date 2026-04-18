# te-engage +copy-config-template

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

把一个模板从源配置项复制到目标配置项。

映射命令: `te-cli te-engage +copy-config-template`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--source-project-id` | number | 是 | 源项目 ID |
| `--source-config-id` | string | 是 | 源配置项 ID |
| `--source-template-id` | string | 是 | 源模板 ID |
| `--project-id` / `-p` | number | 是 | 目标项目 ID |
| `--config-id` | string | 是 | 目标配置项 ID |

## 安全约束

此命令为 **写操作**，会复制模板和依赖资源。

## 示例

```bash
te-cli te-engage +copy-config-template \
  --source-project-id 1 --source-config-id src_cfg --source-template-id tpl_1 \
  --project-id 2 --config-id dst_cfg
```
