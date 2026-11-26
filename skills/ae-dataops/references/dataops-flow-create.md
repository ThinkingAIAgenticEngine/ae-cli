---
name: dataops-flow-create
version: 1.1.0
description: "Flow creation and configuration: create flows, manage custom flow parameters, add SQL/integration/check task nodes (and route to Python nodes), configure dependencies, configure scheduling, preview, and release to production. Trigger keywords: create flow, new workflow, configure schedule, add task node, release, cron, scheduled execution."
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

### Step 5: Read or Modify SQL Task Content and OUT Parameters

```bash
# Read the current DEV Trino SQL task definition (sqlTask, preTasks, retry, outputParams, taskParams, paramSources)
ae-cli dataops_flow +get_sql_task --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --taskCode ${taskCode}

# Create a DEV Trino SQL task that publishes an OUT parameter (must be a SELECT / WITH...SELECT query with LIMIT <= 10)
ae-cli dataops_flow +create_sql_task --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --taskName "Compute Latest Date" \
  --sql "SELECT max(dt) AS sql_dt FROM dwd_user LIMIT 1" \
  --outputParams '[{"paramKey":"sql_dt","remark":"Latest processed date"}]'

# Partial update: change only outputParams (omit --sql to keep existing DEV SQL)
ae-cli dataops_flow +update_sql_task --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --taskCode ${taskCode} \
  --outputParams '[{"paramKey":"sql_dt","remark":"Updated remark"}]'

# Clear preSql/postSql hooks and OUT declarations explicitly
ae-cli dataops_flow +update_sql_task --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --taskCode ${taskCode} \
  --preSql "" --postSql "" --outputParams '[]'
```

- **SQL `OUT` parameter rules**: `--outputParams` (`[{"paramKey":"sql_dt","remark":"optional"}]`) declares `VARCHAR` `OUT` parameters (`paramKey` matching `^[a-z][a-z0-9_]{0,39}$`, not `env`, no `ws_` prefix, workflow-wide `OUT` limit default 50). Declaring `OUT` requires the main SQL to be a query (`SELECT` / `WITH ... SELECT`, with `LIMIT` <= `10` such as `LIMIT 1`; pure DML such as `INSERT` is rejected). At runtime, values bind from the **first result row** by matching column name/alias (for duplicate column names, the rightmost non-null, non-empty value wins; 10 KiB UTF-8 limit per node; empty/0-row output does not overwrite an earlier non-empty upstream value). Downstream tasks wired via `--preTasks` consume published outputs as `${paramKey}`. Remark-only `OUT` edits update the parameter table without bumping the task version.
- **Read & partial update**: `+get_sql_task` reads **DEV** definitions only and requires `dwWorkflowEdit`. On `+update_sql_task`, `--sql` is optional (pass at least one mutable field; omitted fields keep existing DEV values; `--preSql ""` / `--postSql ""` clear hooks to null; `--outputParams` and `--preTasks` use three-state semantics: omit=keep, `'[]'`=clear, non-empty=replace).

### Step 5b: Create, Read, or Modify Python Task Nodes

For all 7 Python task and environment/directory commands (`+create_python_task`, `+update_python_task`, `+get_python_task`, `+list_python_versions`, `+list_python_package_sources`, `+list_python_directories`, `+browse_python_directory`), single-file `main.py` packaging, `TE_OUTPUT:` protocol rules, `dwWorkflowEdit` permission requirements, and DEV/PROD boundaries, see [Python workflow nodes](dataops-flow-python.md).

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

Note on upstream `OUT` parameters: when a downstream task references an upstream node's declared `OUT` parameter (such as `${out_dt}` from an upstream Python task), a task item may include an informational `refuseReason` like `"Parameter ${out_dt} is null."` even when `data.releaseStatus` is `READY` and the task's `validationStatus` is `SUCCESS`. This reflects runtime-only upstream outputs and does not block release when `releaseStatus=READY` and `validationStatus=SUCCESS`.

### Step 9: Release to Production and Verify

```bash
ae-cli dataops_flow +release_flow --spaceCode "${spaceCode}" \
  --flowCode ${flowCode}

# Read the published definition without starting a run
ae-cli dataops_flow +get_flow_overview --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --env PROD
```

Check `data.result.releaseStatus`, not outer `ok` or action `status`: `FAILED`, `CHECK_FAILED`, `FAIL`, `PART_SUCCESS`, and `TABLE_FAIL` are not successful publication. Stop and report their details. `TO_RELEASE`, `RELEASING`, or `SUBMITTED` means completion is unverified; retain `data.result.packageCode` and do not resubmit the release.

Confirm the PROD overview has `data.success=true` and compare its visible `schedule`, `dag`, and `flowParams` with the requested changes, including CRON and task presence/type when applicable. Even a release response of `SUCCESS` needs this readback. The overview does not expose task SQL, Python script text, or the integration task's `syncId`; retain the create/update result and release preview (`contentCompare`) as evidence, and state this readback limit instead of claiming those fields were independently verified in PROD (once a PROD instance runs, `dataops_operations +get_task_instance_detail` exposes the executed historical definition). If publication is pending, make read-only checks within a finite deadline; on expiry or unavailable evidence, report the package/flow IDs and what remains unverified. A release-only request ends here. For an explicitly requested manual run, continue with [execution and completion checks](dataops-flow-monitor.md#workflow-c-manual-execution-and-stop).

---

## Command Quick Reference

For the 7 Python node commands see [Python workflow nodes](dataops-flow-python.md); for operations instance/log queries see [execution and monitoring](dataops-flow-monitor.md).

| Command | Purpose | Risk | Key Flags |
|---------|---------|------|-----------|
| `ae-cli dataops_flow +create_flow` | Create DEV flow | write | `--spaceCode` `--flowName` `[--remark]` |
| `ae-cli dataops_flow +create_sql_task` | Create DEV Trino SQL task | write | `--spaceCode` `--flowCode` `--taskName` `--sql` `[--preSql]` `[--postSql]` `[--outputParams]` `[--preTasks]` `[retry flags]` `[--remark]` |
| `ae-cli dataops_flow +update_sql_task` | Partially update DEV Trino SQL task | write | `--spaceCode` `--flowCode` `--taskCode` `[--sql]` `[--preSql]` `[--postSql]` `[--outputParams]` `[--preTasks]` `[retry flags]` |
| `ae-cli dataops_flow +get_sql_task` | Read DEV Trino SQL task definition | read | `--spaceCode` `--flowCode` `--taskCode` |
| `ae-cli dataops_flow +create_integration_task` | Create DEV integration sync task | write | `--spaceCode` `--flowCode` `--taskName` `--syncId` `[--preTasks]` `[retry flags]` `[--remark]` |
| `ae-cli dataops_flow +update_integration_task` | Rebind DEV integration sync task | write | `--spaceCode` `--flowCode` `--taskCode` `--syncId` `[--preTasks]` `[retry flags]` |
| `ae-cli dataops_flow +create_workflow_instance_check_task` | Create DEV `FLOW_CHECK` task | write | `--spaceCode` `--flowCode` `--taskName` `--checkItems` `[--relation]` `[--checkInterval]` `[--checkTime]` `[--preTasks]` `[retry flags]` `[--remark]` |
| `ae-cli dataops_flow +update_workflow_instance_check_task` | Update DEV `FLOW_CHECK` task | write | `--spaceCode` `--flowCode` `--taskCode` `--checkItems` `[--relation]` `[--checkInterval]` `[--checkTime]` `[--preTasks]` `[retry flags]` |
| `ae-cli dataops_flow +create_task_instance_check_task` | Create DEV `TASK_CHECK` task | write | `--spaceCode` `--flowCode` `--taskName` `--checkItems` `[--relation]` `[--checkInterval]` `[--checkTime]` `[--preTasks]` `[retry flags]` `[--remark]` |
| `ae-cli dataops_flow +update_task_instance_check_task` | Update DEV `TASK_CHECK` task | write | `--spaceCode` `--flowCode` `--taskCode` `--checkItems` `[--relation]` `[--checkInterval]` `[--checkTime]` `[--preTasks]` `[retry flags]` |
| `ae-cli dataops_flow +delete_task` | Delete one DEV task node | high-risk-write | `--spaceCode` `--flowCode` `--taskCode`; `--yes` after confirmation |
| `ae-cli dataops_flow +add_task_relation` | Add DEV dependency (`preTaskCode` -> `taskCode`) | write | `--spaceCode` `--flowCode` `--preTaskCode` `--taskCode` |
| `ae-cli dataops_flow +save_schedule_config` | Save DEV schedule config | write | `--spaceCode` `--flowCode` `--enabled` `[--cron]` |
| `ae-cli dataops_flow +get_flow_params` | List custom workflow parameters | read | `--spaceCode` `--flowCode` `[--env DEV\|PROD]` |
| `ae-cli dataops_flow +create_flow_param` | Create one DEV custom parameter | write | `--spaceCode` `--flowCode` `--paramKey` `--paramValue` `[--paramDataType VARCHAR\|EXPRESSION]` `[--remark]` |
| `ae-cli dataops_flow +update_flow_param` | Update or rename one DEV custom parameter | write | `--spaceCode` `--flowCode` `--paramKey` `[--originParamKey]` `[--paramValue]` `[--paramDataType]` `[--remark]` |
| `ae-cli dataops_flow +delete_flow_param` | Delete one DEV custom parameter | high-risk-write | `--spaceCode` `--flowCode` `--paramKey`; `--yes` after confirmation |
| `ae-cli dataops_flow +get_flow_overview` | View DEV/PROD flow overview & parameter refs | read | `--spaceCode` (`--flowCode` or `--flowName`) `[--env DEV\|PROD]` |
| `ae-cli dataops_flow +preview_release_flow` | Preview pending DEV-to-PROD release diff | read | `--spaceCode` `--flowCode` |
| `ae-cli dataops_flow +release_flow` | Submit DEV-to-PROD release | write | `--spaceCode` `--flowCode` |
| `ae-cli dataops_flow +execute_flow` | Manual PROD execution | write | `--spaceCode` `--flowCode` `[--baseDate]` |

## Parameter Notes

- **Parameter reference**: Reference parameters in tasks as `${paramKey}` (e.g., `${ws_run_date}`).
- **Task dependencies (`--preTasks`)**: JSON array of upstream task codes across all task create/update commands. Omit `--preTasks` on update to preserve existing dependencies; pass `--preTasks '[]'` to clear them; pass a non-empty array to replace them.
- **Retry flags**: `--failRetryTimes`, `--failRetryInterval`, `--failRetryUnit` (`MINUTE` only). Create defaults to `3`, `5`, `MINUTE`; update preserves omitted fields.
- **SQL & integration updates**: `+update_sql_task` preserves omitted hooks/dependencies/retry fields; `+create_sql_task` returns `taskType=TRINO_SQL`, `sqlSaved=true`; `+create_integration_task` returns `taskType=OFFLINE_SYNC`, `syncTaskSaved=true`.
- **Schedule & execution**: `+save_schedule_config` requires `--cron` only when `--enabled true`. `+execute_flow` always runs PROD (`--baseDate` maps to `bd`) and returns `result.executeId`, `operationStatus`, and optional `flowInstanceId`.
- **Release preview & submit**: Both take only `--spaceCode` and `--flowCode`. Preview returns `releaseStatus`, `message`, and `changes` (`scheduleConfigChange.diff.old/new.parameters`, task `changed`/`contentCompare`/`paramCompare`/`targetTable`; `paramCompare` includes `old` and `new` task parameter lists whenever `"parameter"` is in `changed`); parameter-only changes use the existing flow configuration release. Release returns `result.releaseStatus`, `message`, and optional `packageCode`/`changes`.
- **Flow overview (`+get_flow_overview`)**: Requires `dwWorkflowEdit` in DEV (default) and PROD. Returns `flowParams` and `dag.tasks[].taskParams` (empty arrays when none). Expressions stay literal (`paramDataType=QUOTE` on task refs); `paramFrom` is `FLOW` or `SPACE`, and code-parsed refs without a configured source leave `paramFrom`/`paramValue` null or omitted.

## Transport Status

Transition status: transitional

Owning module: gaia-mcp workflow

Current transport: DataOps CLI REST

Covered workflow tools: `flow_get_sql_task`, `flow_create_workflow_instance_check_task`, `flow_update_workflow_instance_check_task`, `flow_create_task_instance_check_task`, `flow_update_task_instance_check_task`, `flow_delete_task`, `flow_get_flow_params`, `flow_create_flow_param`, `flow_update_flow_param`, and `flow_delete_flow_param`

Gateway target: TBD after DataOps workflow Gateway schema review

Review after: 2026-12-21

Exit condition: Migrate or remove these one-to-one commands after equivalent Capability Gateway actions are available.

## Important Notes

1. **Getting flowCode**: Use `+list_flows` (see `dataops-flow-monitor` Skill)
2. **Getting taskCode**: Returned by a task create command or query via `+get_flow_overview`
3. **Release Impact**: Submits current DEV changes to PROD; released schedule/config applies to future PROD runs
4. **SQL Validation**: Recommended to validate before saving TRINO_SQL tasks
5. **Cannot create circular dependencies**
