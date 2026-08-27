### 6.1.18
**日期：** 2026-08-27

**更新内容：**

#### 数据集成
* 将 `data-integration handoff` 扩展为可复用的交付包，包含冻结映射、流水线描述、数据结构检查、可执行的转换/上传阶段、运行手册及可分享 zip，用于持续处理结构相同的新文件
* 加固本地数据转换：明确 AE 系统字段契约和结构化失败分类，补充隔离行修复指引、引号/UUID/IP 处理，并修复 XLS 与 XLSX 输入的 `flatten_rules` 支持

#### 分析与治理
* 新增 `analysis-governance asset-authentication` 列表、导出和更新命令，支持服务端筛选、完整私有 JSONL 导出、类型化资产标识、快照冲突保护及结构化批量结果
* 新增 `personal-semantic-preference` 域，支持按项目查询、读取、新增、更新和删除当前用户的个人语义偏好
* 通过看板获取/更新流程暴露标准化的有效设置，以及看板默认筛选、业务筛选、空间筛选和固定时间筛选配置
* 明确分析缓存与元数据发现规则：仅在显式要求数据新鲜度时绕过缓存，CLI 与页面结果不一致时仅无缓存重试一次，限制在线元数据查找轮次，并复用一份完整的本地目录快照

#### 知识库与运营
* `kb +url` 改由服务端自动识别和解析飞书/Lark URL，无需客户端传入 `--platform`；同时明确飞书/Lark 文档 URL 会忽略自定义解析指令
* 加固运营 A/B 任务构造：保持实验组列表与渠道内容列表的分组元组一致，主目标必须包含触达周期字段，并在保存后校验持久化的分组数据

#### Agent 与 CLI
* 加固 Skill 编辑和版本同步：提供可执行的版本冲突恢复指引、面向用户的安全历史冲突错误，将 rescan 指引收敛为仅内部使用，并在版本安装时显式使用公网 npm registry
* `auth logout` 保留 Host 配置；capability 发现会拒绝未注册域，并阻止 Agent 在空目录缺少部署或权限证据时继续猜测和重试

#### 6.1 独有：项目语义与 Atlas 实验
* 新增 `project-semantic` 域和 `ae-project-semantic` Skill，支持受治理资产包导出、按证据范围生成推荐、确定性候选校验与提交、候选启用、语义生命周期管理及版本发布
* 扩展 Atlas 实验能力：新增 Feature 白名单查询、保存、状态变更和删除命令，并支持包含护栏角色的完整指标绑定替换；重复 ID 校验限定在单个白名单分桶内，同时隐藏暂不支持的内部 `observation` 指标角色

### 6.0.45
**日期：** 2026-08-21

**更新内容：**

#### 知识库
* 将知识库发现流程重构为确定性的 `+index` → `+grep` → `+read` 导航：新增 `+read --outline` 与 `ae-kb-discovery` Skill，要求 `+grep` 显式传入 `--sources` / `--paths` 范围，前置校验 `+list --build-status`，并下线 `+query`
* 将 `kb +ask` 改为提交后轮询执行，同时保留默认等待完成的输出兼容；新增 `--no-wait` 与 `kb +ask-status` 以支持长耗时问题，并完善来源、章节范围与页面窗口指引

#### 数据集成
* 移除非 XLS 本地文件的 200 MB 硬限制，并将旧版 XLS 上限提高至 1 GB；在大文件检查前新增 dry-run 大小/耗时预估，以及非阻塞的处理耗时或内存风险提示

### 6.0.44
**日期：** 2026-08-20

**更新内容：**

#### 数据集成
* 新增端到端本地数据工作流，支持检查、画像、转换、映射、复用和上传 CSV、TSV、TXT、NDJSON 与 Excel 文件，并提供编码检测、嵌套数据拍平、类型与时间推断、冲突处理及埋点方案交接能力

#### 分析
* 支持更新看板业务筛选和项目空间业务筛选，并将看板文件夹与便签纳入分析上下文
* 指标值和首末次标签支持属性筛选，并优化 Analysis Agent 指引，减少重复读取与无效执行

#### Agent 与安全
* 强制校验 CLI 访问权限，支持 CLI Token 有效性校验与自动续期，并统一 Agent 命令的认证及 Host 路由
* 新增通用审批类型、申请、任务和 Effect 管理命令，并收紧重试、请求隔离与风险控制契约
* 区分 Agent 沙箱请求与外部 CLI 调用，优化 KB 鉴权错误提示，并加固 Agent 命令注册校验

#### DataOps
* SQL 查询下载结果改为直接流式写入本地文件，提升大结果集处理的安全性

### 6.1.14
**日期：** 2026-08-13

**更新内容：**

#### 运营
* 新增任务指标用户的同步查询与异步导出命令，支持身份字段校验、SQL 编译、产物生命周期，并为去重指标提供安全限制
* 新增非触发式任务用户明细异步导出，支持 CSV/JSONL 产物及统一的检查、等待、下载和取消流程

#### 分析
* 报表、看板、BI 面板、告警、SQL 表、公共链接和项目空间列表及报表目录导出支持多关键词检索
* 支持更新已有用户标签和分群的自动刷新 Quartz cron，不会启用自动刷新或触发重新计算
* 收紧收藏、指标创建、虚拟属性 SQL 更新和维度表绑定契约，并在分析模型指引中明确指标展示名

### 6.1.13
**日期：** 2026-08-06

**更新内容：**

#### 分析
* 新增统一元数据目录检索/解析，并拆分事件、属性、指标、标签、分群的完整导出命令；加固缓存同步与异步导出契约
* 移除 Analysis MCP 兼容域及不支持鉴权的裸 `api` 命令
* 对齐 BI、成员、事件明细与实体明细导出契约（jsonl/csv 双格式、异步全量导出）；移除同步查询通用 `limit` 参数
* 统一分析查询预览与异步等待契约；明确路径按层截断、默认 120 秒超时、虚拟节点计数、续查证据与看板载荷截断
* 收紧 AI 分析聚合白名单与 Agent capability 输入/SQL 指引；对齐报告 resolutions、子属性目录与 Skill 引用全文件类型

#### 运营
* 新增 Engage 查询与导出能力（流程指标/用户/节点、产物下载、按 `request_id` 取消查询）；对齐流程用户查询契约并兼容驼峰字段
* 新增流程指标更新；下线任务去重用户明细导出 CLI
* 事件触发任务 A 规则强制要求 `periodTimeSymbol`；明确推送记录查询字段、任务提审校验、配置项 `show_time_zone`，以及试验任务 `groupContentList` 组关联约束

#### 数据开发
* 新增任务实例检查节点，支持通过 CLI 创建和更新
* CLI 支持预览并确认删除工作流任务节点
* 任务实例详情不再返回未启用的超时配置字段

#### Agent 与 Skills
* 产品 Skill 去除预置 MCP 回退，并增加发版门禁检查
* 补齐 6.0.40 之后落地的 `ae-cli system` 用量 CSV 流式导出、沙箱工具生命周期、模型与成员统计等能力

#### 6.1 独有：Atlas 实验
* 明确 Atlas 实验保存/提交时，相邻且 `relation` 相同的 `compound` 分组会被拍平，以保证生成的分群 QP 不超过后端层数限制；不同 `relation` 仍会保留
* 清理实验设计/洞察 Skill 中的预置 MCP / te-mcp 回退表述

### 6.1.12
**日期：** 2026-07-31

**更新内容：**

#### Agent 与系统管理
* 将 `ae-cli system` 从 39 条扩展到 59 条命令，补齐成员统计、沙箱配置、模型同步策略与价格、用量工具调用/组合下钻/导出、账户余额与超限用户，以及共享沙箱工具全生命周期
* 用量汇总新增强制刷新；CSV 导出改为独占创建的本地流式写入，并返回结构化文件信息、失败时清理不完整文件
* 明确服务端鉴权与租户边界、排除的系统间接口，以及 Skill 规则、dry-run、命令缺失和 `--yes` 都不是安全控制

#### 运营
* 为流程、任务、策略、预置事件、活动和公共指标写入新增封闭式语义定义校验，包括严格校验字段、操作符、聚合方式及嵌套 DTO
* 明确每个事件与行为序列的 `time_range` 要求和筛选属性契约，包括技术名或结构化字段引用、`array_row` 对象组筛选，以及拒绝不支持或未知字段
* 新增 `engage-activity.activity-data.detail` 投放趋势查询指引，覆盖活动/主题/任务选择、时间粒度、取消请求 ID 和指标语义

#### 6.1 独有：Atlas 实验
* 新增 `experiment report summary`、`experiment report sample-size` 和 `experiment report metric-trend` 三条精选报表命令，并列明 `capability search --domain` 支持的域
* 加固实验保存与指标工作流，明确嵌套 DTO 必须使用原生 camelCase、按权威 schema 校验、使用已验证的指标 ID、处理 `METRIC_NOT_FOUND` / `METRIC_IN_USE`，并完善项目 ID 解析指引

### 6.1.11
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

#### 6.1 独有：Atlas 实验
* 新增 `ae-experiment-design` 和 `ae-experiment-insight` Skills，覆盖实验规划、SDK/曝光就绪检查、结果分析和诊断手册
* 新增实验保存 build-guide 与 validate 命令，并收紧指标属性和整数分流比例契约，包括分流比例总和必须为 100

### 6.1.10
**日期：** 2026-07-30

**更新内容：**

#### 埋点
* 新增本地 Debug 设备管理与接收数据查询命令，并将埋点代码生成指引更新为端到端 CLI 验证流程
* 新增埋点方案展示名同步能力，可根据生成的埋点方案更新事件和属性展示名

#### CLI / Agent
* 将 Skills 发版同步切换为中心化系统服务，并更新打包脚本和回归测试

### 6.1.9
**日期：** 2026-07-28

**更新内容：**

#### CLI / Agent
* 为公网版本新增按 Host 自动同步 CLI 与 Skills，支持精确版本升级/降级、安装锁与限频、本地 npm Skills 优先、GitHub 回退及半成功恢复
* 扩展 `ae-cli update`，支持指定 Host/目标版本、dry-run 计划及结构化的 `AE_CLI_VERSION_SYNCED` 重试语义
* Agent 自动化创建/更新新增 `--reuse-conversation`，支持定时任务在同一可见会话中延续，并覆盖兼容回退场景

#### 埋点与文档
* 修复埋点代码生成的 Wiki 引用路径，统一使用 `~/.ae-cli/wiki/raw` 和 `~/.ae-cli/wiki/synthesis`
* 更新内网/公网中英文 README，并新增中文 changelog

#### 6.1 独有：Atlas 实验
* 新增 `experiment` capability 域，覆盖实验生命周期、报表、样本量与指标趋势、流量层冲突检查、Feature、指标、分桶、操作日志和批量删除
* 新增 `ae-experiment` Skill 和验证覆盖，包括实验就绪检查及高风险写入指南

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
