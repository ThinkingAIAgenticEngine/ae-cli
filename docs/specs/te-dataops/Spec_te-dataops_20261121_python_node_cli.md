---
id: Spec_te-dataops_20261121_python_node_cli
title: DataOps CLI 支持工作流 Python 节点与环境目录发现
modules: [te-dataops]
created: 2026-11-21
updated: 2026-11-21
related_documents:
  - skills/ae-dataops/SKILL.md
  - skills/ae-dataops/references/dataops-flow-python.md
  - skills/ae-dataops/references/dataops-flow-create.md
  - skills/ae-dataops/references/dataops-flow-monitor.md
status: verified-e2e
risk_level: P1
---

# DataOps CLI 支持工作流 Python 节点与环境目录发现

## 背景

数据开发平台（Gaia 6.0）已在工作流中上线 `PYTHON` 类型节点（支持 Python 3.11 容器执行、`requirements.txt` 按需装包、`${paramKey}` 输入替换、`TE_OUTPUT:` 单行 JSON 输出参数及 `/dw/<space>/product|exchange` 目录挂载），但 `ae-cli` 的 `dataops_flow` 尚未提供 Python 节点的编排、环境发现与工作区目录查看能力。

## 目标

在现有 `dataops_flow` 服务下新增 Python 节点的创建、局部更新、DEV 定义读取、版本/包源发现及挂载根/开发目录有界浏览共 7 个命令，支持本地单文件 `.py` 与 `requirements.txt` 调试后无损上传，并同步完善 `ae-dataops` Skill 操作规范与自动化契约测试。

## 范围

- 在 `src/commands/te-dataops/flow/` 新增并注册 7 个 Transitional 命令（统一 `camelCase` 参数，`--spaceCode` 必填）：
  1. `+create_python_task`（`write`）
  2. `+update_python_task`（`write`）
  3. `+get_python_task`（`read`）
  4. `+list_python_versions`（`read`）
  5. `+list_python_package_sources`（`read`）
  6. `+list_python_directories`（`read`）
  7. `+browse_python_directory`（`read`）
- 在 `src/commands/te-dataops/shared.ts` 注册对应 `/api/cli/dataops/v1/gaia/workflow/*` 路由，允许 `flow_update_python_task` 透传显式空字符串 `requirementsTxt=""` 与 `remark=""`，并将 Gaia 业务鉴权拒绝 `return_code = -10`（`ReturnCode.NO_AUTH`）映射为 `PermissionError`（`type: "permission"`、`code: "-10"`，不再落入 `runner.ts` 的 `looksLikeAuthFailure` 误报重登提示；会话失效 `-1001` 仍保持 `auth`）。
- 更新 `skills/ae-dataops/SKILL.md`、`skills/ae-dataops/references/dataops-flow-create.md` 与 `skills/ae-dataops/references/dataops-flow-monitor.md`，并新增渐进披露子参考 `skills/ae-dataops/references/dataops-flow-python.md`（承载 7 个 Python 命令、单行单参 `TE_OUTPUT:` 严格协议与失败边界、`dwWorkflowEdit` 权限边界及 DEV/PROD 边界；`dataops-flow-create.md` 保留原 `### Step 5b` 锚点跳转链接、补齐 `+preview_release_flow` 上游 `OUT` 参数 `refuseReason` 说明与 Quick Reference `Risk` 列、深度精简 `Parameter Notes` 重复项并刷新 `Review after: 2026-12-21`；`dataops-flow-monitor.md` Workflow B 补充 Python 排障线索）。
- 新增聚焦契约测试 `tests/dataops-python-task-contract.test.ts` 并补齐 `tests/dataops-integration.test.ts`（`-10` `PermissionError` 与 `-1001` `auth` 回归）及 `tests/dataops-flow-task-contract.test.ts`（`Review after: 2026-12-21`）。
- 不包含集群默认包源设置（超管能力）与跨空间文件目录共享区授权改写。

## 期望行为

- **脚本与依赖双入口互斥**：
  - 创建和更新支持 `--scriptFile <path>` 与 `--script <string>` 互斥、`--requirementsFile <path>` 与 `--requirements <string>` 互斥。
  - 文件参数仅允许指向单个存在的本地普通文件（UTF-8 读取），禁止目录或符号链接之外的特殊文件；CLI 在本地（含 `--dry-run`）校验脚本与依赖 UTF-8 字节总和不超过 `524,288`（512 KiB）。
  - 创建必填非空白脚本；更新至少提供一项变更字段，未传字段保持原值，`--requirements ""`（或空依赖文件）清空依赖，`--remark ""` 清空备注，空白脚本/版本/包源本地直接拒绝。
- **输出参数声明 `--outputParams`**：
  - JSON 数组，每项仅允许 `paramKey`（必填，匹配参数命名规则且不为保留名 `env`）与可选 `remark`（最长 200 字符），数组内 `paramKey` 不得重复。
  - 更新时省略保留原 `OUT` 声明、传 `'[]'` 清空、传非空数组全量替换。
- **DEV 定义读取与生产运行实例分工**：
  - `+get_python_task` 固定读取 `DEV` 定义（无 `--env` 参数）；生产实际执行快照与日志由既有 `dataops_operations +get_task_instance_detail` 的 `definition.task.pythonTask` 与 `log` 承载。
- **有界目录浏览**：
  - `+list_python_directories` 查询 DEV/PROD 共用的授权挂载根元数据；
  - `+browse_python_directory` 浏览 DEV 物理目录，可选 `--path`、`--maxDepth`（`1..3`，默认 `2`）、`--maxEntries`（`1..500`，默认 `200`）。
- **Skill 约束**：
  - 明确单文件 `main.py` 约束（禁止拆分多本地 `.py` 模块互相 `import`），优先推荐本地文件调试后通过 `--scriptFile` / `--requirementsFile` 上传，说明 `TE_OUTPUT:` 严格单行单参协议（`{"name":"<paramKey>","value":<jsonValue>}`，格式错误会导致任务 `FAIL`，须预先通过 `--outputParams` 声明）、`dwWorkflowEdit` 权限边界、`+preview_release_flow` 上游 `OUT` 参数 `refuseReason` 提示、DEV/PROD 目录与调试执行边界、Workflow B Python 排障线索、Quick Reference `Risk` 列，以及容器非 root（`--user` 装包）运行边界，并刷新 `dataops-flow-create.md` 的 Transitional `Review after: 2026-12-21`。

## 波及与兼容性结论

- `te-cli`：`src/commands/te-dataops/`、`skills/ae-dataops/`、`tests/`、`package.json`。
- 配对后端 `gaia`（`feat/dataops-python-node-6.0`，基于 `origin/feature/6.0/260828_task_python`）：需同步部署 `/api/cli/v1/gaia/workflow/python-*` 接口及发布预览增强。
- **公开契约兼容性（对照 `docs/compatibility-policy.md`）**：
  - **既有命令与参数**：既有 SQL、集成、检查节点、流参数、运维及表管理命令路径、flag、默认值与成功输出结构无移除或破坏性变更。
  - **DataOps `-10`（`ReturnCode.NO_AUTH`）错误归类修复**：`src/commands/te-dataops/shared.ts` 将 Gaia HTTP 200 + `return_code = -10` 从裸 `Error`（原被 `runner.ts` `looksLikeAuthFailure` 误判为 `error.type="auth"` + `hint="Run: ae-cli auth login"`）修正为 `PermissionError`（`error.type="permission"`、`error.code="-10"`、权限提示，退出码仍为 `1`，`error.message` 仍保留原格式 `AE API error: <returnMessage> (code: -10)`），与 `src/core/errors.ts`（F-016/F-018）及 `src/core/mcp.ts` / `capability-api.ts` 规范一致；真正的会话失效 `-1001`（`INVALID_SESSION`）与其他非 0 业务码保持原归类不变。
  - **已发布 Skill 连续性**：复用既有 `skills/ae-dataops`（不新建独立 Skill、不删除或改名已有 reference），仅在其 `references/` 下新增渐进披露子参考 `dataops-flow-python.md` 承载 7 个 Python 节点命令与协议细则，同时在 `dataops-flow-create.md` 原 `### Step 5b: Create, Read, or Modify Python Task Nodes` 锚点位置保留跳转入口，保持全部既有外部路径与标题锚点兼容；未发版分支维持已递增版本 `ae-dataops: 2.3.0` / `dataops-flow-create: 1.1.0` / `dataops-flow-monitor: 1.1.0`（新子参考 `dataops-flow-python: 1.0.0`）；不动无关的 `dataops-backfill.md`。
  - **未验证组合**：旧版本 `ae-cli` 对新 `gaia` 仅不暴露 7 个新 Python 命令（既有接口契约未变）；本次 `-10` `PermissionError` 修正通过本地 mock 服务端 + `dist/index.js` 真实 runner 端到端验证，未在 `ta1-60` 再次创建临时低权限账号复跑（该权限链路此前已在 `ta1-60` 14/14 验证后端确返回 `return_code: -10`）。

## 测试用例与验证

| 类型 | 场景与预期 | 状态 | 证据 |
| --- | --- | --- | --- |
| 正向契约 | 7 个命令注册、risk 等级、`--scriptFile`/`--requirementsFile` 读取与 `--dry-run` URL/params/body 精确匹配后端契约 | passed | `npx tsx tests/dataops-python-task-contract.test.ts`（6/6 passed）及 `dist/index.js` 7 条真实 `--help` + `--dry-run` 通过 |
| 反向与边界 | 互斥参数同时传入、脚本/依赖超 512 KiB、目录或缺失文件、空白脚本/版本/包源、空更新、`outputParams` 非法键/重复/保留字、`maxDepth`/`maxEntries` 越界均在本地被 `CliValidationError` 拦截 | passed | `tests/dataops-python-task-contract.test.ts` 全部反向断言通过 |
| 清空与三态更新 | `--requirements ""`、`--remark ""`、`--preTasks '[]'`、`--outputParams '[]'` 在 dry-run 与传输层原样保留，省略时不传输 | passed | 契约单测与 `node dist/index.js --dry-run dataops_flow +update_python_task` 实测确认 |
| `-10` 权限错误归类 | Gaia HTTP 200 `return_code`/`returnCode = -10` 抛出 `PermissionError`（`type="permission"`、`code="-10"`、不重试、无重登 hint）；`-1001` 仍保持 `auth` 归类 | passed | `tests/dataops-integration.test.ts`（24/24 passed）及 `dist/index.js` 连接本地 mock HTTP 服务端验证输出 `ok:false`、`error.type="permission"`、`code="-10"`、`exit=1` |
| 工程与发布门禁 | `npx tsc --noEmit`、`npm run build`、`npm test`、DataOps 全部 9 份聚焦测试、`npm run check:release` | passed | `tsc --noEmit` 0 错误、`npm run build` 通过、`npm test` 全绿、全部 9 份 `tests/dataops-*.test.ts` 共 110 项测试 0 失败、`npm run check:release` 6/6 checks 通过（含 `skill-risk-examples`） |
| `ta1-60` 端到端联调 | 本地 `dist/index.js` 连接 `http://ta1-60:8996`（`cli` 空间）实测 7 个新命令、非 PYTHON 节点拦截、低权限用户两类拦截、局部更新/清空、`+preview_release_flow` 新旧 4 字段对比、两轮发布与真实 PROD 容器运行回读 | passed | 主链路 16/16 项通过（流 `11674134222336`，包 `20261121_1`/`20261121_2`，PROD 实例 `791` 双节点 `SUCCESS`，`six==1.16.0` 安装与 `TE_OUTPUT:` 传递确认）；低权限账号 `cli_py_lowpriv_20261121` 经浏览器登录与设备码授权完成真实 CLI 认证，在“无空间权限”与“有 `cli` 空间只读权限（`dwDataTableView`+`dwOMInstanceView`，无 `dwWorkflowEdit`）”两场景下 7 个 Python 命令均被 `-10`（`type=auth`）拦截，且后者 `+list_spaces`/`+list_flows` 正常通过、写入零副作用（临时用户与角色已清理） |

## 端到端测试

已在 `http://ta1-60:8996`（已部署本次 `gaia` 包 `SHA=c06fd4cadb3b2472f8d5e541236667c753fd5ffc0247a75d71bf901a5ab9e759`，原包备份于 `/data/home/ta/codex_backups/original-ta-gaia-20261121.jar`）使用本地构建的 `dist/index.js` 完成全链路与低权限实测，结果 `passed`：

1. **环境与目录发现**：`+list_python_versions`（`["3.11"]`）、`+list_python_package_sources`（`aliyun`/`pypi`，默认 `aliyun`）、`+list_python_directories`（`/dw/cli/product`、`/dw/cli/exchange`）及 `+browse_python_directory`（省略 `--path` 跳过虚拟父目录返回 `roots` + 显式 `--path`）全部通过。
2. **读取与反向拦截**：`+get_python_task` 读取既有节点 `check_python_image` 验证无 `args`/`timeout*` 白名单投影；对 `TRINO_SQL` 节点调用 `+get_python_task` 与 `+update_python_task` 均被 `-1003` 拒绝。
3. **文件上传与局部更新**：在 `cli` 空间创建隔离流 `cli_python_e2e_20261121062919`（`flowCode=11674134222336`，关闭调度）与流参数 `e2e_tag=cli_py_v1`，通过 `--scriptFile` + `--requirementsFile` 创建 `py_producer`（`11674134467712`）与下游 `py_consumer`（`11674135293440`）；验证 Omit-to-Keep 局部更新、`--requirements ""` / `--remark ""` 清空以及 `--outputParams '[]'` / `--preTasks '[]'` 三态清空。
4. **发布预览与真实 PROD 执行**：`+preview_release_flow` 验证首次 `newPythonTask` 与二次更新 `oldPythonTask` / `newPythonTask` 对比；发布 `20261121_1` / `20261121_2` 后 `+execute_flow`（`executeId=117`、`flowInstanceId=791`）在真实 Python 3.11 容器完成 `six==1.16.0` 安装并透传 `py_greeting=hello_cli_py_v1_six_1.16.0` 至下游节点，通过 `dataops_operations +get_task_instance_detail --includeLog true` 回读历史 `definition.task.pythonTask`、`runtimeParams.outputParams` 与日志均符合预期。
5. **真实低权限网关拦截验证**：创建临时低权限账号 `cli_py_lowpriv_20261121`（`userId=14`），在浏览器完成登录、首次改密及 `ae-cli auth login` 设备码授权（隔离 `HOME`，不改动本机 `root` 凭据）：
   - **无空间成员资格场景**：`auth status` 与 `+list_spaces`（空）通过，7 个 Python 命令全部返回 `exit=1`、`error.type=auth`、`code=-10`（`Unauthorized operation, please contact the administrator`）。
   - **空间成员但无 `dwWorkflowEdit` 场景**：在 `cli` 空间创建自定义角色 `cli_py_no_wf_edit_20261121`（仅授予 `dwDataTableView`、`dwOMInstanceView`，`dwWorkflowEdit=0`）并分配给该用户；`+list_spaces` 返回 `cli` 且 `+list_flows --spaceCode cli` 成功（`totalCount=9`），证明空间身份有效；全部 7 个 Python 命令均返回 `exit=1`、`error.type=auth`、`code=-10`，且通过 `root` 复核测试流节点数（2）与备注无任何写入副作用。
   - 测试完毕已将临时空间成员、自定义角色与临时公司账号清理完毕。
6. **未覆盖边界**：`cli`/`test`/`default` 空间 DEV 目录当前为空，多级物理文件与 `maxEntries`/20 次列举截断分支由后端单测覆盖。

## 准出结论

- 阶段：E2E Verified
- 结论：通过（本地单测/门禁 + `ta1-60` 全链路与真实低权限端到端实测通过；待用户确认后提交代码）
- 剩余风险：多级非空大目录的物理截断未在 `ta1-60` 现场造数（已由 `McpPythonTaskServiceTest` 覆盖）；`ta1-60` 当前保留新版 `gaia` 运行，可随时通过备份包回滚。
- 后续验证：用户复核后按双仓规范提交/发起 MR。
- 验证人：Gemini
- 日期：2026-11-21
