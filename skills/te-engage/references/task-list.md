# te-engage +task-list

> **前置条件:** 阅读 [`../../te-shared/SKILL.md`](../../te-shared/SKILL.md)

分页查询任务列表。

映射命令: `te-cli te-engage +task-list`

## Flags

| Flag | 类型 | 必填 | 说明 |
|------|------|------|------|
| `--project-id` / `-p` | number | 是 | 项目 ID |
| `--req` | json | 是 | 查询条件 JSON 对象 |

## `--req` 对象字段

常见字段如下，按需传入即可：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `pageNum` | number | 否 | 页码，从 1 开始 |
| `pageSize` | number | 否 | 每页条数 |
| `mappingStatus` | number | 否 | 状态过滤 |
| `triggerType` | number | 否 | 触发类型过滤 |
| `channelType` | number | 否 | 渠道类型过滤 |
| `groupId` | number | 否 | 分组 ID |
| `creator` | string | 否 | 创建人 open_id |
| `fuzzyField` | string | 否 | 任务 ID 或任务名模糊搜索 |
| `belongActivity` | number | 否 | 是否关联活动过滤 |
| `expStatusList` | array | 否 | 实验状态列表 |
| `expReleaseStatusList` | array | 否 | 实验发布状态列表 |
| `expTypeList` | array | 否 | 实验类型列表 |

`projectId` 会由 CLI 自动补入 `--req`，通常不需要重复写。

## 枚举说明

### `req.mappingStatus`

- `0`: draft
- `1`: in progress
- `2`: paused
- `3`: ended
- `4`: approving
- `5`: denied

### `req.triggerType`

- `0`: scheduled-single
- `1`: scheduled-recurring
- `2`: manual
- `3`: trigger-complete A
- `4`: trigger-complete A then B
- `5`: trigger-complete A but not B
- `6`: custom trigger

### `req.channelType`

- `1`: webhook
- `2`: app_push
- `3`: client_push
- `4`: wechat
- `5`: dou_yin

### `req.belongActivity`

- `0`: 全部
- `1`: 已关联活动
- `2`: 未关联活动

### `req.expStatusList[]`

- `0`: 未创建实验
- `1`: 已创建实验

### `req.expReleaseStatusList[]`

- `0`: 未发布实验
- `1`: 已发布实验

### `req.expTypeList[]`

- `0`: normal
- `1`: orthogonal

## 示例

```bash
te-cli te-engage +task-list --project-id 1 --req '{"pageNum":1,"pageSize":20}'
```
