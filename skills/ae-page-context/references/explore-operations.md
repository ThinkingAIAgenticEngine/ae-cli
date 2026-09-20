# Exploration operations

Read [dashboard-context.md](dashboard-context.md) first. Locate the joint surface/action/target row, then read its state paths and all cautions together. A legal combination does not establish that every control or model is instrumented. Examples below contain only lastOperation, not complete snapshots.

## 6. explore 合法组合与状态索引

每行只允许该 surface、target 与所列 action 的组合。操作的最终解释 = action 含义 + 下方该 target 的逐项说明 + 实际状态。覆盖为 partial 表示只接入部分入口，reserved 表示尚未接入，不代表所有合法组合都已采集。

| surface | target | 合法 action | reportKey 规则 | 覆盖 |
| --- | --- | --- | --- | --- |
| `explore` | `explore` | `open` / `close` | required | partial |
| `explore` | `explore_tab` | `edit` | required | partial |
| `explore` | `explore_sidebar` | `edit` | required | partial |
| `explore` | `explore_filters` | `edit` | required | partial |
| `explore` | `query_groups` | `edit` | required | partial |
| `explore` | `user_crowds` | `edit` | required | partial |
| `explore` | `sql_params` | `edit` | required | partial |
| `explore` | `query` | `apply` / `refresh` / `cancel` | required | partial |
| `explore` | `time_range` | `edit` | required | partial |
| `explore` | `time_comparison` | `edit` | required | partial |
| `explore` | `granularity` | `edit` | required | partial |
| `explore` | `timezone` | `edit` | required | partial |
| `explore` | `explore_history` | `apply` | required | partial |
| `explore` | `explore_favorite` | `apply` / `add` / `edit` / `remove` | required | partial |
| `explore` | `chart_type` | `edit` | required | partial |
| `explore` | `metrics` | `edit` | required | partial |
| `explore` | `groups` | `edit` | required | partial |
| `explore` | `comparison_display` | `edit` | required | partial |
| `explore` | `sort` | `edit` | required | partial |
| `explore` | `expansion` | `edit` | required | partial |
| `explore` | `analysis_view` | `edit` | required | partial |
| `explore` | `visual_filters` | `edit` | required | partial |
| `explore` | `path_highlight` | `edit` | required | partial |
| `explore` | `node_detail` | `open` / `close` | required | partial |
| `explore` | `export` | `export` | required | partial |

### `explore / explore`

打开或退出某张报表的独立探索实例；两个动作都归属 explore。

读取状态：

- `temporaryState.surface`
- `temporaryState.explore`
- `temporaryState.recentReportKey`
- `temporaryState.lastOperation.exploreSessionId`

注意事项：

- 关闭后当前 surface 为 dashboard、explore 为 null，但关闭操作仍携带 explore 和已关闭的 sessionId。
- 自动恢复不伪造 open；关闭不等于将探索条件保存或应用到原卡片。
- 入口可能复用卡片结果，也可能自动查询；不应假定全部看板条件都被探索继承。
- 全局筛选组、看板控件和空间控件的继承规则不同；按[exploration query reference](explore-query-inheritance.md)先区分入口状态、实际请求与 display 结果来源。

### `explore / explore_tab`

切换探索侧栏的查询/历史/收藏页签，或 SQL 探索/可视化内容页签。

读取状态：

- `temporaryState.explore.ui.sideTab`
- `temporaryState.explore.ui.contentTab`
- `temporaryState.lastOperation.details.requestedTab`

注意事项：

- sideTab 与 contentTab 是不同控件；通过 changedFields 或 requestedTab 识别具体切换。
- 异步切页签请求先记录 requestedTab，实际落地后才更新 contentTab，两者不能混淆。
- SQL micro_va 只记录外层页签，不代表已经采集子应用内编辑。

### `explore / explore_sidebar`

折叠或展开探索侧栏。

读取状态：

- `temporaryState.explore.ui.sideVisible`

注意事项：

- 不改变外层探索模式，也不代表执行查询。

### `explore / explore_filters`

编辑探索筛选条件及 AND/OR 逻辑关系。

读取状态：

- `temporaryState.explore.conditions.draft.filters`
- `temporaryState.explore.conditions.draft.relation`

注意事项：

- 是探索草稿，不是看板 global_filters，也不是已提交 QP。
- operator/calcuSymbol 保留原编码；运算符及嵌套逻辑见[business value reference](dashboard-business-values.md)，当前实际生效范围见[exploration query reference](explore-query-inheritance.md)。
- 复合筛选内部通用回调来源不明确时只更新状态；明确新增筛选和逻辑关系等入口才记录操作。
- 没有 edit 不能推断用户没改条件；是否已提交由探索查询事实和草稿关联判断。

### `explore / query_groups`

增删改探索中参与查询的分组定义及其区间。

读取状态：

- `temporaryState.explore.conditions.draft.groupBy`

注意事项：

- 仅允许 explore；与两种 surface 都有的展示 groups 不同。
- 编辑先进入草稿，不能因此断言新分组已参与当前结果；按实际计算提交和回包判断。
- 分组区间控件显式标记 user/automatic 来源；初始化、元数据回填和非法区间纠正只更新草稿，不新增用户编辑操作。

### `explore / user_crowds`

编辑探索对比人群及各人群的筛选条件。

读取状态：

- `temporaryState.explore.conditions.draft.userCrowds`

注意事项：

- 仅允许 explore，且只适用于支持对比人群的报表模型。
- 复合人群筛选内部回调来源不明确时只观察状态，明确人群按钮等入口才记录用户操作。
- 草稿修改不是当前结果已使用新人群的证据。
- 人群项顶层 renaming/tempname 为重命名UI状态，不进入草稿和指纹；确认后的 name 与 filters 等业务字段保留。

### `explore / sql_params`

编辑探索 SQL 动态参数。

读取状态：

- `temporaryState.explore.conditions.draft.sqlParams`

注意事项：

- 不是 SQL 文本编辑，也不覆盖 micro_va 内部配置。
- 异步参数解析会观察更新草稿，不能将其当作又一次用户编辑。
- SQL 请求尚未可靠绑定草稿版本；draftVersion/draftFingerprint 为 null 表示未知，不能视为已应用。

### `explore / query`

在探索中点击计算、刷新或取消计算。

读取状态：

- `temporaryState.explore.conditions.validation`
- `temporaryState.explore.conditions.submittedDraftVersion`
- `temporaryState.explore.conditions.hasUnappliedChanges`
- `temporaryState.explore.queryState.latestRequestId`
- `temporaryState.explore.queryState.queries[requestId]`
- `temporaryState.explore.queryState.display`

注意事项：

- apply 表示计算意图，校验通过且实际发送后才有 submitted 请求；成功或失败依赖真实回包。
- queries 中的 sentQp 是实际 body.qp，通常是 JSON 字符串；不是根据草稿重新拼装的参数。
- cancelRequestedAt 仅说明前端请求取消，不等于服务端已确认 canceled。
- submittedDraftVersion 是提交关联，不等于成功；无法关联草稿时保留 null。
- 当前探索入口只显式上报校验失败，正常提交或成功后 validation 也可能是 unknown，不能强求 valid。

### `explore / time_range`

修改探索主时间范围。

读取状态：

- `temporaryState.explore.conditions.draft.timeRange`

注意事项：

- 与卡片 localConditions 隔离；一次控件操作可能同时联动 VS、粒度和图表，查看 changedFields。
- 是否重查沿用原控件行为，以实际请求为准；草稿值不是最终 QP。

### `explore / time_comparison`

修改或关闭探索 VS 查询时间、对比阶段条件。

读取状态：

- `temporaryState.explore.conditions.draft.timeComparison`

注意事项：

- 这是待查条件，不是 comparison_display 的已有阶段展示选择。
- 主时间不变但 VS 改变仍会记录；不能只看 timeRange 判断整次操作无变化。

### `explore / granularity`

修改探索时间粒度及相关单位、周起始日等控件状态。

读取状态：

- `temporaryState.explore.conditions.draft.granularity`

注意事项：

- 不修改原卡片条件；是否触发请求及当前结果采用的粒度需结合实际查询。
- 原值保留；普通 T2=按周、T5=合计，不能把留存 T1-n 等复合值当普通分桶粒度，见[business value reference](dashboard-business-values.md)。

### `explore / timezone`

在探索中切换时区；当前非 SQL 入口随后沿原流程刷新。

读取状态：

- `temporaryState.explore.conditions.draft.timezone`
- `temporaryState.explore.queryState.queries[requestId].requestOptions.zoneOffset`

注意事项：

- 点击只记录一次用户操作，刷新和后续回填不应重复解释为用户操作。
- 当前草稿时区与某次请求实际时区分别读取；请求未携带 zoneOffset 时不得补默认值。
- draft.timezone 记录实际运行或选择值，不把未锁定配置88当时区；显式选择与随后 control_change 请求关联，不能可靠绑定整份草稿时提交版本仍为null。

### `explore / explore_history`

用户选择探索历史记录，恢复其条件并按原逻辑发起查询。

读取状态：

- `temporaryState.explore.loadedPreset`
- `temporaryState.explore.conditions.draft`
- `temporaryState.explore.queryState.queries[requestId]`
- `temporaryState.explore.queryState.display`

注意事项：

- loadedPreset 仅定位历史来源，不保存完整历史列表；不是只切换历史页签。
- 自动恢复历史只更新状态，不伪造用户 apply。
- 历史还原查询的草稿关联尚为未知，实际 sentQp 有记录也不能自行补齐 draftVersion。

### `explore / explore_favorite`

应用收藏并查询，或新增、重命名、移除探索条件收藏。

读取状态：

- `temporaryState.explore.loadedPreset`
- `temporaryState.explore.conditions.draft`
- `temporaryState.explore.queryState.queries[requestId]`
- `temporaryState.lastOperation.details.favoriteId`
- `temporaryState.lastOperation.details.status`

注意事项：

- apply 才恢复收藏条件并查询；add/edit/remove 不等于计算，也不是保存或删除原报表。
- 当前 edit 是收藏重命名；favoriteId 仅在入口取得时记录，新增收藏不保证有定位值。
- 异步完成结果仅在同一 session 且仍为最后操作时补写；缺少 status 不能推断失败或成功。
- 收藏还原查询暂不可靠关联草稿版本，须保留未知。

### `explore / chart_type`

切换探索图表类型。

读取状态：

- `temporaryState.explore.viewState.chartType`

注意事项：

- 只更新探索视图，不直接修改卡片；自动图表纠正不产生用户操作。
- 普通模型多为展示切换，SQL 可能重查；micro_va 内部编辑未采集。

### `explore / metrics`

选择探索当前展示的指标。

读取状态：

- `temporaryState.explore.viewState.metricIds`

注意事项：

- 这是展示选择，不是更改原报表指标定义；值保留实际控件形态。

### `explore / groups`

选择探索当前展示的分组、默认组或属性轴。

读取状态：

- `temporaryState.explore.viewState.displayGroups`

注意事项：

- groups 对应展示分组；参与查询的分组定义应读取 query_groups 对应的 conditions.draft.groupBy。
- 与 dashboard 同名 target 的状态路径不同，不可省略 surface 来解读。
- 平铺表格的搜索分组及搜索维度目前未采集，不能用 groups 代替或据缺少操作认定用户没搜索。

### `explore / comparison_display`

选择探索结果中当前展示的 VS 阶段。

读取状态：

- `temporaryState.explore.viewState.comparisonDisplay`

注意事项：

- 只改变选看的阶段，不等于修改 time_comparison 查询时间。
- 初始化展示阶段只更新状态，不记作用户选择。

### `explore / sort`

调整探索图表或表格排序。

读取状态：

- `temporaryState.explore.viewState.sort`
- `temporaryState.explore.viewState.chartSort`
- `temporaryState.explore.queryState.queries[requestId]`

注意事项：

- 本地展示排序和 SQL 后端排序共用 target，是否重查由实际请求决定。
- 自动 formatSort 只更新状态，不生成用户 edit；值保留具体控件结构。
- 普通图表排序保存在 chartSort，表格及SQL控件排序保存在 sort，两者可同时存在，不互相覆盖。
- SQL明细表列头目前为本地排序，记录后不额外发查询；SQL可视化是否重查取决于原全量计算和后端排序设置。

### `explore / expansion`

展开或收起探索层级表格的行。

读取状态：

- `temporaryState.explore.viewState.expandedKeys`

注意事项：

- 不同于折叠整个探索侧栏；展开记录不代表重新执行查询。

### `explore / analysis_view`

修改探索留存、漏斗、区间等模型的分析展示选项。

读取状态：

- `temporaryState.explore.viewState.analysisView`

注意事项：

- 仅记录当前模型实际控件状态，不代表所有模型都有相同字段。
- 是否因模型控件变化触发查询仍按真实请求观察。
- 留存当日/当周/当月切流失时仅记录一次 analysis_view，changedFields 可同时含 conditions.draft.granularity；自动粒度修正不是第二次用户点击。

### `explore / visual_filters`

修改探索 SQL 图内筛选。

读取状态：

- `temporaryState.explore.viewState.visualFilters`
- `temporaryState.explore.queryState.queries[requestId]`

注意事项：

- 保存在探索 viewState，不使用看板卡片同名 target 的 localConditions 路径。
- 本地过滤或全量重查取决于实际模式；不能因为在 viewState 中就断言不查询。
- 外层图内筛选有记录不代表 micro_va 内部编辑已覆盖。

### `explore / path_highlight`

通过路径图节点菜单明确选择高亮或取消高亮节点。

读取状态：

- `temporaryState.explore.viewState.highlightedNode`

注意事项：

- 仅保存稳定节点定位或 null，不保存整张路径图数据。
- 不是 selection、hover 或 tooltip 采集，也不表示修改查询。

### `explore / node_detail`

打开或关闭探索路径图的节点详情。

读取状态：

- `temporaryState.explore.viewState.detail`

注意事项：

- 仅保存当前详情节点定位或 null，不保存完整详情结果。
- 外层仍为同一 report 的 explore，不新增 surface，也不改变原卡片。

### `explore / export`

导出探索当前视图或下载数据。

读取状态：

- `temporaryState.lastOperation.details.exportScope`

注意事项：

- exportScope=current_view 表示当前视图，full_data 表示数据下载。
- 只记录导出意图，不记录文件或完成状态；导出请求不覆盖当前展示查询。

## Examples

```json
{
  "id": "page-1-op-3",
  "at": 3,
  "surface": "explore",
  "action": "edit",
  "target": "query_groups",
  "reportKey": "report:19",
  "exploreSessionId": "session-a",
  "changedFields": [
    "conditions.draft.groupBy"
  ]
}
```

用户在 session-a 的探索中修改报表 19 的查询分组草稿；仅在当前探索 session 匹配时读取该草稿，不代表已点击计算。

```json
{
  "id": "page-1-op-4",
  "at": 4,
  "surface": "explore",
  "action": "apply",
  "target": "query",
  "reportKey": "report:19",
  "exploreSessionId": "session-a"
}
```

用户点击探索计算。是否提交、提交了哪个 QP、查询结果如何，分别查看该 session 中关联的请求，不能把 apply 翻译为计算成功。

```json
{
  "id": "page-1-op-5",
  "at": 5,
  "surface": "explore",
  "action": "close",
  "target": "explore",
  "reportKey": "report:19",
  "exploreSessionId": "session-a"
}
```

用户关闭 session-a 的探索。当前模式可以已是 dashboard、explore 已清空；不能因这条历史操作说用户仍在探索或已保存原报表。
