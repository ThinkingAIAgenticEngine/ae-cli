---
name: te-dataops
version: 2.0.0
description: "TE Data Development and Operations: Data warehouse management, flow orchestration, IDE queries, data integration, operations and backfill management"
metadata:
  requires:
    bins: ["ae-cli"]
  cliHelp: "ae-cli dataops_repo --help, ae-cli dataops_datatable --help, ae-cli dataops_flow --help, ae-cli dataops_ide --help, ae-cli dataops_integration --help, ae-cli dataops_operations --help"
---

# te-dataops

> **Prerequisites:** Before using this skill, please read [`te-shared/SKILL.md`](../te-shared/SKILL.md) to understand authentication, global parameters, and security constraints.

The TE Data Development and Operations domain provides capabilities for data warehouse management, flow orchestration, IDE SQL queries, data integration, operations and backfill management, including the following subcommands:

| Subcommand | Responsibility | Corresponding Scenario Skill |
|------------|----------------|------------------------------|
| `dataops_repo` | Space and resource management | — |
| `dataops_datatable` | Data table and view management | `dataops-table` |
| `dataops_flow` | Flow creation and orchestration | `dataops-flow-create` |
| `dataops_flow` | Flow execution and monitoring | `dataops-flow-monitor` |
| `dataops_ide` | Data exploration and SQL queries | `dataops-query` |
| `dataops_integration` | Datasource and data integration | `dataops-integration` |
| `dataops_operations` | Operations and backfill management | `dataops-operations` |

---

## Core Concepts and Rules

You must understand the following key concepts before use, otherwise errors are highly likely.

### ID System (Not Interchangeable)

| ID | Source | Usage Scope |
|----|--------|-------------|
| **executeId** | Returned by `dataops_flow +execute_flow` / obtained via `+list_flow_instances` | All execution-related commands in `dataops_flow` |
| **flowInstanceId** | Obtained via `dataops_operations +search_flow_instances` | All operations commands in `dataops_operations` |

> **executeId and flowInstanceId are not interchangeable.** `dataops_flow` tools use executeId, `dataops_operations` tools use flowInstanceId.

### Environment and Defaults

| Scenario | Default Environment | Description |
|----------|---------------------|-------------|
| Most flow/ide/datatable commands | `DEV` | Development environment |
| `+list_flow_instances` instance list | **PROD** | Operations scenarios default to production |
| All `dataops_operations` commands | **PROD** | Operations perspective focuses on production |

### Schema Naming Rules

- DEV environment: `ws_${spaceCode}_dev`
- PROD environment: `ws_${spaceCode}_product`

### Responsibility Boundaries

| Operation | Correct Tool | Prohibited |
|-----------|--------------|------------|
| Execute SELECT queries | `dataops_ide` | — |
| Create/modify/delete data tables (DDL) | `dataops_datatable` | `dataops_ide` |
| Execute DDL on external datasources | `dataops_integration +execute_sql` | — |

### Flow Lifecycle

```
Create Flow → Create Task Nodes → Save Task Definitions → Configure Dependencies → Configure Schedule → DEV Testing → Release to PROD
```

### CRON Format (6 fields)

`second minute hour day month weekday` — Note: one more "second" field than standard 5-field format.
- `0 0 2 * * ?` — Daily at 2 AM
- `0 0 */4 * * ?` — Every 4 hours
- `0 30 8 * * 1-5` — Weekdays at 8:30

### Preset Repository vs Non-Preset Repository

- **Preset Repository (te_etl)**: `datasourceId` is `te_etl@TASK_ENGINE_TRINO`, database field is empty, requires `gatewayConfig`
- **Non-Preset Repository**: `datasourceId` is specific datasource ID, database field is required

---

## Scenario Routing

Choose the appropriate scenario skill based on user intent to get complete step-by-step workflow guidance.

| User Intent | Trigger Skill | Keywords |
|-------------|---------------|----------|
| Create flow, add nodes, configure schedule, release | `dataops-flow-create` | create flow, new workflow, configure schedule, add task node, release, cron, scheduled execution |
| View execution status, troubleshoot failures, view logs | `dataops-flow-monitor` | execute flow, running instance, monitor, logs, stop, DAG, troubleshoot |
| Create datasource, configure sync solution, execute sync | `dataops-integration` | datasource, sync, integration, sync, field mapping, data ingestion, MySQL, ClickHouse |
| Operations instance management, rerun failures, backfill operations | `dataops-operations` | operations, backfill, rerun, alert, operations, backfill |
| Browse metadata, search tables, execute SQL queries | `dataops-query` | query, SQL, data exploration, search tables, view table structure, IDE, catalog, select |
| Create tables, create views, batch create linked views | `dataops-table` | create table, table creation, view, data dictionary, linked view, linkview, DDL |

---

## 1. Space and Resource Management

```bash
# Get space list (entry command, get spaceCode)
ae-cli dataops_repo +list_spaces

# Get repository list
ae-cli dataops_repo +list_repos --spaceCode "${spaceCode}"

# Browse repository structure
ae-cli dataops_repo +list_catalogs --spaceCode "${spaceCode}" --repoCode "te_etl"
ae-cli dataops_repo +list_schemas --spaceCode "${spaceCode}" --repoCode "te_etl" --catalog "hive"

# View space members
ae-cli dataops_repo +list_space_members --spaceCode "${spaceCode}"

# Add member
ae-cli dataops_repo +add_space_member --spaceCode "${spaceCode}" --openId "${openId}" --confirmed true

# View space parameters
ae-cli dataops_repo +list_support_params --spaceCode "${spaceCode}"

# Preview parameter expression
ae-cli dataops_repo +preview_param_expression --spaceCode "${spaceCode}" --expression '${ws_run_date}'
```

### Command Quick Reference

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `+list_spaces` | Space list | — |
| `+list_repos` | Repository list | `--spaceCode` |
| `+list_catalogs` | Catalog list | `--spaceCode` `--repoCode` |
| `+list_schemas` | Schema list | `--spaceCode` `--repoCode` `--catalog` |
| `+list_space_members` | Space members | `--spaceCode` |
| `+add_space_member` | Add member | `--spaceCode` `--openId` `--confirmed` |
| `+list_support_params` | Space parameters | `--spaceCode` |
| `+preview_param_expression` | Preview parameter | `--spaceCode` `--expression` |
| `+list_param_used_flows` | Flows using parameter | `--spaceCode` `--paramKey` |

---

## 2. Data Table and View Management

> See `dataops-table` Skill for detailed step-by-step workflows.

### Typical Flow: Search → View → Create

```bash
# Search tables in data dictionary
ae-cli dataops_datatable +dict_search_tables --spaceCode "${spaceCode}" --search "user" --maxResults 20

# Get table details (field definitions, DDL, data lineage)
ae-cli dataops_datatable +get_table_detail --spaceCode "${spaceCode}" --tableName "dwd_user_info"

# Paginated query of registered tables
ae-cli dataops_datatable +list_tables_by_page --spaceCode "${spaceCode}" --search "user" --pageNum 1 --pageSize 20

# Get hierarchy by repository dimension
ae-cli dataops_datatable +struct_by_repo --spaceCode "${spaceCode}"

# Create physical table (DEV environment, DDL follows Trino specifications)
ae-cli dataops_datatable +create_table --spaceCode "${spaceCode}" \
  --ddl "CREATE TABLE dwd_user_info (user_id VARCHAR, user_name VARCHAR, age INTEGER) WITH (format = 'ORC')" \
  --repoCode "te_etl" --catalog "hive" --schema "ws_default_dev" --confirmed true

# Create PROD environment (same DDL, change schema to product database)
ae-cli dataops_datatable +create_table --spaceCode "${spaceCode}" \
  --ddl "CREATE TABLE dwd_user_info (user_id VARCHAR, user_name VARCHAR, age INTEGER) WITH (format = 'ORC')" \
  --repoCode "te_etl" --catalog "hive" --schema "ws_default_product" --confirmed true

# Create view
ae-cli dataops_datatable +create_view --spaceCode "${spaceCode}" \
  --ddl "CREATE VIEW v_user_info AS SELECT user_id, user_name FROM hive.ws_default_dev.dwd_user_info" \
  --repoCode "te_etl" --catalog "hive" --schema "ws_default_dev" --confirmed true

# Batch create linked views (async)
ae-cli dataops_datatable +batch_create --spaceCode "${spaceCode}" \
  --srcRepoCode "te_etl" --srcCatalog "hive" --srcSchema "ws_default_hidden" \
  --processType 2 --batchCreationMode 1 --owner "${ownerOpenId}" \
  --viewInfos '[{"viewName":"v_orders","srcTableName":"ta_event_123","srcTableType":"TABLE"}]' \
  --confirmed true

# Poll batch creation status (recommend 3-5 second interval)
ae-cli dataops_datatable +linkview_get_batch_status --spaceCode "${spaceCode}" --batchId "${batchId}"
```

### Command Quick Reference

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
| `+linkview_list_source_tables` | Available source tables | `--spaceCode` `--srcRepoCode` `--srcCatalog` `--srcSchema` |
| `+linkview_get_batch_status` | Batch status | `--spaceCode` `--batchId` |
| `+list_batches` | Historical batch records | `--spaceCode` `--status` |

### Parameter Notes

- **schema naming**: DEV environment uses `ws_${spaceCode}_dev`, PROD environment uses `ws_${spaceCode}_product`
- **processType**: `1`=DEV only | `2`=DEV+PROD
- **batchCreationMode**: `1`=full sync | `2`=retry failures
- **Table name rule**: `^[a-z][0-9a-z_]{0,127}$`
- **DDL specification**: Follow Trino DDL syntax

---

## 3. Flow Orchestration

Flow orchestration is divided into two scenario skills: **creation and configuration** and **execution and monitoring**.

### 3a. Creation and Configuration

> See `dataops-flow-create` Skill for detailed 8-step complete process.

**Lifecycle: Create → Configure Nodes → Configure Schedule → DEV Testing → Release to PROD**

```bash
# Create flow (returns flowCode)
ae-cli dataops_flow +create_flow --spaceCode "${spaceCode}" \
  --flowName "Daily ETL Process" --remark "Process user data" --confirmed true

# Create SQL task node (returns taskCode)
ae-cli dataops_flow +create_task --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskName "Process User Data" --taskType "TRINO_SQL" --confirmed true

# Create task with upstream dependency
ae-cli dataops_flow +create_task --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskName "Export Results" --taskType "TRINO_SQL" \
  --preTaskCode "${upstreamTaskCode}" --confirmed true

# Save task definition (SQL task)
ae-cli dataops_flow +save_task_definition --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskCode "${taskCode}" \
  --taskContentJson '{"sql":"SELECT * FROM dwd_user","repoCode":"te_etl","catalog":"hive","schema":"ws_default_dev"}' \
  --failRetryTimes 3 --failRetryInterval 30 --timeout 60 --confirmed true

# Validate SQL (recommended before saving)
ae-cli dataops_flow +validate_task_sql --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskCode "${taskCode}" \
  --sql "SELECT * FROM dwd_user" --repoCode "te_etl" \
  --catalog "hive" --schema "ws_default_dev"

# Add task dependency (DAG connection)
ae-cli dataops_flow +add_task_relation --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --preTaskCode "${upstreamTaskCode}" --taskCode "${downstreamTaskCode}" \
  --confirmed true

# Configure scheduled execution (CRON 6 fields: second minute hour day month weekday)
ae-cli dataops_flow +save_schedule_config --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --scheduled 1 --scheduleType "CRON" \
  --cron "0 0 2 * * ?" --confirmed true

# Manual testing in DEV environment
ae-cli dataops_flow +execute_flow --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --env "DEV" --confirmed true

# Release to production (PROD schedule takes effect immediately, does not interrupt running instances)
ae-cli dataops_flow +release_flow --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --confirmed true
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

### 3b. Execution and Monitoring

> See `dataops-flow-monitor` Skill for detailed troubleshooting workflows.

```bash
# Search flows (get flowCode)
ae-cli dataops_flow +list_flows --spaceCode "${spaceCode}" --keyword "etl"

# View flow basic information
ae-cli dataops_flow +get_flow_detail --spaceCode "${spaceCode}" --flowCode "${flowCode}"

# View definition DAG (static structure)
ae-cli dataops_flow +get_flow_dag --spaceCode "${spaceCode}" --flowCode "${flowCode}"

# View schedule configuration
ae-cli dataops_flow +get_schedule_config --spaceCode "${spaceCode}" --flowCode "${flowCode}"

# View execution instance list (default PROD environment, sorted by time descending)
ae-cli dataops_flow +list_flow_instances --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --env "PROD" --size 30

# View runtime DAG (with execution status for each node)
ae-cli dataops_flow +get_execute_dag --spaceCode "${spaceCode}" --executeId "${executeId}"

# View execution record details
ae-cli dataops_flow +get_execute_record --spaceCode "${spaceCode}" --executeId "${executeId}"

# View task logs (get bsTaskInstanceId and taskCode from DAG)
ae-cli dataops_flow +get_task_instance_log --bsTaskInstanceId "${instanceId}" \
  --taskCode "${taskCode}" --limit 100

# View task parameters
ae-cli dataops_flow +get_task_params --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --taskCode "${taskCode}"

# Manually trigger execution
ae-cli dataops_flow +execute_flow --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --env "DEV" --confirmed true

# Stop execution (irreversible)
ae-cli dataops_flow +stop_flow --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --executeId "${executeId}" --confirmed true

# Update flow information
ae-cli dataops_flow +update_flow --spaceCode "${spaceCode}" \
  --flowCode "${flowCode}" --flowName "New Name" --remark "New Remark" --confirmed true
```

### Command Quick Reference (Complete Flow Commands)

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `+create_flow` | Create flow | `--spaceCode` `--flowName` `--remark` `--confirmed` |
| `+create_task` | Create task node | `--spaceCode` `--flowCode` `--taskName` `--taskType` `--syncId` `--preTaskCode` `--confirmed` |
| `+save_task_definition` | Save task definition | `--spaceCode` `--flowCode` `--taskCode` `--taskContentJson` `--failRetryTimes` `--failRetryInterval` `--timeout` `--confirmed` |
| `+validate_task_sql` | Validate SQL | `--spaceCode` `--flowCode` `--taskCode` `--sql` `--repoCode` `--catalog` `--schema` |
| `+add_task_relation` | Add dependency | `--spaceCode` `--flowCode` `--preTaskCode` `--taskCode` `--confirmed` |
| `+save_schedule_config` | Configure schedule | `--spaceCode` `--flowCode` `--scheduled` `--scheduleType` `--cron` `--confirmed` |
| `+get_schedule_config` | View schedule | `--spaceCode` `--flowCode` `--env` |
| `+list_flows` | Search flows | `--spaceCode` `--keyword` |
| `+get_flow_detail` | Flow information | `--spaceCode` `--flowCode` `--env` |
| `+get_flow_dag` | Definition DAG | `--spaceCode` `--flowCode` `--env` |
| `+update_flow` | Update flow | `--spaceCode` `--flowCode` `--flowName` `--remark` `--confirmed` |
| `+execute_flow` | Manual execution | `--spaceCode` `--flowCode` `--env` `--confirmed` |
| `+stop_flow` | Stop execution | `--spaceCode` `--flowCode` `--executeId` `--confirmed` |
| `+release_flow` | Release to production | `--spaceCode` `--flowCode` `--confirmed` |
| `+list_flow_instances` | Instance list | `--spaceCode` `--flowCode` `--env` `--size` |
| `+get_execute_record` | Execution record | `--spaceCode` `--executeId` |
| `+get_execute_dag` | Runtime DAG | `--spaceCode` `--executeId` |
| `+get_task_instance_log` | Task logs | `--bsTaskInstanceId` `--taskCode` `--startOffset` `--limit` |
| `+get_task_params` | Task parameters | `--spaceCode` `--flowCode` `--taskCode` `--env` |

### Parameter Notes

- **Parameter reference**: Reference workspace parameters in tasks using `${paramKey}` (e.g., `${ws_run_date}`)
- **env**: `DEV` (development, default) | `PROD` (production)
- **Task status**: `success` / `failure` / `running` / `waiting`
- **DAG difference**: `+get_flow_dag` returns static definition structure, `+get_execute_dag` returns runtime structure with execution status
- **taskContentJson format** (varies by taskType):
  - TRINO_SQL: `{"sql":"SELECT ...","repoCode":"xxx","catalog":"hive","schema":"db"}`
  - SHELL: `{"script":"#!/bin/bash\n..."}`

---

## 4. IDE SQL Queries

> See `dataops-query` Skill for detailed step-by-step workflows.

> **IDE only allows query operations (SELECT), prohibits creating/modifying/deleting data tables. Use `dataops_datatable` for table DDL operations.**

### Typical Flow: Browse Metadata → Search Tables → Execute Queries

```bash
# List available repositories
ae-cli dataops_ide +list_repos --spaceCode "${spaceCode}"

# List all catalogs and their schemas in repository
ae-cli dataops_ide +list_catalogs --spaceCode "${spaceCode}" --connType "SPACE" --repoCode "${repoCode}"

# List tables/views under schema
ae-cli dataops_ide +list_tables --spaceCode "${spaceCode}" --connType "SPACE" --repoCode "${repoCode}" \
  --catalog "${catalog}" --schema "${schema}" --isView false --pageNum 1 --pageSize 100

# Get detailed table metadata (column definitions, DDL, partitions, row count)
ae-cli dataops_ide +get_table_detail --spaceCode "${spaceCode}" --connType "SPACE" --repoCode "${repoCode}" \
  --catalog "${catalog}" --schema "${schema}" --tableName "${tableName}" \
  --engineType "TASK_ENGINE_TRINO" --isView false

# Get schema statistics
ae-cli dataops_ide +get_schema_info --spaceCode "${spaceCode}" --connType "SPACE" --repoCode "${repoCode}" \
  --catalog "${catalog}" --schema "${schema}"

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

### SQL Async Query Flow (3 steps: Execute → Poll → Get Results)

```bash
# Step 1: Execute SQL asynchronously (returns requestId)
ae-cli dataops_ide +execute_sql --spaceCode "${spaceCode}" --repoCode "te_etl" \
  --sql "SELECT * FROM hive.ws_default_dev.dwd_user LIMIT 10" \
  --engineType "TASK_ENGINE_TRINO" --confirmed true

# Step 2: Query execution progress (recommend 2-5 second polling)
# state: QUEUED / RUNNING / FINISHED / FAILED / CANCELLED
ae-cli dataops_ide +get_query_progress --requestId "${requestId}"

# Step 3: Get results after state=FINISHED
ae-cli dataops_ide +get_query_result --spaceCode "${spaceCode}" --connType "SPACE" \
  --repoCode "te_etl" --recordId "${recordId}"

# (Optional) Cancel running query
ae-cli dataops_ide +cancel_query --requestId "${requestId}" --confirmed true
```

### Command Quick Reference

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

### Parameter Notes

- **connType**: `SPACE` (data warehouse for daily queries, default) | `ETL` (ETL engine) | `APP` (app warehouse for external services)
- **engineType**: `TASK_ENGINE_TRINO` (default, interactive queries) | `TASK_ENGINE_STARROCKS` (real-time analytics, high concurrency)
- **isView**: `false` for physical tables | `true` for views

---

## 5. Data Integration

> See `dataops-integration` Skill for detailed step-by-step workflows and JSON configuration templates.

> **Sync solution creation involves complex JSON configurations (sourceConfig/sinkConfig/channelConfig/fieldsMapping), be sure to refer to complete templates in `dataops-integration` Skill.**

### Typical Flow: Create Datasource → Browse Source Tables → Create Sync Solution → Execute

```bash
# View supported datasource component types
ae-cli dataops_integration +list_datasource_components

# Test datasource connection
ae-cli dataops_integration +test_datasource_connect --spaceCode "${spaceCode}" \
  --componentName "MySQL" \
  --configValue '{"host":"localhost","port":3306,"username":"root","password":"xxx","database":"test"}'

# Create datasource
ae-cli dataops_integration +add_datasource --spaceCode "${spaceCode}" \
  --componentName "MySQL" --dataSourceName "Production MySQL" \
  --sharedConfig true \
  --envJsonList '[{"host":"localhost","port":3306,"username":"root","password":"xxx"}]' \
  --confirmed true

# View all datasources in workspace
ae-cli dataops_integration +list_space_datasources --spaceCode "${spaceCode}"

# View datasources available for sync (categorized by source/sink)
ae-cli dataops_integration +list_sync_datasources --spaceCode "${spaceCode}"

# Browse source databases and tables
ae-cli dataops_integration +list_datasource_databases --spaceCode "${spaceCode}" \
  --datasourceId "${datasourceId}"
ae-cli dataops_integration +list_datasource_tables --spaceCode "${spaceCode}" \
  --datasourceId "${datasourceId}" --database "test"

# Get table structure (column definitions, partitions)
ae-cli dataops_integration +get_table_structure --spaceCode "${spaceCode}" \
  --datasourceId "${datasourceId}" --database "test" --tablePath "users"

# Create sync solution (requires complete JSON configuration, see dataops-integration Skill)
ae-cli dataops_integration +add_sync_solution --spaceCode "${spaceCode}" \
  --syncName "MySQL to Preset Repository Sync" \
  --srcComponent "MySQL" --srcDatasourceId "${mysqlDatasourceId}" \
  --sinkComponent "hive" --sinkDatasourceId "te_etl@TASK_ENGINE_TRINO" \
  --sourceConfig '...' --sinkConfig '...' --channelConfig '...' --fieldsMapping '...' \
  --confirmed true

# Execute sync solution
ae-cli dataops_integration +exec_sync_solution --spaceCode "${spaceCode}" \
  --syncId "${syncId}" --confirmed true

# View execution history
ae-cli dataops_integration +list_sync_exec_histories --spaceCode "${spaceCode}" \
  --syncId "${syncId}" --limit 20

# View execution details
ae-cli dataops_integration +get_sync_exec_info --spaceCode "${spaceCode}" \
  --syncId "${syncId}" --taskId "${taskId}"

# Stop sync execution
ae-cli dataops_integration +stop_sync_solution --spaceCode "${spaceCode}" \
  --syncId "${syncId}" --taskId "${taskId}" --confirmed true
```

### JSON Configuration Key Points

When creating sync solutions, the following JSON configurations must be strictly generated according to templates:

| Configuration | Description |
|---------------|-------------|
| **sourceConfig** | Source connection information (component, datasource ID, database, table) |
| **sinkConfig** | Target configuration (preset repository database is empty, non-preset repository database is required) |
| **channelConfig** | Channel configuration (must include gatewayConfig when involving preset repository) |
| **fieldsMapping** | Bidirectional field mapping (each field must include manual/partitionKey/primaryKey/shardingKey/sortingKey/upsertKey) |

> See `dataops-integration` Skill for complete JSON templates and conditional required parameters for components like MongoDB.

### Command Quick Reference

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `+list_datasource_components` | Supported components | — |
| `+list_space_datasources` | Workspace datasources | `--spaceCode` `--componentName` `--dataSourceName` |
| `+add_datasource` | Create datasource | `--spaceCode` `--componentName` `--dataSourceName` `--sharedConfig` `--envJsonList` `--confirmed` |
| `+test_datasource_connect` | Test connection | `--spaceCode` `--componentName` `--configValue` |
| `+modify_datasource` | Modify datasource | `--spaceCode` `--datasourceId` `--confirmed` |
| `+online_datasource` | Online datasource | `--spaceCode` `--datasourceId` `--confirmed` |
| `+list_datasource_databases` | List databases | `--spaceCode` `--datasourceId` |
| `+list_datasource_tables` | List tables | `--spaceCode` `--datasourceId` `--database` |
| `+get_table_structure` | Table structure | `--spaceCode` `--datasourceId` `--database` `--tablePath` |
| `+list_sync_datasources` | Sync datasources | `--spaceCode` |
| `+list_sync_solutions` | Sync solution list | `--spaceCode` |
| `+get_sync_detail` | Sync solution details | `--spaceCode` `--syncId` |
| `+add_sync_solution` | Create sync solution | `--spaceCode` `--syncName` `--srcComponent` `--srcDatasourceId` `--sinkComponent` `--sinkDatasourceId` `--sourceConfig` `--sinkConfig` `--channelConfig` `--fieldsMapping` `--confirmed` |
| `+save_sync_solution` | Update sync solution | `--spaceCode` `--syncId` `--confirmed` |
| `+exec_sync_solution` | Execute sync | `--spaceCode` `--syncId` `--confirmed` |
| `+list_sync_exec_histories` | Execution history | `--spaceCode` `--syncId` `--execType` `--limit` |
| `+get_sync_exec_info` | Execution details | `--spaceCode` `--syncId` `--taskId` |
| `+stop_sync_solution` | Stop sync | `--spaceCode` `--syncId` `--taskId` `--confirmed` |
| `+execute_sql` | External DDL execution | `--spaceCode` `--datasourceId` `--database` `--sql` `--confirmed` |
| `+validate_sql` | Validate SQL | `--spaceCode` `--datasourceId` `--database` `--sql` |

---

## 6. Operations and Backfill Management

> See `dataops-operations` Skill for detailed step-by-step workflows.

> **Operations commands use flowInstanceId (not executeId), obtained via `+search_flow_instances`.**

### Typical Flow A: Operations Instance Query and Operations

```bash
# Search flow instances (supports filtering by status/owner/time)
ae-cli dataops_operations +search_flow_instances --spaceCode "${spaceCode}" \
  --pageNum 1 --pageSize 20

# View all task nodes and execution status under instance
ae-cli dataops_operations +list_flow_task_instances --spaceCode "${spaceCode}" \
  --flowInstanceId "${flowInstanceId}"

# Get task node definition details
ae-cli dataops_operations +get_task_definition --spaceCode "${spaceCode}" \
  --flowInstanceId "${flowInstanceId}" --taskCode "${taskCode}"

# Rerun failed flow instance (continue from failed node)
ae-cli dataops_operations +rerun_flow_instance --spaceCode "${spaceCode}" \
  --flowInstanceId "${flowInstanceId}" --confirmed true

# Stop running instance
ae-cli dataops_operations +stop_flow_instance --spaceCode "${spaceCode}" \
  --flowInstanceId "${flowInstanceId}" --confirmed true

# Control instance running status (pause/force pause/resume)
ae-cli dataops_operations +control_flow_instance --spaceCode "${spaceCode}" \
  --flowInstanceId "${flowInstanceId}" --action "PAUSE" --confirmed true
```

### Typical Flow B: Backfill Task Management

```bash
# Query backfill task list
ae-cli dataops_operations +list_flow_jobs --spaceCode "${spaceCode}" \
  --pageNum 1 --pageSize 20

# Get backfill task details (configuration, date range, concurrency settings)
ae-cli dataops_operations +get_flow_job_detail --spaceCode "${spaceCode}" \
  --jobId "${jobId}"

# Get backfill task execution plan list (status for each date)
ae-cli dataops_operations +list_flow_job_plans --spaceCode "${spaceCode}" \
  --jobId "${jobId}"

# Stop running backfill task
ae-cli dataops_operations +stop_flow_job --spaceCode "${spaceCode}" \
  --jobId "${jobId}" --confirmed true
```

### Typical Flow C: Task Node Instance Query

```bash
# Search task node instances (supports filtering by status/type/time)
ae-cli dataops_operations +search_task_instances --spaceCode "${spaceCode}" \
  --pageNum 1 --pageSize 20
```

### Command Quick Reference

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `+search_flow_instances` | Search flow instances | `--spaceCode` `--pageNum` `--pageSize` |
| `+list_flow_task_instances` | Instance task nodes | `--spaceCode` `--flowInstanceId` |
| `+get_task_definition` | Task node definition | `--spaceCode` `--flowInstanceId` `--taskCode` |
| `+rerun_flow_instance` | Rerun instance | `--spaceCode` `--flowInstanceId` `--confirmed` |
| `+stop_flow_instance` | Stop instance | `--spaceCode` `--flowInstanceId` `--confirmed` |
| `+control_flow_instance` | Control instance status | `--spaceCode` `--flowInstanceId` `--action` `--confirmed` |
| `+search_task_instances` | Search task instances | `--spaceCode` `--pageNum` `--pageSize` |
| `+list_flow_jobs` | Backfill task list | `--spaceCode` `--pageNum` `--pageSize` |
| `+get_flow_job_detail` | Backfill task details | `--spaceCode` `--jobId` |
| `+list_flow_job_plans` | Backfill execution plan | `--spaceCode` `--jobId` |
| `+stop_flow_job` | Stop backfill task | `--spaceCode` `--jobId` `--confirmed` |

### Parameter Notes

- **action**: `PAUSE` (pause) | `FORCE_PAUSE` (force pause) | `RESUME` (resume)
- **Instance status**: `RUNNING` / `SUCCESS` / `FAILURE` / `WAITING` / `STOPPED`
- **flowInstanceId vs executeId**: Operations tools use flowInstanceId, flow tools use executeId, **not interchangeable**

---

## Reference Documentation

For detailed command flags and usage, please refer to the command documentation in the [`references/`](./references/) directory.
