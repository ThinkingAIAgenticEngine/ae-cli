# te-mcp-analysis-extend 工具列表分析

## 服务信息

- **服务名称**: te-mcp-analysis-extend
- **组件名**: te-mcp-analysis-extend
- **映射路径**: analysis-extend
- **完整 URL**: `${HOST}/mcp/te-mcp-analysis-extend/http/analysis-extend`
- **描述**: TA 分析扩展服务，提供元数据管理与业务资产管理能力

## 工具分类统计

总计 **28 个工具**，按功能域分类：

### 1. 预警管理 (Alert Management) - 5 个工具
- `get_alert_definition_schema` - 获取预警定义 schema
- `list_alerts` - 列出预警任务
- `get_alert` - 获取单个预警详情
- `create_alert` - 创建预警
- `update_alert` - 更新预警

### 2. 元数据批量管理 (Metadata Batch Management) - 2 个工具
- `batch_edit_metadata` - 批量编辑系统元数据
- `batch_create_metadata` - 批量创建系统元数据

### 3. 虚拟元数据管理 (Virtual Metadata) - 2 个工具
- `create_virtual_event` - 创建虚拟事件
- `create_virtual_property` - 创建 SQL 虚拟属性

### 4. 指标管理 (Metric Management) - 4 个工具
- `list_metrics` - 列出指标元数据
- `get_metric` - 获取指标定义
- `create_metric` - 创建指标
- `update_metric` - 更新指标

### 5. 埋点方案管理 (Tracking Plan) - 3 个工具
- `get_track_program` - 查询埋点方案
- `save_track_items` - 新增/更新埋点方案条目
- `delete_track_items` - 删除埋点方案条目

### 6. 标签与分群刷新 (Tag/Cluster Refresh) - 2 个工具
- `refresh_tag` - 触发标签重算
- `refresh_cluster` - 触发分群重算

### 7. 仪表盘备注管理 (Dashboard Note) - 1 个工具
- `create_or_update_dashboard_note` - 创建或更新仪表盘备注

### 8. 公开链接管理 (Public Access Link) - 3 个工具
- `list_public_access_links` - 列出公开链接
- `create_public_access_link` - 创建公开链接
- `update_public_access_link` - 更新公开链接

### 9. 模型辅助查询 (Model Assist) - 2 个工具
- `load_filters` - 加载属性候选值
- `get_table_columns` - 查询表字段信息

### 10. 项目日期标注 (Project Mark Time) - 4 个工具
- `create_project_mark_time` - 创建日期标注
- `update_project_mark_time` - 更新日期标注
- `list_project_mark_times` - 列出日期标注
- `delete_project_mark_times` - 删除日期标注

## 工具详细信息

### 预警管理工具

#### get_alert_definition_schema
- **描述**: 获取预警定义结构文档（字段、枚举、示例），用于构造 `create_alert`/`update_alert` 的 definition
- **参数**: 无
- **风险**: read

#### list_alerts
- **描述**: 列出项目预警任务，支持按名称关键字过滤
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `query` (String, optional) - 预警名称模糊匹配关键字
- **风险**: read

#### get_alert
- **描述**: 查询单个预警详情
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `alertId` (Integer, required) - 预警 ID
- **风险**: read

#### create_alert
- **描述**: 创建预警任务（definition 为 JSON）
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `definition` (String, required) - 预警定义 JSON（结构参考 `get_alert_definition_schema`）
- **风险**: write

#### update_alert
- **描述**: 更新预警任务（全量替换定义字段）
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `alertId` (Integer, required) - 预警 ID
  - `definition` (String, required) - 更新后的预警定义 JSON
- **风险**: write

### 元数据批量管理工具

#### batch_edit_metadata
- **描述**: 批量编辑已生效系统元数据（事件/事件属性/用户属性）
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `type` (String, required) - 元数据类型：`event` / `event_property` / `user_property`
  - `items` (List<Map<String,String>>, required) - 批量编辑项
- **风险**: write
- **注意**: 该工具用于系统元数据，不用于埋点方案（tracking plan）

#### batch_create_metadata
- **描述**: 原子化批量创建系统元数据，并按名称建立关联
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `events` (List<Map<String,Object>>, optional) - 事件列表
  - `eventProperties` (List<Map<String,Object>>, optional) - 事件属性列表
  - `userProperties` (List<Map<String,Object>>, optional) - 用户属性列表
- **风险**: write
- **注意**: 三类列表可部分为空，但总创建项不能为空

### 虚拟元数据工具

#### create_virtual_event
- **描述**: 创建虚拟事件（多个事件 + 过滤条件组合）
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `eventName` (String, required) - 虚拟事件名（需以 `ta@` 开头）
  - `eventDesc` (String, required) - 展示名/描述
  - `remark` (String, optional) - 备注
  - `events` (String, required) - 事件数组 JSON
  - `filter` (String, optional) - 全局过滤器 JSON
  - `override` (Boolean, optional) - 已存在时是否覆盖
- **风险**: write

#### create_virtual_property
- **描述**: 创建 SQL 虚拟属性
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `propertyName` (String, required) - 属性名（需以 `#vp@` 开头）
  - `propertyDesc` (String, optional) - 展示名/描述
  - `tableType` (String, required) - `event` / `user`
  - `selectType` (String, required) - `string` / `number` / `bool` / `datetime`
  - `sqlExpression` (String, required) - SQL 表达式（Trino 语法）
  - `sqlEventRelationType` (String, required) - `relation_default` / `relation_always` / `relation_by_setting`
  - `relatedEvents` (String, optional) - 关联事件 JSON（`relation_by_setting` 时通常需要）
  - `propertyRemark` (String, optional) - 备注
- **风险**: write

### 指标管理工具

#### list_metrics
- **描述**: 列出项目指标元数据（不执行指标计算）
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `query` (String, optional) - 指标名/展示名/备注模糊匹配关键字
- **风险**: read

#### get_metric
- **描述**: 获取单个指标定义详情（不执行指标计算）
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `metricId` (Long, required) - 指标 ID
- **风险**: read

#### create_metric
- **描述**: 基于分析配置创建指标
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `name` (String, required) - 指标英文名
  - `displayName` (String, required) - 指标展示名
  - `remark` (String, optional) - 指标备注
  - `modelType` (String, required) - `event` / `retention`
  - `events` (String, required) - 指标事件定义 JSON
  - `params` (String, required) - 指标参数 JSON
- **风险**: write

#### update_metric
- **描述**: 更新指标定义
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `metricId` (Long, required) - 指标 ID
  - `name` (String, required) - 指标英文名
  - `displayName` (String, required) - 指标展示名
  - `remark` (String, optional) - 指标备注
  - `modelType` (String, required) - `event` / `retention`
  - `events` (String, required) - 指标事件定义
  - `params` (String, optional) - 指标参数定义
- **风险**: write

### 埋点方案工具

#### get_track_program
- **描述**: 查询埋点方案元数据（非系统元数据）
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
- **风险**: read

#### save_track_items
- **描述**: 新增或更新埋点方案条目（事件、事件属性、用户属性、公共事件属性）
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `trackData` (String, required) - 埋点方案 JSON
- **风险**: write

#### delete_track_items
- **描述**: 删除埋点方案条目
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `deleteData` (String, required) - 待删除条目 JSON
- **风险**: write

### 标签与分群刷新工具

#### refresh_tag
- **描述**: 触发标签重算（异步）
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `tagName` (String, required) - 标签名称
- **风险**: write

#### refresh_cluster
- **描述**: 触发分群重算（异步）
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `clusterName` (String, required) - 分群名称
- **风险**: write

### 仪表盘备注工具

#### create_or_update_dashboard_note
- **描述**: 创建或更新仪表盘备注（传 `noteId` 则更新，否则创建）
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `dashboardId` (Long, required) - 仪表盘 ID
  - `noteId` (Long, optional) - 备注 ID
  - `noteTitle` (String, required) - 备注标题
  - `description` (String, optional) - 备注内容
  - `uiConfig` (String, optional) - 备注 UI 配置 JSON
- **风险**: write

### 公开链接工具

#### list_public_access_links
- **描述**: 列出项目公开访问链接
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
- **风险**: read

#### create_public_access_link
- **描述**: 创建公开访问链接（仪表盘或 BI 看板）
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `companyId` (Integer, optional) - 企业 ID（为空时取项目所属企业）
  - `resourceType` (String, required) - `dashboard` / `bi_panel`
  - `resourceId` (Long, required) - 资源 ID
  - `accessControls` (String, required) - 访问控制 JSON
  - `remark` (String, optional) - 备注
  - `effectiveAt` (String, required) - 生效时间（`yyyy-MM-dd HH:mm:ss`）
  - `expiresAt` (String, required) - 过期时间（`yyyy-MM-dd HH:mm:ss`）
- **风险**: write

#### update_public_access_link
- **描述**: 更新公开访问链接配置
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `companyId` (Integer, optional) - 企业 ID
  - `linkId` (Long, required) - 链接 ID
  - `accessControls` (String, required) - 访问控制 JSON
  - `remark` (String, optional) - 备注
  - `effectiveAt` (String, required) - 生效时间（`yyyy-MM-dd HH:mm:ss`）
  - `expiresAt` (String, required) - 过期时间（`yyyy-MM-dd HH:mm:ss`）
- **风险**: write

### 模型辅助查询工具

#### load_filters
- **描述**: 加载属性候选值，辅助构建过滤条件
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `quot` (String, required) - 属性字段名
  - `tableType` (String, required) - `event` / `user`
  - `eventName` (String, optional) - 事件名（`tableType=event` 时可用于收敛范围）
  - `inputdata` (String, optional) - 候选值前缀过滤
  - `zoneOffset` (Integer, optional) - 时区偏移
  - `clusterDatePolicy` (String, optional) - `LATEST` / `AUTO` / `SPECIFIED`
  - `specifiedClusterDate` (String, optional) - 指定分群日期（`yyyy-MM-dd`）
  - `isReport` (Boolean, optional) - 是否报表模式
- **风险**: read

#### get_table_columns
- **描述**: 查询项目数据表字段列表
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `catalog` (String, required) - catalog
  - `schema` (String, required) - schema
  - `table` (String, required) - 表名
- **风险**: read

### 项目日期标注工具

#### create_project_mark_time
- **描述**: 创建项目日期标注
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `markedAt` (String, required) - 标注时间（`yyyy-MM-dd HH:mm`）
  - `zoneOffset` (Integer, optional) - 时区偏移
  - `content` (String, required) - 标注内容
  - `isVisible` (Integer, optional) - 是否可见（默认 1）
- **风险**: write

#### update_project_mark_time
- **描述**: 更新项目日期标注
- **参数**:
  - `markTimeId` (Integer, required) - 标注 ID
  - `projectId` (Integer, required) - 项目 ID
  - `markedAt` (String, required) - 标注时间（`yyyy-MM-dd HH:mm`）
  - `zoneOffset` (Integer, optional) - 时区偏移
  - `content` (String, required) - 标注内容
  - `isVisible` (Integer, optional) - 是否可见
- **风险**: write

#### list_project_mark_times
- **描述**: 列出项目日期标注
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `zoneOffset` (Integer, optional) - 时区偏移
- **风险**: read

#### delete_project_mark_times
- **描述**: 删除项目日期标注
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `markTimeIds` (List<Integer>, required) - 标注 ID 列表
- **风险**: write

## 来源文件

- `../ta-common-service-debug/ta-mcp/src/main/java/cn/thinkingdata/ta/event/mcp/config/McpServerConfig.java`
- `../ta-common-service-debug/ta-mcp/src/main/java/cn/thinkingdata/ta/event/mcp/tool/extend/SkillPowerTool.java`
- `../ta-common-service-debug/ta-mcp/src/main/java/cn/thinkingdata/ta/event/mcp/tool/extend/alert/AlertTool.java`
- `../ta-common-service-debug/ta-mcp/src/main/java/cn/thinkingdata/ta/event/mcp/tool/extend/meta/MetaPowerTool.java`
- `../ta-common-service-debug/ta-mcp/src/main/java/cn/thinkingdata/ta/event/mcp/tool/extend/meta/VirtualMetaTool.java`
- `../ta-common-service-debug/ta-mcp/src/main/java/cn/thinkingdata/ta/event/mcp/tool/extend/meta/MetricTool.java`
- `../ta-common-service-debug/ta-mcp/src/main/java/cn/thinkingdata/ta/event/mcp/tool/extend/bury/BuryProgramTool.java`
- `../ta-common-service-debug/ta-mcp/src/main/java/cn/thinkingdata/ta/event/mcp/tool/extend/tag/TagPowerTool.java`
- `../ta-common-service-debug/ta-mcp/src/main/java/cn/thinkingdata/ta/event/mcp/tool/extend/cluster/ClusterPowerTool.java`
- `../ta-common-service-debug/ta-mcp/src/main/java/cn/thinkingdata/ta/event/mcp/tool/extend/dashboard/DashboardPowerTool.java`
- `../ta-common-service-debug/ta-mcp/src/main/java/cn/thinkingdata/ta/event/mcp/tool/extend/AccessLinkTool.java`
- `../ta-common-service-debug/ta-mcp/src/main/java/cn/thinkingdata/ta/event/mcp/tool/extend/model/ModelPowerTool.java`
- `../ta-common-service-debug/ta-mcp/src/main/java/cn/thinkingdata/ta/event/mcp/tool/extend/marktime/ProjectMarkTimeTool.java`
