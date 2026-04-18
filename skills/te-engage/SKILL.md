---
name: te-engage
version: 1.0.0
description: "TE Engage MCP: config items, flows, channel settings, task data query, and management"
metadata:
  requires:
    bins: ["ae-cli"]
  cliHelp: "ae-cli engage --help"
---

# te-engage

> **Prerequisite:** Read [`../te-shared/SKILL.md`](../te-shared/SKILL.md) for authentication, global parameters, and safety constraints.

## Overview

The `te-engage` package provides Hermes Engage MCP capabilities across config items, flows, channel settings, and task data. Commands are invoked through `ae-cli engage <command>`.

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

# Query task details
ae-cli engage +task_detail --project_id 1 --task_id task_123

# Query the task overview
ae-cli engage +task_data_overview --project_id 1 --task_id task_123 --task_type normal
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

5. The final `--req` for `+save_flow` must be the complete canvas request payload, not an intent description. It must contain at least:
   - `flowName`
   - `flowDesc`
   - `nodeList`
   - `edgeList`
6. `nodeList[].config` and `edgeList[].config` must be JSON strings, not JSON objects.
7. If `targetClusterQp` appears inside a node `config`, its value should usually also be a string produced by `JSON.stringify`, not a raw object.
8. You must self-check before submitting:
   - There is exactly one entry node
   - There is at least one `exit_flow`
   - `edge.source` and `edge.target` both reference valid nodes
   - Any branch node `sourceBranchId` has already been declared in the upstream node `config`
   - The whole graph is a DAG and contains no cycles

### Explicitly Forbidden

- Do not invent a `channelId`
- Do not fill in branching logic when the user has not provided enough information
- Do not submit business-semantic nodes directly as final `nodeList` nodes
- Do not put `config` into `--req` as an object

### Recommended Order

```text
User request
-> Organize intent
-> analysis_audience +get_cluster_definition_schema --cluster_type condition
-> +channel_list --project_id <projectId>
-> Build nodeList / edgeList
-> Self-check
-> +save_flow
```

For more detailed generation rules, consult these references first:

- `references/save-flow.md`
- `references/flow-node-config-schema.md`
- `references/validate-flow-node-config.md`

## Dry-Run Debugging

```bash
ae-cli --dry-run engage +channel_list --project_id 1
ae-cli --dry-run engage +task_list --project_id 1 --req '{"pageNum":1,"pageSize":20}'
ae-cli --dry-run engage +flow_list --project_id 1
```

## References

More detailed single-command guidance is available in the business-oriented `references/` directory:

- `references/channel-list.md`
- `references/task-list.md`
- `references/config-item-list.md`
- `references/flow-list.md`

This split documentation structure is easier to extend later, because commands with more complex object inputs can stay centralized in the `references/` root directory.

## Command Groups

### setting

`+channel_list`, `+channel_detail`, `+update_channel_status`, `+delete_channel`, `+add_channel`, `+whitelist_list`, `+add_approver`, `+approver_list`, `+cancel_query_by_request_id`, `+config_channel_detail`, `+config_channel_list`, `+delete_config_channel`, `+update_config_channel_status`

### task

`+task_data_overview`, `+task_data_detail`, `+task_metric_detail`, `+task_experiment_report`, `+task_detail`, `+task_list`, `+task_stats`, `+manage_task`

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
- Tasks: `+manage_task`
