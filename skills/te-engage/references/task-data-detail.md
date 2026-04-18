# te-engage +task-data-detail

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

查询任务详细数据报表。

映射命令: `te-cli te-engage +task-data-detail`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--task-id` | string | 是 | 任务 ID |
| `--task-type` | string | 是 | 任务类型：`normal` 或 `trigger` |
| `--detail-type` | string | 是 | 明细类型 |
| `--start-time` | string | 是 | 开始日期 |
| `--end-time` | string | 是 | 结束日期 |
| `--request-id` | string | 否 | 查询 requestId |
| `--push-language-code` | string | 否 | 推送语言代码 |
| `--task-instance-id` | string | 否 | 任务实例 ID |
| `--data-dim-type` | string | 否 | 数据维度类型 |
| `--retention-type` | string | 否 | 留存类型 |
| `--data-view-type` | number | 否 | 触发任务视图类型 |
| `--show-time-zone` | string | 否 | 展示时区偏移 |

## 枚举说明

### `--task-type`

- `normal`: 普通任务
- `trigger`: 触发式任务

### `--detail-type`

- `time`: 按时间维度查看
- `instance`: 按执行实例查看
- `instance_daily`: 查看单个实例的逐日明细

### `--data-dim-type`

- `uv`: 按去重用户数统计
- `pv`: 按事件/次数统计

### `--retention-type`

- `retention`: 留存分析
- `lost`: 流失分析

### `--data-view-type`

仅在 `--task-type trigger` 且 `--detail-type time` 时有效：

- `2`: 日期视图
- `3`: 触发视图

### `--push-language-code`

常见值包括：

- `default`
- `en`
- `zh-Hans`
- `zh-Hant`
- `ja`
- `ko`

## 参数约束

- `--task-type trigger` 时，`--detail-type` 只能是 `time`。
- `--detail-type instance_daily` 时，必须传 `--task-instance-id`。
- `--start-time`、`--end-time` 使用 `yyyy-MM-dd`。

## 示例

```bash
te-cli te-engage +task-data-detail \
  --project-id 1 --task-id task_123 \
  --task-type normal --detail-type time \
  --start-time 2026-04-01 --end-time 2026-04-07
```
