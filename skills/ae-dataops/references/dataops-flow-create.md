---
name: dataops-flow-create
version: 1.0.0
description: "Flow creation and configuration: create flows, manage custom flow parameters, add task nodes, configure dependencies, save task definitions, configure scheduling, test, and release to production. Trigger keywords: create flow, new workflow, configure schedule, add task node, release, cron, scheduled execution."
metadata:
  requires:
    bins: ["ae-cli"]
---

# DataOps Flow Creation and Configuration

> **Prerequisites:** Read [`ae-dataops/SKILL.md`](../SKILL.md) for general rules.

Use the `dataops_flow` subcommand to manage flow lifecycle.

**Flow Lifecycle: Create → Configure Nodes → Configure Schedule → Preview Release → Release to PROD → Read Back PROD Configuration**

---

## Complete Flow Creation Process

Follow the applicable steps for the requested outcome. A DEV-only change stops before release; a request to publish or enable scheduling ends after PROD readback. Manually execute only when the user also requested a run. For scheduled integration, first obtain the intended sync solution from [the integration reference](dataops-integration.md), bind it as an integration task, then configure and release the flow.

### Step 1: Create Flow

```bash
ae-cli dataops_flow +create_flow --spaceCode "${spaceCode}" \
  --flowName "Daily ETL Process" --remark "Process user data"
# Default CLI JSON: data.result.flowCode, required for subsequent steps
```

### Custom Flow Parameters

These commands manage one custom workflow definition parameter at a time. They do not set temporary execution inputs or replace the complete parameter list. All four require workflow edit permission (`dwWorkflowEdit`) in the containing space; reading PROD parameters has the same requirement.

```bash
# Read the current DEV custom parameters before editing
ae-cli dataops_flow +get_flow_params --spaceCode "${spaceCode}" \
  --flowCode ${flowCode}

# Create text; VARCHAR is the default
ae-cli dataops_flow +create_flow_param --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --paramKey "run_date" \
  --paramValue "2026-09-08" --remark "Date to process"

# Use an expression already validated with the platform's supported expression syntax
ae-cli dataops_flow +create_flow_param --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --paramKey "derived_date" \
  --paramDataType EXPRESSION --paramValue "${validatedExpression}"

# Change only the value; preserve type and remark
ae-cli dataops_flow +update_flow_param --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --paramKey "run_date" --paramValue "2026-09-09"

# Rename: originParamKey is the old name and paramKey is the new name
ae-cli dataops_flow +update_flow_param --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --originParamKey "run_date" --paramKey "processing_date"

# Explicitly clear the remark
ae-cli dataops_flow +update_flow_param --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --paramKey "processing_date" --remark ""

# Inspect the target above, then preview deletion
ae-cli dataops_flow +delete_flow_param --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --paramKey "processing_date" --dry-run

# Run only after explicit user confirmation
ae-cli dataops_flow +delete_flow_param --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --paramKey "processing_date" --yes

# Read the published definition separately
ae-cli dataops_flow +get_flow_params --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --env PROD
```

- Query defaults to `DEV`; `PROD` is the only other environment. It returns an array containing `paramKey`, `paramValue`, `paramDataType`, `remark`, `paramFormat`, and expression reference metadata. Only custom flow parameters are returned.
- `flowCode` must be a positive safe integer. Names must match `[a-z][a-z0-9_]{0,39}`; the `ws_` prefix, `env`, and space built-in parameter names are reserved. Built-in parameters cannot be created, updated, or deleted with these commands.
- `paramValue` is required and non-empty on create; it remains literal, including whitespace. Single-quote literal expressions to prevent shell expansion of `${...}`. Types are `VARCHAR` (text, create default) and `EXPRESSION`. Expression syntax and supported references are validated by Gaia; arbitrary references between custom parameters are not supported.
- Update accepts `paramValue`, `paramDataType`, and `remark` independently. Omitted fields retain their values; REST/MCP `null` also retains them. `--remark ""` clears the remark. An empty `paramValue` is rejected. Remarks allow up to 200 characters. Supply at least one update field or an actual rename.
- Omit `originParamKey` for an in-place update. When renaming, it identifies the old name while `paramKey` identifies the new name. Duplicate names, rename conflicts, and missing targets return errors. Renaming does not replace old references in SQL; inspect affected tasks and update their SQL when needed.
- Writes configure DEV. Adding a parameter to an existing definition, changing value/type/name, and deleting a parameter may stop running DEV debug executions. Remark-only and no-op updates do not stop debug runs. Value/type/name/deletion changes require a later release to affect PROD; a remark update without renaming also updates an existing PROD parameter with the same name.
- Deletion is `high-risk-write`: inspect, preview, confirm, then use `--yes`. Task references fall back to a same-name space parameter if one exists; otherwise they remain code-parsed references whose source and value fields are null or omitted. Inspect affected SQL through `+get_flow_overview` task parameters. Read parameters again after each write to verify the saved state.

### Step 2: Create Task Nodes (can be called multiple times)

```bash
# Create SQL task and save SQL content
ae-cli dataops_flow +create_sql_task --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --taskName "Process User Data" \
  --sql "SELECT * FROM dwd_user"
# Default CLI JSON: data.result.taskCode

# Create task with upstream dependency
ae-cli dataops_flow +create_sql_task --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --taskName "Export Results" \
  --preTasks "[${upstreamTaskCode},${anotherUpstreamTaskCode}]" \
  --sql "INSERT INTO ads_user SELECT * FROM dwd_user"
```

`+create_sql_task` creates DEV Trino SQL task nodes and saves the SQL content.

### Step 3: Create or Modify Integration Sync Task

```bash
# Create integration sync task from an existing DataOps sync solution
ae-cli dataops_flow +create_integration_task --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --taskName "Sync Employees" \
  --syncId "${syncId}"

# Rebind an existing integration sync task to another sync solution
ae-cli dataops_flow +update_integration_task --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --taskCode ${taskCode} \
  --syncId "${syncId}"
```

Use `dataops_integration +list_sync_solutions` or `+get_sync_detail` to find the `syncId` first. These commands expose workflow `OFFLINE_SYNC` tasks only; app sync tasks are not part of this flow.

### Step 4: Create or Modify Instance Check Tasks

#### Workflow instance check

`checkItems` is a flat JSON array. Every item contains only `flowCode`, `left`, `right`, and `checkTimeUnit` (`DAY`, `HOUR`, or `MINUTE`). One `AND` or `OR` relation applies to the entire array; nested groups are not supported. For the current workflow, `left` and `right` are at least `1`; for another workflow they may be `0`; `right` must not exceed `left`.

```bash
ae-cli dataops_flow +create_workflow_instance_check_task --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --taskName "Wait for upstream workflows" \
  --checkItems '[{"flowCode":10037355068544,"left":1,"right":1,"checkTimeUnit":"DAY"},{"flowCode":10037355068545,"left":2,"right":0,"checkTimeUnit":"HOUR"}]' \
  --relation OR

ae-cli dataops_flow +update_workflow_instance_check_task --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --taskCode ${taskCode} \
  --checkItems '[{"flowCode":10037355068544,"left":1,"right":1,"checkTimeUnit":"DAY"}]'
```

Create defaults are `relation=AND`, `checkInterval=5`, `checkTime=3`, `failRetryTimes=3`, `failRetryInterval=5`, and `failRetryUnit=MINUTE`. On update, omitted check scalars, dependencies, and retry fields keep their current values.

#### Task instance check

Each task instance `checkItems` entry contains only `flowCode`, `taskCode`, `left`, `right`, and `checkTimeUnit`. The nested `checkItems[].taskCode` identifies a target task inside that item's `flowCode`. On update, the top-level `--taskCode` identifies the TASK_CHECK node to update; it is not a target task code. Use `+get_flow_overview` to discover target task codes. Checking the TASK_CHECK node itself is supported.

```bash
ae-cli dataops_flow +create_task_instance_check_task --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --taskName "Wait for target tasks" \
  --checkItems '[{"flowCode":10037355068544,"taskCode":10380350567040,"left":1,"right":1,"checkTimeUnit":"DAY"},{"flowCode":10037355068545,"taskCode":10380350567041,"left":0,"right":0,"checkTimeUnit":"HOUR"}]' \
  --relation OR

ae-cli dataops_flow +update_task_instance_check_task --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --taskCode ${taskCheckNodeCode} \
  --checkItems '[{"flowCode":10037355068544,"taskCode":10380350567040,"left":1,"right":1,"checkTimeUnit":"DAY"}]'
```

Task instance check create defaults are `relation=AND`, `checkInterval=10`, and `checkTime=3`; retry defaults are `3`, `5`, and `MINUTE`. `checkItems` is required and replaces the complete target list. On update, omitted check scalars, dependencies, and retry fields keep their current values.

### Step 5: Modify SQL Task Content

```bash
# Update SQL task content and keep dependencies and retry policy
ae-cli dataops_flow +update_sql_task --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --taskCode ${taskCode} \
  --sql "SELECT * FROM dwd_user"
```

### Delete a Task Node

Verify the target with `+get_flow_overview` before any deletion. Preview the request first, then execute it only after explicit user confirmation:

```bash
ae-cli dataops_flow +get_flow_overview --spaceCode "${spaceCode}" \
  --flowCode ${flowCode}

ae-cli dataops_flow +delete_task --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --taskCode ${taskCode} --dry-run

# Run only after explicit user confirmation
ae-cli dataops_flow +delete_task --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --taskCode ${taskCode} --yes
```

`+delete_task` deletes exactly one non-placeholder task node in DEV. It removes attached DAG edges but does not reconnect upstream and downstream nodes. It may terminate running DEV debug executions that include the node and does not repair cross-flow `TASK_CHECK` references. A published PROD node remains until the flow is released again. Repeated deletion, a task from another flow, or an internal placeholder returns an error.

### Step 6: Add Task Dependencies (DAG connections)

```bash
ae-cli dataops_flow +add_task_relation --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --preTaskCode ${upstreamTaskCode} --taskCode ${downstreamTaskCode}
```

### Step 7: Configure Schedule

```bash
# CRON expression for scheduled execution
ae-cli dataops_flow +save_schedule_config --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --enabled true \
  --cron "0 0 2 * * ?"
# Example: 0 0 2 * * ? = Daily at 2 AM
```

**CRON Format** (6 fields): `second minute hour day month weekday`
- `0 0 */4 * * ?` — Every 4 hours
- `0 30 8 ? * MON-FRI` — Weekdays at 8:30 (Quartz)

### Step 8: Preview Release

```bash
# Preview pending DEV-to-PROD release changes before publishing
ae-cli dataops_flow +preview_release_flow --spaceCode "${spaceCode}" \
  --flowCode ${flowCode}
```

Inspect `data.releaseStatus` in the default CLI JSON: `READY` permits the requested release; `NO_CHANGES` means skip submission and inspect PROD. For `CHECK_FAILED` or `FAILED`, report the message and failed change items and stop before publishing or executing. Check that the preview contains only the intended changes.

### Step 9: Release to Production and Verify

```bash
ae-cli dataops_flow +release_flow --spaceCode "${spaceCode}" \
  --flowCode ${flowCode}

# Read the published definition without starting a run
ae-cli dataops_flow +get_flow_overview --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --env PROD
```

Check `data.result.releaseStatus`, not outer `ok` or action `status`: `FAILED`, `CHECK_FAILED`, `FAIL`, `PART_SUCCESS`, and `TABLE_FAIL` are not successful publication. Stop and report their details. `TO_RELEASE`, `RELEASING`, or `SUBMITTED` means completion is unverified; retain `data.result.packageCode` and do not resubmit the release.

Confirm the PROD overview has `data.success=true` and compare its visible `schedule`, `dag`, and `flowParams` with the requested changes, including CRON and task presence/type when applicable. Even a release response of `SUCCESS` needs this readback. The overview does not expose task SQL or the integration task's `syncId`; retain the create/update result and release preview as evidence, and state this readback limit instead of claiming those fields were independently verified in PROD. If publication is pending, make read-only checks within a finite deadline; on expiry or unavailable evidence, report the package/flow IDs and what remains unverified. A release-only request ends here. For an explicitly requested manual run, continue with [execution and completion checks](dataops-flow-monitor.md#workflow-c-manual-execution-and-stop).

---

## Command Quick Reference

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `+create_flow` | Create DEV flow | `--spaceCode` `--flowName` `[--remark]` |
| `+create_sql_task` | Create DEV Trino SQL task and save SQL | `--spaceCode` `--flowCode` `--taskName` `--sql` `[--preSql]` `[--postSql]` `[--preTasks]` `[--failRetryTimes]` `[--failRetryInterval]` `[--failRetryUnit]` `[--remark]` |
| `+update_sql_task` | Update DEV Trino SQL task content | `--spaceCode` `--flowCode` `--taskCode` `--sql` `[--preSql]` `[--postSql]` `[--preTasks]` `[--failRetryTimes]` `[--failRetryInterval]` `[--failRetryUnit]` |
| `+create_integration_task` | Create DEV integration sync task from an existing sync solution | `--spaceCode` `--flowCode` `--taskName` `--syncId` `[--preTasks]` `[--failRetryTimes]` `[--failRetryInterval]` `[--failRetryUnit]` `[--remark]` |
| `+update_integration_task` | Rebind DEV integration sync task to a sync solution | `--spaceCode` `--flowCode` `--taskCode` `--syncId` `[--preTasks]` `[--failRetryTimes]` `[--failRetryInterval]` `[--failRetryUnit]` |
| `+create_workflow_instance_check_task` | Create DEV workflow instance check task | `--spaceCode` `--flowCode` `--taskName` `--checkItems` `[--relation]` `[--checkInterval]` `[--checkTime]` `[--preTasks]` `[retry flags]` `[--remark]` |
| `+update_workflow_instance_check_task` | Update DEV workflow instance check task | `--spaceCode` `--flowCode` `--taskCode` `--checkItems` `[--relation]` `[--checkInterval]` `[--checkTime]` `[--preTasks]` `[retry flags]` |
| `+create_task_instance_check_task` | Create DEV task instance check task | `--spaceCode` `--flowCode` `--taskName` `--checkItems` `[--relation]` `[--checkInterval]` `[--checkTime]` `[--preTasks]` `[retry flags]` `[--remark]` |
| `+update_task_instance_check_task` | Update DEV task instance check task | `--spaceCode` `--flowCode` `--taskCode` `--checkItems` `[--relation]` `[--checkInterval]` `[--checkTime]` `[--preTasks]` `[retry flags]` |
| `+delete_task` | Delete one DEV task node after confirmation | `--spaceCode` `--flowCode` `--taskCode` `--yes` |
| `+add_task_relation` | Add DEV dependency | `--spaceCode` `--flowCode` `--preTaskCode` `--taskCode` |
| `+save_schedule_config` | Save DEV schedule config | `--spaceCode` `--flowCode` `--enabled` `[--cron]` |
| `+get_flow_params` | List custom workflow parameters | `--spaceCode` `--flowCode` `[--env DEV\|PROD]` |
| `+create_flow_param` | Create one DEV custom parameter | `--spaceCode` `--flowCode` `--paramKey` `--paramValue` `[--paramDataType VARCHAR\|EXPRESSION]` `[--remark]` |
| `+update_flow_param` | Update or rename one DEV custom parameter | `--spaceCode` `--flowCode` `--paramKey` `[--originParamKey]` `[--paramValue]` `[--paramDataType]` `[--remark]` |
| `+delete_flow_param` | Delete one DEV custom parameter after confirmation | `--spaceCode` `--flowCode` `--paramKey` `--yes` |
| `+get_flow_overview` | View DEV/PROD flow definitions and all task parameter references | `--spaceCode` (`--flowCode` or `--flowName`) `[--env DEV\|PROD]` |
| `+execute_flow` | Manual PROD execution | `--spaceCode` `--flowCode` `[--baseDate]` |
| `dataops_operations +get_flow_instance_detail` | View operations instance DAG and task statuses | `--spaceCode` `--flowCode` `--flowInstanceId` |
| `dataops_operations +get_task_instance_detail` | View operations task detail and optional logs | `--spaceCode` `--flowCode` `--flowInstanceId` (`--taskInstanceId` or `--taskCode` or `--taskName`) `[--includeLog]` |
| `+preview_release_flow` | Preview pending DEV-to-PROD release changes without publishing | `--spaceCode` `--flowCode` |
| `+release_flow` | Submit DEV-to-PROD release | `--spaceCode` `--flowCode` |

## Parameter Notes

- **Parameter Reference**: Reference workspace parameters in tasks using `${paramKey}` (e.g., `${ws_run_date}`)
- **Execution**: `+execute_flow` requires `--spaceCode` and `--flowCode`; `--baseDate` is optional and maps to runtime parameter `bd`. It always runs PROD and returns `action/result/status`; `result` includes `flowCode`, `executeId`, `operationStatus`, `nextAction`, and optional `flowInstanceId`.
- **Schedule config**: `+save_schedule_config` requires `--spaceCode`, `--flowCode`, and `--enabled`. `--cron` is required only when `--enabled true`; omit it when disabling scheduling. It returns `action/result/status`; `result` includes `enabled`, `flow`, `message`, and `cron` only when enabled.
- **Release preview**: `+preview_release_flow` requires `--spaceCode` and `--flowCode`; it has no optional flags. It returns `flowCode`, `releaseStatus`, `message`, and `changes`. Each change may include `scheduleConfigChange` and `tasks`; `scheduleConfigChange.diff.old.parameters` and `.new.parameters` show the flow parameter comparison. Parameter-only changes use the existing flow configuration release. Task entries may include `changed`, `contentCompare`, and `targetTable`.
- **Release**: `+release_flow` requires `--spaceCode` and `--flowCode`; it has no optional flags. It returns `action/result/status`; `result` includes `flowCode`, `releaseStatus`, `message`, optional `packageCode`, and optional `changes`. Each change may include `scheduleConfigChange` and `tasks`; task entries include `changed`.
- **Task dependencies**: `--preTasks` is a JSON array of upstream task codes on SQL, integration, workflow instance check, and task instance check create/update commands. Omit `--preTasks` on update to preserve existing dependencies; pass `--preTasks '[]'` to clear them; pass a non-empty array to replace them.
- **Retry policy**: All four task types accept `--failRetryTimes`, `--failRetryInterval`, and `--failRetryUnit`. Create defaults to `3`, `5`, and `MINUTE`. Update preserves every omitted retry field. `MINUTE` is the only supported unit.
- **SQL task creation**: `+create_sql_task` requires `--spaceCode`, `--flowCode`, `--taskName`, and `--sql`; SQL hooks, dependencies, retry policy, and remark are optional. It returns `action/result/status`; `result` includes `flowCode`, `taskCode`, `taskName`, `taskType=TRINO_SQL`, and `sqlSaved=true`.
- **SQL task update**: `+update_sql_task` requires `--spaceCode`, `--flowCode`, `--taskCode`, and `--sql`; omitted SQL hooks, dependencies, and retry fields keep existing values. It returns `action/result/status`; `result` includes `sqlSaved`, `flowCode`, `taskCode`, `taskType=TRINO_SQL`, and `task`.
- **Task dependency**: `+add_task_relation` requires `--spaceCode`, `--flowCode`, `--preTaskCode`, and `--taskCode`. `preTaskCode` is upstream and `taskCode` is downstream. It returns `action/result/status`; `result` includes `status`, `flowCode`, `preTaskCode`, `taskCode`, and `message`.
- **Flow and task parameters**: `+get_flow_overview` requires `dwWorkflowEdit` and supports DEV (default) or PROD. It returns all custom flow definitions in `flowParams` and task references in `dag.tasks[].taskParams`, including source, definition value, type, description, and built-in flags. Expressions remain literal; task references retain `paramDataType=QUOTE`. Source is `FLOW` or `SPACE` for configured parameters. A code-parsed reference without a configured source remains visible with null or omitted `paramFrom` and `paramValue` fields; either form means no configured source/value. Empty parameter lists are arrays. Use the selected environment to compare unpublished DEV changes with PROD.
- **Integration task creation**: `+create_integration_task` requires `--spaceCode`, `--flowCode`, `--taskName`, and `--syncId`; dependencies, retry policy, and remark are optional. It returns `action/result/status`; `result` includes `syncTaskSaved`, `flowCode`, `taskCode`, `taskName`, `taskType=OFFLINE_SYNC`, `syncId`, and `nextAction`.
- **Workflow instance check tasks**: `checkItems` is required and replaces the complete check item list. Create defaults `relation/checkInterval/checkTime` to `AND/5/3`; update preserves omitted scalar values. This command creates `FLOW_CHECK`, not task-instance `TASK_CHECK`.
- **Task instance check tasks**: `checkItems` is required and replaces the complete check item list. Each item identifies a target using `flowCode` and `taskCode`. Create defaults `relation/checkInterval/checkTime` to `AND/10/3`; update preserves omitted scalar values. This command creates `TASK_CHECK`.
- **Task deletion**: `+delete_task` requires `--spaceCode`, `--flowCode`, and `--taskCode`. It is a `high-risk-write`: inspect the node with `+get_flow_overview`, run `--dry-run`, obtain explicit confirmation, and then pass `--yes`. It changes DEV only; release the flow to apply deletion to PROD.

## Transport Status

Transition status: transitional

Owning module: gaia-mcp workflow

Current transport: DataOps CLI REST

Covered workflow tools: `flow_create_workflow_instance_check_task`, `flow_update_workflow_instance_check_task`, `flow_create_task_instance_check_task`, `flow_update_task_instance_check_task`, `flow_delete_task`, `flow_get_flow_params`, `flow_create_flow_param`, `flow_update_flow_param`, and `flow_delete_flow_param`

Gateway target: TBD after DataOps workflow Gateway schema review

Review after: 2026-10-27

Exit condition: Migrate or remove these one-to-one commands after equivalent Capability Gateway actions are available.

## Important Notes

1. **Getting flowCode**: Use `+list_flows` (see `dataops-flow-monitor` Skill)
2. **Getting taskCode**: Returned by a task create command or query via `+get_flow_overview`
3. **Release Impact**: Submits current DEV changes to PROD; released schedule/config applies to future PROD runs
4. **SQL Validation**: Recommended to validate before saving TRINO_SQL tasks
5. **Cannot create circular dependencies**
