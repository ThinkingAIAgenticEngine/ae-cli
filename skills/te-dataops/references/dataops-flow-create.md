---
name: dataops-flow-create
version: 1.0.0
description: "任务流创建与配置：创建任务流、添加任务节点、配置依赖关系、保存任务定义、配置调度、测试、发布到生产。触发关键词：创建任务流、新建工作流、配置调度、添加任务节点、发布、cron、定时执行。"
metadata:
  requires:
    bins: ["te-cli"]
---

# DataOps 任务流创建与配置

> **前置条件:** 阅读 [`te-dataops/SKILL.md`](../SKILL.md) 了解通用规则。

使用 `dataops_flow` 子命令管理任务流生命周期。

**任务流生命周期：创建 → 配置节点 → 配置调度 → DEV 环境测试 → 发布到 PROD → 上线调度**

---

## 完整任务流创建流程

按顺序执行以下步骤，从零创建一个可上线的任务流。

### Step 1: 创建任务流

```bash
te-cli dataops_flow +create_flow --spaceCode "${spaceCode}" \
  --flowName "每日ETL流程" --remark "处理用户数据" --confirmed true
# 返回 flowCode，后续步骤都需要
```

### Step 2: 创建任务节点（可多次调用）

```bash
# 创建 SQL 任务
te-cli dataops_flow +create_task --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskName "处理用户数据" --taskType "TRINO_SQL" --confirmed true
# 返回 taskCode

# 创建带前置依赖的任务
te-cli dataops_flow +create_task --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskName "导出结果" --taskType "TRINO_SQL" \
  --preTaskCode "${upstreamTaskCode}" --confirmed true
```

**任务节点类型：**

| 类型 | 说明 | 典型用途 |
|------|------|---------|
| TRINO_SQL | Trino SQL 查询 | 数据加工、ETL |
| SHELL | Shell 脚本 | 系统命令、文件操作 |
| FLOW_CHECK | 流程检查 | 检查上游任务流是否完成 |
| TASK_CHECK | 任务检查 | 检查指定任务是否完成 |
| OFFLINE_SYNC | 离线同步 | 集成方案数据同步（需 syncId） |
| APP_SYNC | 应用同步 | 应用表数据同步（需 syncId） |
| PLACE_HOLDER | 占位符 | 流程控制、逻辑分组 |

### Step 3: 保存任务定义（配置 SQL/Shell 内容）

```bash
# SQL 任务
te-cli dataops_flow +save_task_definition --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskCode "${taskCode}" \
  --taskContentJson '{"sql":"SELECT * FROM dwd_user","repoCode":"te_etl","catalog":"hive","schema":"ws_default_dev"}' \
  --failRetryTimes 3 --failRetryInterval 30 --timeout 60 --confirmed true

# Shell 任务
te-cli dataops_flow +save_task_definition --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskCode "${taskCode}" \
  --taskContentJson '{"script":"#!/bin/bash\necho hello"}' \
  --confirmed true
```

### Step 4: 校验 SQL（推荐，仅 TRINO_SQL 类型）

```bash
te-cli dataops_flow +validate_task_sql --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskCode "${taskCode}" \
  --sql "SELECT * FROM dwd_user" --repoCode "te_etl" \
  --catalog "hive" --schema "ws_default_dev"
# 检查 valid=true，否则查看 message 和 errorPosition
```

### Step 5: 添加任务依赖关系（DAG 连线）

```bash
te-cli dataops_flow +add_task_relation --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --preTaskCode "${upstreamTaskCode}" --taskCode "${downstreamTaskCode}" \
  --confirmed true
```

### Step 6: 配置调度

```bash
# CRON 表达式定时执行
te-cli dataops_flow +save_schedule_config --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --scheduled 1 --scheduleType "CRON" \
  --cron "0 0 2 * * ?" --confirmed true
# 示例：0 0 2 * * ? = 每天凌晨2点
```

**CRON 格式**（6 字段）：`秒 分 时 日 月 周`
- `0 0 */4 * * ?` — 每 4 小时
- `0 30 8 * * 1-5` — 工作日 8:30

### Step 7: DEV 环境测试

```bash
# 手动触发执行
te-cli dataops_flow +execute_flow --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --env "DEV" --confirmed true

# 查看执行状态
te-cli dataops_flow +get_execute_dag --spaceCode "${spaceCode}" --executeId "${executeId}"

# 查看任务日志（从 DAG 获取 bsTaskInstanceId 和 taskCode）
te-cli dataops_flow +get_task_instance_log --bsTaskInstanceId "${instanceId}" --taskCode "${taskCode}"

# 根据日志调整配置后，重复测试
```

### Step 8: 发布到生产

```bash
te-cli dataops_flow +release_flow --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --confirmed true
# 发布后 PROD 调度立即生效，不会中断运行中的实例
```

---

## 命令速查

| 命令 | 用途 | 关键 Flags |
|------|------|-----------|
| `+create_flow` | 创建任务流 | `--spaceCode` `--flowName` `--remark` `--confirmed` |
| `+create_task` | 创建任务节点 | `--spaceCode` `--flowCode` `--taskName` `--taskType` `--syncId` `--preTaskCode` `--confirmed` |
| `+save_task_definition` | 保存任务定义 | `--spaceCode` `--flowCode` `--taskCode` `--taskContentJson` `--failRetryTimes` `--failRetryInterval` `--timeout` `--confirmed` |
| `+validate_task_sql` | 校验 SQL | `--spaceCode` `--flowCode` `--taskCode` `--sql` `--repoCode` `--catalog` `--schema` |
| `+add_task_relation` | 添加依赖 | `--spaceCode` `--flowCode` `--preTaskCode` `--taskCode` `--confirmed` |
| `+save_schedule_config` | 配置调度 | `--spaceCode` `--flowCode` `--scheduled` `--scheduleType` `--cron` `--confirmed` |
| `+get_flow_dag` | 查看 DAG 结构 | `--spaceCode` `--flowCode` `--env` |
| `+get_task_params` | 查看任务参数 | `--spaceCode` `--flowCode` `--taskCode` `--env` |
| `+execute_flow` | 手动执行 | `--spaceCode` `--flowCode` `--env` `--confirmed` |
| `+get_execute_dag` | 查看运行态 DAG | `--spaceCode` `--executeId` |
| `+get_task_instance_log` | 查看任务日志 | `--bsTaskInstanceId` `--taskCode` `--startOffset` `--limit` |
| `+release_flow` | 发布到生产 | `--spaceCode` `--flowCode` `--confirmed` |

## 参数说明

- **参数引用**: 任务中通过 `${paramKey}` 引用空间参数（如 `${ws_run_date}`）
- **环境**: `DEV`（默认）| `PROD`
- **taskContentJson**: JSON 字符串，格式因 taskType 而异：
  - TRINO_SQL: `{"sql":"SELECT ...","repoCode":"xxx","catalog":"hive","schema":"db"}`
  - SHELL: `{"script":"#!/bin/bash\n..."}`

## 注意事项

1. **flowCode 获取**: 通过 `+list_flows` 获取（见 `dataops-flow-monitor` Skill）
2. **taskCode 获取**: 通过 `+create_task` 返回或 `+get_flow_dag` 查询
3. **发布影响**: 将 DEV 所有变更同步到 PROD，PROD 调度立即生效
4. **SQL 校验**: 保存 TRINO_SQL 任务前建议先校验
5. **不能创建循环依赖**
