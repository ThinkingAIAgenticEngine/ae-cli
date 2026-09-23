---
name: dataops-integration
version: 1.0.0
description: "Datasource and data integration: create datasources, configure sync solutions and field mappings, execute and monitor runs. Trigger keywords: datasource, sync, integration, field mapping, data ingestion, MySQL, ClickHouse, DatabricksJdbc."
metadata:
  requires:
    bins: ["ae-cli"]
---

# DataOps Datasource and Data Integration

> **Prerequisites:** Read [`ae-dataops/SKILL.md`](../SKILL.md) for general rules.

Use the `dataops_integration` subcommand to manage datasources and sync solutions.

**Core Rules:**
- Configuration parameters differ significantly between preset repositories (te_etl) and non-preset repositories, must strictly follow templates
- sourceConfig/sinkConfig/channelConfig/fieldsMapping are all JSON strings
- Sync solution updates are not partial patches. The current detail command returns a summary, not complete editable configs; follow [Update an Existing Sync Solution](#workflow-d-update-an-existing-sync-solution).
- Test datasource connection before creating sync solution
- `sinkConfig.dataSaveMode` codes are fixed: `1 = APPEND_DATA` (insert/append new data; UI label `插入新数据`), `2 = OVERWRITE` (`DROP_DATA`; UI label `覆盖写入`). Never describe `dataSaveMode=1` as overwrite; use `2` for overwrite.
- Integration `--dry-run` only previews the local request. It does not validate nested JSON, permissions, connections, or execution readiness on the server.

---

## Workflow A: Create Datasource

Use the selected component's returned template. The values in angle brackets below are illustrative; replace them with the user's real connection settings before execution. For MySQL, `jdbcUrl` and the separate `database` field are both required.

```bash
# Step 1: View supported datasource component types. No spaceCode is required.
ae-cli dataops_integration +list_datasource_components

# Step 2: Get envJsonList template for one component
ae-cli dataops_integration +get_datasource_component_template \
  --componentName "MySQL"

# Step 3: Create datasource
ae-cli dataops_integration +add_datasource --spaceCode "${spaceCode}" \
  --componentName "MySQL" --dataSourceName "${datasourceName}" \
  --sharedConfig true \
  --envJsonList '[{"jdbcUrl":"jdbc:mysql://<host>:3306/<database>","database":"<database>","username":"<username>","password":"<password>"}]'

# Step 4: Test the saved datasource connection by name.
ae-cli dataops_integration +test_datasource_connect --spaceCode "${spaceCode}" \
  --datasourceName "${datasourceName}"
```

Read back the exact datasource name with `+get_datasource_detail`. Creation does not prove connectivity: require `connectStatus=SUCCESS` from the connection test and inspect `connectFails` otherwise. For `+online_datasource`, inspect both `successDataSourceNames` and `failDataSources`; a successful command envelope can contain individual failures.

---

## Workflow B: Create Sync Solution

Resolve the source/sink identities and source selection (table, filtered table, or custom query), target table and field mapping, and intended write mode before saving. Daily frequency does not imply append or overwrite: settle `dataSaveMode` from the user's intent, including the supported upsert keys when upsert is selected. Ask only for choices that remain unresolved after discovery. Use `+get_sync_detail --withParams true` for an existing solution's `usedParams` before deciding whether a manual run needs `baseDate` (`bd`).

### Step 1: View Available Datasources

```bash
# View all datasources in workspace
ae-cli dataops_integration +list_space_datasources --spaceCode "${spaceCode}"

# View one datasource detail when connection config or failure reason is needed
ae-cli dataops_integration +get_datasource_detail --spaceCode "${spaceCode}" \
  --datasourceName "${datasourceName}"

# View datasources available for sync (categorized by source/sink)
ae-cli dataops_integration +list_sync_datasources --spaceCode "${spaceCode}" --env DEV
```

### Step 2: Browse Source Table Structure

Current limitation: `+list_datasource_databases` cannot discover databases for a `te_etl@...` datasource because the backend requires `bizClassify`, which this CLI command does not expose. Report that step as unsupported; do not invent a flag or bypass the CLI through an undocumented API. The commands below cover ordinary external datasources. A catalog value must come from trusted configuration or discovery, not a guessed default.

```bash
# List databases under datasource
ae-cli dataops_integration +list_datasource_databases --spaceCode "${spaceCode}" \
  --datasourceId "${datasourceId}"

# List tables under database
ae-cli dataops_integration +list_datasource_tables --spaceCode "${spaceCode}" \
  --datasourceId "${datasourceId}" --database "${database}"
# For catalog-based sources such as Databricks, add --catalog "${catalog}".

# Get table structure (columns and partitionColumns)
ae-cli dataops_integration +get_table_structure --spaceCode "${spaceCode}" \
  --datasourceId "${datasourceId}" --database "${database}" --tablePath "${tablePath}"
# For catalog-based sources such as Databricks, add --catalog "${catalog}".
```

### Step 3: Create Sync Solution

Generate the four JSON strings from the templates below with real discovered values, then place them in the shell variables used here. `sourceConfig.datasourceId` must equal `--srcDatasourceId`; `sinkConfig.datasourceId` must equal `--sinkDatasourceId`. Use the same selected `spaceCode` throughout. Do not execute template IDs or table names. Gaia fills `gatewayConfig` from the selected space on creation; do not supply a guessed `companyId` or copy another space's gateway settings.

```bash
ae-cli dataops_integration +add_sync_solution --spaceCode "${spaceCode}" \
  --syncName "${syncName}" \
  --srcComponent "MySQL" --srcDatasourceId "${mysqlDatasourceId}" \
  --sinkComponent "te_etl" --sinkDatasourceId "te_etl@TASK_ENGINE_TRINO" \
  --sourceConfig "${sourceConfigJson}" --sinkConfig "${sinkConfigJson}" \
  --channelConfig "${channelConfigJson}" --fieldsMapping "${fieldsMappingJson}"
```

On creation, take `syncId` from `data.result.syncId` in the default CLI JSON envelope, then read `+get_sync_detail` for that exact ID. This verifies the saved identity and exposed summary fields; it does not prove all original JSON fields or a successful run. Preserve the submitted complete configuration when later edits may be needed.

### Step 4: Execute Sync Only When Requested

```bash
# Manually execute sync solution
ae-cli dataops_integration +exec_sync_solution --spaceCode "${spaceCode}" \
  --syncId "${syncId}" --baseDate "${baseDate}"

# Read back the submitted taskId among manual sync runs
ae-cli dataops_integration +list_sync_runs --spaceCode "${spaceCode}" \
  --syncId "${syncId}" --limit 20

# Stop execution if necessary
ae-cli dataops_integration +stop_sync_solution --spaceCode "${spaceCode}" \
  --syncId "${syncId}" --taskId "${taskId}"
```

Execution returns `data.result.taskId` and `data.result.status`. The outer `ok:true` and `data.status=SUCCESS` acknowledge the action, not completed data movement. Match that exact `taskId` in `data.runs[]` from `+list_sync_runs`; do not use the newest row without matching its ID. Run states are `WAIT`, `RUNNING`, or `RETRY` while active; `FINISHED` is successful completion, `FAILED` is failure, and `KILLED` is termination. After a stop request, read back the same task instead of treating the stop response as proof of termination. If the task is missing, has an unknown status, or remains active beyond the available wait, report the original `syncId/taskId` and last observed state; do not submit another run to obtain a clearer result.

---

## Workflow C: Schedule Daily Sync Without a Manual Run

For an intent such as "sync this MySQL table daily, publish it, but do not run it now":

1. Complete datasource/solution discovery and configuration above, including target write mode and required date parameters. Reuse the exact existing solution when it already matches the intent.
2. Follow [Create or Modify Integration Sync Task](dataops-flow-create.md#step-3-create-or-modify-integration-sync-task): create or select the intended flow and bind its DEV integration node to the real `syncId`.
3. Follow [Configure Schedule](dataops-flow-create.md#step-7-configure-schedule), using the requested daily time and the platform's configured timezone. Resolve an unspecified or ambiguous time/timezone before setting the schedule.
4. Preview the release, check its business result, and release using [Release to Production and Verify](dataops-flow-create.md#step-9-release-to-production-and-verify). Read `+get_flow_overview --env PROD` for the same `flowCode` and verify the visible integration node, dependencies, enabled schedule, and CRON. The overview does not expose the node's `syncId`; retain the create/update result's `taskCode/syncId` and available release-preview evidence for the binding, and state this readback limit.
5. Finish with the saved `syncId`, published `flowCode`, verified visible PROD configuration, and the fact that no manual execution was submitted. Do not call `+exec_sync_solution` or `+execute_flow` for this intent. Publication establishes configuration readiness, not the success of a future scheduled run.

## Workflow D: Update an Existing Sync Solution

First inspect the exact `syncId` with `+get_sync_detail --withParams true`. Its `source`, `sink`, and `fieldMapping` are summaries; `withParams` adds `usedParams`, not complete editable `sourceConfig`, `sinkConfig`, `channelConfig`, or `fieldsMapping`. Do not reverse-engineer a replacement payload from those summaries.

Use `+save_sync_solution` only when a trusted, complete original configuration for that same solution is available, such as the retained creation payload, and there is no indication it has since changed. Change the requested values in that configuration and preserve the remaining fields, including channel settings and field mappings. If the original is unavailable or stale, report the current CLI/backend capability gap and request the complete current configuration; do not guess it or create a replacement solution. After saving, read back the same `syncId` and verify the exposed changed fields, explicitly identifying any fields the summary cannot verify.

---

## JSON Configuration Templates

These examples show structure, not real resource identities. Replace `ds-id`, database/table names, field names/types, and sample query/filter values from the selected resources. Keep component-specific key names and JSON value types. The MySQL query source intentionally omits `database` and `tablePath`.

### Preset Repository as Source (sourceConfig)

```json
{
  "component": "te_etl",
  "datasourceId": "te_etl@TASK_ENGINE_TRINO",
  "tablePath": "source_table",
  "tableType": "PHYSICAL_TABLE",
  "bizClassify": "CURRENT",
  "dbBizType": "TASK_ENV_DB",
  "authedSpace": "",
  "partitionKeys": [],
  "successOnEmpty": false
}
```

### Preset Repository as Target (Sink)

```json
{
  "component": "te_etl",
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

### MySQL table source without filter

```json
{
  "component": "MySQL",
  "datasourceId": "ds-id",
  "database": "demo",
  "tablePath": "orders",
  "batchSize": 1000
}
```

### MySQL table source with splitColumn

```json
{
  "component": "MySQL",
  "datasourceId": "ds-id",
  "database": "demo",
  "tablePath": "orders",
  "splitColumn": "id",
  "batchSize": 1000
}
```

### MySQL table source with whereCondition

```json
{
  "component": "MySQL",
  "datasourceId": "ds-id",
  "database": "demo",
  "tablePath": "orders",
  "whereCondition": "WHERE created_at >= '2026-07-01'",
  "batchSize": 1000
}
```

### MySQL custom query source

```json
{
  "component": "MySQL",
  "datasourceId": "ds-id",
  "query": "SELECT id, amount FROM orders",
  "batchSize": 1000
}
```

Use exactly one mode. Table mode requires `database` and `tablePath` and may include
non-empty `splitColumn` and `whereCondition`. Query mode requires non-empty `query`
and must not include table-only fields. `batchSize` must be an integer from `1000` to
`10000`; omit it to use the backend default `1000`.

The GUI may send `readType` (`1=table`, `2=query`) and `hasCondition` (`0=off`, `1=on`).
They are optional for CLI calls. Prefer the canonical templates above. In table mode,
`hasCondition=1` requires a non-empty `whereCondition`.

MySQL Source read partitioning uses `sourceConfig.splitColumn`;
`fieldsMapping.shardingKey` is column metadata and must not be used for it.

### MySQL sink target

```json
{
  "component": "MySQL",
  "datasourceId": "ds-id",
  "database": "demo",
  "tablePath": "orders",
  "dataSaveMode": 2,
  "batchSize": 1000
}
```

MySQL Sink requires non-empty `database` and `tablePath` and must not contain a
`query` key. `dataSaveMode` must be a JSON integer: `1=append`, `2=overwrite`,
`3=upsert`; omit it to use default `2`. `batchSize` must be a JSON integer from
`1000` to `10000`; omit it to use default `1000`. Strings, enum names, decimals,
booleans, `null`, and out-of-range values are rejected.

### channelConfig

For a new solution, Gaia generates `gatewayConfig` from its space. The minimal no-limit example is:

```json
{
  "limitType": "0"
}
```

For updates, preserve the complete trusted original channel settings. If `gatewayConfig` is omitted, Gaia retains the existing gateway settings or derives them from the space; never fabricate tenant or space values.

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
| `+list_datasource_components` | List supported datasource components | None |
| `+get_datasource_component_template` | Component envJsonList template | `--componentName` |
| `+test_datasource_connect` | Test saved datasource connection | `--spaceCode` `--datasourceName` |
| `+add_datasource` | Create datasource | `--spaceCode` `--componentName` `--dataSourceName` `--sharedConfig` `--envJsonList` `[--dataSourceRemark]` |
| `+modify_datasource` | Modify datasource | `--spaceCode` `--dataSourceName` `[--dataSourceRemark]` `[--sharedConfig]` `[--envJsonList]` |
| `+online_datasource` | Online datasource | `--spaceCode` `--dataSourceNames` |
| `+list_space_datasources` | List datasources | `--spaceCode` `[--datasourceName]` `[--componentName]` |
| `+get_datasource_detail` | Datasource detail | `--spaceCode` `--datasourceName` |
| `+list_sync_datasources` | Sync datasources | `--spaceCode` `[--env]` |
| `+list_datasource_databases` | List datasource databases | `--spaceCode` `--datasourceId` `[--catalog]` `[--env]` |
| `+list_datasource_tables` | List datasource tables | `--spaceCode` `--datasourceId` `--database` `[--catalog]` `[--env]` |
| `+get_table_structure` | Datasource table structure | `--spaceCode` `--datasourceId` `--database` `--tablePath` `[--catalog]` `[--env]` |
| `+add_sync_solution` | Create sync solution | `--spaceCode` `--syncName` `--srcComponent` `--srcDatasourceId` `--sinkComponent` `--sinkDatasourceId` `--sourceConfig` `--sinkConfig` `[--channelConfig]` `[--fieldsMapping]` `[--remark]` |
| `+save_sync_solution` | Update sync solution | `--spaceCode` `--syncId` `--sourceConfig` `--sinkConfig` `[--syncName]` `[--channelConfig]` `[--fieldsMapping]` `[--remark]` |
| `+list_sync_solutions` | List sync solutions | `--spaceCode` |
| `+get_sync_detail` | Sync solution detail | `--spaceCode` `--syncId` `[--withParams]` |
| `+exec_sync_solution` | Execute sync | `--spaceCode` `--syncId` `[--baseDate]` `[--comment]` |
| `+list_sync_runs` | Manual sync runs | `--spaceCode` `--syncId` `[--limit]` |
| `+stop_sync_solution` | Stop one running sync execution task | `--spaceCode` `--syncId` `--taskId` |

- **Datasource components**: `+list_datasource_components` requires no arguments. It returns an array of `componentName`, `componentType`, and `description`.
- **Datasource component template**: `+get_datasource_component_template` requires only `--componentName`. It returns component metadata, `requiredFields`, `optionalFields`, `envJsonExampleObject`, and `importantNotes`.
- **Datasource list**: `+list_space_datasources` requires `--spaceCode`; `--datasourceName` and `--componentName` are optional filters. It returns datasource summary fields including `datasourceId`, `dataSourceComponentName`, `dataSourceName`, `dataSourceRemark`, `dataSourceStatus`, `connectStatus`, `syncTaskNum`, and `sharedConfig`.
- **Datasource detail**: `+get_datasource_detail` requires `--spaceCode` and `--datasourceName`. It returns `datasourceId`, `dataSourceComponentName`, `dataSourceName`, `dataSourceRemark`, `dataSourceStatus`, `connectStatus`, `syncTaskNum`, `sharedConfig`, masked `connectConfig`, `connectFails`, and `lastConnectTime`.
- **Datasource creation**: `+add_datasource` creates directly (`risk: write`, no CLI confirmation). `envJsonList` must be a JSON array string using keys from the component template `requiredFields`; `sharedConfig=true` uses one config for DEV/PROD, while `sharedConfig=false` requires two configs (DEV, PROD).
- **Datasource connection test**: `+test_datasource_connect` requires `--spaceCode` and `--datasourceName`. It tests the saved datasource config and returns `datasourceName`, `connectStatus`, `connectFails`, `lastConnectTime`, and `nextAction`.
- **Datasource modification**: `+modify_datasource` creates no preview; it updates only provided optional fields (`risk: write`). Use `--envJsonList` with the same JSON array format as `+add_datasource`.
- **Datasource online**: `+online_datasource` requires `--spaceCode` and `--dataSourceNames`. It executes directly (`risk: write`) and returns `failDataSources` and `successDataSourceNames`.
- **Sync datasources**: `+list_sync_datasources` requires `--spaceCode`; `--env` is optional and defaults to `DEV`. It returns `sourceComponentSet` and `sinkComponentSet`, grouped by component, with `dataSourceList` and `supportableComponent`.
- **Datasource databases**: `+list_datasource_databases` requires `--spaceCode` and `--datasourceId`; `--catalog` and `--env` are optional, and `--env` defaults to `DEV`. It returns an array of objects with `databaseName`. Current `te_etl@...` database discovery is unsupported because the CLI lacks the required `bizClassify` parameter.
- **Datasource tables**: `+list_datasource_tables` requires `--spaceCode`, `--datasourceId`, and `--database`; `--catalog` and `--env` are optional, and `--env` defaults to `DEV`. It returns table metadata including `database`, `tableName`, `tableType`, `tableComment`, `engine`, `disabled`, `disabledReasons`, `sameVersion`, and `supportSharding`.
- **Datasource table structure**: `+get_table_structure` requires `--spaceCode`, `--datasourceId`, `--database`, and `--tablePath`; `--catalog` and `--env` are optional, and `--env` defaults to `DEV`. It returns `columns` and `partitionColumns`.
- **Sync solution list**: `+list_sync_solutions` requires only `--spaceCode`. It returns sync metadata including `syncId`, `syncName`, source/sink datasource and table fields, last execution/schedule status codes, owner, remark, and timestamps.
- **Sync detail**: `+get_sync_detail` requires `--spaceCode` and `--syncId`; `--withParams` is optional and defaults to `false`. It returns source, sink, and field mapping summaries, last execution/schedule status, owner, and `nextAction`; `withParams=true` also returns `usedParams`. It does not return complete editable configs.
- **Sync update**: `+save_sync_solution` requires `--spaceCode`, `--syncId`, `--sourceConfig`, and `--sinkConfig`; `--syncName`, `--channelConfig`, `--fieldsMapping`, and `--remark` are optional. `syncName` is accepted for compatibility but ignored; the current name is preserved. `sourceConfig` and `sinkConfig` must be complete JSON strings from a trusted original configuration, not reconstructed from `+get_sync_detail`; pass complete `channelConfig` and `fieldsMapping` when keeping or updating them. Follow [the update workflow](#workflow-d-update-an-existing-sync-solution) when the original configuration is unavailable.
- **Sync runs**: `+list_sync_runs` requires `--spaceCode` and `--syncId`; `--limit` is optional and defaults to `20`. It returns `runs`, `returnedCount`, `limit`, and `nextAction`; each run includes `taskId`, `execType`, `status`, `execTime`, `channelMode`, and `submitter`.
- **Stop sync run**: `+stop_sync_solution` requires `--spaceCode`, `--syncId`, and `--taskId`. Use `taskId` from `+list_sync_runs` for an active run. It returns `action`, `result` with `execStatus`, `syncId`, and `taskId`, and top-level `status`.

## Component Conditional Required Parameters

Some components have conditional required parameters that vary based on deployment mode. The requiredFields from `+get_datasource_component_template` may not include these parameters (they are explained in optionalFields or importantNotes). When creating datasources, be sure to supplement corresponding parameters based on the user's selected mode.

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
3. **Database**: Preset repository configurations use an empty database. External table-mode source/sink configurations require a database; MySQL custom query sources must omit database and the other table-only fields.
4. **channelConfig**: Gaia builds gatewayConfig from the selected space on creation. Preserve trusted channel settings on update; do not guess companyId or copy gateway settings from another space.
5. **Field mapping**: Each field object must include manual/partitionKey/primaryKey/shardingKey/sortingKey/upsertKey properties
6. **Conditional required parameters**: Some components (e.g., MongoDB) have additional required fields based on mode, see "Component Conditional Required Parameters" above
