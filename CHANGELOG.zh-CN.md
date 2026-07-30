### 6.0.39
**日期：** 2026-07-30

**更新内容：**

#### Agent 与 CLI
* 新增 `memory` 域，覆盖用户记忆的全生命周期管理、抽取与审核、整理、默认值与上下文注入，以及实际使用量回传
* 新增 Agent 归档会话搜索与恢复命令，并修复归档时间的时区显示
* 新增带版本管理的 Skill 添加、编辑、上传与同步流程，并加强发版校验
* 重构 Host/环境配置交互，并在未配置 Host 时提供试用引导

#### 分析
* 扩充项目与系统管理能力，覆盖项目生命周期、成员与角色、MFA/认证、邮件与接收地址配置、监控与查询任务，以及用量报表

#### DataOps
* 新增 `+create_workflow_instance_check_task` 和 `+update_workflow_instance_check_task`，支持同时检查多个任务流、使用单层 AND/OR 组合及 DAY/HOUR/MINUTE 检查时间单位；创建时默认每 5 分钟检查一次，共检查 3 次
* 统一 SQL、集成和任务流实例检查节点的依赖与失败重试配置：使用 `preTasks` 数组配置多个前置任务；更新时未传参数保留原值，空数组清空依赖；创建时默认失败重试 3 次、间隔 5 分钟，单位为 MINUTE

#### 运营
* 新增活动主题/任务 payload 校验，并恢复审批提交工作流
* 删除过期的 `engage-setting query cluster-qp-skill`；受众、触发和完成条件改由 Analysis 模型生成语义定义并交给 Hermes 编译，包括在旧版 Flow 校验前编译 `targetDefinitionRequest`
* 明确 Webhook 与客户端创建通道的传参差异，并补充任务保存时可选的 `relationProps`

### 6.0.38
**日期：** 2026-07-30

**更新内容：**

#### 埋点
* 新增本地 Debug 设备管理与接收数据查询命令，并将埋点代码生成指引更新为端到端 CLI 验证流程
* 新增埋点方案展示名同步能力，可根据生成的埋点方案更新事件和属性展示名

#### CLI / Agent
* 将 Skills 发版同步切换为中心化系统服务，并更新打包脚本和回归测试

### 6.0.37
**日期：** 2026-07-28

**更新内容：**

#### CLI / Agent
* 为公网版本新增按 Host 自动同步 CLI 与 Skills，支持精确版本升级/降级、安装锁与限频、本地 npm Skills 优先、GitHub 回退及半成功恢复
* 扩展 `ae-cli update`，支持指定 Host/目标版本、dry-run 计划及结构化的 `AE_CLI_VERSION_SYNCED` 重试语义
* Agent 自动化创建/更新新增 `--reuse-conversation`，支持定时任务在同一可见会话中延续，并覆盖兼容回退场景

#### 埋点与文档
* 修复埋点代码生成的 Wiki 引用路径，统一使用 `~/.ae-cli/wiki/raw` 和 `~/.ae-cli/wiki/synthesis`
* 更新内网/公网中英文 README，并新增中文 changelog

### 6.0.36
**日期：** 2026-07-24

**更新内容：**

#### CLI / Agent
* 新增绑定 Host 的 `ae-cli update`，用于安装当前 AE 环境要求的 CLI 和 Skills 版本
* 新增 `system` 域，用于 Agent 系统管理（成员、沙盒、模型、用量、成本控制、配额、IM 渠道）
* 支持在 system 域下安装和上传 npm 沙盒工具

#### 分析
* 将 `batch_create_metadata` / `batch_edit_metadata` 迁移到新的 CLI capability 入口
* 简化看板日报的获取、发送、更新和发送状态命令
* 对齐看板空壳创建/重命名与 BI 面板创建/更新契约；完善 BI 空壳和汇总下钻文档
* 移除 `alert-definition-schema get`；调整告警创建/更新参数以适配定义构建器

#### 运营
* 新增 `engage-scene strategy predict`，用于预估受众规模，并扩充策略受众文档
* 新增 `engage-setting query cluster-qp-skill`（要求 `--project-id`）；更新 save-flow / task-save 工作流
* 支持通过 `engage-task task save` 更新已暂停的任务
* 扩充活动主题受众与任务编排指南

### 6.0.35
**日期：** 2026-07-23

**更新内容：**

#### 分析
* 将分析查询辅助能力迁移到 capability gateway（`query-cluster list`、`filter-value list`、查询取消路径），并移除已被替代的旧 analysis / meta / common 入口
* 下钻和创建结果集群流程要求传入 `--project-id`；补充 SQL `PartDate` 时区及 AI QP 编译失败契约
* 明确 `filter-value list` 中标签最新版本的语义（数据快照行为）

#### Agent
* 新增 `agent +list-sandbox-tools`，用于列出沙盒工具清单；忽略超出大小限制且不受管理的沙盒工具文件
* 加固异步命令与程序生命周期契约

#### DataOps
* 完善 MySQL Source 创建契约和 MySQL Sink 配置指南
* 集成方案更新时忽略 `syncName`，并收紧更新契约

#### 埋点与元数据
* 修复埋点方案中已有自动采集事件的 autotrack 与客户端 SDK 不匹配问题；修复埋点相关 Skills 中公共事件属性的国际化
* 移除已废弃的元数据事件/属性 get 旧入口，仅保留 gateway 入口

### 6.0.34
**日期：** 2026-07-22

**更新内容：**

#### 运营
* 继续推进 capability gateway 迁移：将配置渠道的 list/get/status/delete 迁移到 `engage-scene`，并移除遗留的旧 MCP setting/task/flow 入口
* 新增 `engage-flow flow update-remark`，用于更新流程版本备注
* 重新启用活动主题/任务的创建和更新；重新启用公共指标创建（收紧 QP / 时间单位契约）及客户端参数创建（仅允许 `column_type`）
* 流程节点配置的 schema/validate 要求传入 `--project-id`；将渠道 `update-status` 与后端枚举对齐（`1`=开启，`2`=关闭）
* 将 `ae-engage` Skill 文档翻译为英文

#### 知识库
* 将 `kb +query` 与 grep 风格的可选参数对齐：`sources` 改为可选；新增 `--top-k` 和 `--locale`

### 6.0.33
**日期：** 2026-07-21

**更新内容：**

* 新增 Host 版本兼容性检查（本地 CLI 与集群 `te_module_version` 不一致时给出软提示）；通过 `meta._notice` 向 Agent Skills 暴露提示
* 新增社区聊天分析和社区数据报告能力（包括标准 v5 报告工作流及 Skill 约束）
* 新增埋点方案和告警 capability 命令；修复相关的方案导入、tracking-client 和 property-get 契约
* 支持项目维度的 capability 发现（按项目执行 `capability list/search`）
* 改进 `generate-tracking-plan`：支持从已有方案文件开始，优化事件标签逻辑，并改善归档 xlsx 布局
* 对齐分析时区、受众校验和生效时区契约；区分看板与 BI 面板的创建路由
* 补充看板日报发送/更新所需的飞书凭证（`app_id` / `app_secret` / `webhook`）文档
* JSON 解析时将长小数保留为字符串，避免精度丢失
* 注册缺失的知识库 `+url` 命令；补全告警、检查和方案删除的高风险确认文档
* 从仅写入的运营活动 Skill 示例中移除 `--yes`

### 6.0.32
**日期：** 2026-07-20

**更新内容：**

#### CLI 架构
* 解析 capability gateway 域名时优先使用 `AE_CLI_CAPABILITY_GATEWAY_DOMAIN*` 环境变量（覆盖调用方默认值）
* 在高风险确认前校验参数；非法布尔值统一返回 JSON 错误
* 将资产治理 capability 与新的 gateway 能力面保持一致，并移除已被替代的旧 CLI 入口

#### 分析
* 将报告 capability CLI 化，并将下钻/详情命令契约与 Agent 文档对齐
* 新增项目管理 capability 命令并修复相关问题
* 在受众文档中明确集群/标签自动计算状态；修复 `ai_models` Skill 指南

#### 运营
* 新增 engage-setting / engage-scene / activity / workbench capability 命令及 Skill 文档
* 新增 `engage-scene config-item list`；重新启用 engage-task 命令；将运营任务重新归组到 `task`
* 将 engage-flow 操作日志查询参数改为 `--flow-id`；将配置渠道的 `--config` 改为可选，并补充 `channel_type` / config 约束文档
* 加固渠道测试发送错误、公共指标空 QP 检查、客户端参数显示名称默认值，以及配置表保存时的上传提示
* 扩充活动主题/任务/复制/审批文档（富文本 TEXT 字段、拒绝原因、白名单校验风险）

#### 知识库与 DataOps
* 新增知识库列表命令
* 统一 DataOps SQL 下载认证

### 6.0.31
**日期：** 2026-07-16

**更新内容：**

#### CLI 架构
* 将更多业务域接入 capability gateway；新增 `capability --validate`，并将 `--dry-run` 保持为仅服务端预检查
* 使用真正的 `jq-wasm` 替换自定义 `--jq` 路径遍历器，提供稳定的 JSON 过滤
* 改进 Agent 错误提示、请求分发指南和非法数值参数拦截（避免 NaN → null 的 gateway 噪音）
* 新增发布门禁的 Skill frontmatter 检查，使 `npx skills add` 遇到未加引号的 YAML `description` 时快速失败
* 移除已被 gateway 替代的旧分析命令入口

#### 分析
* 将报告、看板、即席分析、详情和受众流程 CLI 化：统一运行/导出路由、下钻、产物下载及 AI QP 契约
* 将分析 Skills 合并为单一索引入口（`command_index`），并使 Agent 契约与 capability gateway schema 对齐
* 将资产治理 capability 迁移到 `analysis-governance`（列表/搜索/血缘/影响分析/批量操作），并修复相关治理问题
* 完善用户分析 CLI（集群/标签成员、历史标签下钻、定义构建）和 ID 文件导入契约
* 移除 gateway 已覆盖的旧 `analysis_audience` / detail MCP fallback 命令；同步埋点方案上传的 `lang` 和内置国际化

#### 运营
* 注册运营 capability gateway 路由，并恢复/重构运营 CLI 和 Skill 文档
* 新增流程版本列表、流程/任务操作日志查询、测试运行和推送记录查询（含本地日期范围校验）
* 新增渠道触达限制 L2 命令及 engage-task P0 命令集（segment-list / group / metric / race / ops / channel-ref）

### 6.0.30
**日期：** 2026-07-14

**更新内容：**

* 为 tracking-code、tracking-plan 和 data-integration-helper Skills 的 `description` 加引号，修复 Skill Hub YAML frontmatter 解析错误
* 新增自检规则，检查包含 `: ` 但未加引号的 Skill description

### 6.0.29
**日期：** 2026-07-13

**更新内容：**

* 新增 capability gateway 发现命令（`capability list/search/inspect/dry-run/run`）、`ae-capability` Skill 以及长尾 capability 的命令准入文档
* 将项目空间和文件夹的创建/删除/共享/成员变更迁移到 L3 capability 流程；移除精选 L2 命令
* 将 CLI 风险等级与 lark-cli 三级模型对齐（`read` / `write` / `high-risk-write`），并收紧删除确认行为
* 将数据管理 capability 路由到 `analysis-meta` 域；修复指标、虚拟属性和超级元数据导入的 CLI 输入契约
* 同步分析和受众 CLI 契约：十种即席 QP 构建器、集群定义顶层参数、下钻分页和报告版本字段
* 修复 ID 集群更新/删除到 `te_analysis_extend` MCP 服务的路由
* 为 `metadata data-table sql-write` 补充 `SqlDatatableDef` QP 结构和示例文档

### 6.0.28
**日期：** 2026-07-10

**更新内容：**

* 新增 47 个分析数据管理 capability 命令（事件、属性、虚拟事件、虚拟属性、指标、资产、交换、数据表、超级元数据）
* 将超级元数据导出与异步 XLSX 产物工作流对齐（`request-id`、`timeout-seconds`、运行检查和产物下载）
* 新增 BI 面板版本获取/发布命令；明确已发布与草稿面板契约、日报发送参数及看板报告筛选器用法
* 改进埋点方案和埋点代码 Skills（代码片段交付和方案工作流文档）

### 6.0.27
**日期：** 2026-07-09

**更新内容：**

* 扩展 te-agent，支持 Agent、MCP、Skill 和模型的沙盒/Agent CRUD
* 新增分析产物下载和运行检查命令；优化看板导出契约
* 将 DataOps API 调用迁移到 cli-token，并在任务实例详情中支持 taskInstanceId
* 改进 CLI token 处理：每日续期、更清晰的 403 错误及 Host URL 标准化
* 适配 engage save_flow 协议，并支持在沙盒工作区上传埋点方案文件

### 6.0.24
**日期：** 2026-07-08

**更新内容：**

* 修复认证问题
* 在看板和项目空间域新增 40 多个命令

### 6.0.22
**日期：** 2026-07-07

**更新内容：**

* 重构认证
* 更新埋点 CLI 命令
* 新增元数据域命令

### 6.0.20
**日期：** 2026-07-02

**更新内容：**

* 增强稳定性

### 6.0.18
**日期：** 2026-06-27

**更新内容：**

* 增强稳定性

### 6.0.16
**日期：** 2026-06-25

**更新内容：**

* 支持埋点命令

### 1.0.30
**日期：** 2026-06-23

**更新内容：**

* 增强稳定性

### 1.0.29
**日期：** 2026-06-23

**更新内容：**

* 增强稳定性

### 1.0.28
**日期：** 2026-06-22

**更新内容：**

* 增强使用安全性

### 1.0.27
**日期：** 2026-06-18

**更新内容：**

* 支持客户工作区

### 1.0.24
**日期：** 2026-06-05

**更新内容：**

* 新增知识库（KB）命令

### 1.0.20
**日期：** 2026-05-27

**更新内容：**

* 新增分析引导式 QP 构建命令及 dry-run 回归验证

### 1.0.19
**日期：** 2026-05-21

**更新内容：**

* 改进 Skills

### 1.0.17
**日期：** 2026-05-07

**更新内容：**

* 改进登录流程

### 1.0.16
**日期：** 2026-04-30

**更新内容：**

* ae-cli 终端工具首次发布
