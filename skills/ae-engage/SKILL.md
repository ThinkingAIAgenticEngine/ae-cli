---
name: ae-engage
version: 1.0.0
description: "AE Engage MCP: config items, flows, channel settings, task data query, and management"
---

# ae-engage

AE CLI (`ae-cli`) is the command-line tool for the ThinkingEngine data analysis platform, used by AI Agents and human users.

## Global AE CLI Rules

AE CLI (`ae-cli`) is the command-line tool for the AE / TE / ThinkingEngine analysis platform. For AE analysis-side requests, prefer `ae-cli` and this skill's reference docs over model memory.

Global parameters:

| Parameter | Description |
|---|---|
| `--format <json\|table>` | Output format. Default is JSON. |
| `--jq <expr>` | jq filter expression for JSON output. |
| `--host <url>` | Override the active AE host. Available on every command and may be placed after the subcommand, e.g. `ae-cli engage +<command> --host <url>`. |

Output and errors:
- Successful commands return machine-readable JSON by default. Envelope may include optional `_notice.host_compat`.
- Failed commands return `{ "ok": false, "error": { "type": "...", "message": "...", "hint": "..." } }` and exit non-zero.
- **CRITICAL — Host compat (do this first):** After each `ae-cli` run, check stderr and `_notice.host_compat`. If either is present, open the user reply with a short ⚠️ version warning and **quote the `npm i -g` / `npx skills add` (or update-cluster) lines verbatim**, then present the business result. Soft tip; `ok: true` can still carry the notice.

Safety constraints:
- Read commands can execute directly after required IDs and references are verified.
- Write commands require explicit user intent. Ordinary `write` commands execute without CLI confirmation; only `high-risk-write` commands use the confirmation gate.
- Never invent command names, flags, JSON payloads, `project_id`, resource IDs, field names, event names, property names, metric definitions, or date formats. Read the matching command reference and discover real project metadata first.
- **NEVER fabricate or guess resource names** (reports, dashboards, events, properties, metrics, clusters, tags, alerts). Always use list commands to discover real resources first. If a resource is not found after fuzzy search and full list fallback, explicitly tell the user "resource not found" and stop - do not proceed with fabricated names.

## Overview

The `ae-engage` package provides Hermes Engage MCP capabilities across config items, flows, channel settings, and task data. Legacy MCP tools use `ae-cli engage +<command>`; new capability-gateway commands use `ae-cli engage-flow|engage-task|engage-setting <resource> <action>`.

Typical use cases include:

- Querying and managing channels, config channels, approvers, and whitelists
- Querying project channel touch-limit or fatigue-control rules
- Querying task lists, task details, experiment reports, and metric reports
- Querying config items and strategies, copying templates, and managing strategy status
- Querying flow lists, node schemas, and flow reports, and saving or managing flows

## Parameter Conventions

- Use regular flags for simple parameters, for example `--project_id`, `--task_id`, and `--flow_uuid`
- Use JSON flags for array parameters, for example `--strategy_id_list '["id1","id2"]'`
- Use named JSON flags for object parameters, for example `--req '{...}'` and `--flow_list '[...]'`
- Optional global parameters work the same way as in other domains, for example `--host`, `--mcp-url`, and `--dry-run`

## JSON Parameter Format

Common JSON flag examples:

```bash
--provider_list '["webhook","fcm"]'
--strategy_id_list '["strategy_a","strategy_b"]'
--flow_id_list '["flow_1","flow_2"]'
--req '{"pageNum":1,"pageSize":20}'
```

## Common Scenarios

### 1. setting

```bash
# Query the channel list
ae-cli engage +channel_list --project_id 1

# Filter by provider
ae-cli engage +channel_list --project_id 1 --provider_list '["webhook","fcm"]'

# Query config channels
ae-cli engage +config_channel_list --project_id 1

# Query project channel touch-limit rules
ae-cli engage-setting channel-touch-limits list --project-id <project_id>

# Update a channel's config / reach-funnel settings
ae-cli engage-setting channel update-config --project-id <project_id> --channel-id <channel_id> --enable-touch-event 1

# Send a test message to a channel
ae-cli engage-setting channel test-send --project-id <project_id> --channel-id <channel_id> --push-id <send_id> --content-list '[{"key":"title","value":"hello"}]'

# Batch update / toggle / save channel touch-limit (fatigue-control) rules
ae-cli engage-setting channel-touch-limits batch-update --project-id <project_id> --items '[{"rule_id":"r1","enable":true,"rule_def":"[]"}]'
ae-cli engage-setting channel-touch-limits toggle --project-id <project_id> --rule-id <rule_id> --enable false
ae-cli engage-setting channel-touch-limits save --project-id <project_id> --channel-biz-type <biz_type> --rule-def '[]' --enable true

# Remove an approver from a project
ae-cli engage-setting approval-approver delete --project-id <project_id> --approver <open_id> --yes

# Whitelist add / update / delete / verify
ae-cli engage-setting whitelist add --project-id <project_id> --prop-code <prop_code> --column-name <column_name> --column-type string --whitelist-list '[{"entity_id":"u1","source_value":"v1"}]'
ae-cli engage-setting whitelist update --project-id <project_id> --whitelist-id <id> --note-name <name>
ae-cli engage-setting whitelist delete --project-id <project_id> --whitelist-ids '["wl-1"]' --yes
ae-cli engage-setting whitelist verify --project-id <project_id> --prop-code <prop_code> --column-type string --whitelist-prop-list '["v1"]'

# Push-language (本地化) get / set
ae-cli engage-setting push-language get --project-id <project_id>
ae-cli engage-setting push-language set --project-id <project_id> --push-language-column <prop_code>

# Client param (客户端参数) update / delete / list
ae-cli engage-setting client-param update --project-id <project_id> --column-name level --column-type string --select-type single --column-desc Level
ae-cli engage-setting client-param delete --project-id <project_id> --column-name level --yes
ae-cli engage-setting client-param list --project-id <project_id>

# Config table (配置表) upload / save / list / query-data / update-data / delete
ae-cli engage-setting config-table upload --project-id <project_id> --request-id <rid> --file-name data.csv --file-content "$(base64 -i data.csv)"
ae-cli engage-setting config-table save --project-id <project_id> --request-id <rid> --info-name <table_name>
ae-cli engage-setting config-table list --project-id <project_id>
ae-cli engage-setting config-table query-data --project-id <project_id> --info-id <info_id>
ae-cli engage-setting config-table update-data --project-id <project_id> --request-id <rid> --info-name <table_name> --info-id <info_id>
ae-cli engage-setting config-table delete --project-id <project_id> --info-id <info_id> --yes

# Preset event (预置事件) list / update
ae-cli engage-setting preset-event list --project-id <project_id>
ae-cli engage-setting preset-event update --project-id <project_id> --add-event-desc <qp>

# Common metric (常用指标) list / get / update / delete
ae-cli engage-setting common-metric list --project-id <project_id>
ae-cli engage-setting common-metric get --project-id <project_id> --metric-name <name>
ae-cli engage-setting common-metric update --project-id <project_id> --metric-type <type> --metric-name <name> --metric-qp <qp> --metric-window-num 1 --metric-window-time-unit DAY --display-name <display>
ae-cli engage-setting common-metric delete --project-id <project_id> --metric-name <name> --yes
```

### 2. task

```bash
# Query the task list
ae-cli engage +task_list --project_id 1 --req '{"pageNum":1,"pageSize":20}'

# Build a save_task guide before composing the final req
ae-cli engage +build_task_save_guide --project_id 1 --req '{"context":{"triggerType":2,"channelId":"channel_123"}}'

# Save a task draft (create when req.taskId is omitted)
ae-cli engage +save_task --project_id 1 --req '{"baseInfo":{"taskName":"Demo Task"},"channelConfig":{"channelType":1,"channelId":"channel_123","groupContentList":[{"contentList":[{"pushLanguageCode":"default","content":"[]"}]}]},"targetConfig":{"targetClusterType":3},"triggerConfig":{"triggerType":2},"controlConfig":{"completionIndicatorDef":{"completionIndicators":[]}}}'

# Query task details
ae-cli engage +task_detail --project_id 1 --task_id task_123

# Query the task overview
ae-cli engage +task_data_overview --project_id 1 --task_id task_123
```

### 3. config

```bash
# Query the config item list
ae-cli engage +config_item_list --project_id 1

# Query the strategy list
ae-cli engage +strategy_list --project_id 1 --config_id cfg_123

# Query a config item report
ae-cli engage +config_item_trigger_report \
  --project_id 1 --config_id cfg_123 \
  --start_time 2026-04-01 --end_time 2026-04-07
```

### 4. flow

```bash
# Query the flow list
ae-cli engage +flow_list --project_id 1

# Query flow details
ae-cli engage +flow_detail --project_id 1 --flow_uuid flow_uuid_123

# Query flow operation records and application logs
ae-cli engage-flow operation-log query --project-id 1 --flow-id flow_id_123

# Query flow versions and task push records
ae-cli engage-flow version list --project-id 1 --flow-id flow_id_123
ae-cli engage-task operation-log query --project-id 1 --task-id task_id_123
ae-cli engage-task push-record query --project-id 1 --task-id task_id_123 --page-num 1 --page-size 20
ae-cli engage-task segment-list query --project-id 1 --task-id task_id_123
ae-cli engage-task group list --project-id 1
ae-cli engage-task metric list --project-id 1 --task-id task_id_123
ae-cli engage-task channel-ref stats --project-id 1 --channel-id channel_123
ae-cli engage-task task delete --project-id 1 --task-id task_id_123 --yes

# Query the node schema
ae-cli engage +flow_node_config_schema --node_type message_push
```

### 5. scene (场景管理 / 配置中心)

New capability-gateway command group `engage-scene` covers 配置中心 (config center): config items, params, groups, preset/related metrics, config channels, strategies, and templates. Complex DTOs are passed with `--payload` (native camelCase JSON).

```bash
# Config item (配置项) list / create / update
ae-cli engage-scene config-item list --project-id <project_id>
ae-cli engage-scene config-item create --project-id <project_id> --config-id <config_id> --config-name <name> --business-type params
ae-cli engage-scene config-item update --project-id <project_id> --config-id <config_id> --config-name <name>

# Config param (配置项参数) list / batch-add / update / batch-delete
ae-cli engage-scene config-param list --project-id <project_id> --config-id <config_id>
ae-cli engage-scene config-param batch-add --project-id <project_id> --config-id <config_id> --params '[{"param_name":"a","param_type":"string"}]'
ae-cli engage-scene config-param update --project-id <project_id> --config-id <config_id> --param-id <param_id> --param-name a
ae-cli engage-scene config-param batch-delete --project-id <project_id> --param-ids '[1,2]' --yes

# Config group (配置项分组) list / batch-add / update / batch-delete
ae-cli engage-scene config-group list --project-id <project_id>
ae-cli engage-scene config-group batch-add --project-id <project_id> --group-names '["g1"]'
ae-cli engage-scene config-group update --project-id <project_id> --group-id <group_id> --group-name g2
ae-cli engage-scene config-group batch-delete --project-id <project_id> --group-ids '[1,2]' --yes

# Preset metric (预置指标) get / set
ae-cli engage-scene preset-metric get --project-id <project_id> --config-id <config_id>
ae-cli engage-scene preset-metric set --project-id <project_id> --config-id <config_id> --impression-event-qp '<qp>'

# Config metric (关联指标) list / get / batch-add / update-rule / batch-delete
ae-cli engage-scene config-metric list --project-id <project_id> --config-id <config_id>
ae-cli engage-scene config-metric get --project-id <project_id> --metric-id <metric_id>
ae-cli engage-scene config-metric batch-add --project-id <project_id> --config-id <config_id> --ta-metric-ids '[1,2]'
ae-cli engage-scene config-metric update-rule --project-id <project_id> --metric-id <metric_id> --event-list '[{"event_name":"e1","filter":"true"}]'
ae-cli engage-scene config-metric batch-delete --project-id <project_id> --config-id <config_id> --metric-ids '[1,2]' --yes

# Config channel (配置通道) create / update / query-log
ae-cli engage-scene config-channel create --project-id <project_id> --channel-name <name> --channel-type 0 --config '<json>'
ae-cli engage-scene config-channel update --project-id <project_id> --channel-id <channel_id> --channel-name <name> [--config '<json>']
ae-cli engage-scene config-channel query-log --project-id <project_id> --channel-id <channel_id>

# Strategy (策略) create / update / log / batch-copy
ae-cli engage-scene strategy create --project-id <project_id> --payload '{"configId":"cfg-1","templateId":"tpl-1","strategyName":"s1"}'
ae-cli engage-scene strategy update --project-id <project_id> --payload '{"strategyUuid":"uuid-1"}'
ae-cli engage-scene strategy log --project-id <project_id> --strategy-uuid <uuid>
ae-cli engage-scene strategy batch-copy --project-id <project_id> --config-id <config_id> --strategy-ids '["s1"]'

# Template (模板) list / get / create / update / update-status / delete
ae-cli engage-scene template list --project-id <project_id> --config-id <config_id>
ae-cli engage-scene template get --project-id <project_id> --config-id <config_id> --template-id <template_id>
ae-cli engage-scene template create --project-id <project_id> --payload '{"configId":"cfg-1","templateId":"tpl-1","templateName":"t1"}'
ae-cli engage-scene template update --project-id <project_id> --payload '{"configId":"cfg-1","templateId":"tpl-1","config":[]}'
ae-cli engage-scene template update-status --project-id <project_id> --config-id <config_id> --template-id <template_id> --status 1
ae-cli engage-scene template delete --project-id <project_id> --config-id <config_id> --template-id <template_id> --yes
```

### 6. activity (运营活动)

New capability-gateway command group `engage-activity` covers 运营活动: activities, approval workflow, topics, activity types, and standalone tasks. Complex DTOs are passed with `--payload` (native camelCase JSON).

```bash
# Activity (运营活动) create / update / delete / list / get / pause / end / stats / info-list
ae-cli engage-activity activity create --project-id <project_id> --payload '{"activityName":"a1","activityType":"other_type","tzOffset":8,"periodType":0}'
ae-cli engage-activity activity update --project-id <project_id> --payload '{"activityId":"act-1","activityName":"a1","activityType":"other_type","tzOffset":8,"periodType":0}'
ae-cli engage-activity activity delete --project-id <project_id> --activity-id <activity_id> --yes
ae-cli engage-activity activity list --project-id <project_id> --page 1 --page-size 20
ae-cli engage-activity activity get --project-id <project_id> --activity-id <activity_id>
ae-cli engage-activity activity pause --project-id <project_id> --activity-id <activity_id>
ae-cli engage-activity activity end --project-id <project_id> --activity-id <activity_id>
ae-cli engage-activity activity stats --project-id <project_id>
ae-cli engage-activity activity info-list --project-id <project_id> --activity-id <activity_id>

# Approval (活动审批) submit / approve / reject / cancel
ae-cli engage-activity approval submit --project-id <project_id> --activity-id <activity_id>
ae-cli engage-activity approval approve --project-id <project_id> --activity-id <activity_id>
ae-cli engage-activity approval reject --project-id <project_id> --activity-id <activity_id> --reason <reason>
ae-cli engage-activity approval cancel --project-id <project_id> --activity-id <activity_id>

# Topic (活动主题) remove-task / delete / get / copy
# Temporarily disabled: topic create / topic update
# See references/activity-topic.md for topicClusterKey vs task clusterKey and remaining commands.
# ae-cli engage-activity topic create --project-id <project_id> --payload '{"activityId":"act-1","topicName":"t1","targetClusterType":2,"topicClusterKey":"<cluster>","channelType":1,"channelId":"c1","triggerType":0,"enableChannelTouchLimits":false,"frequencyLimits":"{}","tasks":[...]}'
# ae-cli engage-activity topic update --project-id <project_id> --payload '{"topicId":"topic-1", ...}'
ae-cli engage-activity topic remove-task --project-id <project_id> --task-id <task_id> --yes
ae-cli engage-activity topic delete --project-id <project_id> --topic-id <topic_id> --yes
ae-cli engage-activity topic get --project-id <project_id> --topic-id <topic_id>
ae-cli engage-activity topic copy --project-id <project_id> --topic-id <topic_id> [--new-name <name>]

# Activity type (活动类型) list / batch-add / update / batch-delete
ae-cli engage-activity activity-type list --project-id <project_id>
ae-cli engage-activity activity-type batch-add --project-id <project_id> --type-names '["t1","t2"]'
ae-cli engage-activity activity-type update --project-id <project_id> --id <type_id> --type-name t3
ae-cli engage-activity activity-type batch-delete --project-id <project_id> --ids '["id1","id2"]' --yes

# Standalone task (独立任务) get / copy
# Temporarily disabled: task create / task update
ae-cli engage-activity task get --project-id <project_id> --task-id <task_id>
# ae-cli engage-activity task create --project-id <project_id> --payload '{"taskName":"t1","activityId":"act-1", ...}'
# ae-cli engage-activity task update --project-id <project_id> --payload '{"taskId":"task-1", ...}'
ae-cli engage-activity task copy --project-id <project_id> --task-id <task_id> [--new-name <name>]
```

### 7. workbench (工作台)

New capability-gateway command group `engage-workbench` covers 工作台 metric slots (指标卡槽): each user configures up to 4 metric cards per project. Slots are per-user; `update`/`delete` only affect the caller's own slots. The first `list` auto-initialises 4 default slots.

```bash
# Workbench slot (工作台卡槽) list / add / update / delete
ae-cli engage-workbench workbench list --project-id <project_id>
ae-cli engage-workbench workbench add --project-id <project_id> --metric-type <metric_type> --date-type <date_type> --order-id 1
ae-cli engage-workbench workbench update --project-id <project_id> --slot-id <slot_id> --metric-type <metric_type> --date-type <date_type> --order-id 1
ae-cli engage-workbench workbench delete --project-id <project_id> --slot-id <slot_id> --yes
```

## `+save_flow` Critical Constraints

When the user wants to "create a flow / generate a flow canvas / save a flow", do not treat `+save_flow` as a normal single command. You must follow the workflow below.

### Required Workflow

1. First confirm that the user intent is specific enough. At minimum you need:
   - The business scenario
   - The target users
   - The touchpoint or delivery method
   - Whether branching is needed, and the branching conditions
2. Do not jump directly from natural language to `--req`. You must first organize a stable intermediate intent structure, then map it to the final `req`.
3. Before building condition-related nodes, create the reusable audience directly from its semantic definition, then read back the server-authored definition only if the Engage schema explicitly needs QP-derived fields:

```bash
ae-cli analysis user-cluster create --project-id <projectId> --cluster-name <condition_cluster_name> --display-name <display_name> --definition-request '<semantic-definition-json>'
ae-cli analysis user-cluster get --project-id <projectId> --cluster-names '["<condition_cluster_name>"]'
```

4. Before building touchpoint nodes such as `message_push`, `wechat_push`, or `webhook_push`, you must call:

```bash
ae-cli engage +channel_list --project_id <projectId>
```

5. `+save_flow` is **operation-based** (protocol v2). The `--req` object must carry an `operation` of `build`, `preview`, or `commit`. Do **not** use the old `nodeList` / `edgeList` field names — use `nodes` / `edges` with `operation=build`. A legacy `nodeList`/`edgeList` payload (or a missing `operation`) is rejected with `Unsupported save_flow operation: null`.
6. Run the lifecycle: `build` (returns `ready_to_preview` or `need_input`) → resolve any `need_input` slot → `preview` (re-issues `draftVersion` + `confirmToken`) → `commit` (uses the **preview** `draftVersion` + `confirmToken`) → returns `flowUuid`.
7. `nodes[].config` / `edges[].config` may be a JSON object or a JSON string. If `targetClusterQp` appears inside a node `config`, its value is usually a `JSON.stringify`'d string, not a raw object.
8. You must self-check before previewing/committing:
   - There is exactly one entry node
   - There is at least one `exit_flow`
   - `edge.source` and `edge.target` both reference valid nodes
   - Any branch node `sourceBranchId` has already been declared in the upstream node `config`
   - The whole graph is a DAG and contains no cycles

### Explicitly Forbidden

- Do not invent a `channelId`
- Do not fill in branching logic when the user has not provided enough information
- Do not submit business-semantic nodes directly as final `nodes`
- Do not use the legacy `nodeList` / `edgeList`, and do not omit `operation`

### Recommended Order

```text
User request
-> Organize intent
-> analysis user-cluster create/get
-> +channel_list --project_id <projectId>
-> Build nodes / edges
-> Self-check
-> +save_flow operation=build -> (need_input?) -> preview -> commit
-> +flow_detail (verify)
```

For more detailed generation rules, consult these references first:

- `references/save-flow.md`
- `references/flow-node-config-schema.md`
- `references/validate-flow-node-config.md`

## Dry-Run Debugging

```bash
ae-cli --dry-run engage +channel_list --project_id 1
ae-cli --dry-run engage +task_list --project_id 1 --req '{"pageNum":1,"pageSize":20}'
ae-cli --dry-run engage +build_task_save_guide --project_id 1 --req '{}'
ae-cli --dry-run engage +save_task --project_id 1 --req '{"baseInfo":{"taskName":"Demo Task"},"channelConfig":{"channelType":1,"channelId":"channel_123","groupContentList":[{"contentList":[{"pushLanguageCode":"default","content":"[]"}]}]},"targetConfig":{"targetClusterType":3},"triggerConfig":{"triggerType":2},"controlConfig":{"completionIndicatorDef":{"completionIndicators":[]}}}'
ae-cli --dry-run engage +flow_list --project_id 1
```

## References

More detailed single-command guidance is available in the business-oriented `references/` directory:

- `references/channel-list.md`
- `references/channel_touch_limits_list.md` (`engage-setting.channel-touch-limits.list`)
- `references/channel-touch-limits-batch-update.md` (`engage-setting.channel-touch-limits.batch-update`)
- `references/channel-touch-limits-toggle.md` (`engage-setting.channel-touch-limits.toggle`)
- `references/channel-touch-limits-save.md` (`engage-setting.channel-touch-limits.save`)
- `references/channel-update-config.md` (`engage-setting.channel.update-config`)
- `references/channel-test-send.md` (`engage-setting.channel.test-send`)
- `references/approval-approver-delete.md` (`engage-setting.approval-approver.delete`)
- `references/whitelist.md` (`engage-setting.whitelist.{add,update,delete,verify}`)
- `references/push-language.md` (`engage-setting.push-language.{get,set}`)
- `references/client-param.md` (`engage-setting.client-param.{update,delete,list}`; create temporarily disabled)
- `references/config-table.md` (`engage-setting.config-table.{upload,save,list,query-data,update-data,delete}`)
- `references/preset-event.md` (`engage-setting.preset-event.{list,update}`)
- `references/common-metric.md` (`engage-setting.common-metric.{list,get,update,delete}`; create temporarily disabled)
- `references/scene-config-item.md` (`engage-scene.config-item.{list,create,update}`)
- `references/scene-config-param.md` (`engage-scene.config-param.{list,batch-add,update,batch-delete}`)
- `references/scene-config-group.md` (`engage-scene.config-group.{list,batch-add,update,batch-delete}`)
- `references/scene-preset-metric.md` (`engage-scene.preset-metric.{get,set}`)
- `references/scene-config-metric.md` (`engage-scene.config-metric.{list,get,batch-add,update-rule,batch-delete}`)
- `references/scene-config-channel.md` (`engage-scene.config-channel.{create,update,query-log}`)
- `references/scene-strategy.md` (`engage-scene.strategy.{create,update,log,batch-copy}`)
- `references/scene-template.md` (`engage-scene.template.{list,get,create,update,update-status,delete}`)
- `references/activity-activity.md` (`engage-activity.activity.{create,update,delete,list,get,pause,end,stats,info-list}`)
- `references/activity-approval.md` (`engage-activity.approval.{submit,approve,reject,cancel}`)
- `references/activity-topic.md` (`engage-activity.topic.{remove-task,delete,get,copy}`; create/update temporarily disabled)
- `references/activity-activity-type.md` (`engage-activity.activity-type.{list,batch-add,update,batch-delete}`)
- `references/activity-task.md` (`engage-activity.task.{get,copy}`; create/update temporarily disabled)
- `references/workbench-workbench.md` (`engage-workbench.workbench.{list,add,update,delete}`)
- `references/build-task-save-guide.md`
- `references/save-task.md`
- `references/task-list.md`
- `references/config-item-list.md`
- `references/flow-list.md`
- `references/operation-log-query.md` (`engage-flow.operation-log.query`)
- `references/task-operation-log-query.md` (`engage-task.operation-log.query`)
- `references/version-list.md` (`engage-flow.version.list`)
- `references/push-record-query.md` (`engage-task.push-record.query`)
- `references/segment-list-query.md` (`engage-task.segment-list.query`)
- `references/group-list.md` (`engage-task.group.list`)
- `references/task-delete.md` (`engage-task.task.delete`)

This split documentation structure is easier to extend later, because commands with more complex object inputs can stay centralized in the `references/` root directory.

## Command Groups

### setting

`channel-touch-limits list` / `channel-touch-limits batch-update` / `channel-touch-limits toggle` / `channel-touch-limits save` / `channel update-config` / `channel test-send` / `approval-approver delete` / `whitelist add` / `whitelist update` / `whitelist delete` / `whitelist verify` / `push-language get` / `push-language set` / `client-param update` / `client-param delete` / `client-param list` / `config-table upload` / `config-table save` / `config-table list` / `config-table query-data` / `config-table update-data` / `config-table delete` / `preset-event list` / `preset-event update` / `common-metric list` / `common-metric get` / `common-metric update` / `common-metric delete` (via `engage-setting`), `+channel_list`, `+channel_detail`, `+update_channel_status`, `+delete_channel`, `+add_channel`, `+whitelist_list`, `+add_approver`, `+approver_list`, `+cancel_query_by_request_id`, `+config_channel_detail`, `+config_channel_list`, `+delete_config_channel`, `+update_config_channel_status`

### task

`operation-log query` / `push-record query` / `segment-list *` / `ops *` / `metric *` / `race release` / `channel-ref stats` / `group *` (via `engage-task`), `+task_data_overview`, `+task_data_detail`, `+task_metric_detail`, `+task_experiment_report`, `+task_detail`, `+task_list`, `+task_stats`, `+build_task_save_guide`, `+save_task`, `+manage_task`

### config

`+config_item_trigger_report`, `+config_item_analysis_report`, `+config_item_strategy_comparison`, `+config_item_list`, `+config_item_detail`, `+delete_config_item`, `+copy_config_template`, `+strategy_list`, `+strategy_detail`, `+manage_strategy`

### scene

`config-item list` / `config-item create` / `config-item update` / `config-param list` / `config-param batch-add` / `config-param update` / `config-param batch-delete` / `config-group list` / `config-group batch-add` / `config-group update` / `config-group batch-delete` / `preset-metric get` / `preset-metric set` / `config-metric list` / `config-metric get` / `config-metric batch-add` / `config-metric update-rule` / `config-metric batch-delete` / `config-channel create` / `config-channel update` / `config-channel query-log` / `strategy create` / `strategy update` / `strategy log` / `strategy batch-copy` / `template list` / `template get` / `template create` / `template update` / `template update-status` / `template delete` (via `engage-scene`), capability ids `engage-scene.config-item.{list,create,update}`, `engage-scene.config-param.{list,batch-add,update,batch-delete}`, `engage-scene.config-group.{list,batch-add,update,batch-delete}`, `engage-scene.preset-metric.{get,set}`, `engage-scene.config-metric.{list,get,batch-add,update-rule,batch-delete}`, `engage-scene.config-channel.{create,update,query-log}`, `engage-scene.strategy.{create,update,log,batch-copy}`, `engage-scene.template.{list,get,create,update,update-status,delete}`

### activity

`activity create` / `activity update` / `activity delete` / `activity list` / `activity get` / `activity pause` / `activity end` / `activity stats` / `activity info-list` / `approval submit` / `approval approve` / `approval reject` / `approval cancel` / `topic remove-task` / `topic delete` / `topic get` / `topic copy` / `activity-type list` / `activity-type batch-add` / `activity-type update` / `activity-type batch-delete` / `task get` / `task copy` (via `engage-activity`), capability ids `engage-activity.activity.{create,update,delete,list,get,pause,end,stats,info-list}`, `engage-activity.approval.{submit,approve,reject,cancel}`, `engage-activity.topic.{remove-task,delete,get,copy}`, `engage-activity.activity-type.{list,batch-add,update,batch-delete}`, `engage-activity.task.{get,copy}`
<!-- Temporarily disabled: topic create / topic update / task create / task update -->

### workbench

`workbench list` / `workbench add` / `workbench update` / `workbench delete` (via `engage-workbench`), capability ids `engage-workbench.workbench.{list,add,update,delete}`

### flow

`operation-log query` / `version list` (via `engage-flow`), `+save_flow`, `+flow_node_config_schema`, `+flow_detail`, `+flow_list`, `+flow_node_overview_report`, `+manage_flow`, `+flow_ab_split_node_report`, `+flow_process_report`, `+validate_flow_node_config`, `+flow_node_detail_report`, `+delete_flow`, `+modify_flow_base_info`

## Date Format

Commands that accept date parameters usually use `yyyy-MM-dd`, for example `--start_time 2026-04-01`.

## Write Operation Reminder

High-risk delete commands (`risk: high-risk-write`) require explicit user authorization before execution. Ordinary write commands (`risk: write`) do not:

- Channels and config channels: `+add_channel` (write), `+delete_channel` (high-risk-write), `+update_channel_status` (write), `+delete_config_channel` (high-risk-write), `+update_config_channel_status` (write)
- Strategies and config items: `+delete_config_item` (high-risk-write), `+copy_config_template` (write), `+manage_strategy` (write)
- Flows: `+save_flow` (write), `+modify_flow_base_info` (write), `+manage_flow` (write), `+delete_flow` (high-risk-write)
- Tasks: `+save_task` (write), `+manage_task` (write)

For task draft creation or update, use this workflow:

1. `ae-cli engage +channel_list --project_id <projectId>`
2. `ae-cli engage +build_task_save_guide --project_id <projectId> --req '{...}'`
3. If the guide says QP-derived fields are needed, create the audience with `analysis user-cluster create`, then read its server-authored definition with `analysis user-cluster get`
4. `ae-cli engage +save_task --project_id <projectId> --req '{...}'`

`+build_task_save_guide` is a read-only helper. It returns scenario-specific required fields, channel content schema, unsupported combinations, examples, and a handoff template for `save_task`.

`+save_task` only saves a draft. It does not submit approval, does not start sending, and does not trigger task execution. If `req.taskId` is omitted it creates a new draft; if `req.taskId` is present it updates an existing draft. Update mode only supports draft tasks, and omitted fields can inherit from the existing draft before validation.

Audience creation is not a fixed preflight step. Use direct `analysis user-cluster create` only when the guide requires a condition audience, and prefer the returned `cluster_name`/`clusterKey`. If the Engage schema explicitly requires QP-derived fields such as `targetConfig.qp`, `triggerConfig.triggerRule`, `clientConfig.clientQp`, or `completionIndicatorDef.event`, read the saved server-authored definition with `analysis user-cluster get`; never assemble raw QP manually.
