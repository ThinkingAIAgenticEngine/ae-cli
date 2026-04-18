# te-mcp-analysis CLI 化实施计划（最终版）

## 关键配置说明

- **服务名称**: `analysis`（下划线）
- **MCP 映射配置**:
  - `componentName`: `analysis`
  - `mappingPath`: `analysis`
- **完整 MCP URL**: `${HOST}/mcp/analysis/http/analysis`
- **命令格式**: `ae-cli analysis +tool_name --param_name value`
  - 服务名：下划线 `analysis`
  - 工具名：下划线 `+list_events`
  - 参数名：下划线 `--project_id`（CLI flag）
  - MCP 参数：驼峰 `projectId`（传给 MCP 工具）
- **文件命名**: 中划线 `list-events.ts`
- **Skill 文件名**: 中划线 `list-events.md`

---

## 阶段 1：注册 MCP 服务映射

### 任务 1.1：在 src/index.ts 中注册服务映射

```typescript
import { registerMcpMapping } from './core/mcp.js';

// 注册 analysis 服务映射
registerMcpMapping('analysis', {
  componentName: 'analysis',
  mappingPath: 'analysis'
});
```

**验证 URL 构建**：
- 输入：`buildMcpUrl('http://10.206.16.32:8993', 'analysis')`
- 输出：`http://10.206.16.32:8993/mcp/analysis/http/analysis`

---

## 阶段 2：创建域目录结构

### 任务 2.1：创建目录

```bash
mkdir -p src/commands/te-analysis/{meta,report,dashboard,model,cluster,tag,entity,schema,project,resource}
```

### 目录结构（38 个工具）

```
src/commands/te-analysis/
├── index.ts                          # 导出所有命令
├── meta/                             # 元数据查询 (2 个)
│   ├── list-events.ts
│   └── list-properties.ts
├── report/                           # 报告管理 (4 个)
│   ├── list-reports.ts
│   ├── get-report-definition.ts
│   ├── query-report-data.ts
│   └── create-report.ts
├── dashboard/                        # 仪表盘管理 (5 个)
│   ├── list-dashboards.ts
│   ├── query-dashboard-detail.ts
│   ├── query-dashboard-report-data.ts
│   ├── create-dashboard.ts
│   └── update-dashboard.ts
├── model/                            # 模型分析 (4 个)
│   ├── query-adhoc.ts
│   ├── drilldown-users.ts
│   ├── drilldown-user-events.ts
│   └── create-result-cluster.ts
├── cluster/                          # 分群管理 (5 个)
│   ├── list-clusters.ts
│   ├── get-clusters-by-name.ts
│   ├── list-cluster-members.ts
│   ├── create-cluster.ts
│   └── update-cluster.ts
├── tag/                              # 标签管理 (5 个)
│   ├── list-tags.ts
│   ├── get-tags-by-name.ts
│   ├── list-tag-members.ts
│   ├── create-tag.ts
│   └── update-tag.ts
├── entity/                           # 实体查询 (5 个)
│   ├── list-entities.ts
│   ├── query-entity-details.ts
│   ├── query-event-details.ts
│   ├── build-entity-details-sql.ts
│   └── build-event-details-sql.ts
├── schema/                           # Schema 查询 (5 个)
│   ├── get-analysis-query-schema.ts
│   ├── get-filter-schema.ts
│   ├── get-groupby-schema.ts
│   ├── get-cluster-definition-schema.ts
│   └── get-tag-definition-schema.ts
├── project/                          # 项目配置 (2 个)
│   ├── get-project-config.ts
│   └── list-project-users.ts
└── resource/                         # 资源链接 (1 个)
    └── get-resource-url.ts
```

---

## 阶段 3：命令实现优先级

### P0：核心查询命令（8 个）

#### 元数据查询
- `+list_events` → `meta/list-events.ts`
- `+list_properties` → `meta/list-properties.ts`

#### 报告管理
- `+list_reports` → `report/list-reports.ts`
- `+get_report_definition` → `report/get-report-definition.ts`
- `+query_report_data` → `report/query-report-data.ts`
- `+create_report` → `report/create-report.ts`

#### 模型分析
- `+query_adhoc` → `model/query-adhoc.ts`

#### 仪表盘管理
- `+list_dashboards` → `dashboard/list-dashboards.ts`

---

### P1：管理命令（11 个）

#### 仪表盘管理（续）
- `+query_dashboard_detail` → `dashboard/query-dashboard-detail.ts`
- `+query_dashboard_report_data` → `dashboard/query-dashboard-report-data.ts`
- `+create_dashboard` → `dashboard/create-dashboard.ts`
- `+update_dashboard` → `dashboard/update-dashboard.ts`

#### 分群管理
- `+list_clusters` → `cluster/list-clusters.ts`
- `+get_clusters_by_name` → `cluster/get-clusters-by-name.ts`
- `+list_cluster_members` → `cluster/list-cluster-members.ts`
- `+create_cluster` → `cluster/create-cluster.ts`
- `+update_cluster` → `cluster/update-cluster.ts`

#### 标签管理
- `+list_tags` → `tag/list-tags.ts`
- `+create_tag` → `tag/create-tag.ts`

---

### P2：高级功能（19 个）

#### 模型分析（续）
- `+drilldown_users` → `model/drilldown-users.ts`
- `+drilldown_user_events` → `model/drilldown-user-events.ts`
- `+create_result_cluster` → `model/create-result-cluster.ts`

#### 标签管理（续）
- `+get_tags_by_name` → `tag/get-tags-by-name.ts`
- `+list_tag_members` → `tag/list-tag-members.ts`
- `+update_tag` → `tag/update-tag.ts`

#### 实体查询
- `+list_entities` → `entity/list-entities.ts`
- `+query_entity_details` → `entity/query-entity-details.ts`
- `+query_event_details` → `entity/query-event-details.ts`
- `+build_entity_details_sql` → `entity/build-entity-details-sql.ts`
- `+build_event_details_sql` → `entity/build-event-details-sql.ts`

#### Schema 查询
- `+get_analysis_query_schema` → `schema/get-analysis-query-schema.ts`
- `+get_filter_schema` → `schema/get-filter-schema.ts`
- `+get_groupby_schema` → `schema/get-groupby-schema.ts`
- `+get_cluster_definition_schema` → `schema/get-cluster-definition-schema.ts`
- `+get_tag_definition_schema` → `schema/get-tag-definition-schema.ts`

#### 项目配置
- `+get_project_config` → `project/get-project-config.ts`
- `+list_project_users` → `project/list-project-users.ts`

#### 资源链接
- `+get_resource_url` → `resource/get-resource-url.ts`

---

## 阶段 4：命令实现模板

### 标准命令模板

**文件**: `src/commands/te-analysis/meta/list-events.ts`

```typescript
import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const listEvents: Command = {
  service: 'analysis',
  command: '+list_events',
  description: 'List event metadata accessible to the current user in the project',
  flags: [
    { 
      name: 'project_id',              // CLI 参数用下划线
      type: 'number', 
      required: true, 
      alias: 'p', 
      desc: 'Project ID' 
    },
    { 
      name: 'query', 
      type: 'string', 
      required: false, 
      alias: 'q', 
      desc: 'Optional keyword filter for fuzzy matching' 
    },
  ],
  risk: 'read',
  
  // dry-run 支持
  dryRun: (ctx) => ({
    method: 'tools/call',
    url: resolveMcpUrl(ctx.mcpUrl, ctx.host(), 'analysis'),
    toolName: 'list_events',
    arguments: {
      projectId: ctx.num('project_id'),  // CLI 下划线 → MCP 驼峰
      query: ctx.str('query') || undefined,
    }
  }),
  
  // 实际执行
  execute: async (ctx) => {
    const url = resolveMcpUrl(ctx.mcpUrl, ctx.host(), 'analysis');
    
    const result = await callMcpTool(
      url,
      'list_events',
      {
        projectId: ctx.num('project_id'),  // CLI 下划线 → MCP 驼峰
        query: ctx.str('query') || undefined,
      },
      ctx.host()
    );
    
    return parseMcpResult(result);
  },
};
```

**使用示例**：
```bash
# 列出所有事件（参数用下划线）
ae-cli analysis +list_events --project_id 123

# 带关键词过滤
ae-cli analysis +list_events --project_id 123 --query "登录"

# dry-run 模式
ae-cli analysis +list_events --project_id 123 --dry-run

# 输出格式
ae-cli analysis +list_events --project_id 123 --format table
```

---

### 复杂参数命令模板

**文件**: `src/commands/te-analysis/model/query-adhoc.ts`

```typescript
import type { Command } from '../../../framework/types.js';
import { callMcpTool, parseMcpResult, resolveMcpUrl } from '../../../core/mcp.js';

export const queryAdhoc: Command = {
  service: 'analysis',
  command: '+query_adhoc',
  description: 'Ad hoc analysis - core tool for user behavior analytics',
  flags: [
    { name: 'project_id', type: 'number', required: true, desc: 'Project ID' },
    { name: 'model_type', type: 'string', required: true, desc: 'Model type: event/retention/funnel/...' },
    { name: 'analysis_query', type: 'json', required: true, desc: 'Analysis query JSON' },
    { name: 'zone_offset', type: 'number', required: false, desc: 'Timezone offset' },
    { name: 'request_id', type: 'string', required: false, desc: 'Unique request ID' },
    { name: 'use_cache', type: 'boolean', required: false, desc: 'Use cache (default: true)' },
    { name: 'timeout_minutes', type: 'number', required: false, desc: 'Query timeout in minutes' },
  ],
  risk: 'read',
  
  dryRun: (ctx) => ({
    method: 'tools/call',
    url: resolveMcpUrl(ctx.mcpUrl, ctx.host(), 'analysis'),
    toolName: 'query_adhoc',
    arguments: {
      projectId: ctx.num('project_id'),
      modelType: ctx.str('model_type'),
      analysisQuery: JSON.stringify(ctx.json('analysis_query')),
      zoneOffset: ctx.num('zone_offset') || undefined,
      requestId: ctx.str('request_id') || undefined,
      useCache: ctx.bool('use_cache'),
      timeoutMinutes: ctx.num('timeout_minutes') || undefined,
    }
  }),
  
  execute: async (ctx) => {
    const url = resolveMcpUrl(ctx.mcpUrl, ctx.host(), 'analysis');
    
    const result = await callMcpTool(
      url,
      'query_adhoc',
      {
        projectId: ctx.num('project_id'),
        modelType: ctx.str('model_type'),
        analysisQuery: JSON.stringify(ctx.json('analysis_query')),
        zoneOffset: ctx.num('zone_offset') || undefined,
        requestId: ctx.str('request_id') || undefined,
        useCache: ctx.bool('use_cache'),
        timeoutMinutes: ctx.num('timeout_minutes') || undefined,
      },
      ctx.host()
    );
    
    return parseMcpResult(result);
  },
};
```

**使用示例**：
```bash
# 事件分析
ae-cli analysis +query_adhoc \
  --project_id 123 \
  --model_type event \
  --analysis_query '{"events":[{"eventName":"登录"}],"timeRange":{"recentDay":"0-7"}}'

# 漏斗分析
ae-cli analysis +query_adhoc \
  --project_id 123 \
  --model_type funnel \
  --analysis_query '{"steps":[{"eventName":"浏览商品"},{"eventName":"加入购物车"},{"eventName":"下单"}]}'

# dry-run 模式
ae-cli analysis +query_adhoc \
  --project_id 123 \
  --model_type event \
  --analysis_query '{}' \
  --dry-run
```

---

### index.ts 导出模板

**文件**: `src/commands/te-analysis/index.ts`

```typescript
import type { Command } from '../../framework/types.js';

// Meta
import { listEvents } from './meta/list-events.js';
import { listProperties } from './meta/list-properties.js';

// Report
import { listReports } from './report/list-reports.js';
import { getReportDefinition } from './report/get-report-definition.js';
import { queryReportData } from './report/query-report-data.js';
import { createReport } from './report/create-report.js';

// Dashboard
import { listDashboards } from './dashboard/list-dashboards.js';
import { queryDashboardDetail } from './dashboard/query-dashboard-detail.js';
import { queryDashboardReportData } from './dashboard/query-dashboard-report-data.js';
import { createDashboard } from './dashboard/create-dashboard.js';
import { updateDashboard } from './dashboard/update-dashboard.js';

// Model
import { queryAdhoc } from './model/query-adhoc.js';

// ... 其他导入

const commands: Command[] = [
  // Meta (2)
  listEvents,
  listProperties,
  
  // Report (4)
  listReports,
  getReportDefinition,
  queryReportData,
  createReport,
  
  // Dashboard (5)
  listDashboards,
  queryDashboardDetail,
  queryDashboardReportData,
  createDashboard,
  updateDashboard,
  
  // Model (1)
  queryAdhoc,
  
  // ... 其他命令
];

export default commands;
```

---

## 阶段 5：生成 Skill 文档

### 任务 5.1：创建 Skill 文档结构

```
skills/te-analysis/
├── SKILL.md                          # 域概述
└── references/                       # 命令详细文档（38 个，文件名用中划线）
    ├── list-events.md
    ├── list-properties.md
    ├── query-adhoc.md
    ├── list-reports.md
    └── ...
```

### SKILL.md 模板

```yaml
---
name: te-analysis
version: 1.0.0
description: "TE 分析核心服务：模型分析、报告管理、仪表盘管理、分群标签、元数据查询（38 个工具）"
metadata:
  requires:
    bins: ["ae-cli"]
  cliHelp: "ae-cli analysis --help"
---

# TE Common Analysis Core

## 概述

TE 分析核心服务提供 38 个工具，涵盖：

- **元数据查询**（2 个）：事件、属性
- **报告管理**（4 个）：列表、定义、数据查询、创建
- **仪表盘管理**（5 个）：列表、详情、数据查询、创建、更新
- **模型分析**（4 个）：Ad hoc 分析、用户下钻、事件序列下钻、结果创建分群
- **分群管理**（5 个）：列表、查询、成员、创建、更新
- **标签管理**（5 个）：列表、查询、成员、创建、更新
- **实体查询**（5 个）：列表、详情、SQL 构建
- **Schema 查询**（5 个）：分析查询、过滤器、分组、分群、标签
- **项目配置**（2 个）：配置、成员
- **资源链接**（1 个）：URL 生成

## 前置条件

1. 安装 ae-cli：`npm install -g @tant/ae-cli`
2. 配置认证：`ae-cli auth login`
3. 配置 host：`ae-cli config`

## 核心使用场景

### 场景 1：查询项目元数据

```bash
# 列出所有事件
ae-cli analysis +list_events --project_id 123

# 列出事件属性
ae-cli analysis +list_properties --project_id 123 --scope event

# 列出用户属性
ae-cli analysis +list_properties --project_id 123 --scope user
```

### 场景 2：执行 Ad hoc 分析

```bash
# 事件分析
ae-cli analysis +query_adhoc \
  --project_id 123 \
  --model_type event \
  --analysis_query '{"events":[{"eventName":"登录"}],"timeRange":{"recentDay":"0-7"}}'

# 漏斗分析
ae-cli analysis +query_adhoc \
  --project_id 123 \
  --model_type funnel \
  --analysis_query '{"steps":[{"eventName":"浏览"},{"eventName":"下单"}]}'
```

### 场景 3：报告管理

```bash
# 列出所有报告
ae-cli analysis +list_reports --project_id 123

# 获取报告定义
ae-cli analysis +get_report_definition --project_id 123 --report_id 456

# 查询报告数据
ae-cli analysis +query_report_data \
  --project_id 123 \
  --report_ids '[456,789]'
```

### 场景 4：仪表盘管理

```bash
# 列出所有仪表盘
ae-cli analysis +list_dashboards --project_id 123

# 获取仪表盘详情
ae-cli analysis +query_dashboard_detail \
  --project_id 123 \
  --dashboard_id 789

# 创建仪表盘
ae-cli analysis +create_dashboard \
  --project_id 123 \
  --dashboard_name "销售分析"
```

## 全局参数

所有命令支持以下全局参数：

- `--host <url>` - 覆盖 TE 实例地址
- `--format <json|table>` - 输出格式（默认 json）
- `--jq <expr>` - jq 过滤表达式
- `--dry-run` - 只显示请求详情，不执行
- `--yes` - 跳过 write 操作确认

## 命令列表

详见 `references/` 目录下的各命令文档。
```

### Reference 文档模板

**文件**: `skills/te-analysis/references/list-events.md`

```markdown
# list_events

## 描述

列出项目中当前用户可访问的事件元数据（生产环境已生效的系统元数据）。

## CLI 命令

```bash
ae-cli analysis +list_events [options]
```

## 参数

| 参数名 | 类型 | 必填 | 别名 | 说明 |
|--------|------|------|------|------|
| `--project_id` | number | 是 | `-p` | 项目 ID |
| `--query` | string | 否 | `-q` | 关键词过滤，模糊匹配事件名称、描述、AI 备注 |

## 风险级别

`read` - 只读操作

## 使用示例

### 列出所有事件

```bash
ae-cli analysis +list_events --project_id 123
```

### 带关键词过滤

```bash
ae-cli analysis +list_events --project_id 123 --query "登录"
```

### 输出为表格格式

```bash
ae-cli analysis +list_events --project_id 123 --format table
```

### dry-run 模式

```bash
ae-cli analysis +list_events --project_id 123 --dry-run
```

## 返回示例

```json
{
  "success": true,
  "data": [
    {
      "eventName": "登录",
      "eventDesc": "用户登录事件",
      "aiRemark": "记录用户登录行为",
      "eventType": "track",
      "createTime": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## 注意事项

- 仅返回生产环境已生效的系统元数据
- 不包含埋点方案（tracking-plan）中的元数据
- 支持模糊匹配事件名称、描述和 AI 备注
```

---

## 阶段 6：测试验证

### 任务 6.1：单元测试

创建测试文件验证命令定义：

```typescript
// tests/commands/te-analysis/meta/list-events.test.ts
import { describe, it, expect } from 'vitest';
import { listEvents } from '../../../../src/commands/te-analysis/meta/list-events.js';

describe('listEvents command', () => {
  it('should have correct service name', () => {
    expect(listEvents.service).toBe('analysis');
  });
  
  it('should have correct command name', () => {
    expect(listEvents.command).toBe('+list_events');
  });
  
  it('should have required project_id flag', () => {
    const projectIdFlag = listEvents.flags.find(f => f.name === 'project_id');
    expect(projectIdFlag).toBeDefined();
    expect(projectIdFlag?.required).toBe(true);
    expect(projectIdFlag?.type).toBe('number');
  });
  
  it('should have optional query flag', () => {
    const queryFlag = listEvents.flags.find(f => f.name === 'query');
    expect(queryFlag).toBeDefined();
    expect(queryFlag?.required).toBe(false);
    expect(queryFlag?.type).toBe('string');
  });
  
  it('should be read-only operation', () => {
    expect(listEvents.risk).toBe('read');
  });
  
  it('should have dryRun function', () => {
    expect(listEvents.dryRun).toBeDefined();
  });
  
  it('should have execute function', () => {
    expect(listEvents.execute).toBeDefined();
  });
});
```

### 任务 6.2：集成测试

```bash
# 测试 MCP 服务连接
ae-cli analysis +list_events --project_id 123 --dry-run

# 测试实际执行（需要有效的 TE Token）
ae-cli analysis +list_events --project_id 123

# 测试输出格式
ae-cli analysis +list_events --project_id 123 --format table

# 测试 jq 过滤
ae-cli analysis +list_events --project_id 123 --jq '.data[0]'
```

## 验收标准

### 功能验收
- [ ] 所有 38 个命令正常工作
- [ ] MCP 服务连接正常
- [ ] 参数验证正确
- [ ] 错误处理完善
- [ ] dry-run 模式正常

### 文档验收
- [ ] SKILL.md 完整
- [ ] 38 个 reference 文档完整
- [ ] 使用示例可执行
- [ ] 参数说明准确

### 测试验收
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试通过
- [ ] 所有命令手动测试通过

---

## 附录：完整工具列表

### 元数据查询（2 个）
1. list_events
2. list_properties

### 报告管理（4 个）
3. list_reports
4. get_report_definition
5. query_report_data
6. create_report

### 仪表盘管理（5 个）
7. list_dashboards
8. query_dashboard_detail
9. query_dashboard_report_data
10. create_dashboard
11. update_dashboard

### 模型分析（4 个）
12. query_adhoc
13. drilldown_users
14. drilldown_user_events
15. create_result_cluster

### 分群管理（5 个）
16. list_clusters
17. get_clusters_by_name
18. list_cluster_members
19. create_cluster
20. update_cluster

### 标签管理（5 个）
21. list_tags
22. get_tags_by_name
23. list_tag_members
24. create_tag
25. update_tag

### 实体查询（5 个）
26. list_entities
27. query_entity_details
28. query_event_details
29. build_entity_details_sql
30. build_event_details_sql

### Schema 查询（5 个）
31. get_analysis_query_schema
32. get_filter_schema
33. get_groupby_schema
34. get_cluster_definition_schema
35. get_tag_definition_schema

### 项目配置（2 个）
36. get_project_config
37. list_project_users

### 资源链接（1 个）
38. get_resource_url
