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

6.0 历史授权与实测保留在合入提交 `b569de4f` 的本 Spec：2026-09-22 已完成 ta1-60 字段、发布、回收、分区和 SQL 下载回读；该轮实际彻删 0 次、资产保留，下载 `.part-*` 既有失败及 Google 代理失败单列。其完整证据和 6.0 本地日志不作为 6.1 验证结果；本分支保留下文原有 6.1 本地证据。

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
| 索引收敛 | 普通reference风险表可声明回收高风险；read/write误用yes、回收无声明仍拦截；原index行为兼容 | passed | 6.0 risk-index-red.log复现后同步相同修复；6.1风险检查6组场景全部通过 |

### 本地验证记录（6.1）

- Node v24.19.0；日志目录：/private/tmp/lifecycle-align61-0921.fB8Xg1/。
- 修改前基线：baseline-authorized.log，原生命周期17 + 字段9 + integration23 = 49项通过。
- 最终聚焦：verify-index-final.log，生命周期17 + 命令入口6 + 字段9 + integration23 = 55项通过，0失败；另有风险检查6组场景全部通过。未删除原业务测试或降低原有断言。
- build-index-final.log、npm-test-index-final.log、release-index-final.log：索引收敛后重跑build成功；npm test根帮助、retired-api2、sandbox-tools脚本、dependency-hygiene5、README1通过；release gate 4 checks通过。
- dist-surface.log：实际dist入口3个新帮助、3个旧路径拒绝、6组旧参数拒绝，共12项通过。
- 6.0 red证据：surface-red.log（新回收入口1项失败）→ surface-green-first.log（同1项通过）；surface-red-bin.log（列表/彻删2项失败）→ surface-green-bin.log（3项通过）。6.1不重复宣称独立red：先验证旧49项，再同步同一实现并通过最终55项。
- 反向测试最初附带--help，而Commander在帮助路径提前返回，不能据此判断参数接受情况；改用实际解析路径并保留空必填输入防止误执行，错误断言仍要求unknown option。产品框架未改。
- npm test初轮发现4份README保留已移除的dataops根命令；同步README后原测试通过，未改README测试断言。
- 独立Skill情景阅读：普通回收成功先按ID回读，确认后询问并等待；同名回收对象要求选择；回收冲突不自动清理；dry-run的UNCHANGED不触发彻删邀请；PARTIAL先回读同ID，不盲目重试。5/5符合约定。属于离线行为检查，不宣称真实平台E2E或所有Agent必然遵循。
- 两版3份命令、2份生命周期测试、2份保留的Skill文件及风险检查器/测试共9份文件逐字一致；独立索引已删除，可从Git历史恢复。git diff --check通过，保留的Skill文档链接有效，独立只读核对未发现本次遗漏。
- 索引收敛在6.0先红后绿，再同步同一实现至6.1；6.1不宣称独立red。最终聚焦日志包含原3组和新增3组风险检查：普通reference可提供风险声明，仍拒绝read/write误用--yes及没有风险声明的回收示例。只取消检查器的文件名过滤，未添加recycle名称白名单，其他域索引保留。
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

## 端到端测试

本轮通过 CLI 公开入口离线验证命令注册、拒绝和帮助，并复用 HTTP 替身验证请求响应；真实 ta1-60/ta1-61 端到端为 blocked（本轮无部署或真实删除授权），不以本地测试冒充线上删除结果。后续如授权部署，由本任务承接人只用专门测试对象验证回收及彻删并独立回读。

## 2026-09-22 合并授权与验证范围

- 用户已确认将已推送的 `codex/dataops-google-sheets-integration-6.0` 合入现有同名 6.1 集成分支，并先提交本地已确认的命令与 Skill 改动。本节更新此前“不提交、推送、部署”的阶段性范围；最终 push 由跨工程回归协调方执行。
- 合并前已保存 tracked/index diff、3 个未跟踪文件及 HEAD/status：`/private/tmp/cli61-merge-0922.7xJpyE/`。fresh fetch 确认 6.0 为 `b569de4f6b9e6c7ff0fbb1788da28a9c1d6b9c50`，6.1 为 `e7d864518c2a3f9e2b795d983a6e112dff9cce62`；无额外远端推进。
- 本轮保留 6.1.24 版本与已有 6.1 能力，不新增业务功能、依赖或全局安装。Node 使用 v20.20.2。Require-Id 沿用用户明确豁免，不虚构编号。
- 合并前 `verify:dataops-entity-lifecycle` 通过：23 生命周期/入口 + 9 字段 + 23 integration，另有 6 组风险检查；`verify:dataops-flow-params` 通过：19 参数/overview + 23 integration + 20 task + 9 backfill，runner variadic flags 通过。integration 在两脚本重复执行，不重复计为独立用例。日志为上述目录的 `lifecycle-before-merge-authorized.log`、`flow-before-merge-authorized.log`。首次沙箱运行因 tsx IPC `listen EPERM` 未进入测试，提权后成功；不属于产品失败。
- 合并前检查点提交为 `cb6c9ed2`；合入目标为上述 6.0 精确提交。只有本 Spec 与 Skill 意图 Spec 的 add/add 文档冲突，保留 6.1 本地证据并标注 6.0 历史记录来源；运行时、测试、Skill、依赖和 6.1.24 版本相对检查点无变化。

### 合并后本地验证（6.1，Node v20.20.2）

日志均位于 `/private/tmp/cli61-merge-0922.7xJpyE/`；以下是本轮真实重跑，不沿用历史成功。

| 命令或范围 | 结果 | 日志 |
| --- | --- | --- |
| `npm run verify:dataops-entity-lifecycle` | 23 生命周期/入口 + 9 字段 + 23 integration 全通过，另有风险示例 6 组通过 | `lifecycle-after-merge.log` |
| `npm run verify:dataops-flow-params` | 19 参数/overview 通过；integration 22/23，既有下载失败后 `.part-*` 残留断言失败，脚本退出 1 | `flow-after-merge.log` |
| 链式短路后独立补跑 task、backfill、variadic | 20 task、9 backfill 通过；variadic 脚本通过 | `dataops-flow-task-contract.test.log`、`dataops-backfill-contract.test.log`、`runner-variadic-flags.test.log` |
| `npm run build` | 成功，未安装或升级依赖 | `build.log` |
| `npm test` | 根帮助、retired API 2 项、sandbox-tools、dependency hygiene 5 项、README 1 项通过 | `npm-test.log` |
| `npm run check:release` | 4/4 通过 | `release.log` |
| 实际 dist 命令入口 | 新帮助 3、旧路径拒绝 3、旧参数拒绝 6，共 12 项通过 | `dist-surface.log` |
| `node node_modules/typescript/bin/tsc --noEmit` | 退出 2，仍为既有 asset-package/export.ts:69 的 Promise 类型及 external-experiment/save-submit.ts:70 的 unknown 错误 | `typecheck.log` |
| 差异与凭证检查 | `git diff --check` 通过；本次文件未检出私钥/token 形态；未改已接受失败的实现和测试断言 | 合并前核对及最终 staged 检查 |

- 同一 integration 在 lifecycle 本轮为 23/23，在 flow 本轮为 22/23；原始失败保留，不用重复通过覆盖它，也不把重复运行计为新增独立用例。下载问题和两处 TypeScript 错误已由用户接受；本轮不顺带修复，不宣称全绿。
- 相对初始 6.1 `e7d86451`，上述两处类型错误文件、下载 adapter 与 integration 测试均未变化。合并冲突没有修改任何运行时代码或测试断言。
- 构建 `dist/index.js` SHA256 为 `5f1b266b82214857db3c526cb342126e855cf369eba44c45d4826c3ca58ffe0f`；`dist/te-dataops-RYKKFMJ6.js` SHA256 为 `ef0a8db18a030405f2e57cbc0b9f89f3465aa5626e0cc866dc92340ae04f9dcd`。
- 当前准出：本地受影响合同与构建可供 ta1-61 回归，保留已接受失败。未发起线上请求、未安装全局 CLI/Skill、未 push；ta1-61 E2E 和最终 push 由跨工程主任务承接，不能以 6.0 历史记录或本地替身结果代替。

## 首阶段准出结论（2026-09-21 历史记录）

- 阶段：Coding。
- 结论：两版本地实现、聚焦回归、构建与仓库门禁通过；未部署、未执行真实资产操作。
- 剩余风险：已接受的后端竞态及既有无关检查问题不在本次范围；Skill 情景检查不代表所有 Agent 的行为保证。
- 后续验证：如获授权，再部署并使用专门测试对象进行线上回读；不自动提交、推送或部署。
- 验证人：Codex。
- 日期：2026-09-21。
