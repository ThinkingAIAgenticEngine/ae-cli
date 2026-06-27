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
- Successful commands return machine-readable JSON by default.
- Failed commands return `{ "ok": false, "error": { "type": "...", "message": "...", "hint": "..." } }` and exit non-zero.

Safety constraints:
- Read commands can execute directly after required IDs and references are verified.
- Write commands require explicit user intent and normally keep the confirmation prompt.
- Never invent command names, flags, JSON payloads, `project_id`, resource IDs, field names, event names, property names, metric definitions, or date formats. Read the matching command reference and discover real project metadata first.
- **NEVER fabricate or guess resource names** (reports, dashboards, events, properties, metrics, clusters, tags, alerts). Always use list commands to discover real resources first. If a resource is not found after fuzzy search and full list fallback, explicitly tell the user "resource not found" and stop - do not proceed with fabricated names.

## Overview

The `ae-engage` package provides Hermes Engage MCP capabilities across config items, flows, channel settings, and task data. Commands are invoked through `ae-cli engage <command>`.

Typical use cases include:

- Querying and managing channels, config channels, approvers, and whitelists
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

# Query the node schema
ae-cli engage +flow_node_config_schema --node_type message_push
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
3. Before building any condition-related nodes, you must call:

```bash
ae-cli analysis_audience +get_cluster_definition_schema --cluster_type condition
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
-> analysis_audience +get_cluster_definition_schema --cluster_type condition
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
- `references/build-task-save-guide.md`
- `references/save-task.md`
- `references/task-list.md`
- `references/config-item-list.md`
- `references/flow-list.md`

This split documentation structure is easier to extend later, because commands with more complex object inputs can stay centralized in the `references/` root directory.

## Command Groups

### setting

`+channel_list`, `+channel_detail`, `+update_channel_status`, `+delete_channel`, `+add_channel`, `+whitelist_list`, `+add_approver`, `+approver_list`, `+cancel_query_by_request_id`, `+config_channel_detail`, `+config_channel_list`, `+delete_config_channel`, `+update_config_channel_status`

### task

`+task_data_overview`, `+task_data_detail`, `+task_metric_detail`, `+task_experiment_report`, `+task_detail`, `+task_list`, `+task_stats`, `+build_task_save_guide`, `+save_task`, `+manage_task`

### config

`+config_item_trigger_report`, `+config_item_analysis_report`, `+config_item_strategy_comparison`, `+config_item_list`, `+config_item_detail`, `+delete_config_item`, `+copy_config_template`, `+strategy_list`, `+strategy_detail`, `+manage_strategy`

### flow

`+save_flow`, `+flow_node_config_schema`, `+flow_detail`, `+flow_list`, `+flow_node_overview_report`, `+manage_flow`, `+flow_ab_split_node_report`, `+flow_process_report`, `+validate_flow_node_config`, `+flow_node_detail_report`, `+delete_flow`, `+modify_flow_base_info`

## Date Format

Commands that accept date parameters usually use `yyyy-MM-dd`, for example `--start_time 2026-04-01`.

## Write Operation Reminder

The following commands are write operations. Confirm that the user intent is explicit before executing them:

- Channels and config channels: `+add_channel`, `+delete_channel`, `+update_channel_status`, `+delete_config_channel`, `+update_config_channel_status`
- Strategies and config items: `+delete_config_item`, `+copy_config_template`, `+manage_strategy`
- Flows: `+save_flow`, `+modify_flow_base_info`, `+manage_flow`, `+delete_flow`
- Tasks: `+save_task`, `+manage_task`

For task draft creation or update, use this workflow:

1. `ae-cli engage +channel_list --project_id <projectId>`
2. `ae-cli engage +build_task_save_guide --project_id <projectId> --req '{...}'`
3. If the guide says QP-derived fields are needed, call `ae-cli analysis_audience +get_cluster_definition_schema --cluster_type condition`
4. `ae-cli engage +save_task --project_id <projectId> --req '{...}'`

`+build_task_save_guide` is a read-only helper. It returns scenario-specific required fields, channel content schema, unsupported combinations, examples, and a handoff template for `save_task`.

`+save_task` only saves a draft. It does not submit approval, does not start sending, and does not trigger task execution. If `req.taskId` is omitted it creates a new draft; if `req.taskId` is present it updates an existing draft. Update mode only supports draft tasks, and omitted fields can inherit from the existing draft before validation.

The audience schema query `ae-cli analysis_audience +get_cluster_definition_schema --cluster_type condition` is not a fixed preflight step. Call it only when the guide indicates that you must construct `targetConfig.qp`, `triggerConfig.triggerRule`, `clientConfig.clientQp`, or `completionIndicatorDef.event`.
