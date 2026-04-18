# te-engage +flow-ab-split-node-report

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

查询 AB 分流节点报表。

映射命令: `te-cli te-engage +flow-ab-split-node-report`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--report-type` | string | 是 | 报表类型：`overview` 或 `detail` |
| `--node-uuid` | string | 是 | AB 节点 UUID |
| `--start-time` | string | 是 | 开始日期 |
| `--end-time` | string | 是 | 结束日期 |
| `--flow-id` | string | 否 | Flow ID |
| `--flow-uuid` | string | 否 | Flow UUID |
| `--request-id` | string | 否 | 查询 requestId |
| `--push-language-code` | string | 否 | 推送语言代码 |
| `--indicators-uuid` | string | 否 | 指标 UUID |
| `--show-time-zone` | string | 否 | 展示时区偏移 |

## 枚举说明

### `--report-type`

- `overview`: AB 分流节点概览报表
- `detail`: AB 分流节点明细报表

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
te-cli te-engage +flow-ab-split-node-report \
  --project-id 1 --flow-uuid flow_uuid_123 --node-uuid node_123 \
  --report-type overview --start-time 2026-04-01 --end-time 2026-04-07
```
