# Engage 旧 MCP 命令 Capability 迁移报告

日期：2026-07-22

## 结论

`flow`、`task`、`setting`、`config` 四个旧 te-engage MCP 命令目录已全部迁移完成：45 个旧命令均有 Capability Gateway 等价入口，其中 34 个高频、稳定契约作为 L2 资源命令，11 个低频报表或复杂查询保留为 L3 Capability。te-cli 已删除所有旧 `engage +...` 命令及 MCP 路由注册，不保留 alias；Hermes 原 MCP Tool、Service 和注册全部保留。

迁移状态地图见 [engage-mcp-capability-migration-state.md](engage-mcp-capability-migration-state.md)。源映射表见工作区 `skills/migrate-te-engage-mcp-command/command-map.md`。

## 迁移统计

| 目录 | 旧命令 | L2 | L3 | 状态 |
| --- | ---: | ---: | ---: | --- |
| flow | 12 | 8 | 4 | 完成 |
| task | 10 | 6 | 4 | 完成 |
| setting | 13 | 13（含 4 个既有 scene 能力及 query 生命周期） | 0 | 完成 |
| config | 10 | 7 | 3 | 完成 |
| 合计 | 45 | 34 | 11 | 完成 |

## 目标能力

### flow

- L2：`engage-flow.flow.{list,get,save,modify-base-info,manage,delete}`、`engage-flow.node-config.{schema,validate}`。
- L3：`engage-flow.report.{node-overview,process,node-detail,ab-split-node}`。

### task

- L2：`engage-task.task.{list,get,stats,save,build-save-guide,manage}`。
- L3：`engage-task.task-data.{overview,detail,metric-detail,experiment-report}`。

### setting

- L2：`engage-setting.channel.{list,get,create,update-status,delete}`、`engage-setting.whitelist.list`、`engage-setting.approval-approver.{add,list}`。
- 迁移前已存在且复用的 L2：`engage-scene.config-channel.{list,get,update-status,delete}`。
- L2：`engage-query.query.cancel`。

### config

- L2：`engage-scene.config-item.{list,get,delete}`、`engage-scene.template.copy`、`engage-scene.strategy.{list,get,manage}`。
- L3：`engage-scene.report.{config-item-trigger,config-item-analysis,strategy-comparison}`。

## 实现说明

Hermes 新增按领域划分的迁移适配 Service，Capability handler 直接调用保留的 MCP Service，以维持业务校验、状态机、数据查询和错误行为；Catalog/Definition/Configuration 补齐 Schema、权限、风险等级、dry-run/cancel 元数据和 Spring 注册。输入输出边界统一使用 snake_case，并为列表、单项、布尔结果建立稳定 envelope。

te-cli 为稳定能力新增 kebab-case L2 命令；报表保留 L3，使用 `capability run/dry-run` 和 snake_case JSON。四个旧命令目录、旧 `registerMcpMappings` 和仅供旧命令使用的 MCP 调用包装已删除。`skills/ae-engage`、smoke 脚本和合同测试已同步更新。

`ta-multiverse` 未修改：本次没有改变页面 Controller/DTO 或现有前端 API 契约，Capability 侧复用原 MCP Service。

## 自动化验证

### 分批结果

| 批次 | Hermes | te-cli |
| --- | --- | --- |
| flow | reactor compile/checkstyle；25 个相关测试 | build、Capability/Skill contract、save-flow dry-run、help、旧命令拒绝、release gate |
| task | reactor compile/checkstyle；33 个相关测试 | build、Capability/Skill contract、dry-run/help、旧命令拒绝、release gate |
| setting | reactor compile/checkstyle；42 个相关测试 | build、Capability/Skill contract、dry-run/help、旧命令拒绝、release gate |
| config | reactor compile/checkstyle；17 个相关测试 | build、41 个 scene L2 注册/help 合同、3 个 L3 Skill 合同、dry-run 路由、旧命令拒绝、release gate |

### 最终验证命令

```bash
# Hermes
mvn -pl web -am -DskipTests compile
mvn -pl web -am -Dtest='<migration capability tests>' -Dsurefire.failIfNoSpecifiedTests=false test
git diff --check

# te-cli
npm run build
npm test
npm run verify:engage-capability
npm run check:release
bash -n test/engage/flow.sh test/engage/task.sh test/engage/setting.sh test/engage/config.sh
git diff --check
```

最终合并回归结果：Hermes 124 个相关测试通过（0 failure / 0 error / 0 skipped）；te-cli build、npm test、Capability command contract、Skill contract 和 release gate 全部通过。旧命令目录/注册消失审计、Hermes MCP 源码保留审计、四个 smoke 脚本语法检查及三个仓库 `git diff --check` 均通过。

Review 收口时进一步核对了迁移 Handler 的真实 envelope 和递归 snake_case 转换：高频 `flow save/get/list`、`channel list/get/create`、`task save` Skill 已明确响应路径；嵌套 `req`/`payload` 仍保持 Java DTO 的 camelCase。`channel_status` 的禁用值修正为 `0`，并增加 Skill 合同测试防止文档回退。te-cli 中四个已清空的旧 MCP 命令目录也已删除。

无真实 Hermes 环境时，L2 `--dry-run` 仍会访问 Gateway，因此本地 smoke 脚本只做语法检查；请求 URL、Capability ID 和 input body 由 mock transport 合同测试覆盖。真实 dry-run 和执行场景列入下一节。

## 需要人工重点进行实际环境测试的场景

### 通用入口与权限

1. 用拥有全部权限、仅查看权限、仅编辑权限和无权限的账号分别调用 L2/L3，确认 scope、`functionNames`、项目隔离和 403 错误一致。
2. 对不存在、跨项目和已删除资源验证 404/业务错误；确认响应键全部为 snake_case，分页/列表 envelope 稳定。
3. 对每个 L3 报表先执行 `capability get`、`dry-run`、`run`，记录 `request_id`，验证超时、重复请求和并发请求。
4. 验证旧 `ae-cli engage +...` 全部不可调用，新命令 help 中 flag 均为 kebab-case。

### flow

1. `flow save` 依次覆盖 `build`、`preview`、`commit`，包括新增/修改节点、连线、条件分支、非法环路和节点 Schema 不匹配。
2. `node-config schema/validate` 覆盖所有生产节点类型、缺字段、未知字段和前端真实保存 payload。
3. `flow manage` 覆盖 approve/deny/cancel/pause/recover/end 的合法与非法状态转换；`flow delete` 验证运行中/有依赖流程不可删以及 `--yes`。
4. 四类报表覆盖 flow UUID/ID、时间区间、节点维度、AB 节点、多时区、空结果和大结果。

### task

1. `build-save-guide` 与 `save` 按定时、实时、周期、一次性等任务类型组合，覆盖不同 channel、target cluster、QP 字段和多语言内容。
2. `task list/get/stats` 与页面结果逐字段比对，特别验证 task subtype 路由、分页、状态和空值。
3. `task manage` 覆盖 pause/recover/end/approve/deny/cancel 等状态机、原因字段、无权限和并发操作。
4. 四类 task-data 报表覆盖 overview/detail/metric/experiment 维度、时间区间、指标集合、多语言、多时区和大结果。

### setting

1. channel create/get/list/update-status/delete 覆盖 webhook、App Push、Client Push 等 provider，启停前置条件、被任务引用、敏感配置脱敏和禁用后删除。
2. whitelist list 验证不同属性类型、空名单和大名单；approver add/list 验证有效/无效/离职 open_id、重复添加和权限边界。
3. `engage-query.query.cancel` 用真实异步导出的 run_id 验证运行中取消、重复取消、已完成/不存在运行和非法输入。
4. 四个既有 config-channel 能力与旧 MCP 输出逐字段比对，并验证已被配置项绑定时的启停/删除限制。

### config

1. config-item list/get 对照页面；delete 覆盖无策略、有草稿策略、发布中策略、错误 open_id 和 `--yes`。
2. template copy 覆盖同项目、跨项目、目标已有同名模板、全局参数、单选自定义表及依赖表复制；重点验证源项目和目标项目权限隔离。
3. strategy list/get 覆盖 project/config/UUID 过滤；manage 覆盖 online/offline/suspend/delete/approve/deny/cancel 的所有合法与非法状态，并检查 `strategy_list` 中 `strategy_uuid`/`reason` 映射。
4. 三类 config 报表覆盖 config/template/strategy slice、template 与 strategy 过滤互斥、至少两个策略比较、日期边界、时区、空/大结果及 request_id 延续。

## 已知边界

- 自动化验证未连接真实 Hermes 数据源，因此权限矩阵、状态机副作用、跨项目模板复制和异步导出 run_id 取消必须按上述清单人工验证。
- Strategy save-submit/test-send 与 Template test-send 不是本次旧 MCP 映射表中的命令，仍遵循其既有准入状态，不因本次迁移自动开放。
- Hermes 原 MCP 入口按迁移约束保留；本次只移除了 te-cli 对旧 MCP 命令的公开注册。
