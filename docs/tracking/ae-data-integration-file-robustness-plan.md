---
topic: ae-data-integration-file-robustness
date: 2026-09-02
base_branch: release/6.0
delivery_branch: feat/ae-data-integration-0902
status: in-progress
related:
  - docs/tracking/ae-data-integration-plan.md
  - docs/tracking/ae-data-integration-handoff-relay-plan.md
---

# ae-data-integration 本地文件读取健壮性实施计划

## 1. 目标

让 `ae-data-integration` 在读取客户真实本地文件（尤其是 Excel 导出件）时，**要么读对，要么明确报出读不准**，不再出现"结论看起来正常、数据其实错了"的中间态。

范围只覆盖这一条定位：**把客户各种本地数据文件中的数据上报到 AE 系统**。所有与"上报"无关的能力（通用数据分析、可视化、建模）不在本计划内。

本计划是 [`ae-data-integration-plan.md`](ae-data-integration-plan.md) 的**兄弟文档**，不是它的修订：那份来自 2026-08-18「Agent 数据集成流程对齐」会议，讲的是流程与架构对齐；本文来自与 `/Users/mailin/Downloads/skills/` 中本地文件处理类 skill 的对比分析，讲的是读取层的数据正确性。两份文档的实施顺序互不阻塞。

分档沿用此前评审结论：第一档（纯文档、零代码）**已交付**，见 §7。本文覆盖第二至第四档。

## 2. 范围

### 2.1 纳入（P1–P9）

| 档 | 编号 | 问题 | 主要落点 |
| --- | --- | --- | --- |
| 二 | P1 | xlsx 日期单元格退化成 Excel 序列号，导致"本文件没有时间列"的错误结论 | `input.ts` |
| 二 | P2 | 隐藏工作表/行/列被当成正常数据读入 | `input.ts` |
| 二 | P3 | 公式单元格无缓存值时静默产出 `null` 或原始公式对象 | `input.ts` |
| 二 | P4 | 合并单元格的空白格被当成缺失值 | `input.ts` + 新增 xlsx 预扫描 |
| 三 | P5 | 表头判定只覆盖分隔符文件，且只看第 1 行 | `input.ts` |
| 三 | P6 | 汇总行/合计行无检测，会被当成一条业务记录上报 | `profile.ts` |
| 三 | P7 | profile 没有取值频次与数值分布，用户无法判断该不该上报 | `profile.ts`、`types.ts` |
| 四 | P8 | 重复业务键无检测，事件重复上报不可逆 | `profile.ts` |
| 四 | P9 | 没有行数守恒回执，源行数与输出记录数对不上时无人发现 | `conversion.ts`、`profile.ts` |

### 2.2 明确不做

- 不引入 DuckDB、pandas、Python 或任何新的数据处理运行时；继续用现有 `exceljs` / `xlsx` / `csv-parse` / `stream-json` / `saxes` / `unzipper` 栈。
- 不 patch 或 fork `exceljs`；需要 `exceljs` 拿不到的信息时，用本仓库已有的 `unzipper` + `saxes` 手工解析补齐（见 §3.2）。
- 不新增分析型命令（透视、绘图、统计检验）。这些属于 local analysis 分支，不属于上报链路。
- 不改上报协议、mapping 契约版本号、manifest 契约版本号。P7/P9 只新增可选字段，不改已有字段语义。
- 不改动 `upload` 的确认门禁与 `--allow-clean-subset` 语义。
- 不把任何新检测直接做成阻断项（P9 例外条件见 §3.4）。
- 不修 `exceljs` 流式路径 `worksheet.columns` 恒为 `null` 的上游 bug（`worksheet-reader.js:267` 传参数量错误），本计划所需的列信息不经由该对象。

## 3. 事实与关键决策

以下代码事实均已在 `feat/ae-data-integration-0902` 上核准（`exceljs` 4.4.0）。**行号为核准当时的值，实施时以符号名为准。**

### 3.1 P1：xlsx 日期单元格退化成 Excel 序列号（最高价值项）

事实链：

1. `src/commands/data-integration/input.ts:576` 构造 `ExcelWorksheetReader` 时把样式桩掉：`styles: { getStyleModel: () => null }`。
2. `exceljs` 流式 reader 的日期判定依赖单元格数字格式：`node_modules/exceljs/lib/stream/xlsx/worksheet-reader.js:330` 的 `utils.isDateFmt(cell.numFmt)`。样式为 `null` ⇒ `numFmt` 为 `undefined` ⇒ 判定恒为 false。
3. 因此**日期格式单元格不会变成 `Date`，而是保留 Excel 序列号**。

实测（本机复现，两个最小 xlsx）：

| 列名 | 实际内容 | `inferred_type` | `samples` | `time_parse_ratio` | 结果 |
| --- | --- | --- | --- | --- | --- |
| `event_time` | 2026-03-04 05:06:07 | `number` | `46085.21258101852` | 1 | 侥幸可用 |
| `注册日期` | 2026-03-04 | `number` | `46085` | 0 | `ue_eligible: false`，警告 `No real time field with parseable values was identified.` |

两者差异的原因是列名：`profile.ts:181` 的 `isParseableTime(value, matchesName(name, TIME_NAMES))` 只对**名字命中时间词表**的列接受数字；`TIME_NAMES`（`profile.ts:61`）含 `date`、`时间`，但**不含 `日期`**。命中时 `convert` 侧 `normalizeTime` 的 Excel 纪元分支（`conversion.ts:643-655`，护栏 `1 ≤ v ≤ 2_958_465`）能把序列号正确还原成本地墙上时间——已验证输出 `#time: "2026-03-04 05:06:07.000"` 正确。

决策：

- **这是本计划里危害面最大的一项**，因为它命中的正是最常见的客户文件形态：中文表头的 Excel 导出。表现是 Agent 得出"此文件无时间列，转本地分析"这一**错误结论**，把一次本可完成的上报挡在门外；若用户坚持把该列当普通属性映射，AE 收到的是 `46085` 且类型被永久锁成 number。
- 修法是让样式可用，而不是扩充 `TIME_NAMES`。扩词表只是把偶然命中的范围调大，序列号语义仍然是错的。实现：解析 `xl/styles.xml` 的 `cellXfs` → `numFmtId`（含内置格式号 14–22、45–47 与自定义 `numFmts`），提供真实 `getStyleModel(styleId)`；本仓库已有 `readXlsxSharedStrings` 的同类实现可照搬。
- 同时补 `properties: { model: { date1904 } }`：`input.ts:577` 目前传 `{}`，1904 纪元工作簿会偏 4 年。当前被上一条掩盖，修好日期分支后必须一起给对，否则等于把一个隐性 bug 变成显性 bug。
- 该修复**改变默认行为**：受影响列的 `inferred_type` 由 `number` 变 `datetime`，推荐 mapping 随之改变。这是往正确方向的修正，不加 flag——留着错误默认值没有任何正当用途。但必须在 inspect 侧输出一条 warning 点名受影响列，让 Agent 有话可说（见 §6 兼容性）。

### 3.2 P2 / P4：`exceljs` 流式路径拿不到的信息

事实：

- **合并单元格：`exceljs` 流式路径完全不暴露。** `worksheet-reader.js:223` 是 `case 'mergeCell': break;`——解析到就丢弃，既不建属性也不发事件，且没有任何 option 能打开（`worksheets: 'emit'` 只控制是否 emit 行）。非流式路径才有真正的 `mergeCells` xform（`xlsx/xform/sheet/worksheet-xform.js:117`）。
- **单遍流式在结构上不可能先拿到合并区间。** CT_Worksheet 元素顺序里 `<mergeCells>` 在 `<sheetData>` **之后**（`worksheet-xform.js:325-329` 的渲染顺序即证据），所以处理第一行数据时合并区间还没出现在流里。
- **隐藏信息同样被丢弃。** `<row>` 只取 `r`/`ht`/`s`，`<col>` 只取 `min`/`max`/`width`/`style`；`row.hidden` 的 getter（`lib/doc/row.js:310`）读的是一个**从未被赋值**的 `_hidden`，因此恒为 `false`——直接读它会静默误判，比读不到更糟。
- **工作表级隐藏本仓库也没读。** `readXlsxSheetDefinitions`（`input.ts:616-655`，纯正则实现）只取 `name`/`r:id`/`sheetId`；`parseXmlAttributes` 其实已经把 `state` 放进 map 了，只是没人读。后果：`state="hidden"` / `veryHidden` 的工作表照常出现在 `--data-set` 候选里，`--merge-sheets` 时被一起读入。

决策：

- P2 拆成两步，因为成本差一个数量级：
  - **P2a 工作表隐藏**：`XlsxSheetDefinition` 加 `hidden` 字段，正则已有属性，改动约 10 行。**全计划性价比最高的一项，先做。** 隐藏工作表默认排除出 `--merge-sheets` 与自动候选，并在 inspect 结果里列出被排除的表名。
  - **P2b 行/列隐藏**：需要自己解析行属性，与 P4 的预扫描共用同一条自研读取路径，跟着 P4 走。
- P4 不做"缓冲回填"（内存不可控，违背流式初衷）。走**同一 ZIP entry 的轻量预扫描**：先用 `unzipper` + `saxes` 扫一遍只抓 `<mergeCells>`（以及 P2b 需要的 `<row hidden>` / `<col hidden>`），再跑现有取行流程。代价是多扫一遍字节，不多占内存。
- P4 的**默认行为不变**：预扫描只产出"本表有 N 个合并区间，覆盖列 X/Y"的 inspect warning。是否按合并区间做前向填充，由显式 flag 开启，且填充范围**严格不超出合并区间**——不做无界 forward fill（无界填充会把真实缺失值也填上，属于凭空造数据）。

### 3.3 P3：公式单元格无缓存值

`normalizeExcelValue`（`input.ts:808-818`）当前逐字为：

```ts
if (value && typeof value === 'object') {
  if ('result' in value) return (value as ExcelJS.CellFormulaValue).result ?? null;
  ...
}
return value ?? null;
```

存在两条**都不告警**的失败路径：`result` 键存在但为 `undefined` ⇒ 静默变 `null`（伪装成缺失值）；`result` 键不存在 ⇒ 落到最后一行 `return value ?? null`，把**原始公式对象**塞进行里。

决策：实施前先用 fixture 钉死实际走哪条（`exceljs` 是否总会带 `result` 键取决于写入方），再改。无论哪条，处理一致：识别为"公式无缓存值"，计数并输出 warning，值按缺失处理——**不猜结果、不本地求值**。计数进 inspect warning 与 convert 的 manifest 统计，让 §7 已落地的严重度表能真正给它评级（当前该表把它列为"尚无检测器"）。

### 3.4 通用降险规则（对 P1–P9 全体生效）

读取层的错误在本链路里**代价不对称**：AE 属性类型首次接收即锁定，事件上报不可撤回。因此除 P1、P2a、P3 属于"当前默认值本身是错的"必须改默认，其余各项一律按三段式推进：

1. **默认行为不变**，只在 inspect 侧新增 warning / profile 字段；
2. 需要改变数据的行为一律**显式 flag** 开启；
3. 只有在真实客户文件上验证过、且 §7 的严重度表已把它列为 Critical 的项，才考虑做成阻断。

两个已识别的设计陷阱，实施时必须绕开：

- **`--limit` 只能是预览。** 先用 `--limit N` 预览再整体上报会把第 1..N 行报两次。任何新增的抽样/预览开关都不得进入 `convert` 的输出路径。
- **P9 的行数守恒方程先报告、后阻断。** `mixed` 模式下"一源行 ↔ 一输出记录"的 1:1 关系尚未验证（一行可能同时产出 track 与 profile 记录），在验证前把守恒方程做成阻断项会误伤正常数据。

### 3.5 P6 / P7 / P8：profile 侧现状

`LocalDataColumnProfile`（`types.ts:58-72`）只有 `name`、`inferred_type`、`missing_*`、`unique_*`、`time_parse_*`、可选 `samples`（去重后最多 5 条、截断）、可选 `nested_tree`。**没有取值频次、没有数值分位、没有重复键检测、没有汇总行检测。**

决策：

- P7 的新增字段一律**可选**，不动 `ae-local-data-profile/v1` 版本号；Top-N 频次与五数概括都可在现有单遍累加器里完成，不引入第二遍扫描。
- P7 必须遵守既有安全约束：`samples` 上限（5 条、截断）与"不打印源值"的规则同样适用于 Top-N——频次表输出的是**取值的截断形式与计数**，不是原始值全集。
- P6 汇总行检测只做**报告**：命中特征（关键列为空且数值列等于该列合计、或首列含 `合计`/`总计`/`小计`/`Total` 等词）时输出 warning 并给出行号，由用户决定是否 `exclude`。不自动删行——自动删行会在客户"合计"其实是一条业务记录时丢数据。
- P8 重复业务键检测的键由**用户或 mapping 指定**（`#account_id` + `#time` + `#event_name` 的组合是默认建议，不是自动结论），只报告重复组数与样例键的哈希，不输出原始键值。

### 3.6 Fixture 与验证事实

- `tests/fixtures/local-data/` 现有 25 个 fixture，**xlsx 只有一个**（`13_multi_sheet.xlsx`），且**不存在 fixture 生成脚本**。README 声明 fixture 是"只读回归锚点"，其中中文表头/取值是真实业务数据，豁免全英文约束。
- 因此 P1–P5 所需的新 xlsx fixture（日期格式列、合并单元格、公式无缓存值、隐藏表/行/列、标题行）必须新生成。决策：新增 `scripts/gen-local-data-fixtures.mjs` 做确定性生成，**脚本与产物一起提交**；脚本只用于编写期重生成，测试仍只读 fixture，不在测试里现场生成。
- 验证入口：`npm run qa-changed`（`scripts/qa-changed.mjs:83` 已把 `/data-integration/i` 映射到 `verify:tracking-tools`，无需改动）。`verify:tracking-tools` 是 17 个串联套件，末尾是 `node test/local-data-skill.test.mjs`。**不存在 `npm run verify:data-integration`。**
- `test/local-data-skill.test.mjs` 有两条**约束后续所有改动**的反向断言：SKILL.md 不得出现 `automatically upload` / `auto-upload`；`skills/ae-data-integration` 下任何 `.md` 不得出现 `--yes`。

## 4. 修改文件

| 文件 | 涉及项 | 改动性质 |
| --- | --- | --- |
| `src/commands/data-integration/input.ts` | P1、P2a、P2b、P3、P4、P5 | 读取层主战场：真实样式模型、`XlsxSheetDefinition.hidden`、`normalizeExcelValue`、xlsx 预扫描、表头判定 |
| `src/commands/data-integration/profile.ts` | P6、P7、P8、P9 | 累加器与 profile 产出 |
| `src/commands/data-integration/types.ts` | P7、P9 | 新增可选 profile / manifest 字段 |
| `src/commands/data-integration/conversion.ts` | P3、P9 | 公式无缓存值计数、行数守恒回执 |
| `src/commands/data-integration/inspect.ts` | P1–P8 | warning 汇总输出 |
| `skills/ae-data-integration/references/source-inspect.md` | P1–P8 | 新信号的读法与呈现规则 |
| `skills/ae-data-integration/references/error-handling.md` | P3、P4、P6、P8 | 把"尚无检测器"清单里已实现的项挪进严重度表 |
| `test/local-data-skill.test.mjs` | 同上 | 断言锁定新规则 |
| `tests/local-data-*.test.ts`（新增若干） | P1–P9 | 行为回归 |
| `scripts/gen-local-data-fixtures.mjs`（新增） | P1–P5 | 确定性生成 xlsx fixture |
| `tests/fixtures/local-data/*.xlsx`（新增） | P1–P5 | 回归锚点 |

## 5. 实施顺序

按"危害面优先、成本次之"排序，每一步独立可交付、可回滚，不与下一步耦合。**P1 与 P2a 之间没有依赖**，谁先做都不影响另一项；既然 P1 是全计划危害面最大的一项（§3.1），就由它开路，不拿更便宜的 P2a 当热身。

1. **P1 xlsx 日期**：真实 `getStyleModel` + `date1904`。危害面最大，且 fixture 最容易构造。**已交付，见 §7.2。**
2. **P2a 工作表隐藏**（~10 行）：正则已拿到 `state`，只需透出并默认排除。全计划性价比最高的一项。**已交付，见 §7.3。**
3. **P3 公式无缓存值**：先用 fixture 钉死分支，再改。与 P1 共用同一批 xlsx fixture。**已交付，见 §7.4。**
4. **P5 表头判定**：`detectHeaderRow` 现在是分隔符专用、且只对第 1 行给二元结论（`input.ts:308`，`numSample = 10`）；xlsx 路径更是无条件把第 1 行当表头（`input.ts:589` 的 `if (!headers) { ... continue; }`）。本步把判定接入 xlsx 路径并支持跳过标题行；**多行表头合并不在本步范围**，先只做"识别并报告"。
5. **P4 + P2b xlsx 预扫描**：合并区间与行/列隐藏共用一遍 `unzipper` + `saxes` 扫描。本计划里最重的一项，放在读取层其余项稳定之后。
6. **P7 profile 频次与分布**：为 P6/P8 提供判据。
7. **P6 汇总行检测**。
8. **P8 重复业务键检测**。
9. **P9 行数守恒回执**：仅报告，不阻断；同时验证 `mixed` 模式下的 1:1 假设是否成立，结论写回本文档 §9。

每步的完成标准（CLAUDE.md §7）：`npm run build` 绿 → `npm run qa-changed` 绿 → 新增 fixture 的 `--dry-run` / inspect 输出符合预期 → 若改了 skill 文档则 `npm run check:release` 绿。**未改 `CLAUDE.md` / `AGENTS.md`，不需要 `check:agents-docs`。**

## 6. 兼容与回滚

- **P1 是唯一有 AE 侧不可逆影响的改动。** 修复后受影响列由 `number` 变 `datetime`，推荐 mapping 随之改变。若某个 AE 项目**已经**把该列作为 number 属性接收过，其类型已锁定，无法改成 datetime——这类历史项目只能换属性名重报。因此 P1 必须同时输出 warning 点名受影响列，且 skill 文档要写明"该列此前可能已按 number 上报过"的追问动作。
- P2a 默认排除隐藏工作表，会改变 `--merge-sheets` 的行数。属于修正，但需在 inspect 输出里列出被排除的表名，避免"行数少了却没人知道为什么"。
- P3–P9 全部只新增 warning / 可选字段，默认数据流不变；改变数据的行为均在显式 flag 后。
- 契约不变：`ae-data-integration-mapping/v1`、`ae-local-data-profile/v1`、`ae-local-data-manifest/v1` 版本号均不动，新增字段一律可选，旧 mapping / manifest 继续可读。
- 回滚粒度 = 单步。每步一个 commit，`git revert` 即可；fixture 与生成脚本是纯新增，回滚无副作用。
- 第一档已交付内容（§7）是纯文档，与本计划各步无代码耦合，可独立保留或独立回滚。

## 7. 已交付

### 7.1 第一档（纯文档）

commit `ef9c2f46`「feat: 收紧数据集成的逃生舱、粒度与多源合并规则」，6 文件 +69/−1，在 `feat/ae-data-integration-0902`（尚未 push）。零代码、零数据流改动。

| # | 规则 | 落点 |
| --- | --- | --- |
| 1 | mapping 的逃生舱（`missing_time: 'now'` 等）只能记录用户已做的决定，不得用来让校验失败消失；不得靠缩小上报范围制造"通过" | `SKILL.md` |
| 2 | 可解析的时间列不等于确立了指标的原生粒度；累计快照与重叠周期转本地分析 | `references/ue-routing.md` |
| 3 | 表头相同不证明多源互斥；合并前须确认是互斥分区并出示各源行数与时间覆盖区间 | `references/source-inspect.md`、`references/transform.md` |
| 4 | 文件级数据质量严重度表（Critical/High/Medium/Low），并显式列出**尚无检测器**的四类信号，禁止声称工具检查过它没检查的东西 | `references/error-handling.md` |

第 4 条列出的四类"尚无检测器"信号正是本计划的 P4（合并单元格）、P6（汇总行）、P3（公式无缓存值）、P8（重复业务键）。**每完成一项，就把它从"尚无检测器"清单挪进严重度表**——这是本计划与第一档的接缝，也是判断本计划是否真正落地的标志。

验证记录：`npm run qa-changed` exit 0（tsup build + 17 套件，含 `data integration skill contract tests: passed`）；`npm run check:release` OK（3 checks）。

### 7.2 P1：xlsx 日期单元格

落点 `src/commands/data-integration/input.ts` + `profile.ts`。实施时发现 §3.1 写的"让样式可用"只是三件事里的一件，**三件必须同时做，少一件都会把一个隐性错误换成另一个**：

1. **真实样式模型**：用 `exceljs` 自己的 `StylesXform` + `parseStream(entry.stream())` 读 `xl/styles.xml`（沿用本仓库既有的 `require('exceljs/lib/...')` 深引用写法），替换原来的 `getStyleModel: () => null` 桩。两处 `ExcelWorksheetReader` 构造点（取数与读表头）共用同一个 workbook 上下文，避免两处判定分叉。
2. **`date1904`**：从 `xl/workbook.xml` 的 `<workbookPr date1904>` 读出并传入 `properties.model`。原来传 `{}`，日期分支一旦生效，1904 纪元工作簿就会偏 1462 天——正是 §3.1 说的"把隐性 bug 变成显性 bug"。
3. **墙上时间归一化**：日期单元格在读取边界转成 naive 字符串（`YYYY-MM-DD`，有时间部分则 `YYYY-MM-DD HH:mm:ss[.SSS]`），不把 `Date` 对象往下传。

第 3 件是实施中**新发现的、原计划没有的必要项**：`exceljs` 的 `excelToDate` 是 UTC 侧构造（`utils.js:55` 的 `dateToExcel` 用 `getTime()`），所以 `Date` 的 **UTC** 分量才是用户在 Excel 里看到的墙上时间，那个瞬间本身无意义；而 `conversion.ts` 的 `normalizeTime` 把 `value instanceof Date` 当**绝对瞬间**，只有 naive 字符串/序列号才走 `zonedWallTimeToDate(parts, sourceTimezone)`。若直接放 `Date` 下去，`2026-03-04 05:06:07` 会变成 Asia/Shanghai 的 13:06:07——**由修复本身引入 8 小时偏移**。另一条备选（改 `conversion.ts` 的语义）被否，因为 `.xls`（SheetJS）路径产出的 `Date` 是本地时间构造的，改语义会同时打坏那条路。

第二个绕开的坑：`utils.isDateFmt` 会剥掉 `[...]` 再匹配 `/[ymdhMsb]+/`，所以**耗时类格式（`[h]:mm:ss` 与内置 45/46/47）也算日期**，`0.5` 会被当成 1899-12-30 12:00。修法是在自建的 `getStyleModel` 适配层里对这类格式剥掉 `numFmt`，让它们继续是数字。此外 `exceljs` 的 `getStyleModel` 无保护地读 `this.model.styles[id]`，而 `parseClose` 只在 `cellXfs` 非空时赋值，故无 `cellXfs` 的工作簿会 TypeError——已用 try/catch 降级为"无格式"。

inspect 侧按 §3.1/§6 要求输出一条 warning 点名受影响列，并写明"该列此前可能已按 number 上报过、AE 属性类型已锁定"的追问动作。

新增 fixture 与生成脚本：`scripts/gen-local-data-fixtures.mjs`、`tests/fixtures/local-data/26_xlsx_date_formats.xlsx`（日期列 / 日期时间列 / 耗时列 / 数字列）、`27_xlsx_date1904.xlsx`。

实测验收（§8 标准全部达成）：

| 对象 | 修复前 | 修复后 |
| --- | --- | --- |
| `注册日期` | `number` / `46085` / `time_parse_ratio: 0` / `ue_eligible: false` | `datetime` / `2026-03-04` / `ratio: 1` / `ue_eligible: true` |
| `event_time` | `number` / `46085.21258101852` | `datetime` / `2026-03-04 05:06:07` |
| `耗时`（`[h]:mm:ss`） | `number` / `0.5` | 不变：`number` / `0.5` |
| 1904 纪元 `注册日期` | `number` / `44623` | `2026-03-04`，不偏 4 年 |
| `convert` 输出 | — | `#time: "2026-03-04 05:06:07.000"`，与 Excel 显示一致 |
| 既有 `13_multi_sheet.xlsx` | — | profile 逐字节不变（其时间列本就是文本），`warnings: []` |

### 7.3 P2a：工作表隐藏

落点 `src/commands/data-integration/input.ts` + `inspect.ts` + `types.ts`。§3.2 决策里"默认排除 + 输出被排除表名"两半都落地了，实施中还多出三处原计划没点明、但不做就自相矛盾的地方：

1. **排除不能等于不可达。** 隐藏表若直接从 `discoverDataSets` 的结果里删掉，用户明确 `--data-set 'sheet:临时草稿'` 时会收到"找不到该 Sheet"——把一个知情决定报成一个不存在的表。改法是 `discoverDataSets` 返回 `{ visible, hidden }`，`LocalDataInput` 多一个 `excludedDataSets`，`selectDataSet` 在候选里找不到时再查它，命中就读、同时在 stderr 说明"该表在源工作簿里是隐藏的"。没有新增 flag。
2. **`header_consistency` 也必须排除隐藏表。** 隐藏表常是"上一版草稿"，表头与现行表不一致；若把它算进 `readXlsxSheetHeaders`，一个本来可以安全 `--merge-sheets` 的工作簿会被报成 `different`，反而劝退了正确操作。
3. **"全部工作表都隐藏"是本次改动新造出来的可达状态。** 改动前 xlsx 的候选数恒 ≥ 1，`selectDataSet` 走不到 0；排除隐藏表之后能走到，而它会落进既有的 `This file contains multiple data sets.`——候选列表是空的，读起来像文件坏了。新增 `LOCAL_DATA_ALL_DATA_SETS_HIDDEN` 分支，直说"本文件所有数据集都是隐藏的"并在 hint 里列出可选表名。Excel 界面不允许隐藏最后一张可见表，但脚本导出的文件可以，所以这条不是假想态，配 fixture `29_xlsx_all_hidden.xlsx` 钉住。

被排除表名以 `excluded_sheets: [{ name, reason: 'hidden', data_set }]` 出现在 inspect 输出的三个分支（`selection_required` 发现态、单文件 profile、多文件 profile），对应 §6 的要求：行数变少必须有可解释的出处，否则与解析失败无从区分。`--merge-sheets` 跳过隐藏表时另有一条 stderr warning 点名被跳过的表。

**已知缺口（有意不做）：`.xls` 的隐藏工作表仍未识别。** SheetJS 侧信息在 `wb.Workbook.Sheets[].Hidden`，但无法验证用 SheetJS **写出** `.xls` fixture 时隐藏状态是否被保留，没有 fixture 就没有回归锚点；按 CLAUDE.md 不声称未验证的行为，这条缺口写进了 `references/source-inspect.md`（明说 `.xls` 的表列表未过滤，须让用户确认），而不是留白。

新增 fixture：`28_xlsx_hidden_sheet.xlsx`（可合并的可见表 `1月`/`2月` + 隐藏表 `临时草稿`，后者表头不同、行数不同，所以泄漏会同时在候选数、`header_consistency`、`--merge-sheets` 行数三处露出来）、`29_xlsx_all_hidden.xlsx`（唯一的表 `隐藏明细` 被隐藏）。两个 fixture 都解压核对过 `xl/workbook.xml` 里的 `state="hidden"`，不是只信 `exceljs` 接受了 `{ state: 'hidden' }` 这个入参。

验证记录：`npm run build` 绿；`npm run qa-changed` exit 0（含 `local data xlsx hidden sheet tests: passed` 与 `data integration skill contract tests: passed`）；`npm run check:release` OK（3 checks）。CLI 实测：fixture 28 的 `selection_required` 只列 `1月`/`2月`，并给出 `excluded_sheets: [{ name: '临时草稿', reason: 'hidden', data_set: 'sheet:临时草稿' }]`、`header_consistency: all_same`；fixture 29 返回 `LOCAL_DATA_ALL_DATA_SETS_HIDDEN`，hint 列出 `sheet:隐藏明细`。

### 7.4 P3：公式单元格无缓存值

落点 `src/commands/data-integration/input.ts` + `types.ts` + `profile.ts` + `conversion.ts`。§3.3 要求"实施前先用 fixture 钉死实际走哪条分支"——钉的结果是**原计划的两条路径都不完整，真正的机制在更下游一层，而且它还藏着一条比原计划任何一条都严重的失败路径**。

用一次性探针（直接驱动 `ExcelWorksheetReader` 读 8 种形态的单元格，同时打印 `cell.type` / `cell.value` / `cell.model`）得到的事实：

| 单元格 | XML | 改动前读到的 `cell.value` | `cell.model` |
| --- | --- | --- | --- |
| `=C2*D2` 缓存 `21` | `<f>` + `<v>21</v>` | `{formula, result: 21}` | `result: 21` |
| `=E2*0` 缓存 `0` | `<f>` + `<v>0</v>` | `{formula}`——**0 丢失** | `result: 0` |
| 公式缓存 `""` | `t="str"` `<f>` + `<v></v>` | `{formula}`——**"" 丢失** | `result: ""` |
| `=E2-F2` 无缓存 | `<f>`，无 `<v>` | `{formula}` | **无 `result` 键** |
| `=F2/0` 缓存错误 | `t="e"` `<f>` + `<v>#DIV/0!</v>` | `{formula}` | `result: NaN` |
| 纯错误格 `#N/A` | `t="e"` `<v>#N/A</v>` | `{error: "#N/A"}` | `value: {error}` |

根因不在流式 reader（`worksheet-reader.js` 对 `<v>` 的处理是正确的，`t="str"` 走 `xmlDecode`、其余走 `parseFloat`），而在 `exceljs/lib/doc/cell.js` 的 `_copyModel`：它逐字段 `if (value) copy[name] = value`，**所有 falsy 字段都被丢掉**。于是 `result: 0` / `""` / `false` 在 `cell.value` 里消失，公式单元格退化成裸 `{formula}`——与"文件从未计算过这个公式"**逐字节无法区分**。

这条是原计划没有的第三类失败，也是全计划里唯一"值本来存在却被丢掉"的一类：客户表里 `discount = 0` 是真实的零折扣，不是缺失值；照原计划"没有 `result` 键就判为无缓存值"改，会把每一个真实的 0 变成缺失值——**修一个 bug 造一个更大的 bug**。所以读取层改为先走 `cell.model`（保留 falsy 字段），再按值分类：

- `readExcelCellValue(cell)`：公式格从 `cell.model` 取 `result`，让 `0` / `""` / `false` 活着到调用方；
- `readExcelCell(value)` 返回 `{ value, issue? }`：值与问题**同一处产出**，保证"被计数的格"永远就是"读成缺失的那一格"，不会出现计数与数据打架；
- 三类 `LocalDataCellIssue`：`formula_no_cached_value`（有公式无缓存结果）、`error_value`（`#N/A` / `#DIV/0!`，含 `parseFloat` 后变成 `NaN` 的缓存错误）、`unreadable_object`（未知单元格形态，兜底，防止对象漏进上报路径）。

计数按 `issue -> 列名 -> 条数` 收集：inspect 侧进 `profile.warnings`（每类一条，点名列与条数），convert 侧进 `manifest.output.unreadable_cells` 并在 stderr 复述一遍。**只报条数、不打印源值**。warning 文案明说"本工具从不求值、从不猜结果"，给出的动作是"在 Excel 里重算后重新导出，或直接导出值而非公式"。

行为边界：这些格读成缺失，**行照旧保留**（`valid_records` 不变），所以 `unreadable_cells` 是"AE 里这一列是空的、而表格看着是满的"唯一的解释出处——这也是它必须同时出现在 inspect 与 manifest 两处的原因。

**已知缺口（有意不做）：`.xls` 走 SheetJS 另一条解析路径，不在本次计数范围内。** 已写进 `references/source-inspect.md`，不留白。

新增 fixture：`30_xlsx_formula_cells.xlsx`，一张表覆盖全部六种形态（缓存数字 / 缓存 `0` / 缓存 `""` 与缓存字符串 / 无缓存 / 缓存错误 / 纯错误格）。解压核对过 `sheet1.xml` 里每格的 `<f>` 与 `<v>` 实际形态，不是只信 `exceljs` 接受了入参。

验证记录：`npm run build` 绿；`npm run verify:tracking-tools` 全绿（20 个套件，含新增 `local data xlsx formula tests: passed` 与 `data integration skill contract tests: passed`）；`npm run check:release` OK（3 checks）。回归断言同时钉住两个方向：`discount` 的 `0` 必须以 `0` 上报（`properties.discount === 0`）、`total` / `rate` 必须读成缺失且**任何列都不得出现原始单元格对象**（逐格断言 `typeof value !== 'object'`）。

### 7.5 P5：表头判定（标题行）

落点 `src/commands/data-integration/input.ts` + `inspect.ts` + `types.ts` + `profile.ts` + `mapping.ts` + `conversion.ts`。§5 限定"本步把判定接入 xlsx 路径并支持跳过标题行，多行表头合并不在本步范围，先只做识别并报告"。实施中钉出**三条**缺陷，比原计划写的两条多一条：

| 缺陷 | 现状 | 客户文件里的后果 |
| --- | --- | --- |
| （a） 判定不覆盖 xlsx | `detectHeaderPresence` 开头 `if (input.format !== 'csv' && input.format !== 'tsv') return undefined` | xlsx 首行是数据时无人过问 |
| （b） 首行无条件当表头 | `streamXlsx` 把第一条发出的行直接当表头 | 报表标题占了 A1，它成为**唯一的列名**，真表头降级为第一行数据 |
| （c） 分隔符文件同样中招且同样沉默 | `detectHeaderRow` 对"孤零零一个中文标题"判 `hasHeaders: true`（唯一且非数字，看起来完全像表头） | 与 （b） 完全相同，但原计划以为分隔符路径已被覆盖 |

（c） 是本步新发现的：`2026年3月销售明细` 这一行放在 CSV 首行，既唯一又非数字，启发式毫无理由怀疑它。三条读取器（`streamDelimited` / `streamXlsx` / `streamXls`）都已在本步接上 `skipRows`，所以标题行扫描扩到分隔符路径是零额外成本的；**表头判定本身仍只对 xlsx 追加**，因为分隔符路径的判定已由 `detectHeaderPresence` 给出并且**会据此改变行为**，再报一遍只会自相矛盾。

**关键决策：xlsx 不自动切换，只报告。** 按 §3.4 本项属"默认行为不变"的第一段，但这里还有一条更硬的理由：Excel 导出的表头合法地会是数字（`2024`、`2025` 这类年份列名），恰好会触发分隔符那套"首行像数据"的比例启发式；而误判是**不可恢复**的——没有任何 flag 能把一行"已被当成数据"的行按回表头（`--headers 'a,b,c'` 设的是 `headerNames`，它反而让第 1 行变成数据）。报告 + 显式 flag 让两个方向都可恢复，自动切换只让一个方向可恢复。

行号口径统一为**在所读序列内的 1 基序号**，不用 `excelRow.number`（合并单元格与空行会让两者错位）。已核对该口径在 peek 与 stream 两侧一致：`peekDelimitedRecords` / `streamDelimited` 同用 `skip_empty_lines: true`，`peekXlsxRows` / `streamXlsx` 遍历同一份工作表序列。于是"报出来的序号"就是"`--skip-rows` 该填的值"，这一点由测试直接钉住。

具体落点：

- `detectLeadingTitleRows(rows)`：前 `TITLE_ROW_SCAN_LIMIT = 3` 行内，连续的"非空格数 ≤ 1"计为标题行；**且**紧随其后一行的非空格数须 ≥ `TITLE_ROW_MIN_HEADER_WIDTH = 3`，否则整体不算——单列窄文件不该因为首行只有一个值就被判成有标题行。
- `--skip-rows N`：**校验而非截断**。`mapping.ts` 拒绝非整数 `skip_rows`，而 inspect 会把它写进 `recommended_mapping`，所以小数在 inspect 侧不拦就会在很久以后的 convert 侧才炸（`LOCAL_DATA_SKIP_ROWS_INVALID`，`validate` 钩子）。
- 决定沿 inspect → `recommended_mapping.skip_rows` → convert 传递，且 convert 的**两趟**（profile 趟与转换趟）都吃同一个值，否则 profile 描述的行与上报的记录会是不同的行。
- 输出只含**行序号与非空格数，绝不含单元格文本**（测试反向断言 warning 里不出现标题原文）。
- 契约按 §6 只加可选字段，不升版本：`leading_title_rows`、`header_signal`、`skipped_rows`（profile）与 `skip_rows`（mapping）。

**已知缺口（有意披露）：仍然没有"强制指定表头行"的 flag。** 这正是 xlsx 表头判定只能报告不能自动切换的原因；写进了 `references/source-inspect.md`，不留白。严重度按 `references/error-handling.md` 归入 High——"未经用户确认的 `leading_title_rows` / `header_signal`"必须在确认闸口点名，因为在用户回答之前 mapping 的列名就是错的。

新增 fixture：`31_xlsx_title_row.xlsx`，A1 一句标题、A2 一句副标题、第 3 行才是真表头（`user_id` / `event_time` / `amount`）+ 2 行数据。解压核对过 `dimension ref="A1:C5"` 与每行实际格数，不是只信 `exceljs` 接受了入参。

验证记录：`npm run build` 绿；`npm run verify:tracking-tools` 全绿（21 个套件，含新增 `local data title row tests: passed`）；`npm test` 冒烟绿；`npm run check:release` OK（3 checks）。回归断言两个方向都钉住：默认跑**行为一字不变**（`row_count: 4`、列名只有标题那一个）但报出 `leading_title_rows` 与 warning；`--skip-rows 2` 拿到真表头、真行数、`skipped_rows`、`skip_rows` 进 mapping，convert 据此只出 2 条记录；正常文件与两列窄文件均**不误报**。实施中还补了一处既有测试的 ctx mock（`local-data-xlsx-hidden-sheets.test.ts` 缺 `num`，新 flag 一加就暴露）。

### 7.6 P4 + P2b：xlsx 预扫描（合并单元格 + 行/列隐藏）

落点 `src/commands/data-integration/input.ts`（预扫描、区间追踪器、结构收集器）+ `types.ts` + `inspect.ts` + `profile.ts` + `conversion.ts` + `mapping.ts`。§3.2 的判断成立：`<mergeCells>` 在 `</sheetData>` **之后**才出现，所以单趟流式读到某个空格时，无从知道它是被合并覆盖的；同一 ZIP entry 再扫一遍是结构上必需的，且只多扫字节、不多占内存（`unzipper` + `saxes`，只抓 `<mergeCells>` / `<cols><col hidden>` / `<row hidden>`）。

实施中确认了 §3.2 的一条判断，它决定了 P2b 只能这么做：**`exceljs` 流式 reader 的 `row.hidden` 永远是 `false`**（getter 读的是一个从未被赋值的 `_hidden`）。所以隐藏行不是"自己解析更准"，而是**读那个属性会得到确定的错误答案**，只能来自预扫描。

**两套行号口径不可混用**，这是本步最容易埋错的地方：

| 口径 | 用在哪 | 定义 |
| --- | --- | --- |
| 工作簿行号 | 预扫描、`hidden_row_samples`、区间填充、隐藏行排除 | Excel 显示的行号，即 XML `r` 属性（已核对 `excelRow.number` 就是它） |
| 所读序列内 1 基序号 | P5 的 `leading_title_rows` / `--skip-rows` | §7.5 定的口径，跳空行后重新计数 |

两者在合并单元格与空行处必然错位。预扫描的发现按工作簿行号与行流对齐，而 `--skip-rows` 仍按 §7.5 口径，互不换算。

**默认行为不变，报告先行**（§3.4 第一段）。`xlsx_structure` 只描述读到的布局：`merged_ranges` / `merged_range_samples`（形如 `A3:A5` 的引用，绝不含单元格文本）/ `merged_covered_cells`（按列计数）/ `hidden_rows` / `hidden_row_samples` / `hidden_columns`（按表头名）。是否改数据由显式 flag 决定：

- `--fill-merged-cells`：把区间锚点的值填进**该区间自己覆盖的格**，`严格不越界`、不覆盖已有值、锚点自身为空时不造值——所以它不是 forward fill。
- `--exclude-hidden-rows`：把隐藏行排除出所读序列。
- **隐藏列不给 flag**，只报告并指向既有的 `exclude_columns`——新增一个"排除列"的读取 flag 会与 mapping 里已有的字段打对台。

为什么两条都不做默认：那些格在文件里**确实是空的**，而数据块里被隐藏的一行仍可能是真数据。这与"隐藏**工作表**默认排除"（§7.3）不矛盾——一整张被隐藏的表几乎总是草稿或查找表，一行不是。

`merged_covered_cells` 取的是**观测值而非计算值**：它统计"这次运行里真的因为被合并覆盖而读成缺失"的格。于是报告数恰好等于该次运行的填充会改动的量——默认 3，加 `--exclude-hidden-rows` 后 2，因为被丢掉的行不再被观测。这一点由测试正反两侧钉住。

`convert` **没有读取 flag**（它从 mapping 推导一切），所以两个决定按 §7.5 `skip_rows` 的先例落在 mapping 字段 `fill_merged_cells` / `exclude_hidden_rows` 上，并由 `mapping.ts` 校验：非布尔拒绝，非 `xlsx` 格式拒绝（这两个信号只存在于 worksheet XML）。契约按 §6 只加可选字段，不升版本。

实施中修掉一处测试暴露的 UX 缺陷：mapping 里已经 `exclude_columns` 排除了某隐藏列时，`convert` 仍在 stderr 建议"把它列进 `exclude_columns`"——让用户去做已经做完的事，而这条 warning 是 agent 会解析的。`xlsxStructureWarnings` 因此接一个可选的 `excludedColumns`，只对**仍会进入输出**的隐藏列告警；manifest 里仍完整记录该列曾被隐藏。

新增 fixture：`32_xlsx_merged_cells.xlsx`，工作表 `销售明细`：第 1 行是横跨 A1:E1 的合并标题、第 2 行真表头、5 行数据，`区域` 按 `A3:A5` 与 `A6:A7` 两个区间合并，第 5 行隐藏，第 5 列（`备注`）隐藏。

**已知缺口（有意披露）：`.xls` 不做预扫描**，与 §7.3 / §7.4 同样处理——写进 `references/source-inspect.md`，让 agent 去问用户而不是把沉默当成"没有合并单元格"。严重度按 `references/error-handling.md`：未经用户确认的 `merged_covered_cells` 归 High（在用户回答之前，那一列在 AE 里就是大面积空的），`hidden_rows` / `hidden_columns` 归 Medium。

**顺带发现、已在后续单独提交中修复**：`readXlsxSharedStrings`（`input.ts`）逐 chunk 做 `Buffer.from(chunk).toString('utf8')`，没有 `StringDecoder`。当一个多字节字符正好被 chunk 边界切开时，共享字符串会损坏——大文件上可复现。按 §2 的"外科手术式改动"没有在 P4 + P2b 这一步顺手改，而是单独记录、单独修复，见 §7.7。

验证记录：`npm run build` 绿；`npm run verify:tracking-tools` 全绿（22 个套件，含新增 `local data xlsx merged cell tests: passed`）；`npm test` 冒烟绿；`npm run check:release` OK。回归断言钉住四个方向：默认跑**行为一字不变**（`row_count: 5`、`区域` 缺失 3）但报出全套 `xlsx_structure`；`--fill-merged-cells` 后 `区域` 缺失归零且填充值逐行核对；`--exclude-hidden-rows` 后行数与覆盖计数同步下降；convert 经 mapping 复现同一读取（4 条记录、`region` 逐条核对）。另有两条反向断言：任何 warning 都不得出现单元格原文（`华东` / `内部备注` / 标题行），干净工作簿必须**不产生** `xlsx_structure` 段。

### 7.7 计划外缺陷修复：共享字符串跨 chunk 边界损坏

不属于 P1–P9 任何一项，是 §7.6 实施中顺带发现、经复核确认的既有缺陷，单独一次提交。

落地文件：`src/commands/data-integration/input.ts`（`readXlsxSharedStrings`）、`tests/local-data-xlsx-shared-strings.test.ts`（新增）、`package.json`（套件登记，23 个）。

**为什么这是缺陷而不是理论风险**：XLSX 把每个单元格显示的文本在 `xl/sharedStrings.xml` 里只存一份，工作表单元格只存一个下标。这张表是流式读的，`unzipper` 按解压产出切 chunk（实测约 16KB 一块），边界落在哪里由压缩结果决定，可以正好落在一个多字节字符中间。逐 chunk 各自 `toString('utf8')` 会把这一个字符变成两个替换字符，一个留在本 chunk 尾、一个出现在下一个 chunk 头。

复核用一个 4000 行、备注列全中文的工作簿实测：`sharedStrings.xml` 329,990 字节、切成 21 个 chunk、产生 17 个替换字符，**真实读取路径回读出 7 个单元格损坏**，形如 `华东区??第202号客户备注说明文字`。这条链路上它比一般乱码更严重：损坏的文本会作为属性值或事件名上报，而 AE 属性类型首次接收即锁定、事件上报不可撤回；更关键的是**没有任何计数会记下它**——行数、`unreadable_cells`、`xlsx_structure` 全都正常，文件也不报错，用户只能在 AE 里偶然看到几条乱码值。

修法照搬同一文件里已有的正确写法（P4 预扫描处，`StringDecoder` 早已 import）：跨 chunk 用一个 `StringDecoder` 持有半个字符，结尾 `decoder.end()` 冲掉残留。这不改变任何取值语义，只让本就该完整的字符串保持完整，因此不适用 §3.4 的三段式（没有"默认行为"可选，逐 chunk 解码给出的答案是确定错的）。

回归测试不进 fixture 目录：唯一需要被固定的东西是"大到会分块"，把一个几百 KB 的 xlsx 提进仓库只是为了这一点。测试在临时目录用 exceljs 现建 3000 行工作簿，先断言 `sharedStrings.xml` 确实分成多于一个 chunk（否则这条测试什么也没证明，要显式失败而不是静静通过），再逐行核对 3000 条中文原文。已验证它对缺陷有效：回退 `input.ts` 后测试在第 469 行失败，恢复后通过。

验证记录：`npm run build` 绿；`npm run verify:tracking-tools` 全绿（23 个套件，含新增 `local data xlsx shared string tests: passed`）；`npm test` 冒烟绿；`npm run check:release` OK。

### 7.8 P7：取值频次与数值分布

落地文件：`src/commands/data-integration/types.ts`（`LocalDataValueFrequency`、`LocalDataNumericSummary` 两个接口 + `LocalDataColumnProfile` 两个可选字段）、`src/commands/data-integration/profile.ts`（累加器字段与两个格式化函数）、`tests/local-data-value-distribution.test.ts`（新增）、`package.json`（套件登记，24 个）、`skills/ae-data-integration/references/source-inspect.md`、`test/local-data-skill.test.mjs`（6 条断言）。

**要解决的问题**：`unique_count` 只回答"有多少种取值"，不回答"这些取值值不值得上报"。三种列在旧 profile 里长得一样：三值枚举、自由文本、以及每行都相同的导出残留列。数值列同理，只有类型没有量级，`金额` 是单笔金额还是累计快照、单位是分还是元，都看不出来。

**决策一：频次表在两种情况下整表不输出，而不是截断后照发。** 一是 distinct 超出跟踪预算（200）时——一个几千种取值的列没有"最频繁"可言，截断后发出去的会是恰好最先出现的那几个值，而它读起来像结论。二是实测暴露的第二种情况：小文件里的 ID 列、时间戳列、JSON blob 列 distinct 并没超预算，但**每个值只出现一次**，照发就是把原始值整列打印出来，是纯值转储而不是发现。因此加一条"最高频次 < 2 则整表不输出"的守卫。实测 `01_normal_ecommerce.csv`：加守卫前 9 列里 7 列出表（含 `user_id`、`order_time`、`city`），加守卫后只剩 4 个真正的枚举列，且立刻暴露一个真实发现——`status` 列同时存在 `completed` 与 `success`，这正是 `value_mapping` 的判据。

**决策二：数值分布只对 `inferred_type: number` 的列输出。** id-like 列已被既有规则强制成 `string`，对用户 ID 求和是对标识符做算术；`mixed` 列的类型冲突有既有的 `--type-resolutions` 流程负责，不在这里旁路解释。

**决策三：`count` / `min` / `max` / `sum` / `mean` 永远精确，只有分位数可能近似。** 这条是为 P6 服务的：汇总行的判据是"关键列为空且数值列等于该列合计"，合计一旦变成估计值，判据就不成立。因此累加器对这五项做流式精确累加，只有分位数在超过 5000 个值后走蓄水池抽样，并置 `quantiles_approximate: true` 明示。蓄水池而不是"前 5000 个"：一份按金额排序过的文件会把最小值那一段的分位数报成整列的分位数。

**安全约束**：两个字段都只在 `collectSamples`（即 inspect 路径）下产出，绝不进 convert manifest——manifest 承载映射，不承载客户文件里的值。频次表的值按 `samples` 同样的规则截断，因此超长值会按截断形式合并计数，这也是"整表只在 distinct 完全落在预算内时才输出"的另一个理由。分位数用的蓄水池同样只在 inspect 路径填充，convert 路径内存不变；但 `sum` / `min` / `max` / `count` 两条路径都累加，因为 P6 在两条路径上都要用。全部字段可选，不动 `ae-local-data-profile/v1` 版本号。

验证记录：`npm run build` 绿；`npm run verify:tracking-tools` 全绿（24 个套件，含新增 `local data value distribution tests: passed`）；`npm test` 冒烟绿；`npm run check:release` OK；`npx tsc --noEmit` 维持既有 31 条基线不变。新增测试覆盖精确频次与顺序、1..60 的精确五数概括、浮点合计（0.1+0.2+45.3=45.6 而非累积噪声）、ID 列两个字段都不出、高基数列不出表、超预算时分位数近似而合计精确、以及两个字段都不出现在 convert 路径的 profile 上；蓄水池含随机性，连跑三次稳定。

### 7.9 P6：汇总行检测

落地文件：`src/commands/data-integration/types.ts`（`LocalDataSummaryRow` 接口 + `LocalDataProfile.summary_rows` + `LocalDataManifest.output.summary_rows`）、`src/commands/data-integration/profile.ts`（判定常量、`ColumnAccumulator.keyLike`、`SummaryRowCandidate`、行回调改取 `rowNumber`、`matchesSummaryLabel` / `confirmSummaryRows` / `summaryRowWarning`）、`src/commands/data-integration/conversion.ts`（manifest 透出一行）、`tests/local-data-summary-rows.test.ts`（新增，11 条）、`package.json`（套件登记，25 个）、`skills/ae-data-integration/references/source-inspect.md`、`skills/ae-data-integration/references/error-handling.md`、`test/local-data-skill.test.mjs`（11 条断言）。

**要解决的问题**：导出报表末尾的 `合计` 行、分组报表里每组后面的 `小计` 行，在 profile 里和普通数据行长得完全一样。上报后它是一条从未发生过的事件，金额是整组的营收；不上报也已经污染了报告——P7 的 `numeric_summary.sum` 被算成两倍，`max` 变成合计值，于是 agent 会拿合计值当"最大单笔金额"讲出来。分组小计行更危险：它往往带着一个合法的身份与时间，能干净地通过 UE 校验直接上传。

**决策一：两阶段判定。** "某数值等于该列合计"这个判据在行处理时无法计算——列合计要等流结束才知道。因此行内只做候选判定（自报标签，或"带数值且全部身份/时间列为空"），候选行连同其数值单元格一起保留，流结束后再确认。确认用的恒等式是 `|value * 2 - total| <= max(1e-6, |total| * 1e-9)`：汇总行等于该列**其余行**之和，而运行合计里已经包含了汇总行自己，所以汇总行的值恰好是合计的一半。浮点容差是必需的——`0.1+0.2+0.3` 在二进制下不等于 `0.6`,精确比较会漏掉现实中每一个 `金额` 列。

**决策二：两条误报守卫，都是实测逼出来的。** 一是该列数值个数 < 3 时跳过——两个相等的值互为"对方一半",任意一份两行同额的文件都会命中。二是值为 `0` 时跳过——零合计对每个零都成立。少了这两条，守卫前的干净文件也会报出汇总行，而一个在正常文件上会响的检测项等于教会 agent 忽略它。

**决策三：中文标签按前缀匹配，英文标签必须整格相等。** 真实的中文标签常带范围（`小计（华东）`），前缀匹配才拦得住；英文反过来——`summary of the complaint`、`totally resolved` 都以总计词开头，若按前缀匹配，每个自由文本列都会报汇总行。另加 24 字上限：以 `合计` 开头的长句是叙述，不是行标签。

**决策四：偏离原计划的唯一一处——`convert` 的 manifest 也透出该字段。** §3.5 只写了"输出 warning 并给出行号"。实施中查证：`conversion.ts` 从不读取 `profile.warnings`,而 `transform.md` 也从未让 agent 去读运行目录里的 `profile.json`——也就是说按原计划写完，这个发现到不了上传前的决策点。而这正是最需要它的时刻：小计行此时已经是一条带着可信身份与时间的合法记录，和数据无从区分。因此按 `xlsx_structure` / `unreadable_cells` 的先例，把它重复进 `manifest.output.summary_rows`；这样做的前提是该字段只含列名与行号，见下。

**安全约束与只报告原则**：命中信息只有列名与数据行序号，绝不含单元格文本（测试直接断言 `JSON.stringify(summary_rows)` 不含 `合计`），这也是它可以安全出现在 convert 路径与 manifest 里的原因。行序号用 reader 的 `rowNumber`,与 `invalid.rows.jsonl` 的 `row_number`、`--salvage-from` 读的是同一套编号，因此命中行可以被交叉查证。**不自动删行**：客户的"合计"有时确实是一条业务记录，自动删会丢数据；也确实没有任何 flag 能删掉一个数据行，所以 warning 里明写"convert 会照常把这些行写成记录、这些列报出的每个数字都算了它们",并把处置指向"从源文件删掉或重新导出后再 inspect"。严重度在 `error-handling.md` 按 `leading_title_rows` 的先例归入 High（已报告、等用户回答），并从"尚无检测项"名单里移出。

**开销**：`keyLike`（列名像身份或时间）在累加器创建时算一次并缓存，每个单元格只付一次布尔判断；行内数值数组惰性分配，只在该行确有数值时才建。候选行上限 50,超出置截断标志并在 warning 里说明——一份文件只有几行合计，更长的候选列表说明判据匹配到了别的东西。

验证记录：`npm run build` 绿；`npm run verify:tracking-tools` 全绿（25 个套件，含新增 `local data summary row tests: passed`）；`npm test` 冒烟绿；`npm run check:release` OK；`npx tsc --noEmit` 维持既有 31 条基线不变。新增测试覆盖：标准 `合计` 尾行两个信号同时命中且行序号正确、命中后 `row_count` 与列 `sum` 保持不变（"只报告"的契约本身）、分组 `小计（华东）` 前缀命中而组内小计不等于列合计故只响标签信号、干净文件完全沉默、两行同额不算合计、英文整格匹配的三种反例、无标签合计行仅凭算术被抓到、稀疏行不算合计行、浮点金额合计、convert 路径（`collectSamples: false`）报出同样的行，以及 manifest 透出并确认小计行确实转换成了 6 条有效记录。

### 7.10 P8：重复业务键检测

落地文件：`src/commands/data-integration/types.ts`（`LocalDataDuplicateKeyGroup` / `LocalDataDuplicateKeyReport` 接口 + `LocalDataProfile.duplicate_keys` + `LocalDataManifest.output.duplicate_keys`）、`src/commands/data-integration/profile.ts`（4 个常量、`ProfileLocalDataOptions.duplicateKeyFields`、`DuplicateKeyTracker`、`resolveDuplicateKeyColumns` / `createDuplicateKeyTracker` / `recordDuplicateKey` / `buildDuplicateKeyReport` / `duplicateKeyWarning`）、`src/commands/data-integration/conversion.ts`（`streamOptions.duplicateKeyFields` 从 mapping 组装 + manifest 透出一行）、`tests/local-data-duplicate-keys.test.ts`（新增，11 条）、`package.json`（套件登记，26 个）、`skills/ae-data-integration/references/source-inspect.md`、`skills/ae-data-integration/references/error-handling.md`、`test/local-data-skill.test.mjs`（11 条断言）。

**要解决的问题**：客户重导出覆盖上一次范围、或把两张表粘在一起，同一条观测就进了文件两次。上报后每条重复都是一次额外事件：该用户营收翻倍、每个漏斗把 TA 计两遍。AE 对已被 receiver 接受的事件没有撤回手段，所以这个判定只能发生在 upload 之前、交给用户。

**决策一：键列必须在看到第一行的当下冻结。** profile 是单遍流式，而 time 列要靠流结束后的 `time_parse_ratio` 才能定——键列若拖到流后再定，就什么也比对不了。解法是双路径：显式 `duplicateKeyFields`（convert 从 mapping 传）原样采用；否则按列名启发式（`ACCOUNT_NAMES` ?? `DISTINCT_NAMES` + `TIME_NAMES` + 可选 `EVENT_NAMES`）。`duplicateKeysResolved` 一次性标志保证键列只解析一次。

**决策二：≥2 列才成键。** 单列 identity 会把同一用户的第二行误报为重复（`user_append` 场景是纯噪音）；单列 time 会把同一秒的所有行误报为重复。启发式路径要求 identity + time 都能识别；显式路径要求去重后 `length > 1`。这一条是自查时发现的——初版显式路径写 `length > 0`，用户画像 mapping（只有 `account_id_field`、无 `time.field`）会退化成单列 identity。

**决策三：键列缺失的行不检查。** 否则全空键互相"重复"，会把每一条空身份行报成彼此重复、淹没真实发现。因此报告带 `checked_rows`，用户读到的比例是诚实的。

**决策四：内存结构区分"非重复"与"重复"。** 非重复键只在 `firstRow` 里占 `hash → rowNumber` 一个 number；只有真重复才升级进 `groups` 的对象。`DUPLICATE_KEY_TRACK_LIMIT = 200_000`（与既有 `GLOBAL_UNIQUE_SAMPLE_LIMIT` 同量级）兜底，超限设 `tracking_truncated` 并在报告与 warning 里如实说明"追踪在 N 个键后停止"。

**决策五：偏离原计划的必要扩展。** §3.5 写"键由用户或 mapping 指定"。convert 路径确实如此（`account_id_field ?? distinct_id_field` + `time.field` + `event_name_field`，刻意排除 `default_event_name`——全文件同值，不区分任何行）；但 inspect 阶段用户尚未确认 mapping，而重复键的价值正在 upload 之前**最早**暴露，所以 inspect 路径必须靠列名启发式，否则这个发现到不了它最有用的时刻。§3.5 的"只报告重复组数与样例键哈希"也补了行号——没有行号，哈希只能区分组，用户无法在文件里找到那两行做比对，报告就不可行动。行号用 reader 的 `rowNumber`，与 `invalid.rows.jsonl` 的 `row_number`、`--salvage-from` 读的是同一套编号。

**安全约束与只报告原则**：命中信息只有列名、行号、`count`、`sha256` 前 16 位 `key_hash`——**绝不输出原始键值**（测试直接断言 `JSON.stringify(duplicate_keys)` 与 warning 均不含 `u1`、不含时间、不含事件名）。逐字比较、不做时间归一：`2026-03-01 10:00:00` 与 `2026/03/01 10:00:00` 是两个不同的键，这是写进 warning 与文档的诚实局限；同理，源文件自带的唯一键（订单号）除非 mapping 指明为身份/时间/事件，否则不参与比较。键序列化用 `JSON.stringify(数组)` 防 `["a","b"]` 与 `["ab",""]` 碰撞。**只报告、绝不阻断**：重复行有时是真实的多条记录（一次结算 3 个商品各一行），AE 又无法撤回，所以不自动删、不加任何 flag，并刻意不加 `--duplicate-key` CLI flag 控制范围。**salvage 语义**：profile 扫全文件，`duplicate_keys` 描述源文件整体——源文件的所有有效行最终都会进 AE，所以它与本次是否 `--salvage-from` 无关，这是正确的。

**开销**：单遍流式内每行一次 `isMissing` + 一次 `JSON.stringify` + 一次 sha256；非重复键不建对象。键列名在首行解析一次后缓存。

验证记录：`npm run build` 绿；`npm run verify:tracking-tools` 全绿（26 个套件，含新增 `local data duplicate key tests: passed`）；`npm test` 冒烟绿；`npm run check:release` OK；`npx tsc --noEmit` 维持既有 31 条基线不变。新增测试覆盖：标准 identity+time+event 重复报组、行号、`extra_rows` 且报告不含任何键值；无重复文件完全沉默；同秒同用户不同事件不算重复（事件名入键）；无事件名列退化为 identity+time；无时间列完全不扫（单列不成键）；键列有空值的行不计入 `checked_rows` 且不互相重复；三份同键是一组 count=3 而非两组；`2026-03-01 10:00:00` vs `2026/03/01 10:00:00` 视为两个键；convert 路径用 mapping 字段成键并透出到 `manifest.output.duplicate_keys` 且 manifest 不含键值。

### 7.11 P9：行数守恒回执

落地文件：`src/commands/data-integration/types.ts`（`LocalDataManifest.output.source_rows`）、`src/commands/data-integration/conversion.ts`（守恒方程两侧 + manifest 写出一行）、`tests/local-data-row-balance.test.ts`（新增，5 条）、`package.json`（套件登记，27 个）、`skills/ae-data-integration/references/transform.md`、`test/local-data-skill.test.mjs`（3 条断言）。

**要解决的问题**：manifest 里有 `valid_records` 与 `invalid_records`，却没有"源行数"这个参照系。一旦某行在流与 convert 之间被丢掉或重复，两个输出侧计数自己不会喊冤，读 manifest 的人（agent 或用户）也无从发现——这正是 §2.1 写的"源行数与输出记录数对不上时无人发现"。

**决策一：只加一个字段，不加任何 warning。** 守恒方程 `source_rows === valid_records + invalid_records` 由代码结构保证——`convertRow` 对每一行恰好返回一条记录或一条 invalid，回调里每次调用恰好让一个桶 +1。所以这不是运行时检测，而是一个**让未来回归可见的参照系**：今天它恒等，某天有人改流回调、加预览开关混进输出路径、或算错 `skip_rows` 错位，这个恒等式立刻在测试与人工核对里破掉。按 §3.4"先报告、后阻断"再降半格——它连 warning 都不需要，因为守恒破裂是数据流 bug、不是源文件质量问题，manifest 里的三个数本身就是全部证据。

**决策二：salvage 模式的源侧口径是"本次重新处理的行数"。** 普通 run 的 `source_rows = rowCount`（stream 返回的数据行数，不含 header、不含 `skip_rows` 跳过的行）；salvage run 的 stream 仍流全文件，但回调只处理 salvage 集合里的行，所以 `source_rows = salvageMatched`。两者都让恒等式成立，且语义与"本次 run 实际喂给 convert 的行数"一致。

**验证结论（写回 §9）：`mixed` 模式的"一源行 ↔ 一输出记录" 1:1 假设成立。** §3.4 担心"一行可能同时产出 track 与 profile 记录"，实测推翻：`convertRow` 里 `recordType` 由 `record_type_field` 那一列的**该行值**决定（`normalizeRecordType`），一行只得到一个类型、产出一条记录；`mixed` 是"不同行各变成 track 或 profile"，不是"一行拆多条"。测试断言 `record_types` 的计数之和等于 `valid_records` 而非多于它。因此守恒方程对三种 mode（`track` / `user_set` / `mixed`）统一成立，不需要为 `mixed` 单独放宽。

**开销**：一个三目表达式（`salvageSet ? salvageMatched : rowCount`），零额外扫描。

验证记录：`npm run build` 绿；`npm run verify:tracking-tools` 全绿（27 个套件，含新增 `local data row balance tests: passed`）；`npm test` 冒烟绿；`npm run check:release` OK；`npx tsc --noEmit` 维持既有 31 条基线不变。新增测试覆盖：全有效文件守恒、valid+invalid 混合守恒、`skip_rows` 与 header 不计入源行数、salvage run 的 `source_rows` 等于重新处理的行数而非全文件行数，以及 `mixed` 模式 1:1（`record_types` 之和等于 `valid_records`）。


## 8. 验收追踪

| 项 | 状态 | 验收标准 |
| --- | --- | --- |
| 第一档（4 条文档规则） | ✅ 已交付 `ef9c2f46` | 12 条断言进 `test/local-data-skill.test.mjs`；`qa-changed` 绿 |
| P1 xlsx 日期 | ✅ 已交付（见 §7.2） | `注册日期` fixture：`inferred_type: datetime`、`time_parse_ratio: 1`、`ue_eligible: true`；1904 纪元 fixture 不偏移 |
| P2a 工作表隐藏 | ✅ 已交付（见 §7.3） | 含隐藏表的 fixture：隐藏表不出现在候选与 `--merge-sheets`，被排除表名出现在输出 |
| P3 公式无缓存值 | ✅ 已交付（见 §7.4） | fixture 命中时有计数与 warning，值按缺失处理，绝不出现原始公式对象 |
| P5 表头判定 | ✅ 已交付（见 §7.5） | 带标题行的 xlsx fixture 被识别并报告，默认行为不变；`--skip-rows N` 下拿到真表头并贯通 inspect → mapping → convert |
| P4 + P2b 预扫描 | ✅ 已交付（见 §7.6） | 合并区间与隐藏行/列被报告；填充仅在显式 flag 下发生且不越界；两个决定经 mapping 贯通到 convert |
| P7 频次与分布 | ✅ 已交付（见 §7.8） | 新增字段可选；输出遵守截断与"不打印源值"约束 |
| P6 汇总行 | ✅ 已交付（见 §7.9） | 命中行号被报告，不自动删行；convert manifest 透出且不含单元格文本 |
| P8 重复业务键 | ✅ 已交付（见 §7.10） | 报告重复组数、行号与键哈希，不输出原始键值 |
| P9 行数守恒 | ✅ 已交付（见 §7.11） | 回执出现在 manifest；`mixed` 模式 1:1 假设的结论写回 §9 |

## 9. Plan Review 修订记录

| 日期 | 修订 |
| --- | --- |
| 2026-09-02 | 初稿。基于 `feat/ae-data-integration-0902` 上核准的代码事实与两次 xlsx 实测；第一档已交付并记入 §7 |
| 2026-09-02 | §5 顺序调整：P1 提到第 1 位、P2a 退到第 2 位。原顺序把 P2a 排在前面的唯一理由是"便宜、适合热身"，但两项无依赖，严重度应当决定顺序 |
| 2026-09-02 | P1 已交付，记入 §7.2。实施中新增一项原计划没有的必要修法（日期单元格在读取边界转 naive 墙上时间字符串），否则修复自身会引入源时区偏移；同时记录 `[h]:mm:ss` 类耗时格式与 `getStyleModel` 无 `cellXfs` 两个坑 |
| 2026-09-02 | P2a 已交付，记入 §7.3。§3.2 只写了"默认排除 + 列出被排除表名"，实施中补三处：隐藏表必须仍可被 `--data-set` 显式读到（否则知情决定被报成"表不存在"）、`header_consistency` 必须同样排除隐藏表（否则一份可安全合并的工作簿被误报 `different`），以及"全表皆隐藏"这一由本次改动新造出的可达状态需要独立报错（否则空候选列表读起来像文件损坏）。`.xls` 隐藏表按"无法造 fixture 就不声称"记为已知缺口 |
| 2026-09-02 | P3 已交付，记入 §7.4。§3.3 的前提（"两条都不告警的失败路径"）被实测推翻：真正的根因是 `exceljs` `_copyModel` 的 `if (value)` 逐字段拷贝，导致缓存结果为 `0` / `""` / `false` 的公式格**既泄漏成原始对象、又丢掉了本来存在的真值**——这是原计划完全没有的第三类失败，也是全计划唯一一项"读取修复同时挽回了正在丢失的数据"。若照原计划按"无 `result` 键"判定，会把每个真实的 `0` 变成缺失值。修法改为经 `cell.model` 取值；同时确认 `t="e"` 的缓存错误会被 reader 的 `parseFloat` 变成 `NaN`，需并入 `error_value` 分类 |
| 2026-09-02 | P5 已交付，记入 §7.5。§5 只写了两条缺陷（判定不覆盖 xlsx、xlsx 首行无条件当表头），实施中发现**第三条**：分隔符文件被标题行顶掉表头时同样沉默，因为 `detectHeaderRow` 对"唯一且非数字"的一行标题判 `hasHeaders: true`。因此标题行扫描扩到 CSV/TSV（三条读取器本步都已接 `skipRows`，零额外成本），但**表头判定仍只对 xlsx 追加**，分隔符路径已由 `detectHeaderPresence` 给出并据此改变行为，再报一遍会自相矛盾。另一处偏离原计划的决定：xlsx **不自动切换、只报告**——Excel 导出的表头合法地会是数字（`2024`、`2025`），恰好触发那套比例启发式，而误判不可恢复（没有 flag 能把"已当成数据"的一行按回表头，`--headers` 设的是 `headerNames`，反而让第 1 行变成数据）。由此暴露的"缺少强制指定表头行 flag"按有意披露处理，写进 `references/source-inspect.md` 并在 `error-handling.md` 归入 High |
| 2026-09-02 | P4 + P2b 已交付，记入 §7.6。§3.2 关于"必须第二趟扫描"与"`row.hidden` 恒为 `false`"两条判断均被实测确认，无需修正。记入三处原计划没有的决定：`merged_covered_cells` 取观测值而非计算值，使报告数恰等于该次运行的填充会改动的量；隐藏列**不新增 flag**，只报告并指向既有 `exclude_columns`；`convert` 无读取 flag，故两个决定按 §7.5 `skip_rows` 先例落在 mapping 字段并在 `mapping.ts` 校验格式。实施中另修一处测试暴露的 UX 缺陷（mapping 已排除该列时 `convert` 仍建议去排除），并记录一处顺带发现、有意未修的既有缺陷（`readXlsxSharedStrings` 缺 `StringDecoder`，多字节字符被 chunk 边界切开会损坏共享字符串） |
| 2026-09-02 | 上一行记为"有意未修"的 `readXlsxSharedStrings` 缺陷经复核确认为真实缺陷，已修复并记入 §7.7。判定依据是实测而非读码：构造一份共享字符串表大到会分块的 xlsx，中文列名被 chunk 边界切开后损坏成替换字符，而损坏同时落在表头与取值上且全程不报错——列名对不上映射，坏值静静通过校验。修法是在流式解析处引入 `StringDecoder`，不改分块阈值、不改其它读取行为 |
| 2026-09-02 | P7 已交付，记入 §7.8。两处偏离原计划：一是频次表增加"最高频次 < 2 则整表不输出"这条守卫，它不是读代码想出来的，而是拿真实 fixture 跑 CLI 时发现的——小文件里 ID 列、时间戳列、JSON blob 列的 distinct 都没超预算，却会各出一张全 1 计数的表，等于把原始值整列打印出来，与"不打印源值"直接冲突；二是数值的 `count` / `sum` / `min` / `max` 在 inspect 与 convert **两条路径都累加**，只有分位数蓄水池是 inspect 独有，因为 P6 的汇总行判据要用该列合计，而合计不能是估计值 |
| 2026-09-02 | P6 已交付，记入 §7.9。§3.5 的"输出 warning 并给出行号"在实施中被扩了一处：`convert` 的 `manifest.output` 也透出 `summary_rows`。理由是查证发现 `conversion.ts` 从不读 `profile.warnings`、`transform.md` 也从未指向运行目录的 `profile.json`,按原计划写完这个发现根本到不了上传前的决策点，而分组小计行此时已是一条带合法身份与时间的记录。另记两处实测逼出来的守卫（列内数值个数 < 3、值为 0 时跳过，否则两行同额或零合计的正常文件都会误报）与一处非对称匹配（中文标签按前缀、英文标签须整格，否则 `summary of …` 类自由文本会命中） |
| 2026-09-02 | P8 已交付，记入 §7.10。两处偏离原计划：一是 §3.5 "键由用户或 mapping 指定"被扩为双路径——inspect 阶段用户尚未确认 mapping，而重复键的价值正在 upload 之前最早暴露，故 inspect 按列名启发式成键；二是"只报告重复组数与样例键哈希"补了行号，否则哈希只能区分组、用户无法在文件里定位那两行，报告就不可行动。另记两条自查发现的设计守卫（≥2 列才成键，否则 `user_append` 画像与同一秒多行都会整表误报；键列缺失的行不检查，否则空键行彼此互报重复），与一处如实披露的局限（逐字比较、不做时间归一，`2026-03-01 10:00:00` 与 `2026/03/01 10:00:00` 是两个键） |
| 2026-09-02 | P9 已交付，记入 §7.11。§3.4 的"`mixed` 模式 1:1 假设尚未验证"已实测并**推翻**：`convertRow` 一源行恰好产出一条记录或一条 invalid，`recordType` 由 `record_type_field` 的该行值决定、一行只得到一个类型，`mixed` 是"不同行各变成 track 或 profile"而非"一行拆多条"——守恒方程对三种 mode 统一成立，无需为 `mixed` 放宽。据此按 §3.4"先报告、后阻断"再降半格：P9 连 warning 都不加，只落一个 `manifest.output.source_rows` 字段作未来回归的参照系（守恒破裂是数据流 bug、非源文件质量问题，三个数本身就是全部证据）。salvage 模式的源侧口径按"本次重新处理的行数"（`salvageMatched`）而非全文件行数 |
