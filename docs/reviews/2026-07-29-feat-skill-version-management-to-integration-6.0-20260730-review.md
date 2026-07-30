# Skill 版本管理合并 Review 报告

- **范围模式**：branch + fix recheck
- **提交范围**：`origin/integration/6.0-20260730@aef7c0f5..origin/feat/skill-version-management@5210077f`
- **差异范围**：`origin/integration/6.0-20260730@aef7c0f5...origin/feat/skill-version-management@5210077f`
- **Merge Base**：`a9b77401ff7a35e5212383febdd504774e2b50a2`
- **审查日期**：2026-07-29
- **规模**：3 commits / 15 files / +925 -250
- **需求依据**：`te-claude/docs/plans/2026-07-27-skill-version-management.md`

> 范围说明：`te-cli` 两侧分支的 `package.json` 都没有 `cluster-version`，无法执行
> `te-claude` 工作流约定的字段校验。本次没有用 `package.version` 推断基线，而是严格使用用户明确指定、
> 且已确认存在的远端分支。审查期间目标分支发生过强制更新，因此本报告固定到上述 SHA。

## 结论摘要

- 发布判断：**特性分支问题已修复；目标基线修复后可合并**
- 🔴 本分支必须修复：0（已解决 1）
- 🔴 目标基线阻塞：1
- 🟡 建议优化：0（已解决 2）
- 待验证风险：1

特性实现与目标分支可以无冲突合并；合并结果的构建、冒烟、Skill 版本定向测试、更新检查、
release gate 和真实 CLI 参数场景均通过。本分支的无效文档示例、sync 编排测试缺口和旧本地复制
孤儿代码均已修复。当前唯一阻塞是目标分支自身的 `verify:agent-tools` 存在重复 `const` 声明，
合并结果仍无法通过该必跑校验。

## 范围覆盖

| 模块/分组                        | 文件数 | 状态 | 说明                                    |
| -------------------------------- | -----: | ---- | --------------------------------------- |
| Skill 创建、编辑、上传与版本格式 |      3 | 已审 | 参数、请求体、格式/大小预校验           |
| sync Skill ZIP 逐项上传          |      1 | 已审 | ZIP、版本提取、失败隔离、workspace 提示 |
| Commander 参数与更新检查兼容     |      2 | 已审 | 空格/等号写法及根命令行为               |
| 测试与脚本注册                   |      3 | 已审 | 定向测试、update-check、package script  |
| `ae-agent` Skill 文档            |      4 | 已审 | add/edit/upload 示例和总览契约          |

## 动态验证

所有命令均在临时工作树中先将
`origin/feat/skill-version-management@5210077f` 合并到
`origin/integration/6.0-20260730@aef7c0f5` 后执行。

| 命令/场景                                   | 状态   | 结果或未运行原因                                                       |
| ------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| `git merge-tree --write-tree <base> <head>` | ✅     | 退出码 0，无文本冲突                                                   |
| `npm run verify:skill-version-management`   | ✅     | 通过，覆盖文档示例、逐项失败、部分成功和 workspace 提示                |
| `npm run verify:update-check`               | ✅     | 通过，包含子命令 `--version 2.2`                                       |
| `npm run build`                             | ✅     | tsup 构建成功                                                          |
| `npm test`                                  | ✅     | CLI help 与 sandbox-tools 冒烟通过                                     |
| `npm run check:release`                     | ✅     | 2 个 release gate 均通过                                               |
| `npx tsx tests/program-lifecycle.test.ts`   | ✅     | 通过                                                                   |
| `--version 2.2` / `--version=2.2` dry-run   | ✅     | 两种写法均生成正确 PUT 请求体                                          |
| `ae-cli --version`                          | ✅     | 合并结果正常输出 `6.0.37`                                              |
| `npm run verify:agent-tools`                | ❌     | 目标分支脚本重复声明 `chatContextEnv`，Node 解析阶段失败               |
| `npm run self-check`                        | ✅     | 退出码 0；2 个 P2 为 ae-analysis 既有文档问题，与本分支无关            |
| `npx tsx tests/sync-local-copy.test.ts`     | ❌     | 2 条既有中文正则与英文错误信息不一致；不属于本需求且未接入 npm scripts |
| 真实 te-claude sync endpoint 联调           | 未运行 | Review 环境没有连接测试沙箱/主应用                                     |

## 问题清单

### ✅ 本分支问题复查

#### 1. `edit-skill` 文档仍提供缺少版本号的内容编辑命令（已解决）

- 位置：`skills/ae-agent/references/edit-skill.md:37`、`skills/ae-agent/references/edit-skill.md:40`
- 证据/触发：stdin 示例和 dry-run 示例都修改 `instructions` 或 `name`，但没有传
  `--version`。在临时合并构建产物中执行 dry-run 示例，退出码为 1，并返回
  `--version is required when editing Skill content`。
- 影响：`ae-agent` Skill 是 Agent 的运行时操作说明。Agent 按这两条示例执行会稳定失败，容易再次进入
  反复试参流程，与本次版本管理要求和刚修复的 CLI 使用体验相冲突。
- 最小修复方向：给两条内容编辑示例补充明确的更高版本，例如 `--version 1.1`；最好增加一个文档命令
  契约检查，确保内容编辑示例都包含版本。
- 对应验收/测试：计划要求“编辑内容时必填”和同步更新命令帮助/Skill 文档；所有参考示例应能通过
  CLI 本地校验。
- 修复结果：stdin 和 dry-run 示例均已补充版本号；`verify:skill-version-management` 会扫描
  `+edit-skill` 内容编辑示例并断言包含 `--version`。

### 🔴 目标基线阻塞

#### 1. `integration/6.0-20260730` 自身的 Agent 工具校验脚本无法解析

- 位置：`origin/integration/6.0-20260730:scripts/verify-agent-tools.mjs:148`、
  `origin/integration/6.0-20260730:scripts/verify-agent-tools.mjs:190`
- 证据/触发：同一作用域重复声明 `const chatContextEnv`、`const chatContextDryRun` 和
  `const explicitContextDryRun`，执行 `npm run verify:agent-tools` 立即报
  `SyntaxError: Identifier 'chatContextEnv' has already been declared`。
- 归属证据：该文件不在特性分支差异中；目标分支与临时合并树的文件 blob 均为
  `1df4637c1d634dd1774013a81b00a9cf5c878107`。
- 影响：即使 Skill 版本管理代码不引入冲突，当前目标分支和合并结果都无法通过 Agent domain 的必跑
  校验，MR/集成门禁不能得到绿色结论。
- 最小修复方向：在目标分支移除第二段重复的 automation context 测试，再重新执行
  `npm run verify:agent-tools`；修复后重新验证本次临时合并结果。

### ✅ 建议项复查

#### 1. sync 新协议缺少计划明确要求的逐项上传回归（已解决）

- 位置：`src/commands/sync/index.ts:325`、`tests/skill-version-management.test.ts:79`
- 证据：实现已按 Skill 逐项构造 ZIP、调用 multipart endpoint、捕获单项失败并处理
  `workspaceEnabled=false`；现有测试只覆盖版本解析、ZIP 内容和 1 MB 上限，没有执行
  `pushSkillItems` 或 mock `uploadToMainApp`。
- 影响：endpoint、表单字段、单项失败隔离、部分成功汇总及 workspace 提示未来发生回归时，当前测试
  仍可能保持绿色。
- 建议：为上传函数提供可注入 transport 或导出可测的纯编排层，至少覆盖“两项一成一败”和
  `workspaceEnabled=false`。计划中 `SKILL_SYNC_PROTOCOL_UPGRADE_REQUIRED` 的旧协议拒绝已由
  te-claude 服务端测试承担，te-cli 侧重点应放在新逐项协议。
- 修复结果：`pushSkillItems` 增加最小依赖注入边界；测试验证 multipart endpoint、slug/source/version/
  workspacePath、ZIP 文件、单项失败隔离、部分成功汇总、成功后 manifest 更新和
  `workspaceEnabled=false` 提示。

#### 2. 旧 canonical 本地复制实现和测试仍保留为孤儿代码（已解决）

- 位置：`src/commands/sync/local-copy.ts:145`、`tests/sync-local-copy.test.ts:12`
- 证据：生产调用已从 `copySkillPackageToTarget` 切换到服务端 multipart ZIP 提交，仓库内仅旧测试继续
  引用该函数；`sync/index.ts` 不再使用它。
- 影响：代码仍保留递归删除/复制旧 canonical 目录的过时路径，增加后续维护者误用旧协议的可能，也让
  旧测试产生虚假的覆盖感。
- 建议：删除该孤儿函数、只为它存在的 import 和测试断言；同步修正仍描述旧 `skillTargetRoot` 协议的
  非归档说明。
- 修复结果：已删除 `copySkillPackageToTarget`、返回类型、文件系统依赖和旧测试引用，并修正 sync
  入口注释为 Skill 逐项上传、MCP JSON 批量提交。

### 待验证风险

- 未在连接真实 te-claude 测试环境的沙箱中执行 `ae-cli sync --direction push --kind skill`。服务端路由
  与客户端 multipart 字段静态一致，te-claude 有路由/服务测试，但本次 Review 只验证了 CLI 本地构建
  与 ZIP 逻辑，不能把它表述成端到端通过。

## 亮点

- 新增版本格式预校验与服务端权威校验边界一致，没有在客户端复制版本比较或 CAS 逻辑。
- sync 的每项失败被隔离，成功项不会因后续失败回滚；ZIP 构造拒绝包内符号链接并限制
  `SKILL.md` 为 1 MB。
- Commander 修复保留 `ae-cli --version` 和既有 `--version=2.2`，同时让自然空格写法正确路由；
  合并到目标分支新增的自动版本同步逻辑后仍通过动态验证。
- 目标分支的 memory/automation 新能力与本分支无文本冲突，临时合并构建成功。

## 变更摘要与最终判断

本分支完成了 te-cli 三个 Skill 写入口的版本参数、格式预校验、sync ZIP 新协议以及 Agent 文档同步；
本次 Review 发现的三个分支内问题均已修复并通过特性分支与临时合并结果复验。

当前只需处理目标分支 `verify-agent-tools.mjs` 的重复声明。目标修复后，应在最新目标 SHA 上重新执行
merge-tree、`verify:skill-version-management`、`verify:update-check`、`verify:agent-tools`、build 和
npm test；这些门禁全部通过后，本特性可以合入。
