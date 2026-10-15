# 查询监控实时查询 CLI 技术方案

## 目标与现状

为“通用管理 → 系统监控 → 查询监控 → 实时查询”增加只读 CLI 快照命令。现有 `ae-cli system query-task list` 对应“查询日志”及 `/monitor/task/query`，保持名称、参数和语义不变；实时页使用 `/monitor/task/list`，展示时间窗口内任务及近三天尚未结束的任务。

## 契约

- 新增 Gateway 能力 `system.query_task.realtime_list`，对应精选 L2 命令 `ae-cli system query-task realtime-list`。类型化范围、30 分钟默认值、结果脱敏和限量快照是相对通用 capability 调用的增益。
- 输入：`company_id`；`duration_minutes` 默认 30、范围 1–30；`project_ids` 和 `space_codes` 至少一个非空；`cluster_names` 必填非空；可选 `status_codes`；`limit` 默认 100、最大 200。不自动选择所有项目或集群。
- 输出：`items`、`limit`、`has_more`、`snapshot_at`。每项仅包含页面排障所需的任务 ID、状态、项目/空间、任务/内容类型、内容名称、发起人显示名、集群/引擎、创建/完成时间、耗时、进度、可取消标记。不输出 token、open_id、sql_gateway、SQL。任务详情、取消继续使用现有独立命令。
- 语义：一次执行是一张快照，不自动轮询。SaaS 环境与页面一致返回空列表。`has_more` 表示当前窗口、范围和状态下仍有更多行，不承诺完整计数。

## 实现与安全边界

1. Gateway 复用 `system_monitor:read`、`viewQueryMonitorOfSystem`、公司级权限；服务端再验证每个项目/空间属于 `company_id`，不把 capability 鉴权误当作数据范围校验。无效或跨公司范围直接拒绝。
2. 在 `TaskMonitorService` 增加 CLI 专用入口，页面 `taskList` 和原 Mapper SQL 不改变。新 Mapper 查询使用 `#{}` 绑定筛选值，用 `EXISTS` 约束项目/空间公司归属，在数据库侧排序、过滤隐藏内容并 `LIMIT limit + 1`；最近窗口与近三天未结束任务组成同一查询，避免先全量读取再截断。公司项目和空间显示名按公司查询，不把全公司资产展开成 SQL 的 `IN` 参数。未启用空间表时不引用该表，仅保留项目任务。
3. CLI 适配层仅投影安全字段，不直接序列化页面 DTO；Gateway inspect 发布明确的快照输出 schema。状态过滤、边界值、无权限范围和截断结果均有测试。
4. 第一轮复核发现既有 CLI `query-task options/get/cancel` 以及监控图表、历史列表/导出仅做公司级功能鉴权，未限制所选项目/空间或任务 ID 的公司归属。增加 CLI 专用的选项过滤、详情归属校验和筛选范围校验；取消在执行前和失败回读时均使用受限详情。系统项目 `-1` 无法单独归属公司，因此不能作为 CLI 公司范围筛选值。页面原入口和“查询日志”的数据查询语义不改变，非法跨公司 CLI 参数会由原先可能查询转为拒绝。

## 验证与发布

- 后端：Java 11 下 `./mvnw -pl ta-cli -am -Dtest=SystemMonitorCapabilityServiceTest,SystemMonitorCapabilityCatalogTest,TaskMonitorServiceRegressionTest,TaskMonitorCliSqlContractTest -Dsurefire.failIfNoSpecifiedTests=false test -q` 通过（35 个测试，0 失败）。覆盖 schema/权限/执行、SQL 参数绑定与脱敏、行数边界、公司范围、无空间表和页面原双查询路径。
- CLI：`npm run build`、`npm test`、`npm run verify:analysis-system`、`npm run verify:analysis-tools`、`npm run verify:analysis-skill`、`npm run verify:system-tools` 均通过；覆盖命令注册、参数映射和 dry-run 请求。
- 第一轮分析影响评估：枚举 `QueryMonitorController`、CLI 服务、`TaskMonitorService` 和 Mapper 全部调用方；确认页面 `taskList/taskSelectList/taskDetail` 及原 SQL 未改。发现既有 CLI options/get/cancel、图表、历史列表/导出缺少公司数据范围校验，已增加 CLI 专用校验与回归测试；页面入口不受该新校验影响。
- 第二轮分析影响评估：复核完整 diff、权限、持久化/失败路径、字段与性能。发现内容描述可能包含 SQL，已从快照输出及新 SQL 的读取列中移除，且不读取 token；发现项目与空间交叉归属风险，已在 SQL 双重验证；发现全局枚举与超长 `IN` 风险，改为公司范围查询和 `EXISTS`。独立复核确认原页面查询/导出链路没有代码路径变化；既有历史 CLI 合法参数行为不变，非法跨公司参数从可能读取变为拒绝。无数据库结构变更，无写入或事务变更。
- 先部署后端能力，再部署 CLI；[飞书部署后测试文档](https://thinkingdata.feishu.cn/docx/MD08dpGW6o10Dxx4kSpclD2ynth)记录环境、账号、项目/空间、集群、正反例、页面对照与结果栏，部署后统一执行。此次开发不以本地未部署能力的在线执行结果充数。

## 2026-10-10 补充：历史日志完成时间范围修复

### 原因与时间口径

同步2首轮验证中，历史 `list/export` 对半小时与整天范围均返回 194 条。旧 CLI 只把起止时间交给公用 `buildQP` 的 `byType=date` 日期范围，没有额外的日内精确条件。该行为早于本次实时命令；`realtime-list` 不走此链路。

用户确认按**完成时间**筛选。`TaMonitorQueryEndEvent.toMessageData()` 将 `query_end_time` 写入事件 `#time`，查询时对应内置 `#event_time`；列表和 CSV 的 `start_time` 则是任务发起时间。此前“191 条超范围”是基于 `start_time` 的观察，不能当作完成时间验收结论，也不能预设修复后只剩 3 条。窗口前发起、窗口内完成的任务应保留，不使用 `start_time + query_duration` 推算完成时间。

### 方案与兼容边界

- 在 CLI 的 `SystemMonitorCapabilityService.taskQuery` 给请求叠加 `#event_time` 的 datetime RANGE 条件：下界为起始秒 `.000`，上界为结束秒 `.999`，两端包含。保留原日期分区范围，再按日志事件完成时间精确收敛。
- `list` 和异步 `export` 使用同一请求构造；项目/空间 OR 关系、其他筛选条件 AND 关系、分页、脱敏和导出生命周期不变。公司归属验证仍在查询和创建导出 run/artifact 前执行。
- 不改公用 `MonitorQueryReq`、`TaskMonitorService.buildQP/monitorQuery/downloadMonitor`、`FilterHelper`、Mapper 或采集逻辑。分析页面继续使用原日期语义和自身筛选条件，CLI 半小时结果不要求与页面日期查询的条数相同。
- `start_time/end_time` 字段名、CLI 参数、输出字段、权限与 31 天范围限制不变。严格校验完整的标准时间字符串，拒绝尾部字符和非法日期，避免把部分解析后的原字符串拼入时间条件。
- 不新增表、migration 或数据修复；不改变历史数据、写入事务、导出失败信息或凭证处理。部署后端后旧 CLI 也能使用精确过滤，新 CLI 仅增加 help/reference 的时间口径说明。回滚后端适配层即可恢复原历史查询行为。

### 两轮分析功能影响复核

1. 实现后复核生产 diff 与参数契约：只有 CLI 专用适配层新增精确条件，Catalog/CLI help 改说明，没有改共享生产代码。补半小时、跨午夜、整天、同秒窗口的 list/export 请求一致性测试，确认项目/空间的 OR 条件没有被改成 AND，且没有按返回 `start_time` 二次过滤。
2. 独立重新枚举调用链：页面 `QueryMonitorController` → 公用历史查询/页面导出；CLI → 同公用查询；异步导出 worker → OutputStream 导出；均经 `buildQP` 和事件分析反序列化生成 SQL。补真实 QP → `TaEventView` → `FilterHelper` 的 SQL 边界测试、页面不隐式增加完成时间条件/原 caller filter 保留测试，以及事件时间来源、跨公司拒绝、导出完成与失败脱敏回归。精确条件使用与现有事件分析相同的时间列/时区处理，不另做 UTC 转换。无持久化、事务或失败残留路径改动。

### 本地结果与部署后复测

- Java 11 下运行上述后端命令并增加 `SystemQueryTaskExportServiceTest`：49 个测试通过，0 失败/错误。旧代码已通过缺少精确 filter 的失败用例复现；严格时间校验的尾部字符用例亦完成红绿验证。
- CLI `npm run build`、`npm test`、`verify:analysis-system`（22 个测试）、`verify:analysis-tools`、`verify:analysis-skill`、`verify:skill-reference-files` 通过；命令请求字段保持原秒级字符串，不由 CLI 拼毫秒。
- 飞书增加完成时间口径与部署后复测用例：半小时、跨午夜、起止秒毫秒边界、同秒/空窗口、窗口前发起且窗口内完成、list/CSV 的 query_id 集合一致、权限和非法输入。完成时间证据来自受控已知任务的 `query_end` 事件或经授权的后端观测，不以输出的 `start_time` 作为判定依据。
- 本地仅验证请求构造、SQL 和生命周期；实际数据查询与导出需部署后再验证。实时命令已测结果不被本修复替代；受限账号、真实跨公司及空间场景仍待部署补测，不测试 te-agent。
