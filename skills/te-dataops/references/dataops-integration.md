---
name: dataops-integration
version: 1.0.0
description: "数据源与数据集成：创建数据源、创建同步方案、配置字段映射、执行同步、监控同步。触发关键词：数据源、同步、integration、sync、字段映射、数据接入、datasource、MySQL、ClickHouse。"
metadata:
  requires:
    bins: ["te-cli"]
---

# DataOps 数据源与数据集成

> **前置条件:** 阅读 [`te-dataops/SKILL.md`](../SKILL.md) 了解通用规则。

使用 `dataops_integration` 子命令管理数据源和同步方案。

**核心规则：**
- 预置仓（te_etl）与非预置仓的配置参数差异很大，必须严格按照模板生成
- sourceConfig/sinkConfig/channelConfig/fieldsMapping 都是 JSON 字符串
- 创建同步方案前先测试数据源连接

---

## 工作流 A：创建数据源

```bash
# Step 1: 查看支持的数据源组件类型
te-cli dataops_integration +list_datasource_components

# Step 2: 测试连接（临时配置，不保存）
te-cli dataops_integration +test_datasource_connect --spaceCode "${spaceCode}" \
  --componentName "MySQL" \
  --configValue '{"host":"localhost","port":3306,"username":"root","password":"xxx","database":"test"}'

# Step 3: 创建数据源
te-cli dataops_integration +add_datasource --spaceCode "${spaceCode}" \
  --componentName "MySQL" --dataSourceName "生产MySQL" \
  --sharedConfig true \
  --envJsonList '[{"host":"localhost","port":3306,"username":"root","password":"xxx"}]' \
  --confirmed true
```

---

## 工作流 B：创建同步方案（完整流程）

### Step 1: 查看可用数据源

```bash
# 查看空间所有数据源
te-cli dataops_integration +list_space_datasources --spaceCode "${spaceCode}"

# 查看可用于同步的数据源（按 source/sink 分类）
te-cli dataops_integration +list_sync_datasources --spaceCode "${spaceCode}"
```

### Step 2: 浏览源表结构

```bash
# 列出数据源下的数据库
te-cli dataops_integration +list_datasource_databases --spaceCode "${spaceCode}" \
  --datasourceId "${datasourceId}"

# 列出数据库下的表
te-cli dataops_integration +list_datasource_tables --spaceCode "${spaceCode}" \
  --datasourceId "${datasourceId}" --database "test"

# 获取表结构（列定义、分区）
te-cli dataops_integration +get_table_structure --spaceCode "${spaceCode}" \
  --datasourceId "${datasourceId}" --database "test" --tablePath "users"
```

### Step 3: 创建同步方案

**关键：必须严格按照下方 JSON 模板生成参数**

```bash
te-cli dataops_integration +add_sync_solution --spaceCode "${spaceCode}" \
  --syncName "MySQL到预置仓同步" \
  --srcComponent "MySQL" --srcDatasourceId "${mysqlDatasourceId}" \
  --sinkComponent "hive" --sinkDatasourceId "te_etl@TASK_ENGINE_TRINO" \
  --sourceConfig '{"component":"MySQL","datasourceId":"xxx","database":"test","tablePath":"users"}' \
  --sinkConfig '{"component":"hive","datasourceId":"te_etl@TASK_ENGINE_TRINO","database":"","tablePath":"ods_users_mysql","tableType":"PHYSICAL_TABLE","bizClassify":"CURRENT","dbBizType":"TASK_ENV_DB","authedSpace":"","partitionKeys":[],"dataSaveMode":1,"batchSize":20000}' \
  --channelConfig '{"limitType":"0","gatewayConfig":{"engineFlag":"TASK_ENGINE_TRINO","companyId":1,"appDefinition":"APP_GAIA","bizFlag":"BIZ_GAIA_TASK_RELEASE","repoCode":"te_etl","spaceCode":"default"}}' \
  --fieldsMapping '{"mapping":[{"source":{"name":"id","type":"int","manual":false,"partitionKey":false,"primaryKey":false,"shardingKey":false,"sortingKey":false,"upsertKey":false},"target":{"name":"id","type":"int","manual":false,"partitionKey":false,"primaryKey":false,"shardingKey":false,"sortingKey":false,"upsertKey":false}}]}' \
  --confirmed true
```

### Step 4: 执行同步

```bash
# 手动执行同步方案
te-cli dataops_integration +exec_sync_solution --spaceCode "${spaceCode}" \
  --syncId "${syncId}" --confirmed true

# 查看执行历史
te-cli dataops_integration +list_sync_exec_histories --spaceCode "${spaceCode}" \
  --syncId "${syncId}" --limit 20

# 查看执行详情
te-cli dataops_integration +get_sync_exec_info --spaceCode "${spaceCode}" \
  --syncId "${syncId}" --taskId "${taskId}"

# 必要时停止执行
te-cli dataops_integration +stop_sync_solution --spaceCode "${spaceCode}" \
  --syncId "${syncId}" --taskId "${taskId}" --confirmed true
```

---

## JSON 配置模板

### 预置仓作为目标端（Sink）

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

### 非预置仓（如 MySQL）

```json
{
  "component": "MySQL",
  "datasourceId": "ds-uuid-xxx",
  "database": "test",
  "tablePath": "users"
}
```

### channelConfig（源端或目标端涉及预置仓时必须包含 gatewayConfig）

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

### fieldsMapping（双列映射）

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

## 命令速查

| 命令 | 用途 | 关键 Flags |
|------|------|-----------|
| `+list_datasource_components` | 支持的组件 | 无 |
| `+list_space_datasources` | 空间数据源 | `--spaceCode` `--componentName` `--dataSourceName` |
| `+add_datasource` | 创建数据源 | `--spaceCode` `--componentName` `--dataSourceName` `--sharedConfig` `--envJsonList` `--confirmed` |
| `+test_datasource_connect` | 测试连接 | `--spaceCode` `--componentName` `--configValue` |
| `+list_datasource_databases` | 列出数据库 | `--spaceCode` `--datasourceId` |
| `+list_datasource_tables` | 列出表 | `--spaceCode` `--datasourceId` `--database` |
| `+get_table_structure` | 表结构 | `--spaceCode` `--datasourceId` `--database` `--tablePath` |
| `+list_sync_solutions` | 同步方案列表 | `--spaceCode` |
| `+add_sync_solution` | 创建同步方案 | `--spaceCode` `--syncName` `--srcComponent` `--srcDatasourceId` `--sinkComponent` `--sinkDatasourceId` `--sourceConfig` `--sinkConfig` `--channelConfig` `--fieldsMapping` `--confirmed` |
| `+exec_sync_solution` | 执行同步 | `--spaceCode` `--syncId` `--confirmed` |
| `+list_sync_exec_histories` | 执行历史 | `--spaceCode` `--syncId` `--execType` `--limit` |
| `+get_sync_exec_info` | 执行详情 | `--spaceCode` `--syncId` `--taskId` |
| `+stop_sync_solution` | 停止同步 | `--spaceCode` `--syncId` `--taskId` `--confirmed` |

## 组件条件必填参数

部分组件存在根据部署模式不同而变化的条件必填参数，`+list_datasource_components` 的 requiredFields 可能不包含这些参数（它们在 optionalFields 或 importantNotes 中说明）。创建数据源时务必根据用户选择的 mode 补齐对应参数。

### MongoDB

| mode 值 | 额外必填参数 | 说明 |
|----------|-------------|------|
| `single` | 无 | 单节点模式 |
| `replicaSet` | `replicaSet` | 副本集名称（如 `rs0`），字段名为 `replicaSet` 而非 `replicaSetName` |
| `sharded` | 无 | 分片集群模式 |

**MongoDB 各模式 envJsonList 示例：**

单节点：
```json
[{"mode":"single","nodes":[{"host":"10.0.0.1","port":"27017"}],"database":"mydb","username":"admin","password":"xxx"}]
```

副本集群（注意 `replicaSet` 必填）：
```json
[{"mode":"replicaSet","nodes":[{"host":"10.0.0.1","port":"27017"},{"host":"10.0.0.2","port":"27017"}],"database":"mydb","username":"admin","password":"xxx","replicaSet":"rs0"}]
```

分片集群：
```json
[{"mode":"sharded","nodes":[{"host":"10.0.0.1","port":"27017"},{"host":"10.0.0.2","port":"27017"}],"database":"mydb","username":"admin","password":"xxx"}]
```

---

## 关键规则

1. **表名规则**: 写入预置仓时，未指定表名则用 `ods_${来源表名}_${组件名小写}`
2. **tablePath**: PostgreSQL 用 `模式.表名`，其他组件直接用表名
3. **预置仓 database 为空**，非预置仓 database 必填
4. **channelConfig**: 涉及预置仓时必须包含 gatewayConfig
5. **字段映射**: 每个字段对象必须包含 manual/partitionKey/primaryKey/shardingKey/sortingKey/upsertKey 属性
6. **条件必填参数**: 部分组件（如 MongoDB）根据 mode 不同有额外必填字段，详见上方「组件条件必填参数」
