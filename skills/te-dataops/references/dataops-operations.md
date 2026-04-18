---
name: dataops-operations
version: 1.0.0
description: "运维操作与补数管理：搜索运维实例、重跑失败任务、停止实例、补数任务管理。触发关键词：运维、监控、补数、重跑、告警、operations、实例、backfill。"
metadata:
  requires:
    bins: ["te-cli"]
---

# DataOps 运维操作与补数管理

> **前置条件:** 阅读 [`te-dataops/SKILL.md`](../SKILL.md) 了解通用规则。

使用 `dataops_operations` 子命令进行运维操作。

**核心概念：**
- **flowInstanceId** — operations_* 工具使用的运维实例 ID
- **executeId** — flow_* 工具使用的执行记录 ID（两者不互通，不可混用）
- 运维视角关注生产环境的实例管理和补数操作

---

## 工作流 A：运维实例查询与操作

```bash
# Step 1: 搜索任务流实例（支持按状态/负责人/时间筛选）
te-cli dataops_operations +search_flow_instances --spaceCode "${spaceCode}" \
  --pageNum 1 --pageSize 20

# Step 2: 查看实例下的所有任务节点及执行状态
te-cli dataops_operations +list_flow_task_instances --spaceCode "${spaceCode}" \
  --flowInstanceId "${flowInstanceId}"

# Step 3: 获取任务节点定义详情
te-cli dataops_operations +get_task_definition --spaceCode "${spaceCode}" \
  --flowInstanceId "${flowInstanceId}" --taskCode "${taskCode}"

# Step 4: 重跑失败的任务流实例（从失败节点继续）
te-cli dataops_operations +rerun_flow_instance --spaceCode "${spaceCode}" \
  --flowInstanceId "${flowInstanceId}" --confirmed true

# Step 5: 停止正在运行的实例
te-cli dataops_operations +stop_flow_instance --spaceCode "${spaceCode}" \
  --flowInstanceId "${flowInstanceId}" --confirmed true

# Step 6: 控制实例运行状态（暂停/强制暂停/恢复）
te-cli dataops_operations +control_flow_instance --spaceCode "${spaceCode}" \
  --flowInstanceId "${flowInstanceId}" --action "PAUSE" --confirmed true
```

---

## 工作流 B：补数任务管理

补数任务用于批量重跑历史数据。

```bash
# Step 1: 查询补数任务列表
te-cli dataops_operations +list_flow_jobs --spaceCode "${spaceCode}" \
  --pageNum 1 --pageSize 20

# Step 2: 获取补数任务详情（配置、日期范围、并发设置）
te-cli dataops_operations +get_flow_job_detail --spaceCode "${spaceCode}" \
  --jobId "${jobId}"

# Step 3: 获取补数任务的执行计划列表（每个日期的状态）
te-cli dataops_operations +list_flow_job_plans --spaceCode "${spaceCode}" \
  --jobId "${jobId}"

# Step 4: 停止正在执行的补数任务
te-cli dataops_operations +stop_flow_job --spaceCode "${spaceCode}" \
  --jobId "${jobId}" --confirmed true
```

---

## 工作流 C：任务节点实例查询

```bash
# 搜索任务节点实例（支持按状态/类型/时间筛选）
te-cli dataops_operations +search_task_instances --spaceCode "${spaceCode}" \
  --pageNum 1 --pageSize 20
```

---

## 命令速查

| 命令 | 用途 | 关键 Flags |
|------|------|-----------|
| `+search_flow_instances` | 搜索任务流实例 | `--spaceCode` `--pageNum` `--pageSize` |
| `+list_flow_task_instances` | 实例任务节点 | `--spaceCode` `--flowInstanceId` |
| `+get_task_definition` | 任务节点定义 | `--spaceCode` `--flowInstanceId` `--taskCode` |
| `+rerun_flow_instance` | 重跑实例 | `--spaceCode` `--flowInstanceId` `--confirmed` |
| `+stop_flow_instance` | 停止实例 | `--spaceCode` `--flowInstanceId` `--confirmed` |
| `+control_flow_instance` | 控制实例状态 | `--spaceCode` `--flowInstanceId` `--action` `--confirmed` |
| `+search_task_instances` | 搜索任务实例 | `--spaceCode` `--pageNum` `--pageSize` |
| `+list_flow_jobs` | 补数任务列表 | `--spaceCode` `--pageNum` `--pageSize` |
| `+get_flow_job_detail` | 补数任务详情 | `--spaceCode` `--jobId` |
| `+list_flow_job_plans` | 补数执行计划 | `--spaceCode` `--jobId` |
| `+stop_flow_job` | 停止补数任务 | `--spaceCode` `--jobId` `--confirmed` |

## 参数说明

- **action**: `PAUSE`（暂停）| `FORCE_PAUSE`（强制暂停）| `RESUME`（恢复）
- **实例状态**: `RUNNING` / `SUCCESS` / `FAILURE` / `WAITING` / `STOPPED`
- **flowInstanceId vs executeId**: 运维工具用 flowInstanceId，flow 工具用 executeId，不可混用
