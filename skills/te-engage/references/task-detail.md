# te-engage +task-detail

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

查询单个任务详情。

映射命令: `te-cli te-engage +task-detail`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--task-id` | string | 是 | 任务 ID |

## 返回值里的常见枚举

### `status`

- `0`: `DRAFT`，草稿，未提交
- `1`: `WORKING`，运行中
- `2`: `PENDING`，已暂停
- `3`: `COMPLETE`，已结束

### `mappingStatus`

- `0`: `DRAFT`
- `1`: `WORKING`
- `2`: `PENDING`
- `3`: `COMPLETE`
- `4`: `APPROVE`，待审批
- `5`: `DENY`，审批拒绝

### `channelType`

- `1`: `WEBHOOK`
- `2`: `APP_PUSH`
- `3`: `CLIENT_PUSH`
- `4`: `WECHAT`
- `5`: `DOU_YIN`

### `triggerType`

- `0`: `SCHEDULED_SINGLE`
- `1`: `SCHEDULED_RECURRING`
- `2`: `MANUAL`
- `3`: `TRIGGER_COMPLETE_A`
- `4`: `TRIGGER_COMPLETE_A_THEN_B`
- `5`: `TRIGGER_COMPLETE_A_NOT_B`
- `6`: `CUSTOM_TRIGGER`

### `realtime`

- `0`: physical cluster，物理人群
- `1`: virtual cluster，虚拟人群

## 示例

```bash
te-cli te-engage +task-detail --project-id 1 --task-id task_123
```
