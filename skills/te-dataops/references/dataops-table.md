---
name: dataops-table
version: 1.0.0
description: "Data table and view management: search tables, view table details, create physical tables/views, batch create linked views. Trigger keywords: create table, table creation, view, data dictionary, table details, linked view, linkview, datatable, DDL."
metadata:
  requires:
    bins: ["ae-cli"]
---

# DataOps Data Table and View Management

> **Prerequisites:** Read [`te-dataops/SKILL.md`](../SKILL.md) for general rules.

Use the `dataops_datatable` subcommand to manage data tables.

**Core Rules:**
- Creating/modifying/deleting workspace task tables **must use dataops_datatable**, prohibited to use dataops_ide
- Confirm no table with the same name exists before creation
- When creating views or data tables, generate DDL according to **Trino DDL specifications**
- Create task tables in DEV environment first, then PROD environment (can create simultaneously)

---

## Workflow A: Search and View Table Information

```bash
# Search tables in data dictionary (fuzzy match by table name/description)
ae-cli dataops_datatable +dict_search_tables --spaceCode "${spaceCode}" --search "user" --maxResults 20

# Get detailed table information (fields, DDL, data lineage)
ae-cli dataops_datatable +get_table_detail --spaceCode "${spaceCode}" --tableName "dwd_user_info"

# Paginated query of registered tables in workspace
ae-cli dataops_datatable +list_tables_by_page --spaceCode "${spaceCode}" --search "user" --pageNum 1 --pageSize 20

# Get table hierarchy by repository dimension (repo→catalog→schema→tables)
ae-cli dataops_datatable +struct_by_repo --spaceCode "${spaceCode}"

# Search system tables (event tables, user tables, dimension tables)
ae-cli dataops_datatable +list_system_tables --spaceCode "${spaceCode}" --projectName "my_project"
```

---

## Workflow B: Create Physical Table

```bash
# Step 1: Confirm no table with same name exists
ae-cli dataops_datatable +dict_search_tables --spaceCode "${spaceCode}" --search "dwd_user_info"

# Step 2: Create physical table in DEV environment (DDL must follow Trino specifications)
ae-cli dataops_datatable +create_table --spaceCode "${spaceCode}" \
  --ddl "CREATE TABLE dwd_user_info (user_id VARCHAR, user_name VARCHAR, age INTEGER) WITH (format = 'ORC')" \
  --repoCode "te_etl" --catalog "hive" --schema "ws_default_dev" --confirmed true

# Step 3: Create physical table in PROD environment (same DDL, change schema to product database)
ae-cli dataops_datatable +create_table --spaceCode "${spaceCode}" \
  --ddl "CREATE TABLE dwd_user_info (user_id VARCHAR, user_name VARCHAR, age INTEGER) WITH (format = 'ORC')" \
  --repoCode "te_etl" --catalog "hive" --schema "ws_default_product" --confirmed true
```

---

## Workflow C: Create View

```bash
# Step 1: Confirm no view with same name exists
ae-cli dataops_datatable +dict_search_tables --spaceCode "${spaceCode}" --search "v_user_info"

# Step 2: Create view (defaults to v_${source_table_name} if view name not specified)
ae-cli dataops_datatable +create_view --spaceCode "${spaceCode}" \
  --ddl "CREATE VIEW v_user_info AS SELECT user_id, user_name FROM hive.ws_default_dev.dwd_user_info" \
  --repoCode "te_etl" --catalog "hive" --schema "ws_default_dev" --confirmed true
```

---

## Workflow D: Batch Create Linked Views

```bash
# Step 1: List source tables available for creating linked views
ae-cli dataops_datatable +linkview_list_source_tables --spaceCode "${spaceCode}" \
  --srcRepoCode "te_etl" --srcCatalog "hive" --srcSchema "ws_default_hidden"

# Step 2: Batch create linked views (async execution)
ae-cli dataops_datatable +batch_create --spaceCode "${spaceCode}" \
  --srcRepoCode "te_etl" --srcCatalog "hive" --srcSchema "ws_default_hidden" \
  --processType 2 --batchCreationMode 1 --owner "${ownerOpenId}" \
  --viewInfos '[{"viewName":"v_orders","srcTableName":"ta_event_123","srcTableType":"TABLE"}]' \
  --confirmed true

# Step 3: Poll batch creation status (recommend 3-5 second interval)
# status: WAIT / RUNNING / SUCCESS / STOP
ae-cli dataops_datatable +linkview_get_batch_status --spaceCode "${spaceCode}" --batchId "${batchId}"

# View historical batch creation records
ae-cli dataops_datatable +list_batches --spaceCode "${spaceCode}"
```

---

## Command Quick Reference

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `+dict_search_tables` | Data dictionary search | `--spaceCode` `--search` `--maxResults` |
| `+get_table_detail` | Table details | `--spaceCode` `--tableName` |
| `+list_tables_by_page` | Paginated list | `--spaceCode` `--search` `--pageNum` `--pageSize` |
| `+struct_by_repo` | By repository hierarchy | `--spaceCode` `--search` |
| `+list_system_tables` | System table list | `--spaceCode` `--projectId`/`--projectName` `--pageNum` `--pageSize` |
| `+create_table` | Create physical table | `--spaceCode` `--ddl` `--repoCode` `--catalog` `--schema` `--confirmed` |
| `+create_view` | Create view | `--spaceCode` `--ddl` `--repoCode` `--catalog` `--schema` `--confirmed` |
| `+batch_create` | Batch create views | `--spaceCode` `--srcRepoCode` `--srcCatalog` `--srcSchema` `--processType` `--batchCreationMode` `--owner` `--viewInfos` `--confirmed` |
| `+linkview_get_batch_status` | Batch creation status | `--spaceCode` `--batchId` |
| `+list_batches` | Historical batch records | `--spaceCode` `--status` |

## Parameter Notes

- **schema naming**: DEV environment uses `ws_${spaceCode}_dev`, PROD environment uses `ws_${spaceCode}_product`
- **processType**: `1`=DEV only | `2`=DEV+PROD
- **batchCreationMode**: `1`=full sync | `2`=retry failures
- **Table name rule**: `^[a-z][0-9a-z_]{0,127}$`
