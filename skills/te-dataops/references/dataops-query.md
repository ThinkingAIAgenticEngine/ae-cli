---
name: dataops-query
version: 1.0.0
description: "数据探索与 SQL 查询：浏览数仓元数据、搜索表、执行 SQL 查询、获取结果。触发关键词：查询、SQL、数据探索、搜索表、查看表结构、浏览数据、IDE、catalog、select。"
metadata:
  requires:
    bins: ["te-cli"]
---

# DataOps 数据探索与 SQL 查询

> **前置条件:** 阅读 [`te-dataops/SKILL.md`](../SKILL.md) 了解通用规则。

使用 `dataops_ide` 子命令进行数据探索和 SQL 查询。

**核心规则：IDE 只允许查询操作，禁止创建/修改/删除数据表（任务表 DDL 请用 dataops_datatable）。**

---

## 工作流 A：浏览数仓元数据

逐步探索数据仓库结构：仓库 → catalog → schema → 表 → 列。

```bash
# Step 1: 列出可用仓库
te-cli dataops_ide +list_repos --spaceCode "${spaceCode}"

# Step 2: 列出仓库下所有 catalog 及其 schema
te-cli dataops_ide +list_catalogs --spaceCode "${spaceCode}" --connType "SPACE" --repoCode "${repoCode}"

# Step 3: 列出 schema 下的表/视图
te-cli dataops_ide +list_tables --spaceCode "${spaceCode}" --connType "SPACE" --repoCode "${repoCode}" \
  --catalog "${catalog}" --schema "${schema}" --isView false --pageNum 1 --pageSize 100

# Step 4: 获取表的详细元数据（列定义、DDL、分区、行数）
te-cli dataops_ide +get_table_detail --spaceCode "${spaceCode}" --connType "SPACE" --repoCode "${repoCode}" \
  --catalog "${catalog}" --schema "${schema}" --tableName "${tableName}" \
  --engineType "TASK_ENGINE_TRINO" --isView false
```

---

## 工作流 B：搜索并查看表

当不知道表的确切位置时，通过关键词搜索。

```bash
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

---

## 工作流 C：执行 SQL 查询（完整异步流程）

这是最重要的工作流，包含 3 步：执行 → 轮询进度 → 获取结果。

```bash
# Step 1: 异步执行 SQL（返回 requestId）
te-cli dataops_ide +execute_sql --spaceCode "${spaceCode}" --repoCode "te_etl" \
  --sql "SELECT * FROM hive.ws_default_dev.dwd_user LIMIT 10" \
  --engineType "TASK_ENGINE_TRINO" --confirmed true

# Step 2: 查询执行进度（用 Step 1 返回的 requestId，建议 2-5 秒轮询）
# state 可能值: QUEUED / RUNNING / FINISHED / FAILED / CANCELLED
te-cli dataops_ide +get_query_progress --requestId "${requestId}"

# Step 3: state=FINISHED 后，获取查询结果
# recordId 从查询历史或进度信息中获取
te-cli dataops_ide +get_query_result --spaceCode "${spaceCode}" --connType "SPACE" \
  --repoCode "te_etl" --recordId "${recordId}"

# （可选）取消正在执行的查询
te-cli dataops_ide +cancel_query --requestId "${requestId}" --confirmed true
```

---

## 命令速查

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

## 参数说明

- **connType**: `SPACE`（数据仓库日常查询，默认）| `ETL`（ETL 引擎）| `APP`（应用仓对外服务）
- **engineType**: `TASK_ENGINE_TRINO`（默认，交互式查询）| `TASK_ENGINE_STARROCKS`（实时分析、高并发）
- **isView**: `false` 查物理表 | `true` 查视图
