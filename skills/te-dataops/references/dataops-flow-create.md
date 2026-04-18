---
name: dataops-flow-create
version: 1.0.0
description: "Flow creation and configuration: create flows, add task nodes, configure dependencies, save task definitions, configure scheduling, test, and release to production. Trigger keywords: create flow, new workflow, configure schedule, add task node, release, cron, scheduled execution."
metadata:
  requires:
    bins: ["ae-cli"]
---

# DataOps Flow Creation and Configuration

> **Prerequisites:** Read [`te-dataops/SKILL.md`](../SKILL.md) for general rules.

Use the `dataops_flow` subcommand to manage flow lifecycle.

**Flow Lifecycle: Create → Configure Nodes → Configure Schedule → Test in DEV → Release to PROD → Online Schedule**

---

## Complete Flow Creation Process

Follow these steps in order to create a production-ready flow from scratch.

### Step 1: Create Flow

```bash
ae-cli dataops_flow +create_flow --spaceCode "${spaceCode}" \
  --flowName "Daily ETL Process" --remark "Process user data" --confirmed true
# Returns flowCode, required for subsequent steps
```

### Step 2: Create Task Nodes (can be called multiple times)

```bash
# Create SQL task
ae-cli dataops_flow +create_task --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskName "Process User Data" --taskType "TRINO_SQL" --confirmed true
# Returns taskCode

# Create task with upstream dependency
ae-cli dataops_flow +create_task --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskName "Export Results" --taskType "TRINO_SQL" \
  --preTaskCode "${upstreamTaskCode}" --confirmed true
```

**Task Node Types:**

| Type | Description | Typical Use |
|------|-------------|-------------|
| TRINO_SQL | Trino SQL query | Data processing, ETL |
| SHELL | Shell script | System commands, file operations |
| FLOW_CHECK | Flow check | Check if upstream flow is complete |
| TASK_CHECK | Task check | Check if specified task is complete |
| OFFLINE_SYNC | Offline sync | Integration solution data sync (requires syncId) |
| APP_SYNC | App sync | App table data sync (requires syncId) |
| PLACE_HOLDER | Placeholder | Flow control, logical grouping |

### Step 3: Save Task Definition (configure SQL/Shell content)

```bash
# SQL task
ae-cli dataops_flow +save_task_definition --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskCode "${taskCode}" \
  --taskContentJson '{"sql":"SELECT * FROM dwd_user","repoCode":"te_etl","catalog":"hive","schema":"ws_default_dev"}' \
  --failRetryTimes 3 --failRetryInterval 30 --timeout 60 --confirmed true

# Shell task
ae-cli dataops_flow +save_task_definition --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskCode "${taskCode}" \
  --taskContentJson '{"script":"#!/bin/bash\necho hello"}' \
  --confirmed true
```

### Step 4: Validate SQL (recommended, TRINO_SQL type only)

```bash
ae-cli dataops_flow +validate_task_sql --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskCode "${taskCode}" \
  --sql "SELECT * FROM dwd_user" --repoCode "te_etl" \
  --catalog "hive" --schema "ws_default_dev"
# Check valid=true, otherwise review message and errorPosition
```

### Step 5: Add Task Dependencies (DAG connections)

```bash
ae-cli dataops_flow +add_task_relation --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --preTaskCode "${upstreamTaskCode}" --taskCode "${downstreamTaskCode}" \
  --confirmed true
```

### Step 6: Configure Schedule

```bash
# CRON expression for scheduled execution
ae-cli dataops_flow +save_schedule_config --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --scheduled 1 --scheduleType "CRON" \
  --cron "0 0 2 * * ?" --confirmed true
# Example: 0 0 2 * * ? = Daily at 2 AM
```

**CRON Format** (6 fields): `second minute hour day month weekday`
- `0 0 */4 * * ?` — Every 4 hours
- `0 30 8 * * 1-5` — Weekdays at 8:30

### Step 7: Test in DEV Environment

```bash
# Manually trigger execution
ae-cli dataops_flow +execute_flow --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --env "DEV" --confirmed true

# Check execution status
ae-cli dataops_flow +get_execute_dag --spaceCode "${spaceCode}" --executeId "${executeId}"

# View task logs (get bsTaskInstanceId and taskCode from DAG)
ae-cli dataops_flow +get_task_instance_log --bsTaskInstanceId "${instanceId}" --taskCode "${taskCode}"

# Adjust configuration based on logs, then repeat testing
```

### Step 8: Release to Production

```bash
ae-cli dataops_flow +release_flow --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --confirmed true
# After release, PROD schedule takes effect immediately without interrupting running instances
```

---

## Command Quick Reference

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `+create_flow` | Create flow | `--spaceCode` `--flowName` `--remark` `--confirmed` |
| `+create_task` | Create task node | `--spaceCode` `--flowCode` `--taskName` `--taskType` `--syncId` `--preTaskCode` `--confirmed` |
| `+save_task_definition` | Save task definition | `--spaceCode` `--flowCode` `--taskCode` `--taskContentJson` `--failRetryTimes` `--failRetryInterval` `--timeout` `--confirmed` |
| `+validate_task_sql` | Validate SQL | `--spaceCode` `--flowCode` `--taskCode` `--sql` `--repoCode` `--catalog` `--schema` |
| `+add_task_relation` | Add dependency | `--spaceCode` `--flowCode` `--preTaskCode` `--taskCode` `--confirmed` |
| `+save_schedule_config` | Configure schedule | `--spaceCode` `--flowCode` `--scheduled` `--scheduleType` `--cron` `--confirmed` |
| `+get_flow_dag` | View DAG structure | `--spaceCode` `--flowCode` `--env` |
| `+get_task_params` | View task parameters | `--spaceCode` `--flowCode` `--taskCode` `--env` |
| `+execute_flow` | Manual execution | `--spaceCode` `--flowCode` `--env` `--confirmed` |
| `+get_execute_dag` | View runtime DAG | `--spaceCode` `--executeId` |
| `+get_task_instance_log` | View task logs | `--bsTaskInstanceId` `--taskCode` `--startOffset` `--limit` |
| `+release_flow` | Release to production | `--spaceCode` `--flowCode` `--confirmed` |

## Parameter Notes

- **Parameter Reference**: Reference workspace parameters in tasks using `${paramKey}` (e.g., `${ws_run_date}`)
- **Environment**: `DEV` (default) | `PROD`
- **taskContentJson**: JSON string, format varies by taskType:
  - TRINO_SQL: `{"sql":"SELECT ...","repoCode":"xxx","catalog":"hive","schema":"db"}`
  - SHELL: `{"script":"#!/bin/bash\n..."}`

## Important Notes

1. **Getting flowCode**: Use `+list_flows` (see `dataops-flow-monitor` Skill)
2. **Getting taskCode**: Returned by `+create_task` or query via `+get_flow_dag`
3. **Release Impact**: Syncs all DEV changes to PROD, PROD schedule takes effect immediately
4. **SQL Validation**: Recommended to validate before saving TRINO_SQL tasks
5. **Cannot create circular dependencies**
