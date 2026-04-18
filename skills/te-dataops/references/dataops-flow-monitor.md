---
name: dataops-flow-monitor
version: 1.0.0
description: "Flow execution and monitoring: view execution instances, runtime DAG, task logs, manually execute/stop flows. Trigger keywords: execute flow, running instance, monitor, logs, stop, DAG, troubleshoot, instance, flow instance."
metadata:
  requires:
    bins: ["ae-cli"]
---

# DataOps Flow Execution and Monitoring

> **Prerequisites:** Read [`te-dataops/SKILL.md`](../SKILL.md) for general rules.

Use the `dataops_flow` subcommand to execute and monitor flows.

**Core Concepts:**
- **executeId** — Execution record ID used by flow_* tools (obtained via `+list_flow_instances`)
- **flowInstanceId** — Operations instance ID used by operations_* tools (these two are not interchangeable)
- **Instance list queries PROD environment by default** (unlike other tools which default to DEV)

---

## Workflow A: Find and View Flow Execution Status

```bash
# Step 1: Search flows (get flowCode)
ae-cli dataops_flow +list_flows --spaceCode "${spaceCode}" --keyword "etl"

# Step 2: View execution instance list (default PROD, sorted by time descending)
ae-cli dataops_flow +list_flow_instances --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --env "PROD" --size 30

# Step 3: View runtime DAG (with execution status for each node)
ae-cli dataops_flow +get_execute_dag --spaceCode "${spaceCode}" --executeId "${executeId}"

# Step 4: View execution record details
ae-cli dataops_flow +get_execute_record --spaceCode "${spaceCode}" --executeId "${executeId}"
```

---

## Workflow B: Troubleshoot Task Failures

```bash
# Step 1: Get runtime DAG, locate failed node
ae-cli dataops_flow +get_execute_dag --spaceCode "${spaceCode}" --executeId "${executeId}"
# Find node with status=FAILED, get its bsTaskInstanceId and taskCode

# Step 2: View failed task logs
ae-cli dataops_flow +get_task_instance_log --bsTaskInstanceId "${bsTaskInstanceId}" \
  --taskCode "${taskCode}" --limit 100

# Step 3: View task definition (confirm SQL/configuration)
ae-cli dataops_flow +get_task_params --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskCode "${taskCode}"

# Step 4: Re-execute after fixing
ae-cli dataops_flow +execute_flow --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --env "DEV" --confirmed true
```

---

## Workflow C: Manual Execution and Stop

```bash
# Manually trigger execution (default DEV, can specify PROD)
ae-cli dataops_flow +execute_flow --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --env "DEV" --confirmed true
# Returns executeId

# Monitor execution progress
ae-cli dataops_flow +get_execute_dag --spaceCode "${spaceCode}" --executeId "${executeId}"

# Stop execution if necessary (irreversible)
ae-cli dataops_flow +stop_flow --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --executeId "${executeId}" --confirmed true
```

---

## Workflow D: View Flow Structure

```bash
# View flow definition DAG (static structure, dependencies)
ae-cli dataops_flow +get_flow_dag --spaceCode "${spaceCode}" --flowCode "${flowCode}"

# View flow basic information
ae-cli dataops_flow +get_flow_detail --spaceCode "${spaceCode}" --flowCode "${flowCode}"

# View schedule configuration
ae-cli dataops_flow +get_schedule_config --spaceCode "${spaceCode}" --flowCode "${flowCode}"
```

---

## Command Quick Reference

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `+list_flows` | Search flows | `--spaceCode` `--keyword` |
| `+get_flow_detail` | Flow information | `--spaceCode` `--flowCode` `--env` |
| `+get_flow_dag` | Definition DAG | `--spaceCode` `--flowCode` `--env` |
| `+get_schedule_config` | Schedule configuration | `--spaceCode` `--flowCode` `--env` |
| `+execute_flow` | Manual execution | `--spaceCode` `--flowCode` `--env` `--confirmed` |
| `+stop_flow` | Stop execution | `--spaceCode` `--flowCode` `--executeId` `--confirmed` |
| `+list_flow_instances` | Instance list | `--spaceCode` `--flowCode` `--env` `--size` |
| `+get_execute_record` | Execution record | `--spaceCode` `--executeId` |
| `+get_execute_dag` | Runtime DAG | `--spaceCode` `--executeId` |
| `+get_task_instance_log` | Task logs | `--bsTaskInstanceId` `--taskCode` `--startOffset` `--limit` |
| `+get_task_params` | Task parameters | `--spaceCode` `--flowCode` `--taskCode` `--env` |
| `+update_flow` | Update flow | `--spaceCode` `--flowCode` `--flowName` `--remark` `--confirmed` |

## Parameter Notes

- **env**: `DEV` (development) | `PROD` (production, instance list defaults to PROD)
- **Task Status**: `success` / `failure` / `running` / `waiting`
- **DAG Difference**: `+get_flow_dag` returns static definition structure, `+get_execute_dag` returns runtime structure with execution status
