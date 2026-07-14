# Capability 命令收录规则

本文定义 te-cli 在 Capability Gateway 迁移期间的命令分层、收录、保留和迁移规则。

目标不是让所有后端能力都拥有独立 CLI 命令，而是让 Gateway 负责能力覆盖，精选命令负责提供额外的产品价值。规则不依赖打分、评审会议或审批流程。

## 1. 分层定义

### L1：编排命令

L1 使用 `+<verb>` 形态，面向完整业务任务。它的行为不能由一次 capability 调用等价表达，并且至少提供以下一种编排价值：

- 调用多个能力并组合结果；
- 自动发现、解析或补全资源 ID；
- 自动分页、轮询异步任务、有限重试；
- 应用业务默认值并选择不同执行路径；
- 聚合多个响应或转换为稳定的任务级输出。

单个 MCP tool 的一对一 CLI 包装不因使用 `+` 前缀自动成为 L1。

### L2：精选类型化命令

L2 使用 `ae-cli <domain> <resource> <action>` 形态，底层对应一个稳定 capability。只有通用 L3 调用不足以提供清晰、安全的使用体验时才进入 L2。

L2 必须至少提供以下一种额外价值：

- 将 Gateway 字段转换为明确的类型化 flags；
- 提供稳定且有业务含义的默认值；
- 处理文件、stdin、分页或异步请求；
- 增加比通用执行更明确的安全门禁；
- 将 Gateway 输出整理为稳定、可组合的结果；
- 为已经稳定使用的命令提供兼容入口。

如果命令只是把 capability ID 和 JSON input 换成另一个名字，不得进入 L2。

### L3：Gateway 动态能力

已接入 Gateway 的能力默认由以下通用命令覆盖：

```bash
ae-cli capability list --domain <domain>
ae-cli capability search "<query>" --domain <domain>
ae-cli capability inspect <capability-id>
ae-cli capability dry-run <capability-id> --input <json-or-path>
ae-cli capability run <capability-id> --input <json-or-path>
```

低频、实验性、内部排障、Schema 尚未稳定或主要输入仍是复杂 JSON 的能力保留在 L3，不新增独立精选命令。

### Transitional：过渡命令

Transitional 表示能力尚未接入 Gateway，当前仍通过 MCP 或其他现有 transport 调用。它是迁移状态，不是 L1/L2/L3 之外的长期产品层级。

Gateway 未覆盖时，不因缺少 L3 通道阻塞必要业务命令；但不得借过渡期重复建设同义命令。

## 2. 先判断 Gateway 覆盖状态

每次新增或修改命令，先按能力而不是整个域判断覆盖状态。

### Gateway 已覆盖

1. 默认使用 L3。
2. 一次 capability 调用无法完成任务，且存在编排价值时进入 L1。
3. 一次 capability 可以完成，但 L3 缺少明确的类型、安全或输出体验时进入 L2。
4. 除以上两种情况外，不新增命令。

### Gateway 部分覆盖

- 已覆盖的能力按 L1/L2/L3 规则处理。
- 未覆盖的能力可以保留或新增 Transitional 命令。
- 同一个业务动作不得同时新增 MCP 和 Gateway 两套正式入口。

### Gateway 未接入

- 必要业务命令可以继续使用当前 MCP/REST transport。
- 新增命令必须满足现有 risk、测试、文档、结构化输出和非交互调用约束。
- 命令必须标记为 Transitional，并记录迁移出口。

## 3. L2 硬门槛

L2 必须同时满足：

1. 能力归属到明确的后端业务域或维护模块，不要求指定个人审批者。
2. capability ID、业务语义和主要输入输出已经稳定。
3. Gateway metadata 完整，至少包含 description、risk、input_schema 和输出说明。
4. risk 与真实副作用一致。统一使用三级：`read`（查询）、`write`（新增/修改等普通写）、`high-risk-write`（删除）。**仅 `high-risk-write` 需要 CLI 与 Agent 二次确认**。
5. 输入输出存在可重复的自动化测试。
6. 仓库中不存在语义相同的 L1/L2 命令。
7. 写能力支持 Gateway dry-run；确实无法支持时，必须在命令文档中写明替代安全机制。
8. 相比 L3 至少提供一项本规则定义的额外价值。

以下情况不得进入 L2：

- capability 仍处于实验或内部排障阶段；
- Schema 仍频繁发生不兼容变化；
- 只是 capability ID 的机械别名；
- 仍要求用户传入一个没有额外处理的完整 JSON；
- 无法确定维护业务域、risk 或测试方式；
- 与已有 L1/L2 命令重复。

## 4. L1 硬门槛

L1 必须满足：

1. 面向一个可描述的业务任务，而不是接口名称。
2. 行为无法由一次 capability 调用等价替代。
3. 至少包含多能力调用、资源发现、分页/轮询/重试、执行路径选择或跨响应聚合中的一项。
4. 输出为任务级稳定结果，不能只透传某个底层接口响应。
5. 写操作沿用明确的确认和 dry-run 规则。

以下情况不属于 L1：

- 单个 MCP tool 的一对一包装；
- 仅修改参数命名；
- 仅将一个接口响应原样输出；
- 为了保留 `+` 命令风格而新增的别名。

## 5. Transitional 记录要求

现有未迁移命令不要求立即补齐记录；新建或实际修改 Transitional 命令时，在对应 Skill/reference 中就地记录：

```text
Transition status: transitional
Owning module: <backend domain or module>
Current transport: <MCP or existing transport>
Gateway target: <planned capability ID or TBD>
Review after: <yyyy-mm-dd>
Exit condition: <condition for migrating or removing this command>
```

`Owning module` 表示负责维护后端业务契约的域或模块，不表示审批人。

禁止创建独立申请表或等待额外审批。记录的作用是防止临时 transport 永久化。

## 6. Gateway 接入后的迁移

Gateway 等价能力上线后按以下规则处理：

1. 原命令只是单接口透传：默认退回 L3。
2. 原命令提供稳定的类型化体验：迁移为 L2，底层统一调用 capability execute。
3. 原命令仍包含真实编排价值：保留为 L1，底层逐步改为 capability。
4. 新旧入口语义重复：只保留一个主入口。
5. 已发布命令需要兼容时，保留明确的 deprecated alias 至少一个正式发布周期，并输出替代命令；不得静默改变原命令行为。

Schema 自动生成只面向通过 L2 门槛的精选命令，不为全部 L3 能力生成静态命令。

## 7. 降级与例外

出现以下情况时，L1/L2 应降级或移除：

- 已被 L2/L3 等价覆盖；
- 长期只承担接口透传；
- 与其他命令语义重复；
- 后端契约不再稳定；
- risk、测试或维护归属无法继续保证。

例外不设置审批流程。临时保留时，在命令文档中写明维护模块、临时原因、复审日期和退出条件。

## 8. 确定性决策顺序

按以下顺序判断，不使用评分：

1. Gateway 是否已覆盖该能力？
2. 如果未覆盖：是否确有必要提供 CLI？是则使用 Transitional，否则不新增。
3. 如果已覆盖：一次 capability 调用是否足以完成用户任务？
4. 如果不足且存在真实编排：进入 L1。
5. 如果足够：L3 是否缺少本规则定义的类型、安全、文件、分页或输出增益？
6. 有明确增益且通过 L2 硬门槛：进入 L2。
7. 其余情况：保留在 L3。

## 9. 示例

### Dashboard 列表：L2

`analysis.dashboard.list` 已接入 Gateway；若精选命令提供 project ID 类型化、分页参数、稳定表格输出和现有命令兼容，则可保留：

```bash
ae-cli analysis dashboard list --project-id 1
```

如果没有这些增益，应只使用 `capability search/inspect/run`。

### 复杂分析任务：L1

一个命令需要解析项目、发现事件和属性、构建查询、轮询结果并返回资源链接，无法由一次 capability 调用完成，属于 L1。

### 低频内部修复：L3

一个已接入 Gateway 的低频修复能力主要接收复杂 JSON，类型化命令没有额外价值，保留在 L3。

### 尚未接入 Gateway 的必要 MCP 命令：Transitional

业务当前依赖某个 MCP tool，Gateway 尚无等价能力。命令可以继续存在，但标记为 Transitional；Gateway 能力上线后再判定退回 L3、迁移 L2 或保留 L1。

## 10. Skill / Reference 收录规则

Gateway 能力的默认入口是 **L3 动态发现**（`capability search` → `inspect` → `dry-run` → `run`），**不**为每个 capability 新建 skill reference。

### 默认：不建 reference

新增 capability 上线后，Agent 应通过 `ae-capability` skill 流程发现与调用；catalog 的 `description`、`risk` 与 `inspect` 的 `input_schema` 是唯一契约来源。

### 例外：才建 reference 或 L2 命令

仅在满足 **至少一条** 时新增/保留 reference（或进入 L2）：

| 例外类型 | 条件 | 示例 |
| --- | --- | --- |
| **L2 门槛** | 通过 §3 L2 硬门槛，有类型化 flags、分页、文件处理或稳定输出 | `analysis dashboard list` |
| **易混淆** | 与邻近 capability 语义接近，search alone 易选错 | `project_space.create` vs `folder.create` |
| **高危 delete** | `risk=high-risk-write`，需 chat 确认与 Phase 1/2 编排说明 | `project_space.delete` |
| **多步编排** | 无法由单次 capability 表达，需 list → create、export → poll 等 | dashboard report data export 工作流（见 L2 reference） |

### 不建 reference 的 L3（动态发现即可）

- 只读、description 清晰、不易混淆的能力（如 `*.members`、简单 `list/get`）
- 已有 L2 命令的能力（reference 挂在 L2 命令上，不重复写 L3 版）
- search + inspect 足以完成定位与组 input 的能力

域级矩阵（如 `analysis_gateway_assets.md`）可收录一行摘要 + 示例 input；**不必**为每条 L3 单独建 `references/<id>.md`。

### 试点

`analysis.project_space.members` 与 `analysis.folder.members` 仅保留在 `skills/ae-analysis/references/analysis_gateway_assets.md` L3 矩阵中，不维护独立 reference 文件。
