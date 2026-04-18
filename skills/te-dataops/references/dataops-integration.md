---
name: dataops-integration
version: 1.0.0
description: "Datasource and data integration: create datasources, create sync solutions, configure field mapping, execute sync, monitor sync. Trigger keywords: datasource, sync, integration, sync, field mapping, data ingestion, datasource, MySQL, ClickHouse."
metadata:
  requires:
    bins: ["ae-cli"]
---

# DataOps Datasource and Data Integration

> **Prerequisites:** Read [`te-dataops/SKILL.md`](../SKILL.md) for general rules.

Use the `dataops_integration` subcommand to manage datasources and sync solutions.

**Core Rules:**
- Configuration parameters differ significantly between preset repositories (te_etl) and non-preset repositories, must strictly follow templates
- sourceConfig/sinkConfig/channelConfig/fieldsMapping are all JSON strings
- Test datasource connection before creating sync solution

---

## Workflow A: Create Datasource

```bash
# Step 1: View supported datasource component types
ae-cli dataops_integration +list_datasource_components

# Step 2: Test connection (temporary configuration, not saved)
ae-cli dataops_integration +test_datasource_connect --spaceCode "${spaceCode}" \
  --componentName "MySQL" \
  --configValue '{"host":"localhost","port":3306,"username":"root","password":"xxx","database":"test"}'

# Step 3: Create datasource
ae-cli dataops_integration +add_datasource --spaceCode "${spaceCode}" \
  --componentName "MySQL" --dataSourceName "Production MySQL" \
  --sharedConfig true \
  --envJsonList '[{"host":"localhost","port":3306,"username":"root","password":"xxx"}]' \
  --confirmed true
```

---

## Workflow B: Create Sync Solution (Complete Process)

### Step 1: View Available Datasources

```bash
# View all datasources in workspace
ae-cli dataops_integration +list_space_datasources --spaceCode "${spaceCode}"

# View datasources available for sync (categorized by source/sink)
ae-cli dataops_integration +list_sync_datasources --spaceCode "${spaceCode}"
```

### Step 2: Browse Source Table Structure

```bash
# List databases under datasource
ae-cli dataops_integration +list_datasource_databases --spaceCode "${spaceCode}" \
  --datasourceId "${datasourceId}"

# List tables under database
ae-cli dataops_integration +list_datasource_tables --spaceCode "${spaceCode}" \
  --datasourceId "${datasourceId}" --database "test"

# Get table structure (column definitions, partitions)
ae-cli dataops_integration +get_table_structure --spaceCode "${spaceCode}" \
  --datasourceId "${datasourceId}" --database "test" --tablePath "users"
```

### Step 3: Create Sync Solution

**Key: Must strictly follow JSON templates below to generate parameters**

```bash
ae-cli dataops_integration +add_sync_solution --spaceCode "${spaceCode}" \
  --syncName "MySQL to Preset Repository Sync" \
  --srcComponent "MySQL" --srcDatasourceId "${mysqlDatasourceId}" \
  --sinkComponent "hive" --sinkDatasourceId "te_etl@TASK_ENGINE_TRINO" \
  --sourceConfig '{"component":"MySQL","datasourceId":"xxx","database":"test","tablePath":"users"}' \
  --sinkConfig '{"component":"hive","datasourceId":"te_etl@TASK_ENGINE_TRINO","database":"","tablePath":"ods_users_mysql","tableType":"PHYSICAL_TABLE","bizClassify":"CURRENT","dbBizType":"TASK_ENV_DB","authedSpace":"","partitionKeys":[],"dataSaveMode":1,"batchSize":20000}' \
  --channelConfig '{"limitType":"0","gatewayConfig":{"engineFlag":"TASK_ENGINE_TRINO","companyId":1,"appDefinition":"APP_GAIA","bizFlag":"BIZ_GAIA_TASK_RELEASE","repoCode":"te_etl","spaceCode":"default"}}' \
  --fieldsMapping '{"mapping":[{"source":{"name":"id","type":"int","manual":false,"partitionKey":false,"primaryKey":false,"shardingKey":false,"sortingKey":false,"upsertKey":false},"target":{"name":"id","type":"int","manual":false,"partitionKey":false,"primaryKey":false,"shardingKey":false,"sortingKey":false,"upsertKey":false}}]}' \
  --confirmed true
```

### Step 4: Execute Sync

```bash
# Manually execute sync solution
ae-cli dataops_integration +exec_sync_solution --spaceCode "${spaceCode}" \
  --syncId "${syncId}" --confirmed true

# View execution history
ae-cli dataops_integration +list_sync_exec_histories --spaceCode "${spaceCode}" \
  --syncId "${syncId}" --limit 20

# View execution details
ae-cli dataops_integration +get_sync_exec_info --spaceCode "${spaceCode}" \
  --syncId "${syncId}" --taskId "${taskId}"

# Stop execution if necessary
ae-cli dataops_integration +stop_sync_solution --spaceCode "${spaceCode}" \
  --syncId "${syncId}" --taskId "${taskId}" --confirmed true
```

---

## JSON Configuration Templates

### Preset Repository as Target (Sink)

```json
{
  "component": "hive",
  "datasourceId": "te_etl@TASK_ENGINE_TRINO",
  "database": "",
  "tablePath": "ods_users_mysql",
  "tableType": "PHYSICAL_TABLE",
  "bizClassify": "CURRENT",
  "dbBizType": "TASK_ENV_DB",
  "authedSpace": "",
  "partitionKeys": [],
  "dataSaveMode": 1,
  "batchSize": 20000
}
```

### Non-Preset Repository (e.g., MySQL)

```json
{
  "component": "MySQL",
  "datasourceId": "ds-uuid-xxx",
  "database": "test",
  "tablePath": "users"
}
```

### channelConfig (must include gatewayConfig when source or target involves preset repository)

```json
{
  "limitType": "0",
  "gatewayConfig": {
    "engineFlag": "TASK_ENGINE_TRINO",
    "companyId": 1,
    "appDefinition": "APP_GAIA",
    "bizFlag": "BIZ_GAIA_TASK_RELEASE",
    "repoCode": "te_etl",
    "spaceCode": "default"
  }
}
```

### fieldsMapping (bidirectional column mapping)

```json
{
  "mapping": [
    {
      "source": {
        "name": "id",
        "type": "int",
        "manual": false,
        "partitionKey": false,
        "primaryKey": false,
        "shardingKey": false,
        "sortingKey": false,
        "upsertKey": false
      },
      "target": {
        "name": "id",
        "type": "int",
        "manual": false,
        "partitionKey": false,
        "primaryKey": false,
        "shardingKey": false,
        "sortingKey": false,
        "upsertKey": false
      }
    }
  ]
}
```

---

## Command Quick Reference

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `+list_datasource_components` | List component types | None |
| `+test_datasource_connect` | Test connection | `--spaceCode` `--componentName` `--configValue` |
| `+add_datasource` | Create datasource | `--spaceCode` `--componentName` `--dataSourceName` `--sharedConfig` `--envJsonList` `--confirmed` |
| `+modify_datasource` | Modify datasource | `--spaceCode` `--dataSourceName` `--dataSourceRemark` `--sharedConfig` `--envJsonList` `--confirmed` |
| `+online_datasource` | Online datasource | `--spaceCode` `--dataSourceNames` `--confirmed` |
| `+list_space_datasources` | List datasources | `--spaceCode` `--componentName` `--dataSourceName` |
| `+list_sync_datasources` | Sync datasources | `--spaceCode` `--env` |
| `+list_datasource_databases` | List databases | `--spaceCode` `--datasourceId` `--env` |
| `+list_datasource_tables` | List tables | `--spaceCode` `--datasourceId` `--database` `--env` |
| `+get_table_structure` | Table structure | `--spaceCode` `--datasourceId` `--database` `--tablePath` `--env` |
| `+add_sync_solution` | Create sync solution | `--spaceCode` `--syncName` `--srcComponent` `--srcDatasourceId` `--sinkComponent` `--sinkDatasourceId` `--sourceConfig` `--sinkConfig` `--channelConfig` `--fieldsMapping` `--confirmed` |
| `+save_sync_solution` | Update sync solution | `--spaceCode` `--syncId` `--syncName` `--sourceConfig` `--sinkConfig` `--channelConfig` `--fieldsMapping` `--confirmed` |
| `+list_sync_solutions` | List sync solutions | `--spaceCode` |
| `+get_sync_detail` | Sync solution details | `--spaceCode` `--syncId` `--withParams` |
| `+exec_sync_solution` | Execute sync | `--spaceCode` `--syncId` `--execParams` `--confirmed` |
| `+list_sync_exec_histories` | Execution history | `--spaceCode` `--syncId` `--execType` `--limit` |
| `+get_sync_exec_info` | Execution details | `--spaceCode` `--syncId` `--taskId` |
| `+stop_sync_solution` | Stop sync | `--spaceCode` `--syncId` `--taskId` `--confirmed` |

## Component Conditional Required Parameters

Some components have conditional required parameters that vary based on deployment mode. The requiredFields from `+list_datasource_components` may not include these parameters (they are explained in optionalFields or importantNotes). When creating datasources, be sure to supplement corresponding parameters based on the user's selected mode.

### MongoDB

| mode value | Additional required parameters | Description |
|------------|-------------------------------|-------------|
| `single` | None | Single node mode |
| `replicaSet` | `replicaSet` | Replica set name (e.g., `rs0`), field name is `replicaSet` not `replicaSetName` |
| `sharded` | None | Sharded cluster mode |

**MongoDB envJsonList examples for each mode:**

Single node:
```json
[{"mode":"single","nodes":[{"host":"10.0.0.1","port":"27017"}],"database":"mydb","username":"admin","password":"xxx"}]
```

Replica set (note `replicaSet` is required):
```json
[{"mode":"replicaSet","nodes":[{"host":"10.0.0.1","port":"27017"},{"host":"10.0.0.2","port":"27017"}],"database":"mydb","username":"admin","password":"xxx","replicaSet":"rs0"}]
```

Sharded cluster:
```json
[{"mode":"sharded","nodes":[{"host":"10.0.0.1","port":"27017"},{"host":"10.0.0.2","port":"27017"}],"database":"mydb","username":"admin","password":"xxx"}]
```

---

## Key Rules

1. **Table name rule**: When writing to preset repository, if table name not specified, use `ods_${source_table_name}_${component_name_lowercase}`
2. **tablePath**: PostgreSQL uses `schema.table_name`, other components use table name directly
3. **Preset repository database is empty**, non-preset repository database is required
4. **channelConfig**: Must include gatewayConfig when involving preset repository
5. **Field mapping**: Each field object must include manual/partitionKey/primaryKey/shardingKey/sortingKey/upsertKey properties
6. **Conditional required parameters**: Some components (e.g., MongoDB) have additional required fields based on mode, see "Component Conditional Required Parameters" above
