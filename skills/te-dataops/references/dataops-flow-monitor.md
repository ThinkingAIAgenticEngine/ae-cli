---
name: dataops-flow-monitor
version: 1.0.0
description: "任务流执行与监控：查看执行实例、运行态 DAG、任务日志、手动执行/停止任务流。触发关键词：执行任务流、运行实例、监控、日志、停止、DAG、排错、实例、flow instance。"
metadata:
  requires:
    bins: ["te-cli"]
---

# DataOps 任务流执行与监控

> **前置条件:** 阅读 [`te-dataops/SKILL.md`](../SKILL.md) 了解通用规则。

使用 `dataops_flow` 子命令执行和监控任务流。

**核心概念：**
- **executeId** — flow_* 工具使用的执行记录 ID（通过 `+list_flow_instances` 获取）
- **flowInstanceId** — operations_* 工具使用的运维实例 ID（两者不互通，不可混用）
- **实例列表默认查询 PROD 环境**（与其他工具默认 DEV 不同）

---

## 工作流 A：查找并查看任务流执行状态

```bash
# Step 1: 搜索任务流（获取 flowCode）
te-cli dataops_flow +list_flows --spaceCode "${spaceCode}" --keyword "etl"

# Step 2: 查看执行实例列表（默认 PROD，按时间倒序）
te-cli dataops_flow +list_flow_instances --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --env "PROD" --size 30

# Step 3: 查看运行态 DAG（含各节点执行状态）
te-cli dataops_flow +get_execute_dag --spaceCode "${spaceCode}" --executeId "${executeId}"

# Step 4: 查看执行记录详情
te-cli dataops_flow +get_execute_record --spaceCode "${spaceCode}" --executeId "${executeId}"
```

---

## 工作流 B：排查任务失败

```bash
# Step 1: 获取运行态 DAG，定位失败节点
te-cli dataops_flow +get_execute_dag --spaceCode "${spaceCode}" --executeId "${executeId}"
# 从返回中找到 status=FAILED 的节点，获取其 bsTaskInstanceId 和 taskCode

# Step 2: 查看失败任务的日志
te-cli dataops_flow +get_task_instance_log --bsTaskInstanceId "${bsTaskInstanceId}" \
  --taskCode "${taskCode}" --limit 100

# Step 3: 查看任务定义（确认 SQL/配置）
te-cli dataops_flow +get_task_params --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskCode "${taskCode}"

# Step 4: 修复后重新执行
te-cli dataops_flow +execute_flow --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --env "DEV" --confirmed true
```

---

## 工作流 C：手动执行与停止

```bash
# 手动触发执行（默认 DEV，可指定 PROD）
te-cli dataops_flow +execute_flow --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --env "DEV" --confirmed true
# 返回 executeId

# 监控执行过程
te-cli dataops_flow +get_execute_dag --spaceCode "${spaceCode}" --executeId "${executeId}"

# 必要时停止执行（不可撤销）
te-cli dataops_flow +stop_flow --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --executeId "${executeId}" --confirmed true
```

---

## 工作流 D：查看任务流结构

```bash
# 查看任务流定义态 DAG（静态结构、依赖关系）
te-cli dataops_flow +get_flow_dag --spaceCode "${spaceCode}" --flowCode "${flowCode}"

# 查看任务流基本信息
te-cli dataops_flow +get_flow_detail --spaceCode "${spaceCode}" --flowCode "${flowCode}"

# 查看调度配置
te-cli dataops_flow +get_schedule_config --spaceCode "${spaceCode}" --flowCode "${flowCode}"
```

---

## 命令速查

| 命令 | 用途 | 关键 Flags |
|------|------|-----------|
| `+list_flows` | 搜索任务流 | `--spaceCode` `--keyword` |
| `+get_flow_detail` | 任务流信息 | `--spaceCode` `--flowCode` `--env` |
| `+get_flow_dag` | 定义态 DAG | `--spaceCode` `--flowCode` `--env` |
| `+get_schedule_config` | 调度配置 | `--spaceCode` `--flowCode` `--env` |
| `+execute_flow` | 手动执行 | `--spaceCode` `--flowCode` `--env` `--confirmed` |
| `+stop_flow` | 停止执行 | `--spaceCode` `--flowCode` `--executeId` `--confirmed` |
| `+list_flow_instances` | 实例列表 | `--spaceCode` `--flowCode` `--env` `--size` |
| `+get_execute_record` | 执行记录 | `--spaceCode` `--executeId` |
| `+get_execute_dag` | 运行态 DAG | `--spaceCode` `--executeId` |
| `+get_task_instance_log` | 任务日志 | `--bsTaskInstanceId` `--taskCode` `--startOffset` `--limit` |
| `+get_task_params` | 任务参数 | `--spaceCode` `--flowCode` `--taskCode` `--env` |
| `+update_flow` | 更新任务流 | `--spaceCode` `--flowCode` `--flowName` `--remark` `--confirmed` |

## 参数说明

- **env**: `DEV`（开发）| `PROD`（生产，实例列表默认 PROD）
- **任务状态**: `success` / `failure` / `running` / `waiting`
- **DAG 区别**: `+get_flow_dag` 返回静态定义结构，`+get_execute_dag` 返回含执行状态的运行态结构
