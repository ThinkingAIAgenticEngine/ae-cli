---
name: te-engage
version: 1.0.0
description: "TE Engage MCP：配置项、流程、渠道设置、任务数据查询与管理"
metadata:
  requires:
    bins: ["te-cli"]
  cliHelp: "te-cli te-engage --help"
---

# te-engage

> **前置条件:** 阅读 [`../te-shared/SKILL.md`](../te-shared/SKILL.md) 了解认证、全局参数和安全约束。

## 概述

`te-engage` 域提供 Hermes Engage MCP 能力，覆盖配置项、流程、渠道设置和任务数据。命令通过 `te-cli te-engage <command>` 调用。

适合的场景包括：

- 查询和管理渠道、配置通道、审批人、白名单
- 查询任务列表、任务详情、实验报表、指标报表
- 查询配置项与策略、复制模板、管理策略状态
- 查询流程列表、节点 schema、流程报表，以及保存/管理流程

## 参数约定

- 简单参数直接使用普通 flags，例如 `--project-id`、`--task-id`、`--flow-uuid`
- 数组参数使用 JSON flags，例如 `--strategy-id-list '["id1","id2"]'`
- 对象参数使用具名 JSON flags，例如 `--req '{...}'`、`--flow-list '[...]'`
- 可选全局参数仍可与其他 domain 一样使用，例如 `--host`、`--mcp-url`、`--dry-run`

## JSON 参数格式

常见 JSON flags 示例：

```bash
--provider-list '["webhook","fcm"]'
--strategy-id-list '["strategy_a","strategy_b"]'
--flow-id-list '["flow_1","flow_2"]'
--req '{"pageNum":1,"pageSize":20}'
```

## 常见场景

### 1. setting

```bash
# 查询渠道列表
te-cli te-engage +channel-list --project-id 1

# 过滤 provider
te-cli te-engage +channel-list --project-id 1 --provider-list '["webhook","fcm"]'

# 查询 config channel
te-cli te-engage +config-channel-list --project-id 1
```

### 2. task

```bash
# 查询任务列表
te-cli te-engage +task-list --project-id 1 --req '{"pageNum":1,"pageSize":20}'

# 查询任务详情
te-cli te-engage +task-detail --project-id 1 --task-id task_123

# 查询任务概览
te-cli te-engage +task-data-overview --project-id 1 --task-id task_123 --task-type normal
```

### 3. config

```bash
# 查询配置项列表
te-cli te-engage +config-item-list --project-id 1

# 查询策略列表
te-cli te-engage +strategy-list --project-id 1 --config-id cfg_123

# 查询配置项报表
te-cli te-engage +config-item-trigger-report \
  --project-id 1 --config-id cfg_123 \
  --start-time 2026-04-01 --end-time 2026-04-07
```

### 4. flow

```bash
# 查询流程列表
te-cli te-engage +flow-list --project-id 1

# 查询流程详情
te-cli te-engage +flow-detail --project-id 1 --flow-uuid flow_uuid_123

# 查询节点 schema
te-cli te-engage +flow-node-config-schema --node-type message_push
```

## `+save-flow` 关键约束

当用户要“创建流程 / 生成流程画布 / 保存流程”时，不要把 `+save-flow` 当成普通单命令直接调用，必须按下面流程执行。

### 必须遵守的工作流

1. 先确认用户意图已经足够明确，至少要有：
   - 业务场景
   - 目标用户
   - 触达方式
   - 是否分流，以及分流条件
2. 不要从自然语言直接跳到 `--req`，必须先整理出稳定的中间意图结构，再映射成最终 `req`。
3. 在构造条件相关节点前，必须先调用：

```bash
te-cli te_audience +get_cluster_definition_schema --cluster_type condition
```

4. 在构造 `message_push`、`wechat_push`、`webhook_push` 等触达节点前，必须先调用：

```bash
te-cli te-engage +channel-list --project-id <projectId>
```

5. `+save-flow` 的最终 `--req` 必须是完整画布请求体，而不是意图描述。至少应包含：
   - `flowName`
   - `flowDesc`
   - `nodeList`
   - `edgeList`
6. `nodeList[].config` 和 `edgeList[].config` 必须是 JSON 字符串，不是 JSON 对象。
7. `targetClusterQp` 如果出现在节点 `config` 中，其值通常也应是再次 `JSON.stringify` 后的字符串，而不是原始对象。
8. 提交前必须自检：
   - 只有一个入口节点
   - 至少一个 `exit_flow`
   - `edge.source` / `edge.target` 都引用有效节点
   - 分支节点的 `sourceBranchId` 已在上游节点 `config` 中声明
   - 整张图是 DAG，不能有环

### 明确禁止

- 不要凭空编造 `channelId`
- 不要在用户信息不足时自行脑补分流逻辑
- 不要把业务语义节点直接当成最终 `nodeList` 节点提交
- 不要把 `config` 写成对象后直接塞进 `--req`

### 推荐顺序

```text
用户需求
-> 整理意图
-> te_audience +get_cluster_definition_schema --cluster_type condition
-> +channel-list --project-id <projectId>
-> 构造 nodeList / edgeList
-> 自检
-> +save-flow
```

更细的生成规则优先参考：

- `references/save-flow.md`
- `references/flow-node-config-schema.md`
- `references/validate-flow-node-config.md`

## dry-run 调试

```bash
te-cli --dry-run te-engage +channel-list --project-id 1
te-cli --dry-run te-engage +task-list --project-id 1 --req '{"pageNum":1,"pageSize":20}'
te-cli --dry-run te-engage +flow-list --project-id 1
```

## References

更细的单命令说明见按业务拆分的 `references/` 目录：

- `references/channel-list.md`
- `references/task-list.md`
- `references/config-item-list.md`
- `references/flow-list.md`

这种拆包方式更适合后续继续扩展，因为对象入参较复杂的命令会集中在 `references/` 根目录维护。

## 命令分组

### setting

`+channel-list`, `+channel-detail`, `+update-channel-status`, `+delete-channel`, `+add-channel`, `+whitelist-list`, `+add-approver`, `+approver-list`, `+cancel-query-by-request-id`, `+config-channel-detail`, `+config-channel-list`, `+delete-config-channel`, `+update-config-channel-status`

### task

`+task-data-overview`, `+task-data-detail`, `+task-metric-detail`, `+task-experiment-report`, `+task-detail`, `+task-list`, `+task-stats`, `+manage-task`

### config

`+config-item-trigger-report`, `+config-item-analysis-report`, `+config-item-strategy-comparison`, `+config-item-list`, `+config-item-detail`, `+delete-config-item`, `+copy-config-template`, `+strategy-list`, `+strategy-detail`, `+manage-strategy`

### flow

`+save-flow`, `+flow-node-config-schema`, `+flow-detail`, `+flow-list`, `+flow-node-overview-report`, `+manage-flow`, `+flow-ab-split-node-report`, `+flow-process-report`, `+validate-flow-node-config`, `+flow-node-detail-report`, `+delete-flow`, `+modify-flow-base-info`

## 日期格式

涉及日期参数的命令通常使用 `yyyy-MM-dd`，例如 `--start-time 2026-04-01`。

## 写操作提醒

以下命令属于写操作，执行前应确认用户明确意图：

- 渠道与配置通道：`+add-channel`, `+delete-channel`, `+update-channel-status`, `+delete-config-channel`, `+update-config-channel-status`
- 策略与配置项：`+delete-config-item`, `+copy-config-template`, `+manage-strategy`
- 流程：`+save-flow`, `+modify-flow-base-info`, `+manage-flow`, `+delete-flow`
- 任务：`+manage-task`
