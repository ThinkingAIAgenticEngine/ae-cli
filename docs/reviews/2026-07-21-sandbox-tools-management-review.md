# te-cli 沙箱工具清单增量 Review

> Review 日期：2026-07-21
> 对比分支：`origin/release/6.0...origin/feat/sandbox-tools-management`
> Review 范围：`agent +list-sandbox-tools` 命令、扫描实现、测试、Skill 文档及命令验收脚本

## 1. 结论

`feat/sandbox-tools-management` 已基本满足本次 te-cli 新增需求：提供了正式注册的 `ae-cli agent +list-sandbox-tools` 本地命令，能够列出当前沙箱通过共享盘分发的受管工具，输出名称、版本、命令、运行时、目标路径和状态，并完成真实路径、共享盘边界、文件类型及权限校验。

Review 发现的 1 个 P1 问题已修复：扫描器现在会先通过有界读取识别受管标记，无标记的大文件会被忽略；真正的超大受管 shim 仍会报告为损坏，并已补充回归测试。当前分支满足既定需求，可以合入。

本命令的既定范围是扫描 `/home/ta/.local/bin` 中由 `te-agent-sandbox-tools` 管理的 shim，即 B 类共享盘分发工具；不包含 `claude`、`node`、`python`、`chromium`、`git` 等镜像内置工具，这不属于本次实现缺失。

## 2. 变更概览

- 新增 `agent +list-sandbox-tools` 命令并注册到 `agent` 域。
- 新增受管 shim 扫描与状态判断实现。
- 新增 `--status active|broken` 筛选和 `--dry-run` 支持。
- 新增功能测试，并接入 `npm test` 与 `verify:agent-tools`。
- 更新 `ae-agent` Skill 索引和命令参考文档。

对比分支共包含 3 个提交（其中 1 个为同步 `release/6.0` 的 merge commit），涉及 7 个文件，约新增 545 行、删除 7 行。

## 3. 需求符合度

| 需求项 | 结果 | 说明 |
| --- | --- | --- |
| 提供正式 CLI 查看入口 | 通过 | 命令已注册为 `ae-cli agent +list-sandbox-tools`，风险级别为只读 |
| 仅扫描当前沙箱受管工具 | 通过 | 普通文件和超过 16 KiB 的非受管文件均会忽略 |
| 输出工具、版本、命令、运行时、目标路径、状态 | 通过 | 字段齐全，旧版 shim 的版本和运行时兼容为 `unknown` |
| 单条异常不阻断完整清单 | 通过 | 异常项归类为 `broken`，扫描继续执行 |
| 防止 shim/目标路径伪造和越界 | 通过 | 拒绝 shim 符号链接，使用 `realpath` 校验目标位于工具根目录内 |
| 校验文件类型和权限 | 通过 | Node 工具要求可读，native 工具要求可执行，目标必须是普通文件 |
| 支持状态筛选 | 通过 | 支持 `active`、`broken`，汇总数据保持为筛选前全量统计 |
| 测试和文档 | 基本通过 | 主场景已覆盖并接入验收脚本，仍有若干边界用例可补充 |

## 4. P1 修复记录

### P1-01 超大非受管文件被误报为损坏工具

- 位置：`src/commands/te-agent/sandbox-tools.ts`
- 现象：代码在确认 `managed-by: te-agent-sandbox-tools` 标记前先判断文件大小；只要普通文件超过 16 KiB，就直接返回 `managed: true`。
- 实际复现：在扫描目录创建一个 17 KiB、无任何受管标记的 `user-script`，返回结果包含：

  ```json
  {
    "tool": "unknown",
    "command": "user-script",
    "status": "broken",
    "reason": "shim exceeds size limit"
  }
  ```

- 影响：用户自行放入 `/home/ta/.local/bin` 的脚本或二进制文件可能出现在系统工具清单中，违反“只报告受管 shim”的接口语义，造成错误告警和排障干扰。
- 修复：以 16 KiB 为上限读取文件头部，先识别前 10 行内的受管标记；无标记时直接忽略，有标记且文件超过限制时继续报告 `shim exceeds size limit`。
- 回归测试：已增加一个超过 16 KiB、无受管标记的普通文件，并断言它不进入 `tools` 和 `summary`。
- 状态：已解决。

## 5. 建议补充

### P2-01 补齐计划中约定的边界测试

当前测试覆盖 Node/native 正常目标、目标缺失、native 权限不足、越界符号链接、旧版 shim、重复字段、状态筛选、普通及超大非受管文件和超大受管 shim。建议继续补充：

- 目标路径实际指向目录时返回 `target not a file`。
- Node 目标不可读时返回 `target not readable`。
- 非法工具名/命令名、控制字符和非法绝对路径。

### P2-02 增加命令层最小冒烟测试

现有功能测试直接调用 `scanSandboxTools`，`verify:agent-tools` 主要验证命令注册和帮助信息。建议增加命令执行层测试，至少覆盖：

- `ae-cli agent +list-sandbox-tools --dry-run` 的标准输出信封。
- 非法 `--status` 的错误语义。
- `--status broken` 从命令上下文传递到扫描函数。

这不是当前功能的阻断项，但可以防止命令注册、参数解析或统一输出层未来发生回归。

### P2-03 可选的后续完整性增强

当前 `active` 表示标记中的目标路径合法且权限正确，不校验 shim 可执行正文是否真的调用该目标。若后续需要把 `active` 提升为“命令行为也可信”，可在 shim 中加入内容校验值，或用统一模板生成后比对关键执行语句。本项超出当前已确认需求，不建议在本次分支中扩展。

## 6. 质量评价

| 维度 | 评价 | 说明 |
| --- | --- | --- |
| 业务逻辑 | 绿色 | 主流程完整，P1-01 边界误报已修复 |
| 安全性 | 绿色 | 对 shim 符号链接、目标 realpath、根目录越界、文件类型和权限均有防护 |
| 异常处理 | 绿色 | 单条坏记录不会阻断扫描，并提供可理解的 `reason` |
| 性能 | 绿色 | 扫描目录规模有限，读取有大小上限；修复 P1-01 时应继续采用有界读取 |
| 测试 | 黄色 | 主路径覆盖较好，仍缺 P1 回归和少量既定边界用例 |
| 文档 | 绿色 | Skill 索引、用途、限制、输出结构和故障处理说明完整 |
| 代码质量 | 绿色 | 模块边界清晰、类型明确，与现有 Command 模式一致 |
| 依赖与配置 | 绿色 | 未新增运行时依赖，构建和发布检查通过 |

## 7. 验证记录

以下命令均已在当前分支执行：

- `npm run build`：通过。
- `npm test`：通过，包含 `sandbox-tools functional tests passed`。
- `npm run verify:agent-tools`：通过，67 个命令均完成验收。
- `npm run check:release`：通过。
- `node self-check/scan.mjs --since origin/release/6.0`：退出码 0，无 P1/P2；报告的 5 个 P3 为仓库级既有建议，不由本次变更引入。

首次执行测试时，本地 `node_modules` 缺少锁文件中已声明的 `jq-wasm`，执行 `npm ci` 恢复依赖后全部通过；这不是分支代码或依赖声明问题。

## 8. 合入建议

P1-01 及其回归测试均已完成，相关测试、命令验收和构建重新执行通过。无需扩大功能范围即可合入 `release/6.0`。
