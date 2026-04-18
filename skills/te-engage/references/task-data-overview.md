# te-engage +task-data-overview

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

查询任务漏斗式数据概览。

映射命令: `te-cli te-engage +task-data-overview`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--task-id` | string | 是 | 任务 ID |
| `--task-type` | string | 是 | 任务类型：`normal` 或 `trigger` |
| `--request-id` | string | 否 | 查询 requestId |
| `--push-language-code` | string | 否 | 推送语言代码 |
| `--data-dim-type` | string | 否 | 数据维度类型 |
| `--show-time-zone` | string | 否 | 展示时区偏移 |

## 枚举说明

### `--task-type`

- `normal`: 普通任务
- `trigger`: 触发式任务

### `--data-dim-type`

- `uv`: 按去重用户数统计
- `pv`: 按事件/次数统计

### `--push-language-code`

常见值包括：

- `default`
- `en`
- `zh-Hans`
- `zh-Hant`
- `ja`
- `ko`

## 示例

```bash
te-cli te-engage +task-data-overview --project-id 1 --task-id task_123 --task-type normal
```
