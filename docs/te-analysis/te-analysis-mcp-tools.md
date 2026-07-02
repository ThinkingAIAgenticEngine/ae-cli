# te-mcp-analysis 工具列表分析

## 服务信息

- **服务名称**: te-mcp-analysis
- **组件名**: te-mcp-analysis
- **映射路径**: analysis
- **完整 URL**: `${HOST}/mcp/te-mcp-analysis/http/analysis`
- **描述**: TA 分析核心服务，提供模型分析、仪表盘/报告管理、元数据查询能力

## 工具分类统计

总计 **58 个工具**，按功能域分类：

### 1. 元数据查询 (Meta) - 2 个工具
- `list_events` - 列出项目事件元数据（支持字段投影与分页）
- `list_properties` - 列出项目属性元数据（事件属性/用户属性）（支持字段投影与分页）

### 2. 报告管理 (Report Management) - 4 个工具
- `list_reports` - 列出项目可访问报告（支持字段投影与分页）
- `get_report_definition` - 获取报告定义详情
- `query_report_data` - 查询报告数据
- `create_report` - 创建新报告

### 3. 仪表盘管理 (Dashboard Management) - 10 个工具
- `list_dashboards` - 列出项目可访问仪表盘（支持字段投影与分页）
- `query_dashboard_detail` - 获取仪表盘详情
- `query_dashboard_report_data` - 查询仪表盘报告数据
- `create_dashboard` - 创建新仪表盘
- `update_dashboard` - 更新仪表盘配置
- `delete_dashboard` - 删除仪表盘
- `list_bi_panels` - 列出当前 MCP 用户可访问的 BI 仪表盘
- `get_bi_panel_detail` - 获取 BI 仪表盘已发布版本结构、页面、图表和控件 schema
- `query_bi_panel_data` - 查询 BI 仪表盘图表数据或总结摘要正文

> 注意：`copy_dashboard`、`freeze_dashboards`、`move_dashboard`、`list_spaces` 属于 `te-mcp-analysis-extend`（analysis-extend 路由）。

### 4. 报告管理补充 (Report Management)
- `delete_report` - 删除报告（走 analysis 路由）

> 注意：`update_report` 属于 `te-mcp-analysis-extend`。

### 5. 模型分析 (Model Analysis) - 11 个工具
- `query_adhoc` - Ad hoc 分析（支持 10+ 种分析模型）
  - event: 事件分析
  - retention: 留存分析
  - funnel: 漏斗分析
  - distribution: 分布分析
  - attribution: 归因分析
  - heat_map: 热力图分析
  - interval: 间隔分析
  - path: 路径分析
  - rank_list: 排行榜分析
  - prop_analysis: 用户属性分析
  - sql: 自定义 SQL 分析
- `drilldown_users` - 下钻用户列表
- `drilldown_user_events` - 下钻用户事件序列
- `create_result_cluster` - 从分析结果创建分群
- `cancel_query` - 按 requestId 取消当前用户拥有的运行中 MCP 查询
- `build_attribution_analysis_qp` - 构建归因分析 QP（调用 query_adhoc 前使用）
- `build_distribution_analysis_qp` - 构建分布分析 QP
- `build_heat_map_analysis_qp` - 构建热力图分析 QP
- `build_interval_analysis_qp` - 构建间隔分析 QP
- `build_path_analysis_qp` - 构建路径分析 QP
- `build_rank_list_analysis_qp` - 构建排行榜分析 QP

### 6. 分群管理 (Cluster Management) - 9 个工具
- `list_clusters` - 列出项目所有分群
- `get_clusters_by_name` - 按名称查询分群
- `list_cluster_members` - 列出分群成员
- `create_cluster` - 创建分群
- `update_cluster` - 更新分群
- `create_id_cluster` - 通过 CSV 内容创建 ID 分群（异步）
- `update_id_cluster` - 通过 CSV 内容更新 ID 分群（异步）
- `delete_cluster` - 删除分群（有依赖时需二次确认）
- `build_cluster_definition` - 构建分群定义 JSON（辅助 create_cluster/update_cluster）

### 7. 标签管理 (Tag Management) - 9 个工具
- `list_tags` - 列出项目所有标签
- `get_tags_by_name` - 按名称查询标签
- `list_tag_members` - 列出标签成员
- `create_tag` - 创建标签
- `update_tag` - 更新标签
- `create_id_tag` - 通过 CSV 内容创建 ID 标签（异步）
- `update_id_tag` - 通过 CSV 内容更新 ID 标签（异步）
- `delete_tag` - 删除标签（有依赖时需二次确认）
- `build_tag_definition` - 构建标签定义 JSON（辅助 create_tag/update_tag）

### 8. 实体查询 (Entity Query) - 5 个工具
- `list_entities` - 列出实体列表（支持字段投影与分页）
- `query_entity_details` - 查询实体详情
- `query_event_details` - 查询事件详情
- `build_entity_details_sql` - 构建实体详情 SQL
- `build_event_details_sql` - 构建事件详情 SQL

### 9. Schema 查询 (Schema) - 5 个工具
- `get_analysis_query_schema` - 获取分析查询 Schema
- `get_filter_schema` - 获取过滤器 Schema
- `get_groupby_schema` - 获取分组 Schema
- `get_cluster_definition_schema` - 获取分群定义 Schema
- `get_tag_definition_schema` - 获取标签定义 Schema

### 10. 项目配置 (Project Config) - 2 个工具
- `get_project_config` - 获取项目配置
- `list_project_users` - 列出项目成员

### 11. 资源链接 (Resource Link) - 1 个工具
- `get_resource_url` - 获取资源访问 URL

> 说明：`list_alerts` 不在 `te-mcp-analysis`，属于 `analysis-extend` 服务（`te_analysis_extend`）。

## 工具详细信息

### 元数据查询工具

#### list_events
- **描述**: 列出项目事件元数据（生产环境已生效的系统元数据）, 支持关键词过滤、字段投影和分页
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `query` (String, optional) - 关键词过滤，模糊匹配事件名称、显示名/描述和备注
  - `fields` (List<String>, optional) - 返回字段列表；支持：`eventId` / `eventName` / `eventDesc` / `remark` / `eventTag`；默认：`eventId` / `eventName` / `eventDesc` / `remark`
  - `limit` (Integer, optional) - 分页大小，默认 20，最大 50
  - `offset` (Integer, optional) - 分页偏移，默认 0
- **风险**: read

#### list_properties
- **描述**: 列出项目属性元数据（事件属性/用户属性）, 支持关键词过滤、字段投影和分页
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `scope` (String, optional) - 属性范围：event（事件属性）/ user（用户属性）
  - `eventName` (String, optional) - 事件名称，指定后仅返回该事件的属性
  - `query` (String, optional) - 关键词过滤，模糊匹配属性名称、显示名/描述和备注
  - `fields` (List<String>, optional) - 返回字段列表；支持：`propId` / `propName` / `propDesc` / `remark` / `selectType` / `tableType` / `subTableType`；默认：`propId` / `propName` / `propDesc` / `remark` / `selectType` / `tableType`
  - `limit` (Integer, optional) - 分页大小，默认 20，最大 50
  - `offset` (Integer, optional) - 分页偏移，默认 0
- **风险**: read

### 报告管理工具

#### list_reports
- **描述**: 列出当前用户可访问的报告元数据，支持关键词过滤、字段投影和分页
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `query` (String, optional) - 关键词过滤（模糊匹配 reportName、reportDesc、remark）
  - `fields` (List<String>, optional) - 返回字段列表；支持：`reportId` / `reportName` / `reportDesc` / `remark` / `reportModel`；默认：`reportId` / `reportName` / `reportDesc` / `remark` / `reportModel`
  - `limit` (Integer, optional) - 分页大小，默认 20，最大 50
  - `offset` (Integer, optional) - 分页偏移，默认 0
- **风险**: read

#### get_report_definition
- **描述**: 获取单个报告的定义详情（不执行数据查询）
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `reportId` (Long, required) - 报告 ID
- **风险**: read
- **注意**: 计算日期范围时，如果 recentDay 有值则使用 recentDay，否则使用 startTime 和 endTime

#### query_report_data
- **描述**: 查询一个或多个报告的分析数据
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `reportIds` (List<Long>, required) - 报告 ID 列表
  - `filters` (String, optional) - 过滤器 JSON
  - `groupBy` (String, optional) - 分组 JSON 数组
  - `requestId` (String, required) - 必填，用于追踪和取消的唯一请求 ID；必须在查询开始前生成并传入，格式为 `mcp_<32 lowercase hex UUID>`，例如 `mcp_0123456789abcdef0123456789abcdef`；若 caller/agent 停止等待、请求返回 `fetch failed`、或发生 HTTP timeout，backend query may still be running，可用同一个 ID 调 `+cancel_query --request_id <same value>`；requestId 不会自动生成，因为调用方必须在响应前就知道它；省略或空白返回 `REQUEST_ID_REQUIRED`，格式错误返回 `INVALID_REQUEST_ID`；响应 `metadata.requestId` 会回显传入值。
  - `useCache` (Boolean, optional) - 是否使用缓存，默认 true
  - `startDate` (String, optional) - 开始日期 yyyy-MM-dd
  - `endDate` (String, optional) - 结束日期 yyyy-MM-dd
  - `timeGranularity` (String, optional) - 时间粒度：minute/hour/day/week/month/quarter/year/total
  - `timeoutMinutes` (Long, optional) - 查询超时时间（分钟），默认 30
- **风险**: read

#### create_report
- **描述**: 创建新报告
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `reportName` (String, required) - 报告名称（最多 80 字符）
  - `modelType` (String, required) - 模型类型
  - `analysisQuery` (String, required) - 分析查询 JSON
  - `description` (String, optional) - 报告描述
  - `cacheSeconds` (Integer, optional) - 缓存时长（秒）
  - `queryDurationMs` (Long, optional) - 查询耗时（毫秒）
  - `dashboardIds` (List<Long>, optional) - 关联的仪表盘 ID 列表
- **风险**: write

### 仪表盘管理工具

#### list_dashboards
- **描述**: 列出当前用户可访问的仪表盘元数据，支持关键词过滤、字段投影和分页
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `query` (String, optional) - 关键词过滤（模糊匹配仪表盘名称和备注）
  - `fields` (List<String>, optional) - 返回字段列表；支持：`dashboardId` / `dashboardName` / `remark`；默认：`dashboardId` / `dashboardName` / `remark`；dashboard 无单独 desc 字段
  - `limit` (Integer, optional) - 分页大小，默认 20，最大 50
  - `offset` (Integer, optional) - 分页偏移，默认 0
- **风险**: read

#### query_dashboard_detail
- **描述**: 获取仪表盘详情（包含关联报告、备注、共享成员）
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `dashboardId` (Long, required) - 仪表盘 ID
- **风险**: read

#### query_dashboard_report_data
- **描述**: 查询仪表盘内所有报告的数据
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `dashboardId` (Long, required) - 仪表盘 ID
  - `filters` (String, optional) - 过滤器 JSON
  - `groupBy` (String, optional) - 分组 JSON 数组
  - `requestId` (String, required) - 必填，用于追踪和取消的唯一请求 ID；必须在查询开始前生成并传入，格式为 `mcp_<32 lowercase hex UUID>`，例如 `mcp_0123456789abcdef0123456789abcdef`；若 caller/agent 停止等待、请求返回 `fetch failed`、或发生 HTTP timeout，backend query may still be running，可用同一个 ID 调 `+cancel_query --request_id <same value>`；requestId 不会自动生成，因为调用方必须在响应前就知道它；省略或空白返回 `REQUEST_ID_REQUIRED`，格式错误返回 `INVALID_REQUEST_ID`；响应 `metadata.requestId` 会回显传入值。
  - `useCache` (Boolean, optional) - 是否使用缓存
  - `startDate` (String, optional) - 开始日期
  - `endDate` (String, optional) - 结束日期
  - `timeGranularity` (String, optional) - 时间粒度
  - `timeoutMinutes` (Long, optional) - 查询超时时间
- **风险**: read

#### create_dashboard
- **描述**: 创建新仪表盘
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `dashboardName` (String, required) - 仪表盘名称
  - `spaceId` (Long, optional) - 空间 ID
  - `folderId` (Long, optional) - 文件夹 ID
  - `initialReportId` (Long, optional) - 初始报告 ID
  - `noteTitle` (String, optional) - 备注标题
  - `noteDescription` (String, optional) - 备注描述
- **风险**: write

#### update_dashboard
- **描述**: 更新仪表盘配置（报告布局、备注、共享成员）
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `dashboardId` (Long, required) - 仪表盘 ID
  - `reportIds` (List<Long>, optional) - 报告 ID 列表（全量替换）
  - `noteTitle` (String, optional) - 备注标题
  - `noteDescription` (String, optional) - 备注描述
  - `memberAuthorities` (Map<String, Integer>, optional) - 成员权限映射（userId -> authority）
- **风险**: write

#### list_bi_panels
- **描述**: 列出当前 MCP 用户在项目内可访问的 BI 仪表盘，支持名称模糊搜索、字段裁剪和分页；不返回页面、图表、控件、raw config、SQL 或权限规则明细。
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `query` (String, optional) - BI 仪表盘名称关键词
  - `fields` (List<String>, optional) - 返回字段；支持 `panelId` / `name` / `spaceId` / `spaceName` / `ownerName` / `updatedAt` / `pageCount` / `hasSummary`
  - `limit` (Integer, optional) - 分页大小，默认 20，最大 50
  - `offset` (Integer, optional) - 分页偏移，默认 0
- **风险**: read

#### get_bi_panel_detail
- **描述**: 读取单个 BI 仪表盘已发布版本的结构，不执行数据查询。返回页面、可查询图表、总结摘要信息、仪表盘级参数控制、仪表盘级权限控制、页面筛选组件及绑定关系。
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `panelId` (Long, required) - `list_bi_panels` 返回的 BI 仪表盘 ID
  - `fields` (List<String>, optional) - 详情分区；支持 `basic` / `pages` / `charts` / `parameterControls` / `permissionControls` / `chartFilterControls` / `summary`
- **风险**: read
- **注意**: `parameterControls` 保持单值语义；`permissionControls` 和 `chartFilterControls` 返回 `valueMode=scalar_or_array`，其 `allowedValues` 只是选值提示，不是 MCP 侧白名单。

#### query_bi_panel_data
- **描述**: 查询 BI 仪表盘已发布版本的数据。`resultType=charts` 返回一维表格 `columns` + `rows`；`resultType=summary` 返回总结摘要 `markdown` + 分页 `blocks`。
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `panelId` (Long, required) - BI 仪表盘 ID
  - `pageKey` (String, required) - `get_bi_panel_detail` 返回的页面 key
  - `resultType` (String, required) - `charts` 或 `summary`
  - `requestId` (String, required) - 必填，用于追踪和取消的唯一请求 ID；必须在查询开始前生成并传入，格式为 `mcp_<32 lowercase hex UUID>`，例如 `mcp_0123456789abcdef0123456789abcdef`；若 caller/agent 停止等待、请求返回 `fetch failed`、或发生 HTTP timeout，backend query may still be running，可用同一个 ID 调 `+cancel_query --request_id <same value>`；requestId 不会自动生成，因为调用方必须在响应前就知道它；省略或空白返回 `REQUEST_ID_REQUIRED`，格式错误返回 `INVALID_REQUEST_ID`；响应 `metadata.requestId` 会回显传入值。
  - `chartIds` (List<String>, optional) - 查询的图表 ID；不传时查询页面内所有 `queryable=true` 图表
  - `parameterControls` (List<Map>, optional) - 仪表盘级参数控制覆盖值，每项包含 `controlId` 和单个标量 `value`
  - `permissionControls` (List<Map>, optional) - 仪表盘级权限控制筛选值，每项包含 `controlId` 和标量或数组 `value`
  - `chartFilterControls` (List<Map>, optional) - 页面筛选组件值，每项包含 `controlId` 和标量或数组 `value`，只作用于绑定图表
  - `columns` (List<String>, optional) - 返回列，必须来自 detail 返回的图表字段
  - `rowLimit` / `rowOffset` (Integer, optional) - 图表行分页，默认 50 / 0，最大 500 行
  - `blockLimit` / `blockOffset` (Integer, optional) - 总结摘要 block 分页，默认 20 / 0，最大 100 blocks
  - `useCache` (Boolean, optional) - 是否使用缓存，默认 true
  - `timeoutMinutes` (Integer, optional) - 查询超时，默认 3，范围 1-10
- **风险**: read
- **注意**: MCP 入参不暴露 `paramList`、`permissionFilters`、`visualCfg.whereList`、`perssionFilter`、`field`、`columnName`、`userId`、`openId` 等内部字段。长耗时或可取消查询建议在开始前主动传入 `requestId`，值必须使用 `mcp_<32 lowercase hex UUID>`，例如 `mcp_0123456789abcdef0123456789abcdef`；后续即使 caller/agent 停止等待，也可用 `cancel_query(requestId)` 按同一个 ID 取消。

### 模型分析工具

#### query_adhoc
- **描述**: Ad hoc 分析核心工具，支持 10+ 种分析模型
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `modelType` (String, required) - 模型类型
  - `analysisQuery` (String, required) - 分析查询 JSON
  - `zoneOffset` (Integer, optional) - 时区偏移
  - `requestId` (String, required) - 必填，用于追踪和取消的唯一请求 ID；必须在查询开始前生成并传入，格式为 `mcp_<32 lowercase hex UUID>`，例如 `mcp_0123456789abcdef0123456789abcdef`；若 caller/agent 停止等待、请求返回 `fetch failed`、或发生 HTTP timeout，backend query may still be running，可用同一个 ID 调 `+cancel_query --request_id <same value>`；requestId 不会自动生成，因为调用方必须在响应前就知道它；省略或空白返回 `REQUEST_ID_REQUIRED`，格式错误返回 `INVALID_REQUEST_ID`；响应 `metadata.requestId` 会回显传入值。
  - `useCache` (Boolean, optional) - 是否使用缓存
  - `timeoutMinutes` (Long, optional) - 查询超时时间
- **风险**: read
- **支持的模型类型**:
  - event, retention, funnel, distribution, attribution
  - heat_map, interval, path, rank_list, prop_analysis, sql

#### cancel_query
- **描述**: 按 requestId 取消当前 MCP 用户拥有的运行中查询。适用于上一次查询已经不再需要、caller/agent 在查询返回前超时、请求返回 `fetch failed`、发生 HTTP timeout、用户明确要求停止等待、或需要主动取消的场景；如果出现 `fetch failed`/HTTP timeout/caller timeout，backend query may still be running；主动取消时必须在查询开始前生成并传入 `requestId`，值必须使用 `mcp_<32 lowercase hex UUID>`，例如 `mcp_0123456789abcdef0123456789abcdef`；停止等待后用同一个 ID 调 `+cancel_query --request_id <same value>`。
- **参数**:
  - `requestId` (String, required) - 查询工具响应 `metadata.requestId` 返回的 ID，或启动查询前主动传入的 requestId；必须使用 `mcp_<32 lowercase hex UUID>`，例如 `mcp_0123456789abcdef0123456789abcdef`
  - `reason` (String, optional) - 取消原因，默认 `MCP_CANCEL_QUERY_TOOL`
- **风险**: write
- **注意**: 只支持按 requestId 取消；不支持按 SQL、报告 ID、仪表盘 ID、BI panel ID、runId 或 toolCallId 取消。服务端会校验 requestId 是否属于当前 MCP 用户。

### 用户下钻工具

#### drilldown_users
- **描述**: 从分析结果下钻用户列表
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `eventModel` (String, required) - 分析查询 JSON
  - `drilldownDate` (String, optional) - 下钻日期
  - `drilldownGroups` (String, optional) - 下钻分组
  - `eventIndex` (Integer, optional) - 事件索引
  - `isLost` (Boolean, optional) - 是否流失用户
  - `retentionDays` (Integer, optional) - 留存天数
  - `isChurnedUser` (Boolean, optional) - 是否流失用户
  - `funnelStep` (Integer, optional) - 漏斗步骤
  - `interval` (String, optional) - 间隔
  - `distributionBucket` (Integer, optional) - 分布桶
  - `compareIndex` (Integer, optional) - 对比索引
  - `includeTotal` (Boolean, optional) - 是否包含总计
  - `relationVal` (String, optional) - 关系值
  - `page` (Integer, optional) - 页码
  - `pageSize` (Integer, optional) - 每页大小
  - `requestId` (String, required) - 必填，用于追踪和取消的唯一请求 ID；必须在查询开始前生成并传入，格式为 `mcp_<32 lowercase hex UUID>`，例如 `mcp_0123456789abcdef0123456789abcdef`；若 caller/agent 停止等待、请求返回 `fetch failed`、或发生 HTTP timeout，backend query may still be running，可用同一个 ID 调 `+cancel_query --request_id <same value>`；requestId 不会自动生成，因为调用方必须在响应前就知道它；省略或空白返回 `REQUEST_ID_REQUIRED`，格式错误返回 `INVALID_REQUEST_ID`；响应 `metadata.requestId` 会回显传入值。
  - `timeoutMinutes` (Long, optional) - 查询超时时间（分钟），默认 30
- **风险**: read

#### drilldown_user_events
- **描述**: 下钻用户事件序列
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `accountId` (String, required) - 账号 ID
  - `eventModel` (String, required) - 分析查询 JSON
  - `zoneOffset` (Integer, optional) - 时区偏移
  - `page` (Integer, optional) - 页码
  - `pageSize` (Integer, optional) - 每页大小
  - `requestId` (String, required) - 必填，用于追踪和取消的唯一请求 ID；必须在查询开始前生成并传入，格式为 `mcp_<32 lowercase hex UUID>`，例如 `mcp_0123456789abcdef0123456789abcdef`；若 caller/agent 停止等待、请求返回 `fetch failed`、或发生 HTTP timeout，backend query may still be running，可用同一个 ID 调 `+cancel_query --request_id <same value>`；requestId 不会自动生成，因为调用方必须在响应前就知道它；省略或空白返回 `REQUEST_ID_REQUIRED`，格式错误返回 `INVALID_REQUEST_ID`；响应 `metadata.requestId` 会回显传入值。
  - `timeoutMinutes` (Long, optional) - 查询超时时间（分钟），默认 30
- **风险**: read

### 分群管理工具

#### list_clusters
- **描述**: 列出项目所有分群
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `query` (String, optional) - 关键词过滤
  - `fields` (List<String>, optional) - 返回字段投影；支持：`id` / `clusterName` / `displayName` / `clusterType` / `progress` / `usersNum` / `refreshStatus` / `remarks`；默认：`id` / `clusterName` / `displayName` / `remarks` / `clusterType` / `progress` / `usersNum`
  - `limit` (Integer, optional) - 分页大小，默认 20，最大 50
  - `offset` (Integer, optional) - 分页偏移，默认 0
- **风险**: read

#### get_clusters_by_name
- **描述**: 按名称查询分群
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `names` (List<String>, required) - 分群名称列表
- **风险**: read

#### list_cluster_members
- **描述**: 列出分群成员
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `clusterName` (String, required) - 分群名称
  - `propertyNames` (List<String>, optional) - 需要返回的用户属性
  - `useCache` (Boolean, optional) - 是否使用缓存
  - `query` (String, optional) - 关键词过滤
  - `fields` (List<String>, optional) - 返回字段投影
  - `limit` (Integer, optional) - 分页大小，默认 20，最大 50
  - `offset` (Integer, optional) - 分页偏移，默认 0
  - `requestId` (String, required) - 必填，用于追踪和取消的唯一请求 ID；必须在查询开始前生成并传入，格式为 `mcp_<32 lowercase hex UUID>`，例如 `mcp_0123456789abcdef0123456789abcdef`；若 caller/agent 停止等待、请求返回 `fetch failed`、或发生 HTTP timeout，backend query may still be running，可用同一个 ID 调 `+cancel_query --request_id <same value>`；requestId 不会自动生成，因为调用方必须在响应前就知道它；省略或空白返回 `REQUEST_ID_REQUIRED`，格式错误返回 `INVALID_REQUEST_ID`；响应 `metadata.requestId` 会回显传入值。
  - `timeoutMinutes` (Long, optional) - 查询超时时间（分钟），默认 30
- **风险**: read

#### create_cluster
- **描述**: 创建分群
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `clusterName` (String, required) - 分群名称
  - `displayName` (String, required) - 显示名称
  - `type` (String, optional) - 分群类型：condition/sql
  - `definition` (String, required) - 分群定义 JSON
  - `zoneOffset` (Double, optional) - 时区偏移
  - `entityId` (Long, optional) - 实体 ID
- **风险**: write

#### create_result_cluster
- **描述**: 从分析结果创建分群
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `clusterName` (String, required) - 分群名称
  - `displayName` (String, optional) - 显示名称
  - `qp` (String, required) - 分群定义 JSON
  - `eventModel` (String, required) - 分析查询 JSON
  - `zoneOffset` (Integer, optional) - 时区偏移
  - [其他下钻参数...]
- **风险**: write

#### update_cluster
- **描述**: 更新分群
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `clusterName` (String, required) - 分群名称
  - `displayName` (String, optional) - 显示名称
  - `remark` (String, optional) - 备注
  - `type` (String, optional) - 分群类型：condition/sql
  - `definition` (String, optional) - 分群定义 JSON
  - `zoneOffset` (Double, optional) - 时区偏移
- **风险**: write

### 标签管理工具

#### list_tags
- **描述**: 列出项目所有标签
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `query` (String, optional) - 关键词过滤
  - `fields` (List<String>, optional) - 返回字段投影；支持：`id` / `clusterName` / `displayName` / `clusterType` / `subConditionTabType` / `progress` / `usersNum` / `remarks`；默认：`id` / `clusterName` / `displayName` / `remarks` / `clusterType` / `subConditionTabType` / `progress` / `usersNum`
  - `limit` (Integer, optional) - 分页大小，默认 20，最大 50
  - `offset` (Integer, optional) - 分页偏移，默认 0
- **风险**: read

#### get_tags_by_name
- **描述**: 按名称查询标签
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `names` (List<String>, required) - 标签名称列表
- **风险**: read

#### list_tag_members
- **描述**: 列出标签成员
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `tagName` (String, required) - 标签名称
  - `snapshotDate` (String, optional) - 快照日期，格式 YYYY-MM-DD
  - `propertyNames` (List<String>, optional) - 需要返回的用户属性
  - `useCache` (Boolean, optional) - 是否使用缓存
  - `query` (String, optional) - 关键词过滤
  - `fields` (List<String>, optional) - 返回字段投影
  - `limit` (Integer, optional) - 分页大小，默认 20，最大 50
  - `offset` (Integer, optional) - 分页偏移，默认 0
  - `requestId` (String, required) - 必填，用于追踪和取消的唯一请求 ID；必须在查询开始前生成并传入，格式为 `mcp_<32 lowercase hex UUID>`，例如 `mcp_0123456789abcdef0123456789abcdef`；若 caller/agent 停止等待、请求返回 `fetch failed`、或发生 HTTP timeout，backend query may still be running，可用同一个 ID 调 `+cancel_query --request_id <same value>`；requestId 不会自动生成，因为调用方必须在响应前就知道它；省略或空白返回 `REQUEST_ID_REQUIRED`，格式错误返回 `INVALID_REQUEST_ID`；响应 `metadata.requestId` 会回显传入值。
  - `timeoutMinutes` (Long, optional) - 查询超时时间（分钟），默认 30
- **风险**: read

#### create_tag
- **描述**: 创建标签
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `tagName` (String, required) - 标签名称
  - `displayName` (String, required) - 显示名称
  - `type` (String, optional) - 标签类型：condition/metric/first_last/sql
  - `definition` (String, required) - 标签定义 JSON
  - `zoneOffset` (Double, optional) - 时区偏移
  - `entityId` (Long, optional) - 实体 ID
- **风险**: write

#### update_tag
- **描述**: 更新标签
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `tagName` (String, required) - 标签名称
  - `displayName` (String, optional) - 显示名称
  - `remark` (String, optional) - 备注
  - `type` (String, optional) - 标签类型：condition/metric/first_last/sql
  - `definition` (String, optional) - 标签定义 JSON
  - `zoneOffset` (Double, optional) - 时区偏移
- **风险**: write

### 实体查询工具

#### list_entities
- **描述**: 列出实体列表, 支持关键词过滤、字段投影和分页
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `query` (String, optional) - 关键词过滤 (模糊匹配实体名称, 数据库列名, 数据库列名描述)
  - `fields` (List<String>, optional) - 返回字段列表；支持：`entityId` / `entityName` / `columnName` / `columnDesc` / `selectType` / `tableType` / `entityType`；默认：`entityId` / `entityName` / `columnName` / `columnDesc` / `selectType`；entity 无 remark 字段
  - `limit` (Integer, optional) - 分页大小，默认 20，最大 50
  - `offset` (Integer, optional) - 分页偏移，默认 0
- **风险**: read

#### query_entity_details
- **描述**: 查询实体详情
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `entityId` (String, required) - 实体 ID
  - `properties` (List<String>, optional) - 属性列表
  - `requestId` (String, required) - 必填，用于追踪和取消的唯一请求 ID；必须在查询开始前生成并传入，格式为 `mcp_<32 lowercase hex UUID>`，例如 `mcp_0123456789abcdef0123456789abcdef`；若 caller/agent 停止等待、请求返回 `fetch failed`、或发生 HTTP timeout，backend query may still be running，可用同一个 ID 调 `+cancel_query --request_id <same value>`；requestId 不会自动生成，因为调用方必须在响应前就知道它；省略或空白返回 `REQUEST_ID_REQUIRED`，格式错误返回 `INVALID_REQUEST_ID`；响应 `metadata.requestId` 会回显传入值。
  - `timeoutMinutes` (Long, optional) - 查询超时时间（分钟），默认 30
- **风险**: read

#### query_event_details
- **描述**: 查询事件详情
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `accountId` (String, required) - 账号 ID
  - `startDate` (String, optional) - 开始日期
  - `endDate` (String, optional) - 结束日期
  - `eventNames` (List<String>, optional) - 事件名称列表
  - `page` (Integer, optional) - 页码
  - `pageSize` (Integer, optional) - 每页大小
  - `requestId` (String, required) - 必填，用于追踪和取消的唯一请求 ID；必须在查询开始前生成并传入，格式为 `mcp_<32 lowercase hex UUID>`，例如 `mcp_0123456789abcdef0123456789abcdef`；若 caller/agent 停止等待、请求返回 `fetch failed`、或发生 HTTP timeout，backend query may still be running，可用同一个 ID 调 `+cancel_query --request_id <same value>`；requestId 不会自动生成，因为调用方必须在响应前就知道它；省略或空白返回 `REQUEST_ID_REQUIRED`，格式错误返回 `INVALID_REQUEST_ID`；响应 `metadata.requestId` 会回显传入值。
  - `timeoutMinutes` (Long, optional) - 查询超时时间（分钟），默认 30
- **风险**: read

#### build_entity_details_sql
- **描述**: 构建实体详情 SQL
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `entityId` (String, required) - 实体 ID
  - `properties` (List<String>, optional) - 属性列表
- **风险**: read

#### build_event_details_sql
- **描述**: 构建事件详情 SQL
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `accountId` (String, required) - 账号 ID
  - `startDate` (String, optional) - 开始日期
  - `endDate` (String, optional) - 结束日期
  - `eventNames` (List<String>, optional) - 事件名称列表
- **风险**: read

### Schema 查询工具

#### get_analysis_query_schema
- **描述**: 获取分析查询 Schema
- **参数**: 无
- **风险**: read

#### get_filter_schema
- **描述**: 获取过滤器 Schema
- **参数**: 无
- **风险**: read

#### get_groupby_schema
- **描述**: 获取分组 Schema
- **参数**: 无
- **风险**: read

#### get_cluster_definition_schema
- **描述**: 获取分群定义 Schema
- **参数**:
  - `clusterType` (String, required) - 分群类型：condition/sql
  - `responseMode` (String, optional) - 返回模式：base/examples/full
  - `conditionSubtype` (String, optional) - 条件子类型：core/behavior_seq/all（仅 condition 有效）
- **风险**: read

#### get_tag_definition_schema
- **描述**: 获取标签定义 Schema
- **参数**:
  - `type` (String, required) - 标签类型：condition/metric/first_last/sql
  - `responseMode` (String, optional) - 返回模式：base/examples/full
  - `conditionSubtype` (String, optional) - 条件子类型：core/behavior_seq/all（仅 condition 有效）
- **风险**: read

### 项目配置工具

#### get_project_config
- **描述**: 获取项目配置
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
- **风险**: read

#### list_project_users
- **描述**: 列出项目成员
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
- **风险**: read

### 资源链接工具

#### get_resource_url
- **描述**: 获取资源访问 URL
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `resourceType` (String, required) - 资源类型：dashboard/report/metric/alert/tag/cluster/data_table/super_event/super_prop_user/super_prop_event/virtual_event/user_virtual_prop/event_virtual_prop
  - `resourceId` (Long, required) - 资源 ID
- **风险**: read

## CLI 化建议

### 命令域组织

建议创建新域 `te-analysis`，包含以下子分类：

```
src/commands/te-analysis/
├── index.ts                          # 导出所有命令
├── meta/                             # 元数据查询
│   ├── list-events.ts
│   └── list-properties.ts
├── report/                           # 报告管理
│   ├── list-reports.ts
│   ├── get-report-definition.ts
│   ├── query-report-data.ts
│   └── create-report.ts
├── dashboard/                        # 仪表盘管理
│   ├── list-dashboards.ts
│   ├── query-dashboard-detail.ts
│   ├── query-dashboard-report-data.ts
│   ├── create-dashboard.ts
│   └── update-dashboard.ts
├── model/                            # 模型分析
│   └── query-adhoc.ts
├── drilldown/                        # 用户下钻
│   ├── drilldown-users.ts
│   └── drilldown-user-events.ts
├── cluster/                          # 分群管理
│   ├── list-clusters.ts
│   ├── get-clusters-by-name.ts
│   ├── list-cluster-members.ts
│   ├── create-cluster.ts
│   ├── create-result-cluster.ts
│   └── update-cluster.ts
├── tag/                              # 标签管理
│   ├── list-tags.ts
│   ├── get-tags-by-name.ts
│   ├── list-tag-members.ts
│   ├── create-tag.ts
│   └── update-tag.ts
├── entity/                           # 实体查询
│   ├── list-entities.ts
│   ├── query-entity-details.ts
│   ├── query-event-details.ts
│   ├── build-entity-details-sql.ts
│   └── build-event-details-sql.ts
├── schema/                           # Schema 查询
│   ├── get-analysis-query-schema.ts
│   ├── get-filter-schema.ts
│   ├── get-groupby-schema.ts
│   ├── get-cluster-definition-schema.ts
│   └── get-tag-definition-schema.ts
├── project/                          # 项目配置
│   ├── get-project-config.ts
│   └── list-project-users.ts
└── resource/                         # 资源链接
    └── get-resource-url.ts
```

### 命令命名规范

- 使用 `+` 前缀表示快捷命令
- 使用 kebab-case 命名
- 命令格式：`ae-cli analysis +<tool-name> [options]`

示例：
```bash
ae-cli analysis +list_events --project_id 123
ae-cli analysis +query_adhoc --project_id 123 --model_type event --qp '{...}'
ae-cli analysis +create_report --project_id 123 --report_name "测试报告" --model_type event --analysis_query '{...}'
```
