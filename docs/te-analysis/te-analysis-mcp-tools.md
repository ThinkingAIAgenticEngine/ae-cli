# te-mcp-analysis 工具列表分析

## 服务信息

- **服务名称**: te-mcp-analysis
- **组件名**: te-mcp-analysis
- **映射路径**: analysis
- **完整 URL**: `${HOST}/mcp/te-mcp-analysis/http/analysis`
- **描述**: TA 分析核心服务，提供模型分析、仪表盘/报告管理、元数据查询能力

## 工具分类统计

总计 **38 个工具**，按功能域分类：

### 1. 元数据查询 (Meta) - 2 个工具
- `list_events` - 列出项目事件元数据
- `list_properties` - 列出项目属性元数据（事件属性/用户属性）

### 2. 报告管理 (Report Management) - 4 个工具
- `list_reports` - 列出项目所有报告
- `get_report_definition` - 获取报告定义详情
- `query_report_data` - 查询报告数据
- `create_report` - 创建新报告

### 3. 仪表盘管理 (Dashboard Management) - 5 个工具
- `list_dashboards` - 列出项目所有仪表盘
- `query_dashboard_detail` - 获取仪表盘详情
- `query_dashboard_report_data` - 查询仪表盘报告数据
- `create_dashboard` - 创建新仪表盘
- `update_dashboard` - 更新仪表盘配置

### 4. 模型分析 (Model Analysis) - 4 个工具
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

### 5. 分群管理 (Cluster Management) - 5 个工具
- `list_clusters` - 列出项目所有分群
- `get_clusters_by_name` - 按名称查询分群
- `list_cluster_members` - 列出分群成员
- `create_cluster` - 创建分群
- `update_cluster` - 更新分群

### 6. 标签管理 (Tag Management) - 5 个工具
- `list_tags` - 列出项目所有标签
- `get_tags_by_name` - 按名称查询标签
- `list_tag_members` - 列出标签成员
- `create_tag` - 创建标签
- `update_tag` - 更新标签

### 7. 实体查询 (Entity Query) - 5 个工具
- `list_entities` - 列出实体列表
- `query_entity_details` - 查询实体详情
- `query_event_details` - 查询事件详情
- `build_entity_details_sql` - 构建实体详情 SQL
- `build_event_details_sql` - 构建事件详情 SQL

### 8. Schema 查询 (Schema) - 5 个工具
- `get_analysis_query_schema` - 获取分析查询 Schema
- `get_filter_schema` - 获取过滤器 Schema
- `get_groupby_schema` - 获取分组 Schema
- `get_cluster_definition_schema` - 获取分群定义 Schema
- `get_tag_definition_schema` - 获取标签定义 Schema

### 9. 项目配置 (Project Config) - 2 个工具
- `get_project_config` - 获取项目配置
- `list_project_users` - 列出项目成员

### 10. 资源链接 (Resource Link) - 1 个工具
- `get_resource_url` - 获取资源访问 URL

## 工具详细信息

### 元数据查询工具

#### list_events
- **描述**: 列出项目事件元数据（生产环境已生效的系统元数据）
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `query` (String, optional) - 关键词过滤，模糊匹配事件名称、描述、AI 备注
- **风险**: read

#### list_properties
- **描述**: 列出项目属性元数据（事件属性/用户属性）
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `scope` (String, optional) - 属性范围：event（事件属性）/ user（用户属性）
  - `eventName` (String, optional) - 事件名称，指定后仅返回该事件的属性
  - `query` (String, optional) - 关键词过滤
- **风险**: read

### 报告管理工具

#### list_reports
- **描述**: 列出当前用户可访问的所有报告元数据
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `query` (String, optional) - 关键词过滤
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
  - `requestId` (String, optional) - 唯一请求 ID
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
- **描述**: 列出当前用户可访问的所有仪表盘元数据
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `query` (String, optional) - 关键词过滤
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
  - `requestId` (String, optional) - 唯一请求 ID
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

### 模型分析工具

#### query_adhoc
- **描述**: Ad hoc 分析核心工具，支持 10+ 种分析模型
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `modelType` (String, required) - 模型类型
  - `analysisQuery` (String, required) - 分析查询 JSON
  - `zoneOffset` (Integer, optional) - 时区偏移
  - `requestId` (String, optional) - 唯一请求 ID
  - `useCache` (Boolean, optional) - 是否使用缓存
  - `timeoutMinutes` (Long, optional) - 查询超时时间
- **风险**: read
- **支持的模型类型**:
  - event, retention, funnel, distribution, attribution
  - heat_map, interval, path, rank_list, prop_analysis, sql

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
- **风险**: read

### 分群管理工具

#### list_clusters
- **描述**: 列出项目所有分群
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `query` (String, optional) - 关键词过滤
- **风险**: read

#### get_clusters_by_name
- **描述**: 按名称查询分群
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `clusterName` (String, required) - 分群名称
- **风险**: read

#### list_cluster_members
- **描述**: 列出分群成员
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `clusterId` (Long, required) - 分群 ID
  - `page` (Integer, optional) - 页码
  - `pageSize` (Integer, optional) - 每页大小
- **风险**: read

#### create_cluster
- **描述**: 创建分群
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `clusterName` (String, required) - 分群名称
  - `displayName` (String, optional) - 显示名称
  - `qp` (String, required) - 分群定义 JSON
  - `zoneOffset` (Integer, optional) - 时区偏移
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
  - `clusterId` (Long, required) - 分群 ID
  - `displayName` (String, optional) - 显示名称
  - `qp` (String, optional) - 分群定义 JSON
- **风险**: write

### 标签管理工具

#### list_tags
- **描述**: 列出项目所有标签
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `query` (String, optional) - 关键词过滤
- **风险**: read

#### get_tags_by_name
- **描述**: 按名称查询标签
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `tagName` (String, required) - 标签名称
- **风险**: read

#### list_tag_members
- **描述**: 列出标签成员
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `tagId` (Long, required) - 标签 ID
  - `page` (Integer, optional) - 页码
  - `pageSize` (Integer, optional) - 每页大小
- **风险**: read

#### create_tag
- **描述**: 创建标签
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `tagName` (String, required) - 标签名称
  - `displayName` (String, optional) - 显示名称
  - `tagDefinition` (String, required) - 标签定义 JSON
  - `zoneOffset` (Integer, optional) - 时区偏移
- **风险**: write

#### update_tag
- **描述**: 更新标签
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `tagId` (Long, required) - 标签 ID
  - `displayName` (String, optional) - 显示名称
  - `tagDefinition` (String, optional) - 标签定义 JSON
- **风险**: write

### 实体查询工具

#### list_entities
- **描述**: 列出实体列表
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `query` (String, optional) - 关键词过滤
- **风险**: read

#### query_entity_details
- **描述**: 查询实体详情
- **参数**:
  - `projectId` (Integer, required) - 项目 ID
  - `entityId` (String, required) - 实体 ID
  - `properties` (List<String>, optional) - 属性列表
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
- **参数**: 无
- **风险**: read

#### get_tag_definition_schema
- **描述**: 获取标签定义 Schema
- **参数**: 无
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
