# te-engage +flow-process-report

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

查询流程级别的过程报表。

映射命令: `te-cli te-engage +flow-process-report`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--report-type` | string | 是 | 报表类型 |
| `--flow-id` | string | 否 | Flow ID |
| `--flow-uuid` | string | 否 | Flow UUID |
| `--request-id` | string | 否 | 查询 requestId |
| `--push-language-code` | string | 否 | 推送语言代码 |
| `--data-dim-type` | string | 否 | 数据维度类型 |
| `--start-time` | string | 否 | 开始日期 |
| `--end-time` | string | 否 | 结束日期 |
| `--show-time-zone` | string | 否 | 展示时区偏移 |

## 枚举说明

### `--report-type`

- `overview`: 流程总览
- `detail`: 流程明细
- `exit_detail`: 退出明细
- `push_detail`: 推送明细

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
- 当 `--report-type` 为 `detail`、`exit_detail`、`push_detail` 时，`--start-time` 和 `--end-time` 必填。
- 当 `--report-type` 为 `overview` 时，可以不传时间，也可以成对传入 `--start-time` 和 `--end-time`。

## 示例

```bash
te-cli te-engage +flow-process-report --project-id 1 --flow-uuid flow_uuid_123 --report-type overview
```
