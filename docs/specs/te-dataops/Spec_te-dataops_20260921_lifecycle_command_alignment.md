---
id: Spec_te-dataops_20260921_lifecycle_command_alignment
title: DataOps lifecycle command alignment and agent guidance
modules: [te-dataops]
created: 2026-09-21
updated: 2026-09-22
related_documents:
  - skills/ae-dataops/SKILL.md
  - skills/ae-dataops/references/dataops-table.md
status: verified-local
risk_level: P2
---

# DataOps lifecycle command alignment and agent guidance

## 背景

用户通过 grill-with-docs 确认：未上线的回收及彻删命令统一归属现有 dataops_datatable。原先遵循新命名规范的 dataops entity / dataops recycle-bin 分组直接替换，不保留兼容别名；这是本次明确的局部命名例外，不修改全局规则。

## 目标

三个命令及参数与现有库表命令一致，Agent 能正确区分普通删除与永久删除，不因连续示例或回收成功自动执行彻删。

## 范围

同步修改 6.0、6.1 te-cli 的三个命令定义、聚焦测试及 DataOps Skill/reference；四份 README 根命令表同步合并至 datatable。配对 Gaia 只同步既有生命周期 Spec 的当前命令合同，无后端代码、REST 路径、鉴权、锁、权限或数据处理变更。不提交、推送、部署，不操作真实资产。术语和业务模型未变化，不另建 glossary 或 ADR。

2026-09-22 用户追加授权：本轮提交并推送 6.0 当前分支，配对 Gaia/te-gaia 部署 ta1-60 后验证新版命令；6.1 暂不提交或部署。使用本轮专用表/视图，回收后保留，彻删仅验证预览和拒绝条件，不执行资产清理。

## 期望行为

- ae-cli dataops_datatable +entity_recycle：回收一个表或视图。
- ae-cli dataops_datatable +recycle_bin_list：查询回收站。
- ae-cli dataops_datatable +recycle_bin_delete：彻底删除一个已回收表或视图。
- 参数 space-code、entity-id、max-results 分别替换为 spaceCode、entityId、maxResults；name、search、dry-run、yes 不变。旧三条命令与旧参数拒绝，不设别名。
- 维持精确 entityId 与 name 核对、原有必填/范围约束、语义预览、高风险确认、DEV/PRODUCT 作用范围和结构化返回；不把参数改名传播到 REST 合同。
- 普通“删除表/视图”默认只回收。确认实际已进入回收站后，Agent 可以询问是否彻底删除，说明不可恢复及内表数据可能被删除；没有新的明确确认不继续。
- 提示属于 Skill 指导的 Agent 回复，不增加 CLI 输出字段或交互。PREVIEW 不代表已回收；FAILED/PARTIAL 或未确认状态时先对账，不提示继续彻删。
- 明确永久删除时从回收站列表取精确对象、核对环境、预览并确认后执行；活动或混合状态不能直接彻删。同名冲突不自动删除旧对象，不更换 ID 盲目重试。
- Skill 分开给出两个工作流及可执行示例，同步入口路由、速查表和参数描述；保留 Transitional 说明。
- 用户追加确认删除 DataOps 独立 command_index.md 及引用，将风险标记并入 dataops-table.md 的同一速查表。发布检查器从扫描到的 Markdown 风险表读取同格式声明，不再限制索引文件名；保留普通 read/write 不得使用 --yes、缺少风险声明不得将回收判为安全的检查，不新增 recycle 名称白名单。

## 波及

运行时生产代码变更仅位于 te-cli 的 datatable 命令声明，额外调整 Skill 发布检查器的风险表发现范围并补回归。保持现有命令框架和 HTTP adapter，不新增抽象、依赖或配置。6.0/6.1 使用同一源码及 Skill 合同。Gaia 仅文档同步，Base 和 te-gaia 不涉及。

## 测试用例与验证

测试 interface 为用户已确认的 CLI 命令/参数/帮助、确认与预览，以及原有 HTTP 输入输出合同。使用现有测试框架和 HTTP 替身隔离外部系统，不测试私有实现。

| 类型 | 场景及预期 | 状态 | 证据 |
| --- | --- | --- | --- |
| 正向 | 三条新命令帮助与 datatable 发现可用，驼峰参数接受 | passed | 6.0 新入口先失败 unknown command，修复后通过；两版原17项及新6项均通过 |
| 反向/边界 | 旧命令、旧参数拒绝；缺失身份、空白、越界列表上限仍拒绝 | passed | 3个旧路径、6组旧参数拒绝；原身份与分页反向断言保留且通过 |
| 异常/状态 | 拒绝确认不发送请求；preview、CHANGED、UNCHANGED、FAILED/PARTIAL 保持输出/退出码且不重试 | passed | 原生命周期合同测试通过，仅迁移名称/参数预期并加强整份成功data保持不变的断言 |
| 数据一致性 | 相同 entityId/name、REST 路径和请求体保留；同名多对象不合并 | passed | 原 transport23项与 lifecycle17项全部通过，共享 adapter 未改 |
| Skill | 两个独立流程；成功后可询问但不自动彻删；失败不继续 | passed | 5个独立离线情景符合约定；链接/锚点及仓库4项release检查通过；通用脚本阻塞单列 |
| 构建 | 两版 build、npm test、verify:dataops-entity-lifecycle、check:release | passed | 每版55项聚焦回归、build、npm test、4项release检查，以及dist12项入口检查通过 |
| 幂等/并发 | 不新增锁、重试或业务状态转换 | not-run | 后端不变，本轮不做新并发实验 |
| 索引收敛 | 普通reference风险表可声明回收高风险；read/write误用yes、回收无声明仍拦截；原index行为兼容 | passed | 6.0 risk-index-red.log复现仅识别索引名的问题；风险检查6组场景全部通过 |

### 本地验证记录（6.0）

- Node v24.19.0；日志目录：/private/tmp/lifecycle-align60-0921.Yu8mDn/。
- 修改前基线：baseline.log，原生命周期17 + 字段9 + integration23 = 49项通过。
- 最终聚焦：verify-index-final.log，生命周期17 + 命令入口6 + 字段9 + integration23 = 55项通过，0失败；另有风险检查6组场景全部通过。未删除原业务测试或降低原有断言。
- build-index-final.log、npm-test-index-final.log、release-index-final.log：索引收敛后重跑build成功；npm test根帮助、retired-api2、sandbox-tools脚本、dependency-hygiene5、README1通过；release gate 4 checks通过。
- dist-smoke.log：实际dist入口3个新帮助、3个旧路径拒绝、6组旧参数拒绝，共12项通过。
- 6.0 red证据：surface-red.log（新回收入口1项失败）→ surface-green-first.log（同1项通过）；surface-red-bin.log（列表/彻删2项失败）→ surface-green-bin.log（3项通过）。6.1不重复宣称独立red：先验证旧49项，再同步同一实现并通过最终55项。
- 反向测试最初附带--help，而Commander在帮助路径提前返回，不能据此判断参数接受情况；改用实际解析路径并保留空必填输入防止误执行，错误断言仍要求unknown option。产品框架未改。
- npm test初轮发现4份README保留已移除的dataops根命令；同步README后原测试通过，未改README测试断言。
- 独立Skill情景阅读：普通回收成功先按ID回读，确认后询问并等待；同名回收对象要求选择；回收冲突不自动清理；dry-run的UNCHANGED不触发彻删邀请；PARTIAL先回读同ID，不盲目重试。5/5符合约定。属于离线行为检查，不宣称真实平台E2E或所有Agent必然遵循。
- 两版3份命令、2份生命周期测试、2份保留的Skill文件及风险检查器/测试共9份文件逐字一致；独立索引已删除，可从Git历史恢复。git diff --check通过，保留的Skill文档链接有效，独立只读核对未发现本次遗漏。
- 索引收敛先红后绿：risk-index-red.log证明普通reference中的高风险声明被忽略；仅取消检查器的文件名过滤后risk-index-green-first.log同一用例通过；risk-index-green-final.log及最终聚焦日志包含原3组和新增3组检查。仍拒绝read/write误用--yes，以及没有风险声明的回收示例；未添加recycle名称白名单。其他域索引保留。
- 通用skill-creator quick_validate.py因当前Python缺少yaml模块阻塞；未安装依赖或改既有frontmatter格式。仓库check:release已通过，二者不混算。
- ae-sdd Spec校验仍因缺少require_id失败（cli-spec-validation.log、gaia-spec-validation.log）；按用户此前明确豁免记录，未虚构编号、不宣称正式Spec校验通过。
- Gaia仅修改生命周期Spec当前合同并标记历史命令记录，未修改Java代码，因此本轮未重跑Maven；Base/te-gaia不涉及。

```sh
npm run verify:dataops-entity-lifecycle
npm run build
npm test
npm run check:release
node dist/index.js --no-update-check dataops_datatable +entity_recycle --help
node dist/index.js --no-update-check dataops_datatable +recycle_bin_list --help
node dist/index.js --no-update-check dataops_datatable +recycle_bin_delete --help
```

### 2026-09-22 提交前复测（仅 6.0）

Node20.20.2；证据 `/private/tmp/cli60-precommit-0922.9wayFo/`。生命周期/入口 23、字段 9、参数/概览 19 均通过；两个 verify 脚本都在 integration 22/23 处退出1，失败为用户已接受的流式下载失败后 `.part-*` 临时文件残留，对应测试和 adapter 本轮未改。保留两次原始失败，不宣称全绿、不为本轮改名修复无关下载问题。

链式短路后的 flow task20、backfill9、variadic、风险示例6组已单独补跑通过。build、npm test、dist入口12项、release4项通过；全量扫描P1/P2为0、既有typecheck缺口P3为1。Skill静态76命令/97示例/32链接/12 JSON通过；diff和21份现存变更文件凭证检查通过。用户授权提交，不等于既有失败已修复。

## 端到端测试

本轮通过 CLI 公开入口离线验证命令注册、拒绝和帮助，并复用 HTTP 替身验证请求响应；真实 ta1-60/ta1-61 端到端为 blocked（本轮无部署或真实删除授权），不以本地测试冒充线上删除结果。后续如授权部署，由本任务承接人只用专门测试对象验证回收及彻删并独立回读。

### 2026-09-22 ta1-60 实测

上述为首阶段记录。用户补充授权后，使用已提交CLI `44e59b9c`、新部署Gaia SHA256 `ff073937816e8f6ec2f327526779b1528f371df44a4835d055dbdf2d0b146586`，在e2e_merge_0920运行最小真实回归。证据 `/private/tmp/cli60-regression-0922.9xlnqr/summary.json`，`node verify.mjs` 对原始证据执行176条断言通过，不将断言数作为独立E2E用例数。

- CLI共36次（含部署前4次只读预检），34成功、2次预期ENTITY_NOT_RECYCLED拒绝；12次独立Trino查询通过；5次GUI API回读中4通过，首次IDE目录延迟返回-110003已保留，随后Trino和普通详情证明表真实存在。
- 新增普通字段、类型与说明同时修改、重复add/modify幂等、删除本轮空列delete_probe、表与视图发布、回收语义预览/执行/再次UNCHANGED均通过。活动对象彻删预览拒绝，已回收对象彻删仅PREVIEW，实际彻删0次。
- 保留表 `cli60_0922_table_9xlnqr`（c9029a46acfe2d978b2dae36f7366071）、视图 `cli60_0922_view_9xlnqr`（5678d93aa0b119f0a2d38df0843581d2）于DEV/PROD回收站。原活动名无匹配，4个带gaia_soft_del的物理映射均经information_schema和SHOW CREATE确认仍存在；写入开关已关闭。最终字段id bigint、amount bigint及变更说明。回收资产仍受平台保留期约束。
- 配对分区组验证分区列禁止、默认值/配置/手动/AUTO及25次Trino读回；主线程query task12完成下载，CSV精确回读数字、decimal与中文。这些是受影响路径回归，并非重新执行所有历史DataOps矩阵。
- 无永久删除、低权限、EXPIRED真实过期对象或极端故障注入。本轮Google现存源连接实测FAIL，旧隧道和Base代理参数已缺失，单列环境问题，不改凭据。

## 准出结论

- 阶段：集成。
- 结论：6.0已提交推送且上述ta1-60生命周期实际回归通过；并非全绿，提交前既有下载临时文件用例仍失败，Google环境连接失败另列；6.1本轮未提交或部署。
- 剩余风险：已接受后端竞态/下载清理问题不修；Skill情景检查不保证所有Agent行为，未覆盖项见上。
- 后续验证：代理恢复待用户确认；彻删、低权限及极端故障不在本轮新增实测范围，资产保留。
- 验证人：Codex。
- 日期：2026-09-22。
