---
name: dataops-flow-monitor
version: 1.0.0
description: "Flow execution and monitoring: view execution instances, inspect instance DAGs and task logs, manually execute/stop flows. Trigger keywords: execute flow, running instance, monitor, logs, stop, troubleshoot, instance, flow instance."
metadata:
  requires:
    bins: ["ae-cli"]
---

# DataOps Flow Execution and Monitoring

> **Prerequisites:** Read [`ae-dataops/SKILL.md`](../SKILL.md) for general rules.

Use `dataops_flow` to execute and control flows. Use `dataops_operations` for space-level operations instance search, instance DAG inspection, and task logs.

**Core Concepts:**
- **executeId** — Execution ID returned immediately by `dataops_flow +execute_flow`; useful for stopping before the scheduler instance is available
- **flowInstanceId** — Operations workflow instance ID returned by `dataops_operations +search_flow_instances`; use it for operations detail, task logs, and stop
- **Instance list queries PROD environment by default** (unlike other tools which default to DEV)

In the default CLI JSON, take `executeId` from `data.result.executeId` and an already available `flowInstanceId` from `data.result.flowInstanceId`. Otherwise select `data.instances[]` from operations search and keep its `flowCode` and `flowInstanceId` together. Instance detail supplies `data.taskInstances[].taskInstanceId` for task inspection; a definition's `taskCode` is not a task instance ID.

### Status fields are command-specific

The paths below are relative to the command payload, as used by CLI `--jq`. Prefix them with `.data` when reading the default JSON envelope with an external jq command.

| Command | Execution status path | Trigger path |
|---|---|---|
| `+list_flows` | `.flows[].latestProductionInstance.flowInstanceStatus` | `.flows[].latestProductionInstance.historyCmd` |
| `+search_flow_instances` | `.instances[].status` | `.instances[].triggerType` |
| `+get_flow_instance_detail` | `.flowInstance.status`; task states in `.taskInstances[].status` | `.flowInstance.triggerType` |
| `+get_task_instance_detail` | `.status` | Use its flow instance |

`flowStatus` is the workflow definition state, such as `RELEASED`, not execution completion. `flowScheduleStatus` is a separate scheduling state; neither it nor the latest-flow summary replaces inspection of a specific run.

If the selected instance's execution status is missing, null, or unknown, stop status-based polling and inspect the same read command without `--jq`. A missing field projects to null without a jq error; `ok:true` does not make that status usable. If the raw status remains unavailable, report uncertainty rather than treating it as running or successful. Do not apply this rule to legitimately nullable fields such as `endTime`.

---

## Workflow A: Find and View Flow Execution Status

```bash
# Step 1: List/search current-space flows and get flowCode
ae-cli dataops_flow +list_flows --spaceCode "${spaceCode}" --keyword "etl" --pageSize 20

# Optional: find frequently released flows in the last 30 days
ae-cli dataops_flow +list_high_frequency_release_flows --spaceCode "${spaceCode}" \
  --days 30 --topN 10 --status SUCCESS

# Optional: get one-environment overview by exact name or flowCode
ae-cli dataops_flow +get_flow_overview --spaceCode "${spaceCode}" \
  --flowName "etl" --env "PROD"

# Step 2: Search operation instances across the whole space, with statistics
ae-cli dataops_operations +search_flow_instances --spaceCode "${spaceCode}" \
  --keyword "${flowKeyword}" --startDate "${startDate}" --endDate "${endDate}" --pageSize 20

# Step 3: Inspect one instance DAG and task statuses
ae-cli dataops_operations +get_flow_instance_detail --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --flowInstanceId ${flowInstanceId}
```

`flowKeyword` must be a discovered flow name, remark, or instance ID; search does not match `flowCode`. Filter returned instances by the exact `flowCode` and the requested execution/base date, following `hasMore` when needed. For a newly submitted run, compare the submission time and prior instance list; if several candidates still match, report ambiguity instead of inspecting an arbitrary latest instance.

Once the intended instance is verified, keep its `flowInstanceId` fixed and poll its detail, not all matching instances. A previous instance's `SUCCESS` cannot prove that the requested run completed. If the current CLI cannot correlate `executeId` to one instance confidently, retain the execution handle and report the limitation.

```bash
# Inspect only the previously verified instance; reuse these IDs while polling.
ae-cli dataops_operations +get_flow_instance_detail --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --flowInstanceId "${flowInstanceId}" \
  --jq '{flowInstanceId: .flowInstance.flowInstanceId, status: .flowInstance.status}'
```

---

## Workflow B: Troubleshoot Task Failures

```bash
# Step 1: Inspect one workflow instance and locate the failed task
ae-cli dataops_operations +get_flow_instance_detail --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --flowInstanceId ${flowInstanceId}

# Step 2: View task detail and logs
ae-cli dataops_operations +get_task_instance_detail --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --flowInstanceId ${flowInstanceId} \
  --taskInstanceId ${taskInstanceId} --includeLog true
```

Report the failed task, historical instance/base date, and relevant log evidence first. These commands cannot rerun only failed nodes of that historical instance. Do not substitute `+execute_flow` (a new whole-flow PROD run) or a backfill job for that request. If the user explicitly requests a new whole-flow run, establish its business date, release any required DEV fixes using [the release workflow](dataops-flow-create.md#step-8-preview-release), and continue below; pass `--baseDate` for a requested historical date rather than assuming today's date is equivalent.

---

## Workflow C: Manual Execution and Stop

```bash
# Run only when the user requested a new whole-flow PROD execution
ae-cli dataops_flow +execute_flow --spaceCode "${spaceCode}" \
  --flowCode ${flowCode}
# data.result.operationStatus=SUCCESS means accepted; retain data.result.executeId

# Monitor recent executions
ae-cli dataops_operations +search_flow_instances --spaceCode "${spaceCode}" \
  --keyword "${flowKeyword}" --startDate "${startDate}" --endDate "${endDate}" --pageSize 20

# Stop only when requested, using the verified execution handle
ae-cli dataops_operations +stop_flow_instance --spaceCode "${spaceCode}" \
  --flowCode ${flowCode} --executeId ${executeId}
```

An accepted execution is not a completed run. Inspect `data.result.operationStatus`; a non-`SUCCESS` result stops the submission path. Once the instance is identified, read `data.flowInstance.status` from `+get_flow_instance_detail`: `SUCCESS` is successful execution, `FAIL` is failure, and `STOP` or `PAUSE` is not success. `RUNNING` and `READY_PAUSE` are unfinished flow instance states. Task detail uses `data.status`; instance detail uses `data.taskInstances[].status`. A successful read of a failed instance is still a successful query.

For `+search_flow_instances --status`, use only `RUNNING,SUCCESS,FAIL,READY_PAUSE,PAUSE,STOP`. `WAITING` filtering is not supported by the current backend; an empty result with that filter does not establish that no work is waiting. Do not infer support from a different command's scheduling or download status.

When completion is requested, set a finite polling deadline and use read-only instance queries. Stop on a terminal/paused state, an actionable error, or the deadline; then report the IDs, last observed state, and relevant failure evidence. A temporarily absent instance or a timeout does not authorize another `+execute_flow`; retain the original `executeId` and report uncertain correlation or completion. Read the instance again after a stop request to distinguish stop acceptance from an observed `STOP` state.

---

## Workflow D: View Flow Structure

```bash
# View agent-friendly flow overview for one environment
ae-cli dataops_flow +get_flow_overview --spaceCode "${spaceCode}" \
  --flowName "etl" --env "DEV"

# The current schedule is included in +get_flow_overview output as "schedule".
```

---

## Command Quick Reference

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `+list_flows` | List/search current-space flows | `--spaceCode` `[--keyword]` `[--pageNum]` `[--pageSize]` |
| `+list_high_frequency_release_flows` | List flows ranked by release count, not execution count | `--spaceCode` `[--days]` `[--topN]` `[--minCount]` `[--status]` |
| `+get_flow_overview` | DEV/PROD flow overview | `--spaceCode` (`--flowCode` or `--flowName`) `[--env]` |
| `+execute_flow` | Manual PROD execution | `--spaceCode` `--flowCode` `[--baseDate]` |
| `dataops_operations +search_flow_instances` | Search operations workflow instances | `--spaceCode` `[--keyword]` `[--startDate]` `[--endDate]` `[--status]` `[--pageNum]` `[--pageSize]` |
| `dataops_operations +get_flow_instance_detail` | Operations instance DAG and task statuses | `--spaceCode` `--flowCode` `--flowInstanceId` |
| `dataops_operations +get_task_instance_detail` | Operations task detail and optional logs | `--spaceCode` `--flowCode` `--flowInstanceId` (`--taskInstanceId` or `--taskCode` or `--taskName`) `[--includeLog]` |
| `dataops_operations +stop_flow_instance` | Stop a running execution | `--spaceCode` `--flowCode` exactly one of `--executeId` or `--flowInstanceId` |
| `+update_flow` | Update DEV workflow name and/or remark | `--spaceCode` `--flowCode` `[--flowName]` `[--remark]` |

## Parameter Notes

- **Execution**: `+execute_flow` requires `--spaceCode` and `--flowCode`; `--baseDate` is optional and maps to runtime parameter `bd`. It always runs PROD and returns `action/result/status`; `result` includes `flowCode`, `executeId`, `operationStatus`, `nextAction`, and optional `flowInstanceId`.
- **Stop flow instance**: `dataops_operations +stop_flow_instance` requires `--spaceCode`, `--flowCode`, and exactly one of `--executeId` or `--flowInstanceId`. `--executeId` comes from `dataops_flow +execute_flow`; `--flowInstanceId` comes from `dataops_operations +search_flow_instances`. It returns `success`, `selector`, and selector-specific stop result fields.
- **Flow overview**: `+get_flow_overview` requires `--spaceCode` and either `--flowCode` or exact `--flowName`; `--flowCode` takes precedence. `--env` defaults to `DEV`; use `PROD` to include latest production instance fields when available. It requires `dwWorkflowEdit` in both environments and returns `success`, `env`, `resolvedBy`, `flow`, `flowParams`, `schedule`, `dag`, and `summary`. `flowParams` contains all custom flow parameters, including unused ones; `dag.tasks[].taskParams` contains each task's references with `paramKey`, `paramType`, `paramDataType`, `paramFrom`, `paramValue`, `paramDesc`, and built-in flags such as `isBd`. Both lists use the selected environment and are empty arrays when no parameters exist. Definition values preserve expression text: a FLOW reference to `p=${bd}` keeps `paramDataType=QUOTE` and `paramValue=${bd}`; it is not an execution date.
- **Flow update**: `+update_flow` requires `--spaceCode`, `--flowCode`, and at least one of `--flowName` or `--remark`. It returns `action/result/status`; `result` is an array with items containing `flowCode`, `operationStatus`, `nameChanged`, and optional `flowName`.
- **High-frequency release flows**: `+list_high_frequency_release_flows` requires `--spaceCode`; `--days`, `--topN`, `--minCount`, and `--status` are optional. Defaults are `days=30`, `topN=10`, and `status=SUCCESS`. It returns `period`, `filters`, `flows`, `returnedCount`, and `nextAction`; flow items include `rank`, `flowCode`, `flowName`, `releaseCount`, `lastReleaseTime`, and `avgIntervalHours`.
- **Operations instance search**: `dataops_operations +search_flow_instances` requires `--spaceCode`; `--keyword`, `--startDate`, `--endDate`, `--status`, `--pageNum`, and `--pageSize` are optional. `--keyword` fuzzy-matches instance ID, workflow name, or workflow remark, not `flowCode`; filter the returned `flowCode` exactly. `pageNum` defaults to `1`; `pageSize` defaults to `20` and maxes at `100`. It returns `totalCount`, `returnedCount`, `pageNum`, `pageSize`, `hasMore`, `instances`, `statusCounts`, `triggerTypeCounts`, and `ownerCounts`.
- **Flow instance detail**: `dataops_operations +get_flow_instance_detail` requires `dwOMInstanceView` and returns the historical execution snapshot in `flowInstance.instanceParamMap`. A missing snapshot is null or omitted; the server does not substitute current parameter definitions. Later definition changes do not change historical execution values.
- **Task instance detail**: `dataops_operations +get_task_instance_detail` requires `--spaceCode`, `--flowCode`, `--flowInstanceId`, and one selector: `--taskInstanceId`, `--taskCode`, or exact `--taskName`. Prefer `--taskInstanceId` because retries can create multiple instances with the same task code/name. It requires `dwOMInstanceView`. `--includeLog` is optional and defaults to `false`; when enabled, `log.params` contains the task's historical actual execution values. It returns `success`, `flowInstanceId`, `taskCode`, `taskName`, `taskInstanceId`, `status`, `task`, `taskInstance`, `definition`, and `log` only when requested.
- **env**: `DEV` (development) | `PROD` (production, instance list defaults to PROD)
- **flow list paging**: `+list_flows` requires `--spaceCode`; `--keyword`, `--pageNum`, and `--pageSize` are optional. It returns `flows`, `totalCount`, `returnedCount`, `pageNum`, `pageSize`, and `hasMore`; flow items include `latestProductionInstance` only when available. `pageSize` defaults to `20` and maxes at `100`.
- **Task parameter sources**: Read `dag.tasks[].taskParams` from `+get_flow_overview`. `paramFrom=FLOW` means a flow definition supplies the value; `SPACE` means a space parameter does. A code-parsed reference remains in the list when neither source exists; its `paramFrom` and `paramValue` fields are null or omitted, both meaning no configured source/value. Deleting a flow parameter falls back to a same-name space parameter, or to code-parsed status. Unpublished DEV changes do not alter PROD values or sources.
- **Task Status**: `WAITING` / `RUNNING` / `SUCCESS` / `FAIL` / `STOP` / `PAUSE`; only `SUCCESS` means successful completion.
