---
name: te-dataops
version: 2.0.0
description: "TE 数据开发运维：数据仓库管理、任务流编排、IDE查询、数据集成、运维操作与补数管理"
metadata:
  requires:
    bins: ["te-cli"]
  cliHelp: "te-cli dataops_repo --help, te-cli dataops_datatable --help, te-cli dataops_flow --help, te-cli dataops_ide --help, te-cli dataops_integration --help, te-cli dataops_operations --help"
---

# te-dataops

> **前置条件:** 使用本技能前，请先阅读 [`te-shared/SKILL.md`](../te-shared/SKILL.md)，了解认证、全局参数和安全约束。

TE 数据开发运维域提供数据仓库管理、任务流编排、IDE SQL 查询、数据集成、运维操作与补数管理等能力，包含以下子命令：

| 子命令 | 职责 | 对应场景化 Skill |
|--------|------|-----------------|
| `dataops_repo` | 空间与资源管理 | — |
| `dataops_datatable` | 数据表与视图管理 | `dataops-table` |
| `dataops_flow` | 任务流创建与编排 | `dataops-flow-create` |
| `dataops_flow` | 任务流执行与监控 | `dataops-flow-monitor` |
| `dataops_ide` | 数据探索与 SQL 查询 | `dataops-query` |
| `dataops_integration` | 数据源与数据集成 | `dataops-integration` |
| `dataops_operations` | 运维操作与补数管理 | `dataops-operations` |

---

## 核心概念与规则

在使用前务必理解以下关键概念，否则极易出错。

### ID 体系（不可混用）

| ID | 来源 | 使用范围 |
|----|------|---------|
| **executeId** | `dataops_flow +execute_flow` 返回 / `+list_flow_instances` 获取 | `dataops_flow` 的所有执行相关命令 |
| **flowInstanceId** | `dataops_operations +search_flow_instances` 获取 | `dataops_operations` 的所有运维命令 |

> **executeId 和 flowInstanceId 不互通，不可混用。** `dataops_flow` 工具用 executeId，`dataops_operations` 工具用 flowInstanceId。

### 环境与默认值

| 场景 | 默认环境 | 说明 |
|------|---------|------|
| 大多数 flow/ide/datatable 命令 | `DEV` | 开发环境 |
| `+list_flow_instances` 实例列表 | **PROD** | 运维场景默认查生产 |
| `dataops_operations` 所有命令 | **PROD** | 运维视角关注生产 |

### Schema 命名规则

- DEV 环境: `ws_${spaceCode}_dev`
- PROD 环境: `ws_${spaceCode}_product`

### 职责边界

| 操作 | 正确工具 | 禁止使用 |
|------|---------|---------|
| 执行 SELECT 查询 | `dataops_ide` | — |
| 创建/修改/删除数据表(DDL) | `dataops_datatable` | `dataops_ide` |
| 在外部数据源执行 DDL | `dataops_integration +execute_sql` | — |

### 任务流生命周期

```
创建任务流 → 创建任务节点 → 保存任务定义 → 配置依赖 → 配置调度 → DEV 测试 → 发布到 PROD
```

### CRON 格式（6 字段）

`秒 分 时 日 月 周` — 注意比标准 5 字段多一个"秒"。
- `0 0 2 * * ?` — 每天凌晨 2 点
- `0 0 */4 * * ?` — 每 4 小时
- `0 30 8 * * 1-5` — 工作日 8:30

### 预置仓 vs 非预置仓

- **预置仓 (te_etl)**: `datasourceId` 为 `te_etl@TASK_ENGINE_TRINO`，database 字段为空，需要 `gatewayConfig`
- **非预置仓**: `datasourceId` 为具体数据源 ID，database 字段必填

---

## 场景路由

根据用户意图选择合适的场景化 Skill，以获取完整的分步工作流指引。

| 用户意图 | 触发 Skill | 关键词 |
|---------|-----------|--------|
| 创建任务流、添加节点、配置调度、发布 | `dataops-flow-create` | 创建任务流、新建工作流、配置调度、添加任务节点、发布、cron、定时执行 |
| 查看执行状态、排查失败、查看日志 | `dataops-flow-monitor` | 执行任务流、运行实例、监控、日志、停止、DAG、排错 |
| 创建数据源、配置同步方案、执行同步 | `dataops-integration` | 数据源、同步、integration、sync、字段映射、数据接入、MySQL、ClickHouse |
| 运维实例管理、重跑失败、补数操作 | `dataops-operations` | 运维、补数、重跑、告警、operations、backfill |
| 浏览元数据、搜索表、执行 SQL 查询 | `dataops-query` | 查询、SQL、数据探索、搜索表、查看表结构、IDE、catalog、select |
| 建表、创建视图、批量创建关联视图 | `dataops-table` | 建表、创建表、视图、数据字典、关联视图、linkview、DDL |

---

## 1. 空间与资源管理

```bash
# 获取空间列表（入口命令，获取 spaceCode）
te-cli dataops_repo +list_spaces

# 获取仓库列表
te-cli dataops_repo +list_repos --spaceCode "${spaceCode}"

# 浏览仓库结构
te-cli dataops_repo +list_catalogs --spaceCode "${spaceCode}" --repoCode "te_etl"
te-cli dataops_repo +list_schemas --spaceCode "${spaceCode}" --repoCode "te_etl" --catalog "hive"

# 查看空间成员
te-cli dataops_repo +list_space_members --spaceCode "${spaceCode}"

# 添加成员
te-cli dataops_repo +add_space_member --spaceCode "${spaceCode}" --openId "${openId}" --confirmed true

# 查看空间参数
te-cli dataops_repo +list_support_params --spaceCode "${spaceCode}"

# 预览参数表达式
te-cli dataops_repo +preview_param_expression --spaceCode "${spaceCode}" --expression '${ws_run_date}'
```

### 命令速查

| 命令 | 用途 | 关键 Flags |
|------|------|-----------|
| `+list_spaces` | 空间列表 | — |
| `+list_repos` | 仓库列表 | `--spaceCode` |
| `+list_catalogs` | catalog 列表 | `--spaceCode` `--repoCode` |
| `+list_schemas` | schema 列表 | `--spaceCode` `--repoCode` `--catalog` |
| `+list_space_members` | 空间成员 | `--spaceCode` |
| `+add_space_member` | 添加成员 | `--spaceCode` `--openId` `--confirmed` |
| `+list_support_params` | 空间参数 | `--spaceCode` |
| `+preview_param_expression` | 预览参数 | `--spaceCode` `--expression` |
| `+list_param_used_flows` | 参数引用的任务流 | `--spaceCode` `--paramKey` |

---

## 2. 数据表与视图管理

> 详细分步工作流见 `dataops-table` Skill。

### 典型流程：搜索 → 查看 → 创建

```bash
# 在数据字典中搜索表
te-cli dataops_datatable +dict_search_tables --spaceCode "${spaceCode}" --search "user" --maxResults 20

# 获取表详情（字段定义、DDL、数据血缘）
te-cli dataops_datatable +get_table_detail --spaceCode "${spaceCode}" --tableName "dwd_user_info"

# 分页查询已注册的表列表
te-cli dataops_datatable +list_tables_by_page --spaceCode "${spaceCode}" --search "user" --pageNum 1 --pageSize 20

# 按仓库维度获取层级结构
te-cli dataops_datatable +struct_by_repo --spaceCode "${spaceCode}"

# 创建物理表（DEV 环境，DDL 遵循 Trino 规范）
te-cli dataops_datatable +create_table --spaceCode "${spaceCode}" \
  --ddl "CREATE TABLE dwd_user_info (user_id VARCHAR, user_name VARCHAR, age INTEGER) WITH (format = 'ORC')" \
  --repoCode "te_etl" --catalog "hive" --schema "ws_default_dev" --confirmed true

# 创建 PROD 环境（同 DDL，schema 改为 product 库）
te-cli dataops_datatable +create_table --spaceCode "${spaceCode}" \
  --ddl "CREATE TABLE dwd_user_info (user_id VARCHAR, user_name VARCHAR, age INTEGER) WITH (format = 'ORC')" \
  --repoCode "te_etl" --catalog "hive" --schema "ws_default_product" --confirmed true

# 创建视图
te-cli dataops_datatable +create_view --spaceCode "${spaceCode}" \
  --ddl "CREATE VIEW v_user_info AS SELECT user_id, user_name FROM hive.ws_default_dev.dwd_user_info" \
  --repoCode "te_etl" --catalog "hive" --schema "ws_default_dev" --confirmed true

# 批量创建直连视图（异步）
te-cli dataops_datatable +batch_create --spaceCode "${spaceCode}" \
  --srcRepoCode "te_etl" --srcCatalog "hive" --srcSchema "ws_default_hidden" \
  --processType 2 --batchCreationMode 1 --owner "${ownerOpenId}" \
  --viewInfos '[{"viewName":"v_orders","srcTableName":"ta_event_123","srcTableType":"TABLE"}]' \
  --confirmed true

# 轮询批量创建状态（建议 3-5 秒间隔）
te-cli dataops_datatable +linkview_get_batch_status --spaceCode "${spaceCode}" --batchId "${batchId}"
```

### 命令速查

| 命令 | 用途 | 关键 Flags |
|------|------|-----------|
| `+dict_search_tables` | 数据字典搜索 | `--spaceCode` `--search` `--maxResults` |
| `+get_table_detail` | 表详情 | `--spaceCode` `--tableName` |
| `+list_tables_by_page` | 分页列表 | `--spaceCode` `--search` `--pageNum` `--pageSize` |
| `+struct_by_repo` | 按仓库层级 | `--spaceCode` `--search` |
| `+list_system_tables` | 系统表列表 | `--spaceCode` `--projectId`/`--projectName` `--pageNum` `--pageSize` |
| `+create_table` | 创建物理表 | `--spaceCode` `--ddl` `--repoCode` `--catalog` `--schema` `--confirmed` |
| `+create_view` | 创建视图 | `--spaceCode` `--ddl` `--repoCode` `--catalog` `--schema` `--confirmed` |
| `+batch_create` | 批量创建视图 | `--spaceCode` `--srcRepoCode` `--srcCatalog` `--srcSchema` `--processType` `--batchCreationMode` `--owner` `--viewInfos` `--confirmed` |
| `+linkview_list_source_tables` | 可用源表 | `--spaceCode` `--srcRepoCode` `--srcCatalog` `--srcSchema` |
| `+linkview_get_batch_status` | 批量状态 | `--spaceCode` `--batchId` |
| `+list_batches` | 历史批量记录 | `--spaceCode` `--status` |

### 参数说明

- **schema 命名**: DEV 环境用 `ws_${spaceCode}_dev`，PROD 环境用 `ws_${spaceCode}_product`
- **processType**: `1`=仅 DEV | `2`=DEV+PROD
- **batchCreationMode**: `1`=全量同步 | `2`=失败重试
- **表名规则**: `^[a-z][0-9a-z_]{0,127}$`
- **DDL 规范**: 遵循 Trino DDL 语法

---

## 3. 任务流编排

任务流编排分两个场景化 Skill：**创建配置**和**执行监控**。

### 3a. 创建与配置

> 详细 8 步完整流程见 `dataops-flow-create` Skill。

**生命周期：创建 → 配置节点 → 配置调度 → DEV 测试 → 发布 PROD**

```bash
# 创建任务流（返回 flowCode）
te-cli dataops_flow +create_flow --spaceCode "${spaceCode}" \
  --flowName "每日ETL流程" --remark "处理用户数据" --confirmed true

# 创建 SQL 任务节点（返回 taskCode）
te-cli dataops_flow +create_task --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskName "处理用户数据" --taskType "TRINO_SQL" --confirmed true

# 创建带前置依赖的任务
te-cli dataops_flow +create_task --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskName "导出结果" --taskType "TRINO_SQL" \
  --preTaskCode "${upstreamTaskCode}" --confirmed true

# 保存任务定义（SQL 任务）
te-cli dataops_flow +save_task_definition --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskCode "${taskCode}" \
  --taskContentJson '{"sql":"SELECT * FROM dwd_user","repoCode":"te_etl","catalog":"hive","schema":"ws_default_dev"}' \
  --failRetryTimes 3 --failRetryInterval 30 --timeout 60 --confirmed true

# 校验 SQL（推荐在保存前执行）
te-cli dataops_flow +validate_task_sql --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskCode "${taskCode}" \
  --sql "SELECT * FROM dwd_user" --repoCode "te_etl" \
  --catalog "hive" --schema "ws_default_dev"

# 添加任务依赖关系（DAG 连线）
te-cli dataops_flow +add_task_relation --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --preTaskCode "${upstreamTaskCode}" --taskCode "${downstreamTaskCode}" \
  --confirmed true

# 配置定时调度（CRON 6 字段: 秒 分 时 日 月 周）
te-cli dataops_flow +save_schedule_config --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --scheduled 1 --scheduleType "CRON" \
  --cron "0 0 2 * * ?" --confirmed true

# DEV 环境手动测试
te-cli dataops_flow +execute_flow --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --env "DEV" --confirmed true

# 发布到生产（PROD 调度立即生效，不会中断运行中的实例）
te-cli dataops_flow +release_flow --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --confirmed true
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

### 3b. 执行与监控

> 详细排查工作流见 `dataops-flow-monitor` Skill。

```bash
# 搜索任务流（获取 flowCode）
te-cli dataops_flow +list_flows --spaceCode "${spaceCode}" --keyword "etl"

# 查看任务流基本信息
te-cli dataops_flow +get_flow_detail --spaceCode "${spaceCode}" --flowCode "${flowCode}"

# 查看定义态 DAG（静态结构）
te-cli dataops_flow +get_flow_dag --spaceCode "${spaceCode}" --flowCode "${flowCode}"

# 查看调度配置
te-cli dataops_flow +get_schedule_config --spaceCode "${spaceCode}" --flowCode "${flowCode}"

# 查看执行实例列表（默认 PROD 环境，按时间倒序）
te-cli dataops_flow +list_flow_instances --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --env "PROD" --size 30

# 查看运行态 DAG（含各节点执行状态）
te-cli dataops_flow +get_execute_dag --spaceCode "${spaceCode}" --executeId "${executeId}"

# 查看执行记录详情
te-cli dataops_flow +get_execute_record --spaceCode "${spaceCode}" --executeId "${executeId}"

# 查看任务日志（从 DAG 获取 bsTaskInstanceId 和 taskCode）
te-cli dataops_flow +get_task_instance_log --bsTaskInstanceId "${instanceId}" \
  --taskCode "${taskCode}" --limit 100

# 查看任务参数
te-cli dataops_flow +get_task_params --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskCode "${taskCode}"

# 手动触发执行
te-cli dataops_flow +execute_flow --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --env "DEV" --confirmed true

# 停止执行（不可撤销）
te-cli dataops_flow +stop_flow --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --executeId "${executeId}" --confirmed true

# 更新任务流信息
te-cli dataops_flow +update_flow --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --flowName "新名称" --remark "新备注" --confirmed true
```

### 命令速查（任务流全量）

| 命令 | 用途 | 关键 Flags |
|------|------|-----------|
| `+create_flow` | 创建任务流 | `--spaceCode` `--flowName` `--remark` `--confirmed` |
| `+create_task` | 创建任务节点 | `--spaceCode` `--flowCode` `--taskName` `--taskType` `--syncId` `--preTaskCode` `--confirmed` |
| `+save_task_definition` | 保存任务定义 | `--spaceCode` `--flowCode` `--taskCode` `--taskContentJson` `--failRetryTimes` `--failRetryInterval` `--timeout` `--confirmed` |
| `+validate_task_sql` | 校验 SQL | `--spaceCode` `--flowCode` `--taskCode` `--sql` `--repoCode` `--catalog` `--schema` |
| `+add_task_relation` | 添加依赖 | `--spaceCode` `--flowCode` `--preTaskCode` `--taskCode` `--confirmed` |
| `+save_schedule_config` | 配置调度 | `--spaceCode` `--flowCode` `--scheduled` `--scheduleType` `--cron` `--confirmed` |
| `+get_schedule_config` | 查看调度 | `--spaceCode` `--flowCode` `--env` |
| `+list_flows` | 搜索任务流 | `--spaceCode` `--keyword` |
| `+get_flow_detail` | 任务流信息 | `--spaceCode` `--flowCode` `--env` |
| `+get_flow_dag` | 定义态 DAG | `--spaceCode` `--flowCode` `--env` |
| `+update_flow` | 更新任务流 | `--spaceCode` `--flowCode` `--flowName` `--remark` `--confirmed` |
| `+execute_flow` | 手动执行 | `--spaceCode` `--flowCode` `--env` `--confirmed` |
| `+stop_flow` | 停止执行 | `--spaceCode` `--flowCode` `--executeId` `--confirmed` |
| `+release_flow` | 发布到生产 | `--spaceCode` `--flowCode` `--confirmed` |
| `+list_flow_instances` | 实例列表 | `--spaceCode` `--flowCode` `--env` `--size` |
| `+get_execute_record` | 执行记录 | `--spaceCode` `--executeId` |
| `+get_execute_dag` | 运行态 DAG | `--spaceCode` `--executeId` |
| `+get_task_instance_log` | 任务日志 | `--bsTaskInstanceId` `--taskCode` `--startOffset` `--limit` |
| `+get_task_params` | 任务参数 | `--spaceCode` `--flowCode` `--taskCode` `--env` |

### 参数说明

- **参数引用**: 任务中通过 `${paramKey}` 引用空间参数（如 `${ws_run_date}`）
- **env**: `DEV`（开发，默认）| `PROD`（生产）
- **任务状态**: `success` / `failure` / `running` / `waiting`
- **DAG 区别**: `+get_flow_dag` 返回静态定义结构，`+get_execute_dag` 返回含执行状态的运行态结构
- **taskContentJson 格式**（因 taskType 而异）:
  - TRINO_SQL: `{"sql":"SELECT ...","repoCode":"xxx","catalog":"hive","schema":"db"}`
  - SHELL: `{"script":"#!/bin/bash\n..."}`

---

## 4. IDE SQL 查询

> 详细分步工作流见 `dataops-query` Skill。

> **IDE 只允许查询操作（SELECT），禁止创建/修改/删除数据表。表 DDL 操作请用 `dataops_datatable`。**

### 典型流程：浏览元数据 → 搜索表 → 执行查询

```bash
# 列出可用仓库
te-cli dataops_ide +list_repos --spaceCode "${spaceCode}"

# 列出仓库下所有 catalog 及其 schema
te-cli dataops_ide +list_catalogs --spaceCode "${spaceCode}" --connType "SPACE" --repoCode "${repoCode}"

# 列出 schema 下的表/视图
te-cli dataops_ide +list_tables --spaceCode "${spaceCode}" --connType "SPACE" --repoCode "${repoCode}" \
  --catalog "${catalog}" --schema "${schema}" --isView false --pageNum 1 --pageSize 100

# 获取表的详细元数据（列定义、DDL、分区、行数）
te-cli dataops_ide +get_table_detail --spaceCode "${spaceCode}" --connType "SPACE" --repoCode "${repoCode}" \
  --catalog "${catalog}" --schema "${schema}" --tableName "${tableName}" \
  --engineType "TASK_ENGINE_TRINO" --isView false

# 获取 schema 统计信息
te-cli dataops_ide +get_schema_info --spaceCode "${spaceCode}" --connType "SPACE" --repoCode "${repoCode}" \
  --catalog "${catalog}" --schema "${schema}"

# 跨 catalog/schema 模糊搜索表
te-cli dataops_ide +search_tables --spaceCode "${spaceCode}" --connType "SPACE" --repoCode "${repoCode}" \
  --searchKey "user" --size 20

# 跨表模糊搜索列名
te-cli dataops_ide +search_columns --spaceCode "${spaceCode}" --repoCode "${repoCode}" \
  --searchKey "user_id" --tables '[{"catalog":"hive","isView":false,"schema":"ws_default_dev","tableName":"dwd_user"}]' \
  --engineType "TASK_ENGINE_TRINO" --pageNum 1 --pageSize 100

# 根据表名和列名生成 SELECT SQL
te-cli dataops_ide +generate_sql --spaceCode "${spaceCode}" --repoCode "${repoCode}" \
  --catalog "hive" --schema "ws_default_dev" --tableName "dwd_user" \
  --engineType "TASK_ENGINE_TRINO" --selectColumns '["user_id","user_name","age"]'
```

### SQL 异步查询流程（3 步：执行 → 轮询 → 取结果）

```bash
# Step 1: 异步执行 SQL（返回 requestId）
te-cli dataops_ide +execute_sql --spaceCode "${spaceCode}" --repoCode "te_etl" \
  --sql "SELECT * FROM hive.ws_default_dev.dwd_user LIMIT 10" \
  --engineType "TASK_ENGINE_TRINO" --confirmed true

# Step 2: 查询执行进度（建议 2-5 秒轮询）
# state: QUEUED / RUNNING / FINISHED / FAILED / CANCELLED
te-cli dataops_ide +get_query_progress --requestId "${requestId}"

# Step 3: state=FINISHED 后获取结果
te-cli dataops_ide +get_query_result --spaceCode "${spaceCode}" --connType "SPACE" \
  --repoCode "te_etl" --recordId "${recordId}"

# （可选）取消正在执行的查询
te-cli dataops_ide +cancel_query --requestId "${requestId}" --confirmed true
```

### 命令速查

| 命令 | 用途 | 关键 Flags |
|------|------|-----------|
| `+list_repos` | 列出仓库 | `--spaceCode` |
| `+list_catalogs` | 列出 catalog/schema | `--spaceCode` `--connType` `--repoCode` |
| `+list_tables` | 列出表 | `--spaceCode` `--connType` `--repoCode` `--catalog` `--schema` `--isView` `--pageNum` `--pageSize` |
| `+get_table_detail` | 表元数据 | `--spaceCode` `--connType` `--repoCode` `--catalog` `--schema` `--tableName` `--engineType` `--isView` |
| `+get_schema_info` | schema 统计 | `--spaceCode` `--connType` `--repoCode` `--catalog` `--schema` |
| `+search_tables` | 模糊搜索表 | `--spaceCode` `--connType` `--repoCode` `--searchKey` `--size` |
| `+search_columns` | 模糊搜索列 | `--spaceCode` `--repoCode` `--searchKey` `--tables` (JSON) `--engineType` `--pageNum` `--pageSize` |
| `+generate_sql` | 生成 SELECT | `--spaceCode` `--repoCode` `--catalog` `--schema` `--tableName` `--engineType` `--selectColumns` (JSON) |
| `+execute_sql` | 执行 SQL | `--spaceCode` `--repoCode` `--sql` `--engineType` `--confirmed` |
| `+get_query_progress` | 查询进度 | `--requestId` |
| `+get_query_result` | 获取结果 | `--spaceCode` `--connType` `--repoCode` `--recordId` |
| `+cancel_query` | 取消查询 | `--requestId` `--confirmed` |

### 参数说明

- **connType**: `SPACE`（数据仓库日常查询，默认）| `ETL`（ETL 引擎）| `APP`（应用仓对外服务）
- **engineType**: `TASK_ENGINE_TRINO`（默认，交互式查询）| `TASK_ENGINE_STARROCKS`（实时分析、高并发）
- **isView**: `false` 查物理表 | `true` 查视图

---

## 5. 数据集成

> 详细分步工作流和 JSON 配置模板见 `dataops-integration` Skill。

> **同步方案创建涉及复杂 JSON 配置（sourceConfig/sinkConfig/channelConfig/fieldsMapping），务必参考 `dataops-integration` Skill 中的完整模板。**

### 典型流程：创建数据源 → 浏览源表 → 创建同步方案 → 执行

```bash
# 查看支持的数据源组件类型
te-cli dataops_integration +list_datasource_components

# 测试数据源连接
te-cli dataops_integration +test_datasource_connect --spaceCode "${spaceCode}" \
  --componentName "MySQL" \
  --configValue '{"host":"localhost","port":3306,"username":"root","password":"xxx","database":"test"}'

# 创建数据源
te-cli dataops_integration +add_datasource --spaceCode "${spaceCode}" \
  --componentName "MySQL" --dataSourceName "生产MySQL" \
  --sharedConfig true \
  --envJsonList '[{"host":"localhost","port":3306,"username":"root","password":"xxx"}]' \
  --confirmed true

# 查看空间所有数据源
te-cli dataops_integration +list_space_datasources --spaceCode "${spaceCode}"

# 查看可用于同步的数据源（按 source/sink 分类）
te-cli dataops_integration +list_sync_datasources --spaceCode "${spaceCode}"

# 浏览源端数据库和表
te-cli dataops_integration +list_datasource_databases --spaceCode "${spaceCode}" \
  --datasourceId "${datasourceId}"
te-cli dataops_integration +list_datasource_tables --spaceCode "${spaceCode}" \
  --datasourceId "${datasourceId}" --database "test"

# 获取表结构（列定义、分区）
te-cli dataops_integration +get_table_structure --spaceCode "${spaceCode}" \
  --datasourceId "${datasourceId}" --database "test" --tablePath "users"

# 创建同步方案（需要完整 JSON 配置，详见 dataops-integration Skill）
te-cli dataops_integration +add_sync_solution --spaceCode "${spaceCode}" \
  --syncName "MySQL到预置仓同步" \
  --srcComponent "MySQL" --srcDatasourceId "${mysqlDatasourceId}" \
  --sinkComponent "hive" --sinkDatasourceId "te_etl@TASK_ENGINE_TRINO" \
  --sourceConfig '...' --sinkConfig '...' --channelConfig '...' --fieldsMapping '...' \
  --confirmed true

# 执行同步方案
te-cli dataops_integration +exec_sync_solution --spaceCode "${spaceCode}" \
  --syncId "${syncId}" --confirmed true

# 查看执行历史
te-cli dataops_integration +list_sync_exec_histories --spaceCode "${spaceCode}" \
  --syncId "${syncId}" --limit 20

# 查看执行详情
te-cli dataops_integration +get_sync_exec_info --spaceCode "${spaceCode}" \
  --syncId "${syncId}" --taskId "${taskId}"

# 停止同步执行
te-cli dataops_integration +stop_sync_solution --spaceCode "${spaceCode}" \
  --syncId "${syncId}" --taskId "${taskId}" --confirmed true
```

### JSON 配置要点

创建同步方案时，以下 JSON 配置必须严格按模板生成：

| 配置项 | 说明 |
|--------|------|
| **sourceConfig** | 源端连接信息（组件、数据源ID、数据库、表） |
| **sinkConfig** | 目标端配置（预置仓 database 为空，非预置仓 database 必填） |
| **channelConfig** | 通道配置（涉及预置仓时必须包含 gatewayConfig） |
| **fieldsMapping** | 双列字段映射（每个字段必须包含 manual/partitionKey/primaryKey/shardingKey/sortingKey/upsertKey） |

> 完整 JSON 模板和 MongoDB 等组件条件必填参数详见 `dataops-integration` Skill。

### 命令速查

| 命令 | 用途 | 关键 Flags |
|------|------|-----------|
| `+list_datasource_components` | 支持的组件 | — |
| `+list_space_datasources` | 空间数据源 | `--spaceCode` `--componentName` `--dataSourceName` |
| `+add_datasource` | 创建数据源 | `--spaceCode` `--componentName` `--dataSourceName` `--sharedConfig` `--envJsonList` `--confirmed` |
| `+test_datasource_connect` | 测试连接 | `--spaceCode` `--componentName` `--configValue` |
| `+modify_datasource` | 修改数据源 | `--spaceCode` `--datasourceId` `--confirmed` |
| `+online_datasource` | 上线数据源 | `--spaceCode` `--datasourceId` `--confirmed` |
| `+list_datasource_databases` | 列出数据库 | `--spaceCode` `--datasourceId` |
| `+list_datasource_tables` | 列出表 | `--spaceCode` `--datasourceId` `--database` |
| `+get_table_structure` | 表结构 | `--spaceCode` `--datasourceId` `--database` `--tablePath` |
| `+list_sync_datasources` | 同步数据源 | `--spaceCode` |
| `+list_sync_solutions` | 同步方案列表 | `--spaceCode` |
| `+get_sync_detail` | 同步方案详情 | `--spaceCode` `--syncId` |
| `+add_sync_solution` | 创建同步方案 | `--spaceCode` `--syncName` `--srcComponent` `--srcDatasourceId` `--sinkComponent` `--sinkDatasourceId` `--sourceConfig` `--sinkConfig` `--channelConfig` `--fieldsMapping` `--confirmed` |
| `+save_sync_solution` | 更新同步方案 | `--spaceCode` `--syncId` `--confirmed` |
| `+exec_sync_solution` | 执行同步 | `--spaceCode` `--syncId` `--confirmed` |
| `+list_sync_exec_histories` | 执行历史 | `--spaceCode` `--syncId` `--execType` `--limit` |
| `+get_sync_exec_info` | 执行详情 | `--spaceCode` `--syncId` `--taskId` |
| `+stop_sync_solution` | 停止同步 | `--spaceCode` `--syncId` `--taskId` `--confirmed` |
| `+execute_sql` | 外部DDL执行 | `--spaceCode` `--datasourceId` `--database` `--sql` `--confirmed` |
| `+validate_sql` | 校验SQL | `--spaceCode` `--datasourceId` `--database` `--sql` |

---

## 6. 运维操作与补数管理

> 详细分步工作流见 `dataops-operations` Skill。

> **运维命令使用 flowInstanceId（非 executeId），通过 `+search_flow_instances` 获取。**

### 典型流程 A：运维实例查询与操作

```bash
# 搜索任务流实例（支持按状态/负责人/时间筛选）
te-cli dataops_operations +search_flow_instances --spaceCode "${spaceCode}" \
  --pageNum 1 --pageSize 20

# 查看实例下的所有任务节点及执行状态
te-cli dataops_operations +list_flow_task_instances --spaceCode "${spaceCode}" \
  --flowInstanceId "${flowInstanceId}"

# 获取任务节点定义详情
te-cli dataops_operations +get_task_definition --spaceCode "${spaceCode}" \
  --flowInstanceId "${flowInstanceId}" --taskCode "${taskCode}"

# 重跑失败的任务流实例（从失败节点继续）
te-cli dataops_operations +rerun_flow_instance --spaceCode "${spaceCode}" \
  --flowInstanceId "${flowInstanceId}" --confirmed true

# 停止正在运行的实例
te-cli dataops_operations +stop_flow_instance --spaceCode "${spaceCode}" \
  --flowInstanceId "${flowInstanceId}" --confirmed true

# 控制实例运行状态（暂停/强制暂停/恢复）
te-cli dataops_operations +control_flow_instance --spaceCode "${spaceCode}" \
  --flowInstanceId "${flowInstanceId}" --action "PAUSE" --confirmed true
```

### 典型流程 B：补数任务管理

补数任务用于批量重跑历史数据。

```bash
# 查询补数任务列表
te-cli dataops_operations +list_flow_jobs --spaceCode "${spaceCode}" \
  --pageNum 1 --pageSize 20

# 获取补数任务详情（配置、日期范围、并发设置）
te-cli dataops_operations +get_flow_job_detail --spaceCode "${spaceCode}" \
  --jobId "${jobId}"

# 获取补数任务的执行计划列表（每个日期的状态）
te-cli dataops_operations +list_flow_job_plans --spaceCode "${spaceCode}" \
  --jobId "${jobId}"

# 停止正在执行的补数任务
te-cli dataops_operations +stop_flow_job --spaceCode "${spaceCode}" \
  --jobId "${jobId}" --confirmed true
```

### 典型流程 C：任务节点实例查询

```bash
# 搜索任务节点实例（支持按状态/类型/时间筛选）
te-cli dataops_operations +search_task_instances --spaceCode "${spaceCode}" \
  --pageNum 1 --pageSize 20
```

### 命令速查

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

### 参数说明

- **action**: `PAUSE`（暂停）| `FORCE_PAUSE`（强制暂停）| `RESUME`（恢复）
- **实例状态**: `RUNNING` / `SUCCESS` / `FAILURE` / `WAITING` / `STOPPED`
- **flowInstanceId vs executeId**: 运维工具用 flowInstanceId，flow 工具用 executeId，**不可混用**

---

## 参考文档

详细的命令 Flags 和用法请查看 [`references/`](./references/) 目录下的各命令文档。
