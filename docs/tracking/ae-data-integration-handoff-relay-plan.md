# ae-data-integration handoff 交付物重构方案

## Context（为什么改）

`ae-cli data-integration handoff` 目前只产出「冻结 mapping + 薄壳 transform.mjs + index.json」，与设计文档 `docs/tracking/ae-data-integration-plan.md` §5 规划的「可执行脚本 + 方案引用 + 显式交付」差距很大。实测暴露三个问题：

1. **跨目录无法复用**：`.ae-data-integration/` 是相对 CWD 解析（`handoff.ts:225,240`、`reuse.ts:91,102` 的 `resolve('.ae-data-integration')`）。用户从不同目录启动 Claude Code / Codex，`reuse` 找不到历史包。
2. **交付物不完整**：没有 plan 里承诺的「转译脚本程序」；Source 与 Sink 被写死进脚本（xlsx → `/sync_json`），没有作为可替换的管线阶段。参考 `/Users/mailin/Downloads/ae-di-star-sea-iap/` 的产物形态重新设计。
3. **不显式告知、不打包**：用户不知道交付物在哪，也没有压缩包可分发。

目标：让 `handoff` 一次性产出**完整、自描述、可扩展、可直接分发**的「接力包」+ zip，并让 `reuse` 跨目录可命中。

## 已确认决策

- 复用机制：**向上搜索 + 全局兜底**（handoff 默认仍写项目内 `.ae-data-integration/`；reuse 查找顺序 CWD → 逐级父目录 → `~/.ae-cli/data-integration/`）。
- 交付物形态：**DataX 式 source→transform→sink 管线描述符 + 通用 stage 执行器**（本次落地；source=local_file、sink=restful_sync_json 为唯一实现，`type` 字段预留 logbus/datax/mysql 扩展位）。
- 脚本语言：**Python + shell**（编排，转译仍调 ae-cli；不造第二个运行时引擎）。
- 压缩包：**总是生成，放包目录旁**。
- 包内容：**标准通用流程**（不内嵌两轮 salvage / SQL 直查等环境 workaround）。

## 硬约束提醒

- CLAUDE.md：CLI 源码与用户可见输出**全英文**。生成的 pipeline.json/README/RUNBOOK/脚本注释均为英文。
- 生成文档/脚本**不得出现 `--yes`**（`test/local-data-skill.test.mjs` + self-check skill-risk-examples 均为 P1）；不出现 MCP 话术。
- 接力包内容敏感：文件 0o600、目录 0o700、脚本 0o700（可执行）、zip 0o600。

---

## 管线模型（核心设计）

借鉴 DataX 的 `reader → transformer → writer`：**声明式描述 + 可插拔类型，但不造运行时引擎**——执行仍是 `ae-cli data-integration inspect / convert / upload` 子命令，`bin/` 脚本只做「读描述符 → 按 type 分发到 ae-cli 子命令」。

段职责：

| 段 | 冻结什么 | 可替换什么 |
|---|---|---|
| source | 格式、数据集合 | 换文件（重绑 sha256/data_set）、换源类型 |
| transform | mapping（已确认业务逻辑） | —（复用核心） |
| sink | 类型 + batch 参数 | APPID/endpoint（本地 target.env）、换 sink 类型 |

### pipeline.json schema（`ae-data-integration-pipeline/v1`）

```jsonc
{
  "version": "ae-data-integration-pipeline/v1",
  "created_at": "<ISO>",
  "source":    { "type": "local_file",       "params": { "format": "xlsx" } },
  "transform": { "type": "ae-data-integration-mapping/v1", "refs": ["4686…/mapping.json", "0667…/mapping.json"] },
  "sink":      { "type": "restful_sync_json", "params": { "batch_size": 500, "env_file": ".local/target.env" } }
}
```

- `transform.refs` 由 index.json 的 `mapping_file` 生成（运行时视图）；`index.json` 仍是 reuse 匹配视图。两者并存，各司其职。
- 本次 `source.type` 仅 `local_file`、`sink.type` 仅 `restful_sync_json`；executor 对未知 type 报「unsupported, re-run full pipeline / upgrade」。
- **边界**：数据库源归 `ae-dataops`、logbus/datax 配置现属 `ae-generate-tracking-code`（plan 文档 T9 才迁入）——本次只留 `type` 扩展位，不实现。

---

## 交付物目标布局（`--out-dir` 默认 `.ae-data-integration/`）

```
.ae-data-integration/                    ← 接力包根（= out-dir）
  pipeline.json                          ← 新增：管线描述符（source/transform/sink）
  index.json                             ← 已有：结构指纹索引（reuse 匹配）
  shape.json                             ← 新增：形状基线（每 entry 的 mode/data_set/format/columns）
  <fingerprint16>/                       ← 已有：每个 mapping 一个（多 mapping 时多个）
    mapping.json / plan.json / transform.mjs
  bin/                                   ← 新增：通用 stage 执行器（读 pipeline.json）
    run.sh                               # source(bind) → transform(convert) → plan(plan_check)，不上报
    upload.sh                            # sink：默认 dry-run，--confirm 才真发
    bind_mapping.py                      # source 阶段：inspect → 重绑 sha256/data_set + 列集合形状校验
    summarize.py                         # transform 阶段：打印有效/隔离数与原因分布
    plan_check.py                        # 埋点方案覆盖检查（新事件/属性 → exit 3）
  README.md                              ← 新增：人怎么用 / 交给 Agent 怎么用
  RUNBOOK.md                             ← 新增：完整流程 + 四个确认门 + 已知坑（英文）
  .local/target.env.example              ← 新增：AE_PROJECT_ID / AE_APPID / AE_ENDPOINT 模板
  .gitignore                             ← 新增：inbox/ runs/ .local/target.env
  inbox/  runs/                          ← 新增：空目录，每日输入 / 每次产物
```

zip：`<out-dir 父目录>/ae-data-integration-handoff-<fingerprint[:8]>.zip`（多 mapping 取第一个指纹；用已有 `archiver` 依赖，参照 `src/commands/te-system/sandbox-tool-package.ts:563-598`，0o600）。

四个确认门（RUNBOOK 与脚本共同保证，`gates` 不写进 schema 以免「声明未执行」）：
1. 形状门（`bind_mapping.py` 列集合比对 shape.json，不匹配硬失败）；
2. 方案门（`plan_check.py` 新事件/属性 → exit 3）；
3. 上报 dry-run 门（`upload.sh` 默认 dry-run）；
4. 脏行 clean-subset 门（manifest `blocked` 时提示取舍，`--confirm` 才真发）。

---

## 改动明细

### 工作流 1 — 跨目录复用

**新建** `src/commands/data-integration/local-data/handoff-root.ts`：
- `globalHandoffDir()` → `join(getConfigDir(), 'data-integration')`（复用 `src/core/config.ts` 的 `getConfigDir()` = `~/.ae-cli`；HOME 为空跳过全局兜底）。
- `findReuseRoot(startDir = process.cwd())`：向上逐级找 `.ae-data-integration/index.json`，找到返回该目录，否则 `globalHandoffDir()`。纯函数、可测。

**修改** `src/commands/data-integration/local-data/reuse.ts`：
- `dryRun`/`execute` 的 `outDir`：显式 `--out-dir` → `resolve(it)`；缺省 → `findReuseRoot()`。
- 未命中返回 `searched_paths`，并保持 `detectReuse(mapping, outDir)` 纯函数签名不变（`tests/local-data-reuse.test.ts` 不受破坏）。

### 工作流 2 — 完整接力包（管线描述符 + 通用执行器）

**新建** `src/commands/data-integration/local-data/relay.ts`（纯函数，返回 `{relPath, content, mode}[]`，仿 `createHandoffScript` 模板风格）：
- `buildPipelineDescriptor(mappings, entries)` → `pipeline.json`（上述 schema；`transform.refs` 取 index entries 的 `mapping_file`）。
- `buildShapeBaseline(mappings)` → `shape.json`：每 entry 记 `mode`/`data_set`/`format`/`columns`（源列集合 = `properties[].source` ∪ identity 字段 ∪ `exclude_columns`，排序）。列**集合**匹配，容忍列序变化与 sheet 改名。
- `generateBinScripts()` → 5 个通用脚本（基于参考目录 `ae-di-star-sea-iap/bin/*` 简化，**按 `pipeline.json` 的 type 分发**）：
  - `run.sh`：读 `pipeline.json` → source 阶段 `bind_mapping.py`（`source.type==local_file` 分支）→ transform 阶段对 `transform.refs` 逐个 `ae-cli data-integration convert` + `summarize.py` → plan 阶段 `plan_check.py`。不上报。未知 type 报错退出。
  - `upload.sh`：读 `pipeline.json` 的 `sink.params` + `.local/target.env`；`sink.type==restful_sync_json` 分支调 `ae-cli data-integration upload`（默认 `--dry-run`，`--confirm` 真发）；`blocked` 时打印 clean-subset 说明再带 `--allow-clean-subset`。
  - `bind_mapping.py`：`subprocess` 调 `ae-cli data-integration inspect --input-file <new>`，取 `source.sha256` 与 `data_sets`/`header_details`；对 index 每个 entry 重绑 `source.sha256`+`source.data_set`（id 精确 → label → 列集合对 shape.json），不匹配硬失败提示重走完整链路。只动文件身份字段，业务逻辑不动。
  - `summarize.py`：读 `manifest.json`+`invalid.rows.jsonl` 打印统计。
  - `plan_check.py`：读 `plan.json`+各 `valid.ue.jsonl` 比对事件/属性覆盖，新事件/属性 → exit 3 并列出。
- `generateReadme(mappings)` / `generateRunbook(mappings)` → 英文文档；RUNBOOK 落库核对用 skill 既有命令（`ae-cli tracking ingest summary -p <project> --start-time --end-time`、`tracking live-data list -p <project>`、`tracking ingest-error list`，来自 `sink-upload.md`），不发明 flag、不做 SQL。
- `generateEnvTemplate()` / `generateGitignore()` → 模板字符串。

**新建** `src/commands/data-integration/local-data/archive.ts`：
- `zipPackage(dir, zipPath)` 用 `archiver`（`zip.directory(dir, false)`，过滤 `.DS_Store`），0o600。

**修改** `src/commands/data-integration/local-data/handoff.ts`：
- `--mapping` 改 `variadic: true`（一次 handoff 收多个 mapping，对应多 sheet 文件；每个 mapping 一个指纹目录 + 一个 index entry）。`--plan-file` 仍单个，复制进每个 entry 目录并各自引用。
- `execute` 在「冻结包 + index」后：调 `relay.ts` 生成 pipeline.json/shape.json/bin/README/RUNBOOK/.local/.gitignore + 建 `inbox/`/`runs/`，再 `archive.ts` 打 zip。
- 返回结构扩展（沿用「路径写进 data」范式，不新增 notice 通道）：
  `{ out_dir, zip_path, pipeline_file, handoff_dirs[], index_file, deliverables:[{rel_path,abs_path}], next_steps:string[], reused_existing }`。
- `dryRun` 同步预览：fingerprints、files（含 pipeline.json/bin 列表）、zip 路径。
- 保留 `createHandoffScript` / `structureFingerprint` / `upsertIndexEntry`（不被破坏）。

### 工作流 3 — 显式告知 + 打包

- 命令侧：`execute` 返回 `zip_path`（绝对路径）+ `next_steps`。
- skill 侧：更新 `references/handoff.md` 与 `SKILL.md` 第 6 步，要求 agent 完成响应**明示** zip 绝对路径、包目录、以及「同形状文件下次怎么跑」的一行命令。

### skill 文档更新

- `skills/ae-data-integration/references/handoff.md`：重写为新布局（含目录图 + pipeline.json）、zip 位置、通用执行器说明、复用命令、安全规则（无 APPID/token；target.env 本地填）。
- `skills/ae-data-integration/references/reuse.md`：补充查找顺序（CWD → 父目录 → `~/.ae-cli/data-integration/`）与 `searched_paths` 语义。
- `skills/ae-data-integration/SKILL.md`：第 2 步 reuse 措辞微调；第 6 步 handoff 改为「产出完整接力包（pipeline.json + 脚本 + 文档）+ zip 并明示路径」。
- 所有新增/修改 md 不得出现 `--yes`；链接相对路径可解析（self-check D4b）。

### 测试

- `tests/local-data-handoff.test.ts`：新增 `buildPipelineDescriptor`（version/source.type/sink.type/refs 与 index 一致）、`buildShapeBaseline`、各 `generate*`（脚本含关键命令与 type 分发、README/RUNBOOK 不含 `--yes`、无中文、含 zip 路径与复用命令）、`zipPackage` 产出可解压 zip（含 index.json + bin/run.sh 且保留执行位）。
- `tests/local-data-reuse.test.ts`：新增 `findReuseRoot` 用例（CWD 命中 / 祖先命中 / 全局兜底 / 全无）。
- `test/local-data-skill.test.mjs`：可选补 handoff.md/reuse.md content 断言（`--yes` 检查已自动覆盖新 md）。

---

## 验证（完成标准）

1. `npm run build` 绿。
2. `npm test` 冒烟通过。
3. `npm run verify:tracking-tools` 通过（覆盖 `local-data-handoff` / `local-data-reuse` / `local-data-skill` 等）。
4. `npm run self-check` 通过（新 reference 链接、frontmatter）。
5. 手动端到端：
   - 小 fixture 跑 `npx tsx src/index.ts data-integration handoff --mapping <mapping.json> --plan-file <plan.json> --dry-run`，核对 preview；
   - 正式 handoff 后检查 `.ae-data-integration/` 新文件齐全、zip 可解压、`bin/run.sh` 可执行、pipeline.json 合法；
   - 换目录跑 `npx tsx src/index.ts data-integration reuse --mapping <同形状 mapping>`，确认跨目录 + 全局兜底各命中一次。
6. `npm run check:release`（涉及 skills/ 改动时）通过。

---

## 范围外 / 不做

- 不实现 logbus/datax/mysql 等 source/sink 具体类型（只留 `type` 扩展位；职责在 ae-dataops / ae-generate-tracking-code，二期迁入）。
- 不造运行时插件引擎（执行仍是 ae-cli 子命令，脚本只做分发）。
- 不内嵌两轮 salvage / SQL 直查等环境 workaround。
- 不新增全局 config KV；复用靠「向上搜索 + 全局目录」，不持久化 out-dir。
- 「个人 skill 形态」交付（plan §5 另一形态）不在本次范围。

---

## 实现差异（存档补充，2026-08-24）

实现落地后与本方案初稿的偏差，供评审对照；以代码为准。

1. **函数签名简化**：`buildPipelineDescriptor` 实际签名为 `(entries)`（`source.format` 从首个 index entry 取）；`generateReadme()` / `generateRunbook()` 无参——README/RUNBOOK 是通用模板，不依赖 mapping。
2. **四确认门命名**：README/RUNBOOK 采用「①形状 ②Transform ③埋点方案 ④Sink」，并把 clean-subset 并入 Sink 门；本方案初稿写「①形状 ②方案 ③上报 dry-run ④脏行 clean-subset」。语义等价，命名不同。
3. **全局目录超前实现**：设计文档（ae-data-integration-plan.md §5）写「跨项目复用诉求出现后再评估扩展到 `~/.ae-cli/data-integration/`」，实现直接落地了「向上搜索 + 全局兜底」。
4. **`handoff_dirs` 语义**：返回指纹目录名（`fingerprint[:16]`），非完整路径；完整路径由 `out_dir` + `handoff_dirs` 拼接。
5. **`dryRun`/`execute` 文件清单已修正**：初稿的 `files` 列表不含 `<fingerprint16>/` 前缀且无法表达多 mapping；已改为从 fingerprints/items 派生，逐目录枚举 `mapping.json` / `transform.mjs` / `plan.json`，`deliverables` 与落盘一致，`dryRun` 补齐 `shape_file`。
6. **zip 内容裁剪为「本轮」**：初稿写 zip 是 out-dir 快照；实现改为只打本轮产物（本轮指纹目录 + 裁剪后的本轮 `index.json` + 通用执行器/文档，见 `stageScopedPackage`），目录里仍累积完整历史供 reuse 匹配——避免 zip 里混入 zip 内不存在的历史 mapping 引用。

## 实现差异（存档补充，2026-08-25）

后续一次「记录目标 + 落库核对」迭代的增量，仍以代码为准：

7. **pipeline.json 记录目标**：`sink.params` 增加 `pushurl?` / `project_id?`（`handoff --pushurl` / `--project-id` 记录）。复用默认走记录值，但 `upload.sh` 无 `--confirm` 不发数据，操作者每次仍确认地址与项目。
8. **bin 脚本 5 → 7**：新增 `verify.py`（软核对：本地算提交窗口 + 期望计数，快照 `tracking ingest summary` 前后差异，**不解析**服务端 summary 字段）与 `resolve_appid.py`（`project info get` 派生 APPID，精确读取顶层 `data.appid`）。`run.sh` 增加 salvage 提示；`upload.sh` 回显中 APPID 打码，不落日志。
9. **硬判据下沉到项目定制层**：`tracking ingest summary` 的 `data` 结构属服务端定义、无稳定契约（参考包注释亦指出其对已落库数据仍返回 0、不能当判据），故通用包只做软核对；SQL 直查式硬判据 + 多轮 salvage 写成 `skills/ae-data-integration/references/custom-layer.md` 的定制层骨架，不进通用交付物。
10. **APPID 派生字段名已实测确认**：对 AE demo host（`web-ta-demo.thinkingdata.cn`）实测 `project info get` 返回顶层 `data.appid`（`project info list --fields '["appid"]'` 亦可取到，但 list 默认投影不含 appid）。`resolve_appid.py` 改为精确读取该字段，缺失时回退 `AE_APPID`，不再做递归键搜索。附带发现 `data.public_receiver_address` / `private_receiver_address` 即上报 pushurl；pushurl 仍按决策仅走 `--pushurl` flag，不自动派生。

11. **路径规范收口**：`.ae-data-integration/` 改为 `.ae-cli/data-integration/`，对齐 `docs/tracking/ae-tracking-migration.md` 的项目工作区规范（`~/.ae-cli/` = 全局配置、`./.ae-cli/` = 项目工作区）。`handoff`/`reuse` 默认根、`handoff-root.ts` 向上搜索、skills 文档与 `local-data-reuse.test.ts` 全部改为 `.ae-cli/data-integration/`；`convert` 默认输出统一为 `.ae-cli/data-integration/runs/<run-id>/`（与 `bin/run.sh` 的 `runs/<ts>` 一致）。全局兜底 `~/.ae-cli/data-integration/` 保持不变（本就落在全局根下）。本条目与 `ae-data-integration-plan.md` 决策 2A（存储于 `.ae-data-integration/`）构成偏差，以代码为准。
