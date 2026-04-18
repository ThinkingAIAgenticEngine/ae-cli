# te-engage +flow-node-detail-report

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

查询单个流程节点的详细报表。

映射命令: `te-cli te-engage +flow-node-detail-report`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--node-uuid` | string | 是 | 节点 UUID |
| `--start-time` | string | 是 | 开始日期 |
| `--end-time` | string | 是 | 结束日期 |
| `--flow-id` | string | 否 | Flow ID |
| `--flow-uuid` | string | 否 | Flow UUID |
| `--request-id` | string | 否 | 查询 requestId |
| `--push-language-code` | string | 否 | 推送语言代码 |
| `--branch-id` | string | 否 | 分支 ID |
| `--indicator-name` | string | 否 | 指标名称 |
| `--data-dim-type` | string | 否 | 数据维度类型 |
| `--show-time-zone` | string | 否 | 展示时区偏移 |

## 枚举说明

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

## 参数约束

- `--flow-id` 和 `--flow-uuid` 至少传一个。
- `--start-time`、`--end-time` 使用 `yyyy-MM-dd`。

## 示例

```bash
te-cli te-engage +flow-node-detail-report \
  --project-id 1 --flow-uuid flow_uuid_123 --node-uuid node_123 \
  --start-time 2026-04-01 --end-time 2026-04-07
```
