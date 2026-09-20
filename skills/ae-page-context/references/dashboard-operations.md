# Dashboard operations

Read [dashboard-context.md](dashboard-context.md) first. Locate the joint surface/action/target row, then read its state paths and all cautions together. A legal combination does not establish that every control or model is instrumented. Examples below contain only lastOperation, not complete snapshots.

## 5. dashboard 合法组合与状态索引

每行只允许该 surface、target 与所列 action 的组合。操作的最终解释 = action 含义 + 下方该 target 的逐项说明 + 实际状态。覆盖为 partial 表示只接入部分入口，reserved 表示尚未接入，不代表所有合法组合都已采集。

| surface | target | 合法 action | reportKey 规则 | 覆盖 |
| --- | --- | --- | --- | --- |
| `dashboard` | `global_filters` | `edit` / `apply` / `reset` / `cancel` | null | partial |
| `dashboard` | `dashboard_filters` | `edit` / `apply` / `reset` / `cancel` | null | partial |
| `dashboard` | `space_filters` | `edit` / `apply` / `reset` / `cancel` | null | partial |
| `dashboard` | `time_range` | `edit` / `apply` / `reset` / `cancel` | nullable | partial |
| `dashboard` | `granularity` | `edit` / `apply` / `reset` / `cancel` | required | partial |
| `dashboard` | `time_comparison` | `edit` / `apply` / `reset` / `cancel` | required | partial |
| `dashboard` | `sql_params` | `edit` / `apply` / `reset` / `cancel` | required | partial |
| `dashboard` | `visual_filters` | `edit` / `apply` / `reset` / `cancel` | required | partial |
| `dashboard` | `query_options` | `edit` / `apply` / `reset` / `cancel` | nullable | reserved |
| `dashboard` | `query` | `refresh` / `cancel` | nullable | partial |
| `dashboard` | `chart_type` | `edit` / `reset` | required | partial |
| `dashboard` | `metrics` | `edit` / `reset` | required | partial |
| `dashboard` | `groups` | `edit` / `reset` | required | partial |
| `dashboard` | `sort` | `edit` / `reset` | required | partial |
| `dashboard` | `pagination` | `edit` / `reset` | required | reserved |
| `dashboard` | `expansion` | `edit` / `reset` | required | reserved |
| `dashboard` | `legend` | `edit` / `reset` | required | reserved |
| `dashboard` | `analysis_view` | `edit` / `reset` | required | partial |
| `dashboard` | `report_settings` | `open` / `close` / `save` | required | partial |
| `dashboard` | `report` | `add` / `remove` | required | partial |
| `dashboard` | `layout` | `edit` / `reset` | null | partial |
| `dashboard` | `dashboard_name` | `edit` | null | partial |
| `dashboard` | `export` | `export` | nullable | partial |

### `dashboard / global_filters`

编辑、应用、重置或取消看板全局筛选，包括筛选项及其逻辑关系。

读取状态：

- `temporaryState.dashboardConditions.draft.globalFilters`
- `temporaryState.dashboardConditions.effective.globalFilters`

注意事项：

- reportKey 必须为 null；不是某张报表的局部筛选。
- 草稿不等于实际生效条件；apply 也可能等待异步条件回填，不能仅按动作认定已生效。
- 全局操作引发的卡片自动恢复只更新状态，不应解释为用户逐张操作。

### `dashboard / dashboard_filters`

修改看板级页面筛选器的选择值，包括明确的应用、重置或取消。

读取状态：

- `temporaryState.dashboardConditions.draft.dashboardFilters`
- `temporaryState.dashboardConditions.effective.dashboardFilters`

注意事项：

- reportKey 必须为 null；与 global_filters、space_filters 是不同的条件来源。
- 这些页面条件不能直接当作某张报表最终发送的 QP，也不能假设探索全部继承。
- 原探索不自动合入看板页面控件；与可按模型继承的全局筛选组不同。完整来源规则见[exploration query reference](explore-query-inheritance.md)。

### `dashboard / space_filters`

修改看板所在空间的页面筛选条件，包括明确的应用、重置或取消。

读取状态：

- `temporaryState.dashboardConditions.draft.spaceFilters`
- `temporaryState.dashboardConditions.effective.spaceFilters`

注意事项：

- reportKey 必须为 null；不是单张报表的筛选条件。
- 页面条件是否参与某次查询不能仅由本动作判断；探索不支持的页面筛选不能视为已继承。

### `dashboard / time_range`

修改看板整体或某张卡片的主时间范围。

读取状态：

- `temporaryState.dashboardConditions.draft.timeRange`
- `temporaryState.dashboardConditions.effective.timeRange`
- `temporaryState.reports[reportKey].localConditions.draft.timeRange`
- `temporaryState.reports[reportKey].localConditions.effective.timeRange`

注意事项：

- reportKey 为 null 时读 dashboardConditions；非空时只读该报表的 localConditions。
- 一次主时间操作可以同时改变 VS、粒度或图表，实际联动看 changedFields。
- 主时间未变、仅 VS 改变时会记录为 time_comparison；不应据 target 推断整批变化只有一个字段。

### `dashboard / granularity`

修改卡片的时间粒度及相关单位、周起始日等实际控件值。

读取状态：

- `temporaryState.reports[reportKey].localConditions.draft.granularity`
- `temporaryState.reports[reportKey].localConditions.effective.granularity`

注意事项：

- 是卡片条件，不是探索内的粒度。
- 原值保留；普通 T2=按周、T5=合计，模型专用编码及配套字段见[business value reference](dashboard-business-values.md)。
- 是否触发查询以及查询是否成功，分别以真实请求和回包状态为准。

### `dashboard / time_comparison`

修改或关闭卡片 VS 的查询时间和对比阶段条件。

读取状态：

- `temporaryState.reports[reportKey].localConditions.draft.timeComparison`
- `temporaryState.reports[reportKey].localConditions.effective.timeComparison`

注意事项：

- 即使主时间仍是同一个过去 7 天，只要 VS 条件变了就是不同状态。
- 这是查询条件；不要与探索中只选看已有阶段的 comparison_display 混淆。

### `dashboard / sql_params`

编辑、应用、重置或取消卡片 SQL 动态参数。

读取状态：

- `temporaryState.reports[reportKey].localConditions.draft.sqlParams`
- `temporaryState.reports[reportKey].localConditions.effective.sqlParams`

注意事项：

- 只记录动态参数，不表示在编辑任意 SQL 文本。
- 自动参数解析和回填只观察状态；草稿或点击应用不能证明解析、提交、查询已经完成。

### `dashboard / visual_filters`

修改卡片 SQL 图内筛选，记录当前被卡片接受的筛选条件。

读取状态：

- `temporaryState.reports[reportKey].localConditions.draft.visualFilters`
- `temporaryState.reports[reportKey].localConditions.effective.visualFilters`

注意事项：

- 看板卡片图内筛选保存在 localConditions；探索同名 target 保存位置不同。
- 本地过滤与服务端重查取决于原页面模式，不能仅凭 effective 或 edit 宣称发生了查询。

### `dashboard / query_options`

预留：记录看板整体或卡片查询选项的编辑、应用、重置、取消。

读取状态：

- `temporaryState.dashboardConditions.draft.queryOptions`
- `temporaryState.dashboardConditions.effective.queryOptions`
- `temporaryState.reports[reportKey].localConditions.draft.queryOptions`
- `temporaryState.reports[reportKey].localConditions.effective.queryOptions`

注意事项：

- reportKey 为 null 时读 dashboardConditions；非空时读对应 localConditions。
- 尚未接入稳定用户控件回调；组合合法不表示当前能收到这种操作或读到这些字段。

### `dashboard / query`

刷新或请求取消看板整体、单张卡片的查询。

读取状态：

- `temporaryState.lastOperation`
- `queryState.reports`
- `temporaryState.reports`
- `queryState.reports[reportKey]`
- `temporaryState.reports[reportKey].display`

注意事项：

- reportKey 为 null 表示整体操作，须逐项读取 queryState.reports 和 temporaryState.reports；非空只读该卡片。
- 卡片 queryState 只有实际请求 ID、状态和条件版本等观察事实，没有 sentQp 或查询结果正文。
- refresh 不是已成功，cancel 不是服务端已确认取消；没有新的请求事实时不能编造请求。

### `dashboard / chart_type`

切换或恢复卡片图表类型，如折线、表格等当前支持的展示方式。

读取状态：

- `temporaryState.reports[reportKey].viewState.chartType`

注意事项：

- 自动纠正不支持的图表只更新状态，不记录用户切图。
- 部分 SQL 图表切换可能重查；是否重查不能由展示操作本身推断。

### `dashboard / metrics`

选择或恢复卡片当前展示的指标。

读取状态：

- `temporaryState.reports[reportKey].viewState.metricIds`

注意事项：

- 这是展示选择，不代表修改已保存报表的指标定义或最终查询 QP。

### `dashboard / groups`

选择或恢复卡片当前展示的分组、默认组或属性轴。

读取状态：

- `temporaryState.reports[reportKey].viewState.groups`

注意事项：

- 这是展示分组，不是新增查询分组定义；query_groups 仅允许在 explore。
- 值保留实际控件投影，不能假定一定是扁平分组 ID 数组。

### `dashboard / sort`

调整卡片显示排序，或按原业务模式触发 SQL 后端排序。

读取状态：

- `temporaryState.reports[reportKey].viewState.sort`
- `temporaryState.reports[reportKey].localConditions.draft.sort`
- `temporaryState.reports[reportKey].localConditions.effective.sort`
- `queryState.reports[reportKey]`

注意事项：

- 纯展示排序仅更新 viewState；原回调按生效条件记录时也可更新 localConditions.sort。
- 是否发出后端排序请求看 queryState，不能把每次 edit/sort 都视为重新查询。

### `dashboard / pagination`

预留：记录卡片分页显示状态。

读取状态：

- `temporaryState.reports[reportKey].viewState.pagination`

注意事项：

- 尚未接入稳定用户分页回调，缺少记录不代表用户没有翻页。

### `dashboard / expansion`

预留：记录卡片层级表格的展开状态。

读取状态：

- `temporaryState.reports[reportKey].viewState.expandedKeys`

注意事项：

- 看板入口尚未接入稳定用户回调；探索同名 target 的接入情况不能套用到看板。

### `dashboard / legend`

预留：记录通过卡片图例隐藏或显示的数据系列。

读取状态：

- `temporaryState.reports[reportKey].viewState.hiddenSeriesIds`

注意事项：

- 尚未接入稳定图例回调；字段缺省不能解释为所有系列均显示。

### `dashboard / analysis_view`

调整卡片留存、漏斗、区间等模型的展示方式和数值显示选项。

读取状态：

- `temporaryState.reports[reportKey].viewState.analysisView`

注意事项：

- 只包含当前模型实际暴露且已采集的控件值，不代表完整报表定义。
- 展示操作可能存在模型特定查询行为，仍以实际查询状态为准。
- 留存切流失的自动粒度修正合并到同一次 analysis_view 操作，不是用户另外点击了 granularity。

### `dashboard / report_settings`

打开、关闭卡片更多菜单中的报表内容设置弹窗，或记录已有保存回调。

读取状态：

- `temporaryState.lastOperation`
- `temporaryState.surface`
- `reports[reportKey]`

注意事项：

- 仍属于 dashboard，不是第三种 surface，也不是探索。
- 当前只采集 open/close/save；未采集弹窗内每个设置项的草稿或修改明细。
- 保存回调可能晚于弹窗关闭，操作归属不随当前页面模式改变；不要据此判断弹窗当前仍打开。

### `dashboard / report`

在看板中添加或移除报表卡片，影响看板报表目录。

读取状态：

- `reports[reportKey]`
- `temporaryState.reports[reportKey]`
- `queryState.reports[reportKey]`

注意事项：

- 移除后对应目录和状态可能已不存在；新增信息以随后实际加载的目录为准。
- 这是看板卡片关系变化，不应解释为创建或永久删除了报表管理中的报表资源。

### `dashboard / layout`

调整或恢复看板卡片布局。

读取状态：

- `temporaryState.layout`

注意事项：

- reportKey 必须为 null；布局变化本身不是查询条件变化，也不证明已持久化保存。

### `dashboard / dashboard_name`

修改看板名称。

读取状态：

- `resource.dashboardName`

注意事项：

- reportKey 必须为 null；名称变化不代表条件或查询版本变化。

### `dashboard / export`

发起看板整体或单张卡片的导出。

读取状态：

- `temporaryState.lastOperation`

注意事项：

- reportKey 为 null 表示看板导出，非空表示该卡片导出。
- 当前只记录操作，不保存导出文件或完成状态；不能据此断言导出成功。

## Examples

```json
{
  "id": "page-1-op-1",
  "at": 1,
  "surface": "dashboard",
  "action": "edit",
  "target": "global_filters",
  "reportKey": null,
  "changedFields": [
    "globalFilters"
  ]
}
```

用户在看板编辑全局筛选。读取 dashboardConditions 的 draft/effective 判断是否生效，不能说所有卡片已经按新条件查询成功。

```json
{
  "id": "page-1-op-2",
  "at": 2,
  "surface": "dashboard",
  "action": "edit",
  "target": "groups",
  "reportKey": "report:19",
  "changedFields": [
    "groups"
  ]
}
```

用户调整看板报表 19 的展示分组；读取 temporaryState.reports["report:19"].viewState.groups，不是查询分组。

```json
{
  "id": "page-1-op-6",
  "at": 6,
  "surface": "dashboard",
  "action": "save",
  "target": "report_settings",
  "reportKey": "report:19"
}
```

看板报表 19 的设置保存成功回调已被记录。即使当前已进入 explore，这条操作仍属于 dashboard，不改变当前探索模式。
