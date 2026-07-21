# ae-tracking v0.3.3 + v0.3.4 → ae-cli 合入方案（临时技术文档）

> **状态**：待确认
> **基准**：ae-tracking `e84e1f9`（v0.3.2 发布版）→ `a88cec8`（v0.3.4 HEAD）
> **约束**：埋点方案上传功能以 ae-cli 为准，不合入 ae-tracking 的 plan.ts upload 变更

---

## 目录

1. [已确认已在 ae-cli（无需合入）](#1-已确认已在-ae-cli)
2. [合入清单总览](#2-合入清单总览)
3. [详细改动：新增文件](#3-详细改动新增文件)
4. [详细改动：XLSX 模块](#4-详细改动xlsx-模块)
5. [详细改动：Plan Fix 模块](#5-详细改动plan-fix-模块)
6. [详细改动：i18n 资源](#6-详细改动i18n-资源)
7. [详细改动：CLI 命令](#7-详细改动cli-命令)
8. [详细改动：Skills（需仔细对比）](#8-详细改动skills)
9. [详细改动：测试文件](#9-详细改动测试文件)
10. [详细改动：Wiki & 模板](#10-详细改动wiki--模板)
11. [不合入的内容及原因](#11-不合入的内容及原因)
12. [实施顺序建议](#12-实施顺序建议)

---

## 1. 已确认已在 ae-cli（无需合入）

以下 v0.3.3 变更在初始合入时已经被带入了 ae-cli：

| 变更点 | ae-tracking 文件 | ae-cli 文件 | 状态 |
|--------|-----------------|-------------|------|
| PropType 包含 `'object'` | `src/plan/types.ts` | `src/tracking/plan/types.ts` | ✅ 已有 |
| fixUnknownPropRefs | `src/plan/fix.ts` | `src/tracking/plan/fix.ts` | ✅ 已有 |
| fixDisplayNameDuplicates | `src/plan/fix.ts` | `src/tracking/plan/fix.ts` | ✅ 已有 |
| 复合类型 validateDraft 扩展 | `src/xlsx/write.ts` | `src/tracking/xlsx/write.ts` | ✅ 已有（`object` + `array_row`） |
| fixArrayRowConsistency 扩展 | `src/plan/fix.ts` | `src/tracking/plan/fix.ts` | ✅ 已有 |
| VALID_PROP_TYPES 含 object | `src/xlsx/read.ts` / `write.ts` | ae-cli 都有 | ✅ 已有 |
| Cursor 兼容 | `src/cli/home.ts`, `init.ts` | `src/commands/tracking/` | ✅ 已有 |
| plan.ts draft 重试循环 | `src/cli/plan.ts` | `src/commands/tracking/plan.ts` | ✅ 已有 |
| plan.ts upload 语言不匹配提示 | `src/cli/plan.ts` | ae-cli 已有 | ✅ 已有 |
| Wiki 文档重构为英文版 | `wiki/te-docs/` | `wiki/te-docs/` | ✅ 已有 |
| wiki/crawler.ts v6.0 URL | `src/wiki/crawler.ts` | ae-cli 已有 | ✅ 已有 |
| wiki/index-writer.ts 更新 | `src/wiki/index-writer.ts` | ae-cli 已有 | ✅ 已有 |
| ae-locale.ts | `src/i18n/ae-locale.ts` | `src/tracking/i18n/ae-locale.ts` | ✅ 已有（内容一致） |
| plan/autotrack.ts | `src/plan/autotrack.ts` | `src/tracking/plan/autotrack.ts` | ✅ 已有（内容一致） |
| plan/draft.ts | `src/plan/draft.ts` | `src/tracking/plan/draft.ts` | ✅ 已有（内容一致） |
| i18n/locale.ts | `src/i18n/locale.ts` | `src/tracking/i18n/locale.ts` | ✅ 已有（内容一致） |
| data-integration-helper 英文翻译 | `skills/` | `skills/ae-data-integration-helper/` | ✅ 已有（内容一致，仅命名差异） |
| v0.3.3 reference 文件更新 | `skills/*/references/` | ae-cli 部分已有 | ⚠️ 需逐一核对 |

---

## 2. 合入清单总览

### 新增文件（3 个）
| # | ae-tracking 源文件 | ae-cli 目标路径 | 版本 |
|---|-------------------|-----------------|------|
| 1 | `src/xlsx/tag-priority.ts` (76行) | `src/tracking/xlsx/tag-priority.ts` | v0.3.4 |
| 2 | `tests/xlsx.tag-priority.test.ts` (170行) | `test/tracking-tag-priority.test.mjs` | v0.3.4 |
| 3 | — | — | — |

### 源文件修改（8 个）
| # | 文件 | 改动量 | 版本 |
|---|------|--------|------|
| 4 | `src/tracking/xlsx/write.ts` | +~100行 | v0.3.4 |
| 5 | `src/tracking/xlsx/read.ts` | +~35行 | v0.3.4 |
| 6 | `src/tracking/plan/fix.ts` | +~60行 | v0.3.4 |
| 7 | `src/tracking/i18n/resources/xlsx/types.ts` | +45/- | v0.3.4 |
| 8 | `src/tracking/i18n/resources/cli/{en,ja,ko,zh}.json` | +1 key each | v0.3.3 |
| 9 | `src/commands/tracking/code.ts` | +5行 | v0.3.3 |

### Skills（多个文件）
| # | 类别 | 文件数 | 处理方式 |
|---|------|--------|----------|
| 10 | generate-tracking-plan SKILL.md | 1 | **手动合并**（ae-cli 有自己的 i18n 策略） |
| 11 | generate-tracking-code SKILL.md | 1 | **手动合并**（ae-cli 行数比 ae-tracking 还多） |
| 12 | data-integration-helper SKILL.md | 1 | 改动极小，仅路径替换 |
| 13 | generate-tracking-plan references | 4 | 可复制（内容独立） |
| 14 | generate-tracking-code references | 10 | 可复制（内容独立） |
| 15 | data-integration-helper references | ~15 | 可复制（内容独立） |

### 测试文件（1 修改）
| # | 文件 | 说明 |
|---|------|------|
| 16 | `test/tracking-plan-fix.test.mjs` | v0.3.4 小改动 |

### Wiki & 模板
| # | 类别 | 说明 |
|---|------|------|
| 17 | `wiki/te-docs/synthesis/` | 验证合成文档同步 |
| 18 | `tracking-plan-template/` | 更新模板 .md 和 .xlsx |

---

## 3. 详细改动：新增文件

### 3.1 `src/tracking/xlsx/tag-priority.ts`（新建）

ae-tracking: `src/xlsx/tag-priority.ts` → ae-cli: `src/tracking/xlsx/tag-priority.ts`

**内容**：自包含模块，定义事件标签优先级排序。

- `TAG_PRIORITY` 映射：英文 tag 名 → 优先级编号（1~80），优先级越低越靠前
  - Basic(1) → Battle(10)/Stage(11)/Dungeon(12)/Gacha(13) → Growth(20)/Resource(21) → Ads(30)/Payment(31) → Shop(40)/Quest(41)... 等
- `CANONICAL_TAG` 反向映射：zh/ja/ko 本地化 tag 名 → 英文 canonical 名
  - 涵盖中文（战斗、关卡、支付、商城、签到...）、日文（バトル、広告...）、韩文
- `getTagPriority(tag: string)` 导出函数：先查 canonical 再查 priority，未知 tag 返回 80

**无 ae-cli 适配**：import `'../plan/types.js'` 路径无需修改。

**实施**：复制 ae-tracking 文件内容到 ae-cli 目标路径。

---

### 3.2 `test/tracking-tag-priority.test.mjs`（新建）

ae-tracking: `tests/xlsx.tag-priority.test.ts` → ae-cli: `test/tracking-tag-priority.test.mjs`

**需要适配**：
- import 路径改为：`../../src/tracking/xlsx/tag-priority.js`（ae-cli 用 `.mjs` + 编译后 `.js`）
- 扩展名 `.ts` → `.mjs`
- 参考现有 `test/tracking-client.test.mjs` 的写法

---

## 4. 详细改动：XLSX 模块

### 4.1 `src/tracking/xlsx/write.ts`（v0.3.4, +~100行）

**改动 A：引入 tag-priority 并按标签分组排序事件**

```typescript
// 新增 import
import type { Event } from '../plan/types.js';  // 原来只 import Draft 等
import { getTagPriority } from './tag-priority.js';

// 替换原有的 for (const evt of d.events) 循环：
// 新增分组逻辑（在构建 propMap 之后）：
const autotrackEvents: Event[] = d.events.filter(e => e.source === 'autotrack');
const businessEvents: Event[] = d.events.filter(e => e.source !== 'autotrack');
const tagGroups = new Map<string, Event[]>();
const tagOrder: string[] = [];
for (const evt of businessEvents) {
  const tag = evt.event_tag || '';
  if (!tagGroups.has(tag)) { tagGroups.set(tag, []); tagOrder.push(tag); }
  tagGroups.get(tag)!.push(evt);
}
tagOrder.sort((a, b) => getTagPriority(a) - getTagPriority(b));
const sorted: Event[] = [...autotrackEvents];
for (const tag of tagOrder) {
  for (const evt of tagGroups.get(tag)!) { sorted.push(evt); }
}
// 然后用 sorted 替代 d.events
```

**改动 B：添加 autoFitSheet 辅助函数**

```typescript
// 新增 isWideChar(), displayWidth(), autoFitSheet() 三个函数
// 调用：在事件 sheet、公共属性 sheet、用户属性 sheet、用户ID sheet 最后各加一行
autoFitSheet(eventSheet, 50);
autoFitSheet(commonSheet, 50);
autoFitSheet(userSheet, 50);
autoFitSheet(userIdSheet, 50);
```

**改动 C：合并单元格加垂直居中**

```typescript
// 在现有的 mergeCells 循环后，新增：
for (let r = startRow; r <= endRow; r++) {
  const row = eventSheet.getRow(r);
  for (const col of ['A', 'B', 'C', 'D', 'E']) {
    const cell = row.getCell(col);
    cell.alignment = { ...cell.alignment, vertical: 'middle' };
  }
}
```

**改动 D：validateDraft 已有扩展（已确认 ae-cli 已有）**

ae-cli 的 write.ts 已包含 v0.3.3 的 `object` 复合类型支持和 `event_properties` 备用读取逻辑（`d.event_properties ?? (d as any).common_properties ?? []`），这些不需要再改。

---

### 4.2 `src/tracking/xlsx/read.ts`（v0.3.4, +~35行）

**新增 fillDownMergedCells 函数 + 调用**

```typescript
// 新增函数：
function fillDownMergedCells(
  rows: Row[],
  merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }>,
): void {
  for (const merge of merges) {
    const { s, e } = merge;
    const topLeftValue = rows[s.r]?.[s.c];
    if (topLeftValue === null || topLeftValue === undefined) continue;
    for (let r = s.r; r <= e.r; r++) {
      if (!rows[r]) continue;
      for (let c = s.c; c <= e.c; c++) {
        if (r === s.r && c === s.c) continue;
        if (rows[r][c] === null || rows[r][c] === undefined) {
          rows[r][c] = topLeftValue;
        }
      }
    }
  }
}

// 在 readTemplateXlsx 中，XLSX.utils.sheet_to_json 之后、解析每 sheet 之前加：
const merges = (ws as Record<string, unknown>)['!merges'] as
  | Array<{ s: { r: number; c: number }; e: { r: number; c: number } }>
  | undefined;
if (merges && merges.length > 0) {
  fillDownMergedCells(rows, merges);
}
```

**为什么需要**：SheetJS（`xlsx` 包）对合并单元格的非左上角返回 `null`，导致读入数据缺失。此函数将合并区域的左上角值向下向右填充。

---

## 5. 详细改动：Plan Fix 模块

### 5.1 `src/tracking/plan/fix.ts`（v0.3.4, +~60行）

相对于 ae-cli 现有版本，需要新增两个函数：

#### 改动 A：fixCrossPoolDisplayNameInconsistency

```typescript
// 新增函数（在 fixDisplayNameDuplicates 之后）：
function fixCrossPoolDisplayNameInconsistency(draft: Draft): string[] {
  const fixed: string[] = [];
  const commonProps = draft.common_event_properties ?? [];
  const eventProps = draft.event_properties ?? [];

  for (const cp of commonProps) {
    if (!cp.display_name) continue;
    const ep = eventProps.find(p => p.name === cp.name);
    if (!ep) continue;
    if (ep.display_name && ep.display_name !== cp.display_name) {
      const oldName = ep.display_name;
      ep.display_name = cp.display_name;
      fixed.push(
        `Aligned display_name for "${cp.name}" in event_properties: "${oldName}" → "${cp.display_name}" (from common_event_properties)`
      );
    }
  }
  return fixed;
}
```

**作用**：同一个属性名在 event_properties 和 common_event_properties 中同时出现但 display_name 不同时，以 common_event_properties 为准（全局定义）。

#### 改动 B：fixEventPlatforms

```typescript
// 新增函数：
function fixEventPlatforms(draft: Draft): string[] {
  const fixed: string[] = [];
  const mode = draft.meta.sdk_integration_mode;
  if (mode !== 'client_only' && mode !== 'server_only') return fixed;
  const targetPlatform = mode === 'client_only' ? 'client' : 'server';
  let count = 0;
  for (const event of draft.events) {
    if (!event.platform) {
      event.platform = targetPlatform;
      count++;
    }
  }
  if (count > 0) {
    fixed.push(`Auto-filled platform="${targetPlatform}" for ${count} event(s) based on sdk_integration_mode="${mode}"`);
  }
  return fixed;
}
```

#### 改动 C：更新 validateAndFix 调用序列

ae-cli 当前的 validateAndFix 步骤：
```
1. fixUnknownPropRefs
2. fixDisplayNameDuplicates
3. fixArrayRowConsistency (复合类型)
4. fixPropertyNames
5. fixEventNameDuplicates
```

需要在步骤 2 和 3 之间插入：
```
2.5. fixCrossPoolDisplayNameInconsistency
2.6. fixEventPlatforms
```

#### 注意事项

ae-cli 现有 fix.ts 的 `fixArrayRowConsistency` 已被扩展为同时处理 `array_row` 和 `object`，使用 `compositeChildren` 替代 `arrayRowChildren`。此改动已在 ae-cli 中，不要回退。

---

## 6. 详细改动：i18n 资源

### 6.1 `src/tracking/i18n/resources/xlsx/types.ts`

当前 ae-cli 版本 vs ae-tracking v0.3.4 版本差异：

| 字段 | ae-cli 当前 | ae-tracking v0.3.4 | 说明 |
|------|-----------|-------------------|------|
| `string.en` | `string` | `String` | 首字母大写 |
| `number.en` | `number` | `Number` | 同上 |
| `bool.en` | `boolean` | `Boolean` | 同上 |
| `datetime.en` | `datetime` | `Date` | 改名 |
| `object.en` | ❓（需确认） | `Row` | 新增行 |
| `array_row.en` | `object[]` | `Array Row` | 改名 |
| `array_string.en` | `string[]` | `List` | 改名 |
| `string.ko` | `string` | `String` | 与 en 对齐 |
| `number.ko` | `number` | `Number` | 同上 |
| `bool.ko` | `boolean` | `Boolean` | 同上 |
| `datetime.ko` | `time` | `Date` | Bug 修复 |
| `object.ko` | `object` | `Row` | 改名 |
| `array_row.ko` | `object_array` | `Array Row` | 改名 |
| `array_string.ko` | `string_array` | `List` | 改名 |
| `string.ja` | `ストリング` | `ストリング` | 不变 |
| `object.ja` | `オブジェクト` | `オブジェクト` | 已有 |
| `array_row.ja` | `オブジェクト配列` | `オブジェクトグループ` | 改名 |
| `array_string.ja` | `配列` | `リスト` | 改名 |
| ALIASES | 部分旧值 | 新增大量兼容别名 | 兼容老 xlsx |
| `array_string.ja` | — | `リスト` | 需要确认 ae-cli |

**新增的 ALIASES（reader 兼容）**：
- en: `'string'→'string'`, `'number'→'number'`, `'boolean'→'bool'`, `'datetime'→'datetime'`, `'object'→'object'`, `'object[]'→'array_row'`, `'string[]'→'array_string'`
- ko: `'time'→'datetime'`, `'object_array'→'array_row'`, `'string_array'→'array_string'`
- ja: `'オブジェクト配列'→'array_row'`, `'配列'→'array_string'`

**实施**：复制 ae-tracking v0.3.4 整个文件内容到 ae-cli。先确认 ae-cli 当前 `object` 的 ja 显示名是否有值。

---

### 6.2 CLI i18n JSON（en/ja/ko/zh.json）

每个文件新增一个 key + 一个 plan 相关 key（但 plan 相关 key 不合入，因为以 ae-cli 为准）：

**要添加的 key**:
```json
"code": {
  "xlsx_import_empty_warning": "..."
}
```

| 语言 | 值 |
|------|-----|
| en | `"[import-xlsx] WARNING: No events imported from {path}. The file may not be an AE tracking plan xlsx (missing #-prefixed sheets like #event data)"` |
| zh | `"[import-xlsx] ⚠️ 警告：未从 {path} 导入到任何事件。该文件可能不是 AE 埋点方案 xlsx（缺少 #事件数据 等带 # 前缀的 sheet）"` |
| ja | `"[import-xlsx] ⚠️ 警告：{path} からイベントがインポートされませんでした。このファイルはAEトラッキングプランxlsxではない可能性があります（#イベントデータ などの # プレフィックスシートがありません）"` |
| ko | `"[import-xlsx] ⚠️ 경고: {path}에서 이벤트를 가져오지 못했습니다. 이 파일은 AE 트래킹 플랜 xlsx가 아닐 수 있습니다 (#이벤트 데이터 등 # 접두사 시트가 없습니다)"` |

同时附带添加几个 v0.3.3 也有的 key（已在 ae-cli 的 plan 相关代码中引用）：
- `plan.language_mismatch_hint` (4 语言)
- `plan.ae_lang_mismatch`, `plan.ae_lang_switch_hint`, `plan.ae_lang_switched`, `plan.ae_lang_manual_refresh` (4 语言)
- `fix.unknown_prop_ref` (4 语言) — **⚠️ 这个 fix.ts 在用，必须加**

**⚠️ 注意**：ae-cli 的 ja/ko/zh JSON 有额外的 `error.*` key（`output_path_is_directory`, `input_path_is_directory`, `input_path_not_found`），合并时不能覆盖。

---

## 7. 详细改动：CLI 命令

### 7.1 `src/commands/tracking/code.ts`（v0.3.3, +5行）

在 `readTemplateXlsx` 或 `readTemplateMd` 之后、推断 mode 之前添加：

```typescript
// Warn if xlsx import produced no data (likely not an AE-format file)
if (!opts.template.endsWith('.md') && draft.events.length === 0) {
  process.stderr.write(t('code.xlsx_import_empty_warning', { path: opts.template }) + '\n');
}
```

注意 ae-cli 的 code.ts 结构可能和 ae-tracking 不同，需要找到读入 draft 后的合适位置。

---

## 8. 详细改动：Skills

**⚠️ 这部分最复杂，不能直接复制，必须手动对比合并。**

### 8.1 `skills/ae-generate-tracking-plan/SKILL.md`

| 指标 | ae-tracking v0.3.4 | ae-cli 当前 | 差异 |
|------|-------------------|-------------|------|
| 行数 | 1233 | 1189 | -44行 |
| 语言 | 英文 | 部分中文？ | 需确认 |

**ae-cli 独有的内容**（不能丢）：
- 第12行的 i18n 策略声明：`"Template localization is CLI-owned. Do NOT manually translate..."` — ae-tracking 用的是"手动翻译"方式，ae-cli 用的是 CLI pipeline 方式，**必须保留 ae-cli 版本**
- ae-cli 命令调用方式不同：`ae-cli tracking plan draft` 而不是 `ae-tracking plan draft`
- `.ae-cli/` 路径替代 `.ae-tracking/`

**ae-tracking v0.3.4 新增的内容**（需要合并）：
- "Modify existing tracking plan" 功能（Phase 0 新增 `source_type: "existing_plan"`）
- 多源合并优先级规则：`existing_plan → template → codebase → prd → chat → autotrack`
- event_tag 排序规则优化

**建议合并策略**：
1. 以 ae-cli 当前版本为基准
2. 从 ae-tracking v0.3.4 diff 中提取 "Modify existing plan" 相关段落
3. 将 ae-tracking 的命令引用替换为 ae-cli 格式
4. 保留 ae-cli 的 i18n pipeline 声明和其他 ae-cli 特有内容

### 8.2 `skills/ae-generate-tracking-code/SKILL.md`

| 指标 | ae-tracking v0.3.4 | ae-cli 当前 | 差异 |
|------|-------------------|-------------|------|
| 行数 | 634 | 681 | +47行（ae-cli 更多） |

ae-cli 比 ae-tracking **多** 47 行，说明 ae-cli 有自己的额外内容。

**需要从 ae-tracking v0.3.3/v0.3.4 合并的**：
- v0.3.3：英文翻译优化
- v0.3.4：小幅更新（+5行）

**不能丢的 ae-cli 特有内容**：
- ae-cli 命令格式、路径引用
- 额外添加的功能说明

**建议合并策略**：
1. diff ae-cli 当前版本 vs ae-tracking v0.3.4，找出 ae-cli 独有的行
2. 对比 ae-tracking v0.3.2 vs v0.3.4 的增量
3. 手工将增量合并到 ae-cli 版本中

### 8.3 `skills/ae-data-integration-helper/SKILL.md`

| 指标 | ae-tracking v0.3.4 | ae-cli 当前 | 差异 |
|------|-------------------|-------------|------|
| 行数 | 242 | 242 | 相同 |

几乎完全一致，仅需替换几处引用：
- `data-integration-helper` → `ae-data-integration-helper`
- `generate-tracking-plan` → `ae-generate-tracking-plan`
- `~/.ae-tracking/wiki/` → `~/.ae-cli/wiki/`

### 8.4 Reference 文件

**generate-tracking-plan/references/**：

| 文件 | ae-tracking 行数 | ae-cli 行数 | 处理 |
|------|-----------------|-------------|------|
| autotrack-events.md | 相同 | 相同 | 直接复制 |
| business-dimension-mapping.md | 489 | 424 | 需复制（ae-tracking 新增 event_tag 多语言对照表等内容） |
| te-api.md | 100 | 131 | ae-cli 更多，需对比 |
| xlsx-schema.md | 154 | 152 | 接近，需对比（v0.3.4 新增列） |

**generate-tracking-code/references/**（10个文件）：
v0.3.3 全部做了英文翻译更新。大部分是内容变更，不涉及 ae-cli 命名。**可直接复制覆盖**。

**data-integration-helper/references/**（~15个文件）：
v0.3.3 英文翻译更新。**可直接复制覆盖**。

---

## 9. 详细改动：测试文件

### 9.1 `test/tracking-plan-fix.test.mjs`（v0.3.4 小改动）

需要检查 v0.3.4 对这个文件的改动。根据 diff stat，只有 +6/- 行的小变化。

### 9.2 新增测试已在 3.2 中说明

---

## 10. 详细改动：Wiki & 模板

### 10.1 Wiki 合成文档

虽然 wiki 主体在 v0.3.3 已同步，但需要确认 v0.3.4 是否有更新。检查以下文件是否与 ae-tracking HEAD 一致：
- `wiki/te-docs/synthesis/batch-ingest-comparison.md`
- `wiki/te-docs/synthesis/js-sdk-cheatsheet.md`
- `wiki/te-docs/synthesis/restful-api-reference.md`
- `wiki/te-docs/synthesis/sdk-selection.md`
- `wiki/te-docs/synthesis/server-sdk-overview.md`

### 10.2 追踪方案模板

`tracking-plan-template/` 下的 `.md` 和 `.xlsx` 文件在 v0.3.3 中有更新。直接复制即可。

---

## 11. 不合入的内容及原因

| 内容 | ae-tracking 文件 | 不合入原因 |
|------|-----------------|-----------|
| upload `--switch-lang` | `src/cli/plan.ts` | **以 ae-cli 为准** |
| `getAEConfig()` / `setAELang()` | `src/client.ts` | 仅 upload 语言检测用 |
| `readUmilocal` / `writeUmilocale` | `src/cli/plan.ts` | 浏览器 localStorage 操作，依赖 ae-tracking auth 体系 |
| `lang.ts` set/reset 持久化 | `src/cli/lang.ts` | ae-cli 使用更简洁的 `export AE_LANG` 方式 |
| `home.ts` / `init.ts` / `debug.ts` 额外更新 | `src/cli/*.ts` | 已在 ae-cli 中 |
| `auth.ts` token 管理更新 | `src/auth.ts` | ae-cli 使用 `cli-token.ts` 机制 |
| `dist/` 全部文件 | `dist/` | ae-cli 自己构建 |
| `scripts/` 新增的工作流脚本 | `scripts/` | ae-cli 有自己的构建体系 |
| `package.json` | `package.json` | ae-cli 自己的版本管理 |
| `.claude/settings.local.json` | `.claude/` | ae-cli 自己的配置 |

---

## 12. 实施顺序建议

```
Phase 1: 基础层（无依赖、无行为变更）
├── 新建 src/tracking/xlsx/tag-priority.ts
├── 更新 src/tracking/i18n/resources/xlsx/types.ts
└── 更新 i18n JSON（4个文件，加 key）

Phase 2: XLSX 改进
├── read.ts: 添加 fillDownMergedCells
├── write.ts: 添加 autoFitSheet + tag sorting + 垂直居中
└── code.ts: 添加 xlsx_import_empty_warning

Phase 3: Fix 逻辑
└── fix.ts: 新增 fixCrossPoolDisplayNameInconsistency + fixEventPlatforms

Phase 4: Skills（手动对比合并）
├── ae-generate-tracking-plan/SKILL.md（v0.3.3 英文重写 + v0.3.4 modify plan）
├── ae-generate-tracking-code/SKILL.md
├── ae-data-integration-helper/SKILL.md（基本一致）
├── references/ 各文件
└── 全局替换：ae-tracking → ae-cli, .ae-tracking → .ae-cli

Phase 5: 测试
├── test/tracking-tag-priority.test.mjs（新建）
└── test/tracking-plan-fix.test.mjs（更新）

Phase 6: Wiki & 模板
├── 检查 wiki/te-docs/synthesis/ 同步
└── 更新 tracking-plan-template/ 文件

Phase 7: 验证
├── npm run build
├── npm test
└── npm run verify:tracking-tools
```
