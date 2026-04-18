---
name: dataops-table
version: 1.0.0
description: "数据表与视图管理：搜索表、查看表详情、创建物理表/视图、批量创建关联视图。触发关键词：建表、创建表、视图、数据字典、表详情、关联视图、linkview、datatable、DDL。"
metadata:
  requires:
    bins: ["te-cli"]
---

# DataOps 数据表与视图管理

> **前置条件:** 阅读 [`te-dataops/SKILL.md`](../SKILL.md) 了解通用规则。

使用 `dataops_datatable` 子命令管理数据表。

**核心规则：**
- 空间任务表的创建/修改/删除**必须用 dataops_datatable**，禁止用 dataops_ide
- 创建前先确认同名表不存在
- 创建视图或数据表时，按照 **Trino DDL 规范**生成 DDL
- 任务表先创建 DEV 环境，再创建 PROD 环境（可同时创建）

---

## 工作流 A：搜索并查看表信息

```bash
# 在数据字典中搜索表（按表名/说明模糊匹配）
te-cli dataops_datatable +dict_search_tables --spaceCode "${spaceCode}" --search "user" --maxResults 20

# 获取表的详细信息（字段、DDL、数据血缘）
te-cli dataops_datatable +get_table_detail --spaceCode "${spaceCode}" --tableName "dwd_user_info"

# 分页查询空间已注册的表列表
te-cli dataops_datatable +list_tables_by_page --spaceCode "${spaceCode}" --search "user" --pageNum 1 --pageSize 20

# 按仓库维度获取表层级结构（repo→catalog→schema→tables）
te-cli dataops_datatable +struct_by_repo --spaceCode "${spaceCode}"

# 搜索系统表（事件表、用户表、维度表）
te-cli dataops_datatable +list_system_tables --spaceCode "${spaceCode}" --projectName "my_project"
```

---

## 工作流 B：创建物理表

```bash
# Step 1: 确认同名表不存在
te-cli dataops_datatable +dict_search_tables --spaceCode "${spaceCode}" --search "dwd_user_info"

# Step 2: 创建 DEV 环境的物理表（DDL 需遵循 Trino 规范）
te-cli dataops_datatable +create_table --spaceCode "${spaceCode}" \
  --ddl "CREATE TABLE dwd_user_info (user_id VARCHAR, user_name VARCHAR, age INTEGER) WITH (format = 'ORC')" \
  --repoCode "te_etl" --catalog "hive" --schema "ws_default_dev" --confirmed true

# Step 3: 创建 PROD 环境的物理表（同样 DDL，schema 改为 product 库）
te-cli dataops_datatable +create_table --spaceCode "${spaceCode}" \
  --ddl "CREATE TABLE dwd_user_info (user_id VARCHAR, user_name VARCHAR, age INTEGER) WITH (format = 'ORC')" \
  --repoCode "te_etl" --catalog "hive" --schema "ws_default_product" --confirmed true
```

---

## 工作流 C：创建视图

```bash
# Step 1: 确认同名视图不存在
te-cli dataops_datatable +dict_search_tables --spaceCode "${spaceCode}" --search "v_user_info"

# Step 2: 创建视图（未指定视图名时默认用 v_${来源表名}）
te-cli dataops_datatable +create_view --spaceCode "${spaceCode}" \
  --ddl "CREATE VIEW v_user_info AS SELECT user_id, user_name FROM hive.ws_default_dev.dwd_user_info" \
  --repoCode "te_etl" --catalog "hive" --schema "ws_default_dev" --confirmed true
```

---

## 工作流 D：批量创建直连视图

```bash
# Step 1: 列出可用于创建关联视图的源表
te-cli dataops_datatable +linkview_list_source_tables --spaceCode "${spaceCode}" \
  --srcRepoCode "te_etl" --srcCatalog "hive" --srcSchema "ws_default_hidden"

# Step 2: 批量创建直连视图（异步执行）
te-cli dataops_datatable +batch_create --spaceCode "${spaceCode}" \
  --srcRepoCode "te_etl" --srcCatalog "hive" --srcSchema "ws_default_hidden" \
  --processType 2 --batchCreationMode 1 --owner "${ownerOpenId}" \
  --viewInfos '[{"viewName":"v_orders","srcTableName":"ta_event_123","srcTableType":"TABLE"}]' \
  --confirmed true

# Step 3: 轮询批量创建状态（建议 3-5 秒间隔）
# status: WAIT / RUNNING / SUCCESS / STOP
te-cli dataops_datatable +linkview_get_batch_status --spaceCode "${spaceCode}" --batchId "${batchId}"

# 查看历史批量创建记录
te-cli dataops_datatable +list_batches --spaceCode "${spaceCode}"
```

---

## 命令速查

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
| `+linkview_get_batch_status` | 批量创建状态 | `--spaceCode` `--batchId` |
| `+list_batches` | 历史批量记录 | `--spaceCode` `--status` |

## 参数说明

- **schema 命名**: DEV 环境用 `ws_${spaceCode}_dev`，PROD 环境用 `ws_${spaceCode}_product`
- **processType**: `1`=仅 DEV | `2`=DEV+PROD
- **batchCreationMode**: `1`=全量同步 | `2`=失败重试
- **表名规则**: `^[a-z][0-9a-z_]{0,127}$`
