# ae-data-integration 数据集成方案与开发计划

> 来源:2026-08-18「Agent 数据集成流程对齐」会议(会前材料 + 智能纪要 + 文字记录)。
> 本文档是会议结论的落地化方案,供评审与后续实现跟踪。

## 1. 一段话结论

让离线数据也像代码埋点一样闭环:从业务分析目标出发,经过 agent 对数据的理解(结合业务文档 / 用户 prompt 先验)和**人的一次确认**,带着业务含义进入 AE,看板和报表直接可用。「把 CSV 导进 AE 更快一点」只是顺带结果,不是目标。

- 收敛为**一个 skill**:`ae-data-integration`。
- 内部固定**四个子模块**:Source 业务识别 → 埋点方案 → Transform 转义 → Sink 上报。
- **两个统一入口**:AE Agent 对话框(附件/加号上传)、ae-cli。
- **两条上报路径**:RESTful API(一次性/小量)、LogBus + DataX(常态化/大量,二期)。
- 核心原则:**埋点方案在入库前生成并由人确认 —— 数据治理左移**。

## 2. 会议核心决策

### 已定(不再讨论)

| 决策 | 说明 |
|-|-|
| 大宽表全扫是默认动作 | agent 读数据是脚本级成本,全扫 + 业务文档/用户 prompt 先验,不靠纯数据猜 |
| 埋点方案前置 | 入库前生成并由人确认;入库后不再补治理,方案本身即资产 |
| 埋点方案 merge 归 ae-generate-tracking-plan | 与项目既有方案(如代码埋点已生成的方案)merge,处理同名属性、字段合并 |
| 识别失败追问用户 | 无表头、类型识别失败等情况追问,而不是拒绝或硬猜 |
| 保留「全量导入」开关 | 默认只导入方案内字段,提供全量导入开关;需告知后置治理成本 |
| onboarding 确认步 | 由谭小伟负责,与 skill 的确认门共用同一份方案 |
| dry-run / 精简确认模式改造 | 由麦林负责(ae-generate-tracking-plan),细节见 §4A |

### 一期边界

- **只做本地文件导入全链路**:上传 → 探查 → 埋点方案 → 确认 → 转义 → RESTful 上报 → 看板,并**输出中间产物(handoff 包)**。
- **不做**:其他数据源(MySQL / 多维表格 / 日志等)、常态化部署(LogBus / DataX),这些都放到二期。

## 3. 目标架构

```
入口层    AE Agent 对话框(附件/加号上传) │ ae-cli          —— 两个统一出口
─────────────────────────────────────────────────────────────
编排层    一个 skill:ae-data-integration
          ① Source 业务识别 → ② 生成埋点方案 → ③ Transform 转义 → ④ Sink 上报
          (source/sink 均插件化,新增一个不改主流程)
─────────────────────────────────────────────────────────────
Sink 层   一次性/小量 → RESTful API 上报 user-event
          常态化/大量 → LogBus / DataX(复用同一份埋点方案生成映射配置)
─────────────────────────────────────────────────────────────
Source 演进  首期 CSV/xlsx(及现有 TSV/TXT/JSON/JSONL/XLS)
             后续:本地日志(log4j/nginx)、飞书多维表格、MySQL/HDFS、三方连接器
```

### 子模块职责与插件契约

| 子模块 | 职责 | 插件契约 |
|-|-|-|
| ① Source 业务识别 | 全扫数据,结合业务文档/用户 prompt,推断表/文件的业务含义、字段含义与分析价值 | 识别、采样、读取 |
| ② 生成埋点方案 | 调用 ae-generate-tracking-plan(新增 dry-run / 精简确认模式)产出事件、属性、显示名、说明、标签;与既有方案 merge | —(复用现有 skill) |
| ③ Transform 转义 | 按方案做字段映射、类型转换、前置治理(如 UA 拆解)、脏数据隔离 | CLI 化、管道化(正则/Python 脚本等) |
| ④ Sink 上报 | 按数据量和频率选路径 | RESTful、LogBus、DataX |

### 命名与拓扑

- 总 skill 名 **不带 local / csv / custom**,避免再次把定位限死。
- 埋点方案环节调用 `ae-generate-tracking-plan`(为其新增 dry-run / 精简确认模式、新增「以数据样本为输入」路径)。
- `ae-generate-tracking-code` 里的 `logbus-config` / `datax-config` / `restful-call` 参考文档迁入 sink 插件(二期)。
- 对客户暴露的入口只有 AE Agent 对话框和 ae-cli 两个。

## 4. 端到端流程(新四步)

三条泳道:用户、Agent(ae-data-integration skill)、AE 平台。

1. **用户提供数据**:上传 CSV/xlsx 或指定路径;可选附业务文档,或一句话说明想分析什么。
2. **Agent 全扫数据并画像**:字段、类型、缺失率、时间字段、用户 ID;结合先验推断业务含义。
3. **Agent 生成埋点方案**:事件、属性、显示名、说明、标签;与项目既有方案 merge。
4. **异常分支**:无表头、类型识别失败等 → Agent 追问用户补充,回到第 2 步。
5. **用户确认门**:确认业务含义、调整事件和属性;选择字段范围(默认只导入方案内字段,提供「全量导入」开关)。**全流程唯一人工确认点。**
6. **AE 平台:埋点方案入库。**
7. **Agent 做 Transform**:字段映射、类型转换、前置治理、脏数据隔离。
8. **Agent 上报**:一次性走 RESTful API;常态化/大量走 LogBus / DataX(二期)。
9. **AE 平台:user-event 入库**,看板和报表直接可用。

对照用户侧四步表述:**文件探查 → 设计埋点方案 → 数据处理转译 → 数据上报**。

## 4A. 「生成埋点方案」细节设计(已定稿)

核心差异:代码路径是从业务理解**发明**事件;数据路径是从表结构**映射**列 → 事件/属性。数据路径采用**精简确认模式(单门)**,不照搬现有 5 阶段流程。

### 输入

inspect 画像(列 / 类型 / 样本 / UE eligibility / mapping confidence)+ 可选业务文档 + 用户一句话目标。

### 子步骤

1. **事件模型判定**(复用现有 UE routing):
   - 单表单事件 track / 单表多事件(事件名列)/ 单表 user_set / mixed。
   - 支持 agent 主动提议「一表拆多事件」(如广告表按 campaign_type 拆 ad_show/ad_click),须经用户在确认门确认。
2. **列 → 属性映射草案**:
   - 识别系统列:时间字段、distinct_id / account_id、事件名列、用户属性名列。
   - 其余列 → 事件属性 / 用户属性 / 公共属性。
   - 命名:snake_case 事件/属性名 + display_name + desc + event_tag(语言随用户输入)。
   - 类型推断:CSV 默认 string;结合字段名 + 值分布 + 业务文档/prompt 先验推断 number / bool / datetime / 枚举;**不确定/冲突列标记「待确认」,仅在确认门内追问**。
3. **精简确认门(单门,一次确认)**:
   - 一张汇总表:事件清单 + 属性清单(类型不确定项高亮)+ 字段范围(默认方案内字段 + 全量导入开关)+ 未识别/脏数据处理。
   - 用户一次回复 ok / 修改(可只改个别字段、命名、类型、增删列)。
   - 同名属性、类型冲突由 agent 在门内一并提示。
4. **merge 既有方案**:fetch 项目既有 tracking plan → 同名属性类型冲突(severe)/ 同名事件(advisory)→ append / replace 决策。
5. **方案入库**:draft.json → xlsx → upload(sdk_integration_mode=none)。
6. **产出字段映射**:确认后的方案 + 列→属性映射 + value_mapping + flatten_rules → 交给 Transform(convert)。

### 已拍板要点

| 点 | 结论 |
|-|-|
| 确认门粒度 | 单门,一次确认(一张汇总表) |
| 事件模型拆分 | 支持 agent 提议一表拆多事件,须用户确认 |
| 类型确认策略 | agent 推断 + 仅对不确定/冲突列追问 |
| dry-run 语义 | 只预览草案与映射,不落盘、不上传 |

### ae-generate-tracking-plan 改造

1. 新增 source_type `data`(数据样本/文件画像)进 Phase 0 Item 2 选项。
2. 新增精简确认模式:数据路径跳过 SDK config / 用户体系的大部分(sdk_integration_mode=none),Refine 5 段压缩为 1 个合并确认门。
3. 新增 dry-run 模式:产出 draft 预览,不写文件、不上传。

### CLI 层

- 新增 `ae-cli data-integration plan`:inspect 画像 + 确认后映射 → draft.json;支持 `--dry-run` 预览。
- 复用现有 `ae-cli tracking plan draft / validate / upload` 完成方案生成与入库。

## 5. Handoff 中间产物(handoff 包)

### 概念

单次链路跑完后**必须输出可复用的中间产物**,避免同格式数据下次导入重复走全流程;固化字段识别、转译等核心逻辑。下次再导同类文件时,直接跑产物即可,不必重跑整个链路(否则「今天一个 CSV、明天一个 CSV 每次都重跑流程」会爆炸)。

### 产物形态(按用户技术能力适配)

| 用户类型 | 产物形态 |
|-|-|
| 懂技术的用户 | 可执行脚本(Shell / Python,如 `xxx-int.py`),下次贴命令直接跑 |
| 普通用户 | 可直接调用的个人 Skill |
| 常态化(二期) | DataX / LogBus 配置包 |

产物内容包含:transform 逻辑、脚本、RESTful 调用;埋点方案本身随 AE 平台入库,产物引用同一份方案。

### 存储与复用判定(已确认)

- **存储**:产物落本地项目目录 `.ae-data-integration/`(随项目走),另建一份结构指纹索引(同目录)。
- **复用判定**:新文件导入时按表结构 / 字段指纹自动匹配历史产物,主动提示可复用的脚本/skill,用户确认后直接复用,跳过全流程。
- 跨项目复用诉求出现后,再评估扩展到用户全局目录 `~/.ae-cli/data-integration/`。

## 6. 现状盘点与差距

| 实现线 / 资产 | 状态 | 与目标架构的差距 |
|-|-|-|
| `ae-local-data` skill(当前分支 feat/local-data-skill-v2) | 8/17 合并,待 MR 评审 | 无埋点方案环节;埋点方案后置(入库后按元数据生成);无 handoff 产物 |
| `ae-local-data` 命令 `tracking local-data inspect/convert/upload` | 8/11 仿真通过 | inspect/convert/upload 覆盖「探查/转义/上报」,缺「埋点方案」环节与「handoff 产物」 |
| `ae-generate-tracking-plan`(已有) | 在用 | 缺 dry-run / 精简确认模式;缺「以数据样本为输入」路径 |
| `ae-generate-tracking-code`(已有) | 在用 | references 已有 logbus-config / datax-config / restful-call,只生成配置,不管下载安装启动验证 |
| onboarding beta UI | 8/11 就绪 | 「确认埋点方案」步需与 skill 确认门共用同一份方案 |
| Q3 OKR:LogBus & DataX 数据接入 Skill | 计划中 | 何时并入同一 skill 待定(本文定为二期) |

当前 `ae-local-data` 已具备的能力(可直接沿用,不重写):

- 文件格式:CSV / TSV / TXT / JSON / JSONL / XLS / XLSX。
- `inspect`:字段类型识别、缺失率/唯一性/时间解析率、无表头检测、编码识别、多 sheet、多文件类型冲突、嵌套 JSON 探查。
- `convert`:UE 映射、`flatten_rules` 嵌套拉平、`value_mapping`、类型转换、脏数据隔离。
- `upload`:`/sync_json` RESTful 上报、批次、`--resume-from`、clean-subset 决策。

## 7. 更名与命名契约

### skill 更名

| 旧 | 新 |
|-|-|
| `skills/ae-local-data` | `skills/ae-data-integration` |

frontmatter `name: ae-local-data` → `name: ae-data-integration`,description 同步去掉「one-time / historical」限定,改为数据集成总入口定位。

### CLI 命令命名空间(已确认:skill + CLI 同步更名)

| 旧命令 | 新命令 | 备注 |
|-|-|-|
| `ae-cli tracking local-data inspect` | `ae-cli data-integration inspect` | 探查(Source 业务识别) |
| —(新增) | `ae-cli data-integration plan` | 埋点方案(调用 ae-generate-tracking-plan,dry-run / 精简确认模式) |
| `ae-cli tracking local-data convert` | `ae-cli data-integration convert` | Transform 转义 |
| `ae-cli tracking local-data upload` | `ae-cli data-integration upload` | Sink 上报(RESTful) |
| —(新增) | `ae-cli data-integration handoff` | 产物导出 / 复用检测 |

> 说明:skill 与 CLI 命名空间同步更名,一次到位。命令契约最终收敛由廖德生负责(「命令名和参数不再频繁变更」),本表为合入评审的基线映射。

## 8. 分阶段开发计划

### 一期(当前高优):本地文件导入全链路 + handoff 产物

验收标准:一份 CSV 走完「上传 → 探查 → 方案 → 确认 → transform → RESTful 上报 → 看板」的可演示闭环,并产出可复用的 handoff 产物。

| 任务 | 内容 | 依赖 |
|-|-|-|
| T1 skill 更名与骨架 | `ae-local-data` → `ae-data-integration`,SKILL.md 重写为四子模块编排;references 重组(把现有 inspect/convert/upload 说明归入对应子模块);**同步扩展 `scripts/qa-changed.mjs`:新增 `/data-integration/i → verify:tracking-tools` 匹配**(否则更名后路径不再含 `tracking`,改动后自动测试会漏) | — |
| T2 ae-generate-tracking-plan 扩展 | 新增 dry-run / 精简确认模式;新增「以数据样本为输入」路径(从 inspect 产物喂入);merge 逻辑落到此 skill | — |
| T3 埋点方案环节接入 | 在 inspect 与 convert 之间插入 plan 环节,细节见 §4A:探查结果 → 生成方案草案 → 精简确认(单门)→ 方案入库 | T1、T2 |
| T4 handoff 产物 | 跑完后导出产物(转译脚本 + RESTful 调用 + 方案引用);按用户技术能力选形态(脚本 / 个人 skill) | T1 |
| T5 复用检测 | 新文件导入时按表结构/字段指纹匹配历史产物,提示复用,确认后跳过全流程 | T4 |
| T6 主线合入评审 | 命令契约稳定(廖德生),MR 通过 | T1–T5 |
| T7 onboarding 接入 | onboarding「本地已有数据」路径接入 skill 确认门,UI 确认的方案与 skill 上传方案同一份(谭小伟) | T3 |
| T8 AE Agent 对话框附件入口接入 skill(王浩强) | 对话框上传 CSV 触发同一流程 | T1–T3 |

### 二期(下一阶段):LogBus / DataX 常态化

| 任务 | 内容 |
|-|-|
| T9 sink 插件扩展 | 新增 LogBus、DataX sink,复用同一份埋点方案生成映射配置(李阳、韩浩栋);`ae-generate-tracking-code` 的 logbus-config/datax-config 参考迁入 |
| T10 常态化 handoff | 产物升级为 DataX / LogBus 配置包,支持部署到本地/服务器,配合调度 |
| T11 source 插件扩展 | MySQL、多维表格、本地日志(log4j/nginx)等,按需求优先级逐个接入 |

## 9. 行动项与负责人

| 事项 | 负责人 | 验收标准 |
|-|-|-|
| ae-data-integration 总 skill 骨架;v2 改造为四子模块;ae-generate-tracking-plan dry-run 模式;提 MR | 麦林 | 一份 CSV 走完可演示闭环 |
| onboarding「本地已有数据」路径接入 skill 确认门 | 谭小伟 | UI 确认的方案与 skill 上传方案同一份 |
| ae-cli 主线合入评审,命令契约稳定 | 廖德生 | MR 通过;命令名和参数不再频繁变更 |
| AE Agent 对话框附件入口接入 skill | 王浩强 | 对话框上传 CSV 触发同一流程 |
| LogBus / DataX sink 复用同一份埋点方案生成映射配置 | 李阳、韩浩栋 | 同一份方案能生成 DataX / LogBus 配置 |

## 10. 待确认决策点

| 决策点 | 结论 | 状态 |
|-|-|-|
| CLI 命令命名空间是否随 skill 更名 | skill + CLI 同步更名为 `data-integration` | ✅ 已确认(1A) |
| handoff 产物存储位置 | 本地项目目录 `.ae-data-integration/` + 结构指纹索引 | ✅ 已确认(2A) |
| 新文件复用判定做到什么程度 | 指纹自动匹配并提示,用户确认后复用 | ✅ 已确认(3A) |
| 「生成埋点方案」细节 | 见 §4A | ✅ 已确认(单门 / 可拆多事件 / 推断+追问 / dry-run 预览) |

## 11. 研发范式

- skill 本身用 agent native 方式开发:agent 负责采样数据、写 transform、跑仿真测试,人只做业务确认与评审。
- 迭代以天计,验收看可演示闭环(上传 → 方案 → 确认 → 上报 → 看板),不看排期文档。
- source 和 sink 都是插件,新增一个不改主流程。
- **测试纪律**(每次改动后):`npm run qa-changed`(自动按 git diff 拼测试组合,先 `-- --list` 预览);本域手动兜底 `npm run build` + `npm test` + `npm run verify:tracking-tools`;改 skill frontmatter 加 `npm run check:release`。回归样本放 `tests/fixtures/local-data/`(只读、真实业务数据),新能力同步加样本 + 对应 `tests/local-data-*.test.ts`。
