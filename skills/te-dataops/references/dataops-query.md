---
name: dataops-query
version: 1.0.0
description: "Data exploration and SQL query: browse data warehouse metadata, search tables, execute SQL queries, get results. Trigger keywords: query, SQL, data exploration, search tables, view table structure, browse data, IDE, catalog, select."
metadata:
  requires:
    bins: ["ae-cli"]
---

# DataOps Data Exploration and SQL Query

> **Prerequisites:** Read [`te-dataops/SKILL.md`](../SKILL.md) for general rules.

Use the `dataops_ide` subcommand for data exploration and SQL queries.

**Core Rule: IDE only allows query operations, prohibits creating/modifying/deleting data tables (use dataops_datatable for task table DDL).**

---

## Workflow A: Browse Data Warehouse Metadata

Explore data warehouse structure step by step: repository → catalog → schema → table → column.

```bash
# Step 1: List available repositories
ae-cli dataops_ide +list_repos --spaceCode "${spaceCode}"

# Step 2: List all catalogs and their schemas in repository
ae-cli dataops_ide +list_catalogs --spaceCode "${spaceCode}" --connType "SPACE" --repoCode "${repoCode}"

# Step 3: List tables/views under schema
ae-cli dataops_ide +list_tables --spaceCode "${spaceCode}" --connType "SPACE" --repoCode "${repoCode}" \
  --catalog "${catalog}" --schema "${schema}" --isView false --pageNum 1 --pageSize 100

# Step 4: Get detailed table metadata (column definitions, DDL, partitions, row count)
ae-cli dataops_ide +get_table_detail --spaceCode "${spaceCode}" --connType "SPACE" --repoCode "${repoCode}" \
  --catalog "${catalog}" --schema "${schema}" --tableName "${tableName}" \
  --engineType "TASK_ENGINE_TRINO" --isView false
```

---

## Workflow B: Search and View Tables

When you don't know the exact table location, search by keyword.

```bash
# Fuzzy search tables across catalog/schema
ae-cli dataops_ide +search_tables --spaceCode "${spaceCode}" --connType "SPACE" --repoCode "${repoCode}" \
  --searchKey "user" --size 20

# Fuzzy search column names across tables
ae-cli dataops_ide +search_columns --spaceCode "${spaceCode}" --repoCode "${repoCode}" \
  --searchKey "user_id" --tables '[{"catalog":"hive","isView":false,"schema":"ws_default_dev","tableName":"dwd_user"}]' \
  --engineType "TASK_ENGINE_TRINO" --pageNum 1 --pageSize 100

# Generate SELECT SQL based on table and column names
ae-cli dataops_ide +generate_sql --spaceCode "${spaceCode}" --repoCode "${repoCode}" \
  --catalog "hive" --schema "ws_default_dev" --tableName "dwd_user" \
  --engineType "TASK_ENGINE_TRINO" --selectColumns '["user_id","user_name","age"]'
```

---

## Workflow C: Execute SQL Query (Complete Async Flow)

This is the most important workflow, containing 3 steps: execute → poll progress → get results.

```bash
# Step 1: Execute SQL asynchronously (returns requestId)
ae-cli dataops_ide +execute_sql --spaceCode "${spaceCode}" --repoCode "te_etl" \
  --sql "SELECT * FROM hive.ws_default_dev.dwd_user LIMIT 10" \
  --engineType "TASK_ENGINE_TRINO" --confirmed true

# Step 2: Query execution progress (use requestId from Step 1, recommend 2-5 second polling)
# state values: QUEUED / RUNNING / FINISHED / FAILED / CANCELLED
ae-cli dataops_ide +get_query_progress --requestId "${requestId}"

# Step 3: After state=FINISHED, get query results
# recordId obtained from query history or progress info
ae-cli dataops_ide +get_query_result --spaceCode "${spaceCode}" --connType "SPACE" \
  --repoCode "te_etl" --recordId "${recordId}"

# (Optional) Cancel running query
ae-cli dataops_ide +cancel_query --requestId "${requestId}" --confirmed true
```

---

## Command Quick Reference

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `+list_repos` | List repositories | `--spaceCode` |
| `+list_catalogs` | List catalog/schema | `--spaceCode` `--connType` `--repoCode` |
| `+list_tables` | List tables | `--spaceCode` `--connType` `--repoCode` `--catalog` `--schema` `--isView` `--pageNum` `--pageSize` |
| `+get_table_detail` | Table metadata | `--spaceCode` `--connType` `--repoCode` `--catalog` `--schema` `--tableName` `--engineType` `--isView` |
| `+get_schema_info` | Schema statistics | `--spaceCode` `--connType` `--repoCode` `--catalog` `--schema` |
| `+search_tables` | Fuzzy search tables | `--spaceCode` `--connType` `--repoCode` `--searchKey` `--size` |
| `+search_columns` | Fuzzy search columns | `--spaceCode` `--repoCode` `--searchKey` `--tables` (JSON) `--engineType` `--pageNum` `--pageSize` |
| `+generate_sql` | Generate SELECT | `--spaceCode` `--repoCode` `--catalog` `--schema` `--tableName` `--engineType` `--selectColumns` (JSON) |
| `+execute_sql` | Execute SQL | `--spaceCode` `--repoCode` `--sql` `--engineType` `--confirmed` |
| `+get_query_progress` | Query progress | `--requestId` |
| `+get_query_result` | Get results | `--spaceCode` `--connType` `--repoCode` `--recordId` |
| `+cancel_query` | Cancel query | `--requestId` `--confirmed` |

## Parameter Notes

- **connType**: `SPACE` (data warehouse for daily queries, default) | `ETL` (ETL engine) | `APP` (app warehouse for external services)
- **engineType**: `TASK_ENGINE_TRINO` (default, interactive queries) | `TASK_ENGINE_STARROCKS` (real-time analytics, high concurrency)
- **isView**: `false` for physical tables | `true` for views
