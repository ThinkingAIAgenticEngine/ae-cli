# ae-data-integration parquet 支持 — 实施计划（work-in-progress）

> 状态：三项待决策已定（§6.4/6.5/6.6，2026-10-23），开始编码。本文件是唯一事实来源，随讨论持续更新；已移出 `.scratch/` 成为正式设计文档。
> 分支：`feat/ae-data-integration-1022`（基于 `release/6.0` @ `5dfe6557`）
> 关联记忆：项目记忆 `ae-data-integration-parquet-plan`；跨项目记忆 `mytona-ae-integration`（data-import-solution-design 目录）

## 1. 目标

让 `ae-cli data-integration` 的 `inspect / convert / plan / handoff / reuse` 管道原生支持 **parquet 文件输入**，使 Mytona（Cooking Diary）客户侧的 Agent 能直接用每日导出的 parquet 产出 AE 格式 JSONL（**不上报**），交给 LogBus2 消费。

**非目标（明确不做）**：
- 不在 skill / CLI 里集成 LogBus2 本身；"sink: logbus" 只等于"落盘 JSONL、不上报"——`convert` 已落盘 `valid.ue.jsonl`，handoff `bin/run.sh` 已 never uploads。
- 不做 parquet 写入；不碰 DataX/数仓路径。

## 2. 背景（来自会话 e4c22bab-4ff1-41e2-9674-d638933418fe，已落盘）

- 客户 Mytona（Cooking Diary 游戏数据）：Iceberg 存 AWS S3、Trino 查询；样例 parquet，5 事件表 `login / purchase / episodewindow / item / level`（已下载前 3 个）。
- 仅"部分样例" ~1610 万行（login 603 万 / purchase 993 万 / episodewindow 14.6 万）；回补 + 增量统一走 LogBus2，`sync_json` 只做映射冒烟。
- 关键字段口径：`time_`=业务事件时间（`#time` 应取它）、`timestamp`=处理时间、`local_timestamp` 不可靠（有未来值）、分区 `year_/month_` 与事件时间不一致。
- 已定方向：**扩展 ae-data-integration（引擎在 ae-cli）**，加 parquet 原生输入 + 落盘不上报模式；客户有自有 Agent 可装 ae-cli；交付 handoff 包；映射由同事提供。
- 待客户确认：user_id 口径（account_id vs distinct_id）、时区是否 UTC、回补范围、login 属性是否双写 user_set、login 一行粒度（~43% 行共享 `(user_id, time_)`）。

## 3. 现状架构（关键接点，file:line）

| 接点 | 位置 | 说明 |
|---|---|---|
| 格式枚举 | `src/commands/data-integration/types.ts:1` | `LocalDataFormat = 'csv'\|'tsv'\|'json'\|'jsonl'\|'xls'\|'xlsx'` |
| 扩展名识别 | `input.ts:313 resolveFormat` | 未知扩展名 → `txt` → 内容嗅探 |
| 廉价 meta | `input.ts:68 resolveLocalDataInputMeta` | xls/xlsx 跳过 encoding 探测（`input.ts:92`） |
| 数据集发现 | `input.ts:485 discoverDataSets` | csv/jsonl 单数据集 `$` |
| 流分发 | `input.ts:285 streamLocalDataRows` | switch 到 streamDelimited / streamJsonLines / streamJson / streamXlsx / streamXls |
| 类型推断 | `profile.ts:445 inferValueType` | 已处理 `Date`→datetime、number、boolean、string——parquet 直接 emit 类型化 JS 值即可，**无需改推断** |
| 时间归一 | `conversion.ts:681 normalizeTime` | 已处理 `Date`（绝对时刻）/ epoch / naive 字符串（走 source_timezone） |
| 吞吐估算 | `estimate.ts:16` | `Record<Exclude<LocalDataFormat,'xls'>, number>`，**加格式必须加条目，否则编译错** |
| mapping 校验 | `mapping.ts:62` + `:13/:16/:19` | `source.format` 白名单 + FLATTEN/SKIP_ROWS/XLSX_STRUCTURE 三白名单 |
| 打包 | `tsup.config.ts` + `package.json` | tsup 默认全 bundle；WASM 有 `jq-wasm` 先例；exceljs/xlsx 在 devDeps 被打进 dist |

## 4. 改动清单

### A. 格式接线（机械，低风险）
1. `types.ts:1` — `LocalDataFormat` 加 `'parquet'`。
2. `input.ts:313` — `.parquet` / `.pq` → `'parquet'`。
3. `input.ts:92` — parquet 二进制，跳过 encoding 探测。
4. `input.ts:485` — parquet 单数据集 `{ id:'$', kind:'file', label, selector:'$' }`。
5. `input.ts:285` — switch 加 `case 'parquet'`。
6. `estimate.ts:16` — THROUGHPUT 加 parquet 条目（不加班编译错）。
7. `mapping.ts:62` — `source.format` 合法值加 `'parquet'`。

### B. reader 本体（核心，最高风险）
新写 `streamParquet(filePath, onRow, options)`，建议独立 `parquet.ts`（不撑大 input.ts）：
1. 读 schema（列名 + 逻辑类型）→ 当 header（parquet 无表头行，schema 即列名）。
2. 按 row group 流式，逐行 emit `LocalDataRow`（类型化 JS 值）。
3. 类型映射：INT32/INT64→number（INT64/UINT64 实际**恒转 string**，见 §9.4.2 决策）、DOUBLE/FLOAT→number、BOOLEAN→boolean、BYTE_ARRAY(UTF8)→string、TIMESTAMP→见 C、**DATE(date32/date64)→墙钟日期字符串 `YYYY-MM-DD`（复查新增，原清单漏了 DATE，date32 原样漏成 epoch 数字）**、DECIMAL→string、LIST/STRUCT/MAP→object/array（复用 flatten）。
4. int64 精度：INT64 超 2^53 → BigInt→string 兜底（ID 类列）。
5. 值提取：parquet-wasm 的 wasm `Table` 不直接给 JS 值，走官方路径 `tableFromIPC(table.intoIPCStream())` → apache-arrow Table（apache-arrow 作为 companion 依赖加进 `dependencies`）。

### C. 时间语义（沿用 `excelDateToWallClock` 原则，input.ts:1313）
- `TIMESTAMP(isAdjustedToUTC=true)` → UTC epoch → emit `Date`（绝对时刻，`normalizeTime` 会按 source_timezone 格式化）。
- `TIMESTAMP(isAdjustedToUTC=false)` → 本地墙钟 → emit naive wall-clock 字符串（让 source_timezone 生效）。
- **INT96**（旧 Spark/Impala 遗留，Mytona 之前正是 Spark+Impala）→ Julian day + nanos，无时区 → emit naive 字符串。

### D. 文档与 skill 同步（CLAUDE.md 硬约束）
- `skills/ae-data-integration/SKILL.md` description + trigger words 加 parquet。
- `references/source-inspect.md` 可接受格式列表。
- `references/ue-mapping.md:30` `source.format is one of ...` 加 `parquet`。
- `mapping.ts:13 FLATTEN_SUPPORTED_FORMATS`：支持嵌套 flatten 则加，否则 Phase 1 降级。
- **sink/落盘说明（2026-10-23 已决策：零改动，文档说明）**：在 `SKILL.md` sink 说明与 `references/handoff.md` 写清「LogBus2/文件模式 = 跑 `convert`（`--output-dir` 指向 LogBus2 监听目录）或 `bin/run.sh`、**绝不跑 `bin/upload.sh`**」；`sink.type` 仍只有 `restful_sync_json`，`logbus` 保持预留字符串不实现（见 §6.7）。

### E. 依赖 + 测试
- 选库加进 `package.json`。
- parquet fixture + `local-data-parquet.test.ts`（挂进 `verify:tracking-tools`）。

### F. 逐文件清单（2026-10-23 定稿，开工前最后确认）

**新增（3 类）**

| 文件 | 内容 |
|---|---|
| `src/commands/data-integration/parquet.ts` | `streamParquet` reader：schema→header、行组流式、类型映射、int64→string、DECIMAL scale、时间语义（C 点）。导入 parquet-wasm `readParquet`/`readMetadata` + apache-arrow `tableFromIPC` |
| `tests/local-data-parquet.test.ts` | parquet reader / profile / convert 测试，挂进 `verify:tracking-tools` |
| `tests/fixtures/local-data/34_*.parquet` | check-in 二进制 fixture，**合成数据**（按客户文件 schema/列类型/编码形态生成，无客户 PII）；覆盖 basic + INT96 + DECIMAL + 嵌套 + tz + date32/uint64/map（39） |

**修改（9 个）**

| 文件 | 改动点 |
|---|---|
| `src/commands/data-integration/types.ts` | `:1` `LocalDataFormat` 加 `'parquet'` |
| `src/commands/data-integration/input.ts` | `:313` resolveFormat 认 `.parquet`/`.pq`；`:92` 跳过 encoding 探测；`:485` discoverDataSets 单数据集 `$`；`:285` switch 加 `case 'parquet'` → `streamParquet`；顶部 import |
| `src/commands/data-integration/estimate.ts` | `:16` THROUGHPUT 加 parquet 条目 |
| `src/commands/data-integration/mapping.ts` | `:62` `source.format` 白名单加 `'parquet'`；`:13` FLATTEN 白名单**不改**（§6.4 已定：嵌套降级） |
| `package.json` | `dependencies` 加 `parquet-wasm` + `apache-arrow`；`:74` verify 链加 `tsx tests/local-data-parquet.test.ts` |
| `skills/ae-data-integration/SKILL.md` | frontmatter description + trigger words 加 parquet；sink 落盘（LogBus2/文件模式）说明 |
| `skills/ae-data-integration/references/source-inspect.md` | 可接受格式列表加 parquet |
| `skills/ae-data-integration/references/ue-mapping.md` | `:30` `source.format is one of ...` 加 `parquet` |
| `skills/ae-data-integration/references/handoff.md`（及/或 sink-upload.md） | 落盘模式一句话：`bin/run.sh` never uploads、**不跑 `bin/upload.sh`**（sink 零改动） |

**无需改动（已核对）**

- `inspect.ts` — format 专属行为分支全在 xls/xlsx/csv/tsv，parquet 走默认路径；仅 `description` / `--input-file` desc 文案加了 Parquet（无行为改动）。
- `relay.ts` — format 透传 `first?.format ?? 'csv'`，无白名单；sink 零改动决策不动它。
- `conversion.ts:118` — xlsxStructure 仅 xlsx。
- `profile.ts:159-165` — §6.4 已定嵌套降级，不改。
- `reuse.ts` / `handoff.ts` — format 仅类型透传。
- `index.ts` — 无新命令，reader 是内部函数。

## 5. 风险（按严重度）

1. **库选型已定：parquet-wasm（覆盖全表，2026-10-22 实测通过，见 §9）**。残余打包风险见第 6 条：node build 是 CJS + `require('fs').readFileSync(__dirname)`，不能直接打进 ESM dist。**排除手写 reader**（Dremel 嵌套极易做错）；hyparquet 不再考虑。下游模型（AE 属性 number/string/boolean/datetime/list/object）已收窄问题。
2. **int64 精度**：parquet-wasm → Arrow Int64 → apache-arrow 已返回 **bigint**（2^53+1 精确，不丢精度）。风险转为：`bigint` 不是 JSON 可序列化值，reader 须转 string（或 |v|≤2^53 转 number），否则 `convert` 的 JSON.stringify 抛错。
3. **时间语义**：`isAdjustedToUTC` 读错 → 整表偏移 8 小时且难察觉。（已确认 parquet-wasm 通过 Arrow tz 有无保留该语义，见 §9.4。）
4. **内存**：按 row group 流式，不整文件 materialize；超大 row group 风险。（Mytona 文件单 row group，见 §9.4.5。）
5. **嵌套列**：struct/list/map 已确认 parquet-wasm 能解码；Phase 1 是否 flatten 仍建议降级（报 warning），见 §6.4。
6. **打包（已明确，风险低）**：parquet-wasm 纯 WASM（`parquet_wasm_bg.wasm` 5.25MB），无原生 addon。**照 jq-wasm 先例**：加进 `dependencies`（tsup 默认 external，不打包），node build 是 CJS，`__dirname` 指向它在 node_modules 的真实位置，fs 读 wasm 正常工作；ESM `import { readParquet } from 'parquet-wasm'` 走 exports map → CJS，named export 可用。**不做运行时下载/安装**（ae-cli 客户机自运维，不能依赖首次联网），也不用 `.wasm` loader 打进 dist。spike 只验证 external 下 named import 在 dist 可用。
7. **兼容性**：新增格式纯增量、向后兼容；跑 `check:release` + 按 `docs/compatibility-policy.md` 审视已发布 skill 入口连续性。

## 6. 待决策

1. ~~库选型方向~~ **已定 parquet-wasm**（覆盖全表，2026-10-22 实测见 §9；hyparquet 不再考虑）。~~打包方式~~ 已验证（§9.4.4：external 即可，无需 wasm loader）。
2. 时间戳 emit 策略：reader 从 Arrow field type 即可区分 UTC/naive（`isAdjustedToUTC` 映射为 tz 有无，见 §9.4.1），C 点方案成立；具体 emit 代码待实现。
3. int64 → 转 string 的落地方式（见 §9.4.2：值已是 bigint，只需转 string；是否 |v|≤2^53 转 number 待定）。
4. ~~嵌套列 Phase 1 是否降级~~ **已定（2026-10-23）：保持嵌套、不 flatten**。LIST/STRUCT/MAP 列整体按 object/array 原样透传（与 JSON/JSONL 输入一致，profile 重新推断为 `list`/`object`），不序列化为 JSON 字符串、不报 warning；`mapping.ts:13` FLATTEN 白名单不加 parquet，`profile.ts:159` 不改。
5. ~~plan 是否移出 `.scratch/`~~ **已定（2026-10-23）：移出**，成为正式设计文档 `docs/plans/2026-10-23-ae-data-integration-parquet.md`（随代码进仓库）。
6. ~~测试语料~~ **已定（2026-10-23）：check-in 二进制、合成数据**。不用客户真实文件（含 PII）；按客户文件 schema/列类型/编码形态生成一个合成 fixture（假数据），check in `tests/fixtures/local-data/`。
7. ~~sink 处理~~ **已定（2026-10-23）：零改动、文档说明**。'落盘不上报'复用 `convert --output-dir` + `bin/run.sh` never uploads，不新增 `sink.type`、不动 `relay.ts`；文档任务并入 §4.D。
   **随访（2026-10-23，实机测试反馈）**：客户侧实测时 agent 未先问输出目录、也未主动给 LogBus2 选项，直接默认走 RESTful 入库。文档说明补强为**强制前置二问**：① 输出目录（`convert --output-dir`，默认仅作 offer，LogBus2 模式必须指向其监听目录）；② sink 路径（RESTful `/sync_json` vs 文件/LogBus2），用户给了 endpoint/APPID 不等于选好了路径；同一份 JSONL 不得同时走两条路径（会重复入库）。改动落在 `SKILL.md` 步骤 5、`references/sink-upload.md` 新增「Choose the sink path first」、`references/transform.md` convert 前问输出目录。
8. ~~目录输入~~ **已定（2026-10-23）：调用方展开、不新增 flag**。parquet 分区数据集（`dt=…/part-*.parquet`）由 agent/skill 展开成 `.parquet` 文件列表后走现有 `--input-file` 变参；CLI 不收目录（`resolveLocalDataInputMeta` 的 `stat.isFile()` 语义不变）。展开规则写进 `references/source-inspect.md`。
9. ~~同 schema 多文件探查~~ **已定（2026-10-23）：首个全量 + 其余只读 footer**。全部输入都是 parquet 且 >1 个文件时：第 1 个全量 profile，其余 `readMetadata` 只读 footer（schema + 行数），比对 schema（列名 + arrow 类型 + decimal scale + timestamp tz）一致就跳过数据面 decode，返回精简 shape；任一 schema 不一致则回退现有全量循环。**已知边界**：footer 只校验 schema、不校验值，UTF8 列的值驱动推断（数字串→number、日期串→datetime、JSON 串→object）可能跨文件漂移；parquet 列本身强类型，残余漂移仅限 UTF8 值形态，文档里写清 caveat。`readMetadata` 仍要 `readFileSync` 全量字节（本地 I/O 便宜，贵的是 decode），不省 I/O 只省 decode。
10. ~~大文件限制~~ **已定（2026-10-23）：只加内存警告、不设硬上限**。`estimate.ts` 给 parquet 加 `largeFileMemoryWarning`（>1GB 时 memoryRisk，照 xlsx/json 先例）：reader 是整文件 `readFileSync` + `readParquet` 整表物化，峰值内存可达文件大小数倍。口径与 csv/json「无硬上限」一致；文档建议大文件按 row group / 分区拆成多个文件。本地流式（逐 row group）暂不做——parquet-wasm 流式 `ParquetFile.fromUrl().stream()` 要 URL（Node 20 fetch 不支持 file://）。

## 7. 下一步

1. ~~验证候选库覆盖~~ 已完成，见 §9：parquet-wasm 通过全部覆盖矩阵（Mytona 实文件 + 多写家 fixtures）。
2. ~~打包 spike~~ 已验证（2026-10-23，见 §9.4.4）：tsup ESM dist 下 external named import 正常、wasm 自读正常，无需 wasm loader / 无需打进 dist。~~剩余唯一待办：在能访问 sheetjs CDN 的环境跑一次仓库内 `npm install` + `npm run build` 做最终确认~~ **已完成（2026-10-23）**：sheetjs CDN 慢（~5KB/s、ETIMEDOUT），用 `curl -C -` 断点续传拿全 2.4MB tarball、`shasum` 核对与 lockfile integrity 一致后 `npm cache add` 按 integrity 入缓存，`npm install` 从缓存取 xlsx 不再访问 CDN，整树恢复成功。
3. 按 §4 改动清单出逐文件 diff（A 格式接线 → B reader → C 时间 → D 文档 → E 测试）。
4. 实现时把 §9.4 的 int64→string、decimal scale、UTC/naive 判别写进 reader。

## 8. 完成标准（CLAUDE.md §7）

- `npm run build` 绿。
- `npm test` 冒烟通过。
- `npm run verify:tracking-tools`（含新增 parquet 测试）通过。
- `--dry-run` 预览请求符合预期。
- `npm run check:release`（改过 skill frontmatter / 发包前）。

**验证记录（2026-10-23，全绿）**：`npm run build` ✅（303ms，Build success）；`npm test` ✅（7/7）；`npm run verify:tracking-tools` ✅（含 `local data parquet tests: passed`，链尾 `data integration skill contract tests: passed`）；`--dry-run` ✅（`inspect --input-file 34_parquet_events.parquet --dry-run` 返回 `format:"parquet"`）；`npm run check:release` ✅（5 checks）。端到端 `inspect` 实测 ✅（推荐 mapping `format:"parquet"`、`ue_eligible:true`、int64 `account_id`→string、`time_`/`timestamp` 双 datetime 列均正确推断）。`check:agents-docs` 未跑（CLAUDE.md/AGENTS.md 未改动）。

**第二轮验证（2026-10-23，§6.8–6.10 落地后，全绿）**：`npx tsc --noEmit` ✅；`npm run build` ✅；`npm run verify:tracking-tools` ✅（parquet 测试新增 footer schema + 多文件 schema_checked/回退断言）；`npm run check:release` ✅。端到端 CLI 实测 ✅：同 schema（34×2）→ `schema_checked:true`、2 files、`total_row_count:6`；异 schema（34+36）→ 回退全量（`files:2`、`column_union:11`、无 `schema_checked`）。`readSchema`+`readMetadata` 实测只读 footer（`numRows`、`type.toString()` 判别 Int32/Int64、naive/tz Timestamp、Decimal scale、嵌套递归）。

## 9. 库验证结果（parquet-wasm 0.9.0，2026-10-22 实测）

方法：venv pyarrow 26 读 Mytona footer 取 ground truth；`/tmp/parquet-wasm-probe` 用 `readParquet` + apache-arrow `tableFromIPC` 逐文件核对 schema/行数/样例值；`/tmp/parquet-fixtures` 用 pyarrow 生成多写家变体 fixtures。

### 9.1 Mytona 真实文件 ground truth
- 60 个文件全部 `created_by=parquet-mr-trino version 483`、**GZIP**、单 row group/文件。
- 编码集合：`PLAIN`、`PLAIN_DICTIONARY`、`RLE`+`BIT_PACKED`（=RLE_DICTIONARY 数据页）、`DELTA_LENGTH_BYTE_ARRAY`。
- 时间列 `time_`/`timestamp`/`local_timestamp`/`installed_at` 全部 `timestamp[ns]` **无 tz**（= TIMESTAMP(isAdjustedToUTC=false) 墙钟）；另有 `timezone` 列携带每行偏移（-5/9…）。
- 样例行数：episodewindow 145,751 / login 531,706 / purchase 908,721（均单文件）。

### 9.2 parquet-wasm 对 Mytona 文件的解析
- 三表 schema、行数、类型全部正确；速度 ~130ms（146K 行）/~1.7s（532K）/~2.0s（909K）；28MB purchase 文件 rss ~1.2GB（整文件 materialize）。
- 类型映射：Utf8/Int32/Bool/Float32 正确；时间列 → `Timestamp<NANOSECOND>` 无 tz（与 pyarrow naive 一致）。

### 9.3 多写家 fixture 覆盖矩阵（pyarrow 生成，parquet-wasm 读）
| 维度 | 变体 | 结果 |
|---|---|---|
| 压缩 | snappy / gzip / zstd / brotli / lz4 | 全部 OK |
| 编码 | DELTA_BINARY_PACKED / DELTA_BYTE_ARRAY / BYTE_STREAM_SPLIT / PLAIN / 字典 | 全部 OK |
| 数据页 | v2 | OK |
| 物理类型 | INT96（旧 Spark/Impala） | OK → naive `Timestamp<NANOSECOND>` |
| 嵌套 | LIST / STRUCT | OK → `List<Utf8>` / `Struct<{x:Int64,y:Utf8}>` |
| DECIMAL | decimal128 | OK → Arrow `Decimal[p,s]`，但值 `.toString()` 不自动加小数点（见 9.4.3） |
| 时间语义 | isAdjustedToUTC=true | → `Timestamp<MICROSECOND, UTC>`（**tz 保留**） |
| 时间语义 | isAdjustedToUTC=false | → `Timestamp<MICROSECOND>`（naive） |

### 9.4 关键结论
1. **时间语义**：parquet-wasm 把 `isAdjustedToUTC=true/false` 映射为 Arrow tz 有无，reader 读 `field.type` 即可判别 UTC vs naive，**无需手撕 parquet 元数据**。C 点方案成立。
2. **int64 精度**：Int64 → apache-arrow 返回 **bigint**（2^53+1 精确），不静默丢精度；但 bigint 不可 JSON 序列化，reader 须转 string（或 |v|≤2^53 转 number）。
3. **DECIMAL 陷阱**：apache-arrow 的 Decimal 值 `.toString()` 返回**未缩放整数**（如 `90071992547409931234` 应为 `9007199254740993.1234`），scale 在 schema field type 上（`type.scale`），值对象无 `.scale`。须按 schema scale 手工插小数点，否则数值错。
4. **打包（已实测验证，2026-10-23）**：**照 jq-wasm 先例，加进 `dependencies` 保持 external**（不打包进 dist、不用 `.wasm` loader、不做运行时下载）。node build 是 CJS `require('fs').readFileSync(__dirname+'/parquet_wasm_bg.wasm')`，external 时 `__dirname` 指向 node_modules 真实位置，wasm 正常读到。spike 实测：tsup `--format esm` + 仓库同款 banner 构建后，dist 里 `import { readParquet } from 'parquet-wasm'` 保持裸 ESM import（995B 产物、未内联 wasm），Node v20.20.2 跑 dist 解 531,706 行 Mytona 文件成功。唯一未在仓库内跑通：本机 `npm install` 因 `cdn.sheetjs.com`（xlsx devDep 外部 tarball）EIDLETIMEOUT 中断，属环境问题、与 parquet-wasm 无关。
5. **内存**：`readParquet(Uint8Array)` 整文件 materialize；Mytona 文件单 row group，行组流式无收益；文件 5–28MB、≤909K 行，rss 峰值 ~1.2GB，CLI 批量可接受。真正按行组流式的 `ParquetFile.stream()` 要 URL（fetch），不接本地 fs。
6. **Node 版本**：parquet-wasm 0.9.0 **无 `engines` 声明**；生成代码 `Symbol.dispose` 全部走 `if (Symbol.dispose)` 守卫（16/16）、`FinalizationRegistry`(Node14.6+)/`BigInt`(Node10.4+) 均低于 Node20。**已在 Node v20.20.2 实测**通过全部 fixture + 真实 Mytona login 文件（531K 行，2.7s）。companion 依赖 apache-arrow（`tableFromIPC` 提取 JS 值）同机 Node20 实测通过。ae-cli 的 Node≥20 下限满足。

### 9.5 复现物（已清理，2026-10-23）
验证完成后已删除全部临时产物（`/tmp/parquet-fixtures`、`/tmp/parquet-wasm-probe`、pyarrow footer/生成脚本、npx node@20 缓存等，合计 ~160MB）。如需复现：fixtures 用 pyarrow `write_table`（compression: snappy/gzip/zstd/brotli/lz4；column_encoding: DELTA_BINARY_PACKED / DELTA_BYTE_ARRAY / BYTE_STREAM_SPLIT；`use_deprecated_int96_timestamps=True`；nested list/struct；`data_page_version='2.0'`）；探针用 `readParquet(Uint8Array)` + apache-arrow `tableFromIPC(wasmTable.intoIPCStream())`。正式测试语料在实现阶段重新生成并 check in（见 §6.6）。
