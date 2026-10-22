# Agent Evaluation CLI 同步补充说明（2026-09-12）

## 1. 任务目标

将 `agent-test` 当前公开业务 API 和产品工作流同步到 `te-cli` 的 `evaluation` 域。本文是给实施 Agent 的执行说明，不是产品历史记录。

实施边界：

- 源端事实源：`/Users/jatny/agent-test`，基线分支 `ferat/agent_eval_deloy`，审计时 HEAD 为 `a2fdc5b`。
- CLI 目标：`/Users/jatny/te-cli`，基线分支 `feat/ae-evaluation-domain`，审计时 HEAD 为 `183abb9e`。
- 上一次已知同步参考点：`agent-test` 的 `7060152`（2026-08-18）。
- 当前 CLI 有 75 个 evaluation 命令；本轮新增 27 个公开 API operation，并有多处已有命令契约漂移。
- 不修改 `agent-test`；只修改 `te-cli`。
- 不提交代码。除非用户后续明确要求，否则禁止 `git commit`。
- 不执行生产写请求，不记录或输出 token、credential secret、signed URL、Agent 原始输出或 Trace 敏感正文。

开始实现前必须重新确认两个仓库 HEAD 和工作区状态。如果 `agent-test` 已经前进，不要继续按本文猜测；先重跑契约差异检查并更新本文结论。

## 2. 权威资料顺序

不要仅根据本文或 README 实现，请按以下顺序核对：

1. `/Users/jatny/agent-test/docs/product/agent-evaluation-mvp-product.md`
2. `/Users/jatny/agent-test/docs/openapi/openapi.yaml`
3. `/Users/jatny/agent-test/apps/server/internal/transport/http/*.go`
4. `/Users/jatny/agent-test/docs/architecture/contracts/schemas/` 与 `fixtures/`
5. `/Users/jatny/te-cli/docs/capability-command-admission.md`
6. `te-cli` 现有 `src/commands/evaluation/*.ts` 的局部写法

`agent-test/AGENTS.md` 要求工程请求先调用 `/ask-matt`。当前审计会话没有该 Skill，项目内也未发现可读取定义；实施 Agent 如果具备该能力，必须先调用。

## 3. P0：先修复现有命令的兼容问题

### 3.1 API 路由前缀

当前服务端实际注册路径为：

```text
/agenteval/api/v1/...
```

证据：

- `apps/server/internal/types/route.go`：`AppRoutePrefix = "/agenteval"`
- `apps/server/internal/transport/http/router.go`：`AppRoutePrefix + "/api"`
- `deploy/k8s/ingress.yaml`：前缀原样转发，不 rewrite

当前 CLI 的 `EVAL_API_PREFIX` 仍为 `/api/v1`，默认 endpoint 只包含 origin，因此线上默认请求会打到错误路径。

要求：

- 统一跟随当前 AE Host，通过 `--host` 切换；旧 `--endpoint` 和 `AE_EVAL_BASE_URL` 只接受与当前 Host 等价的地址，不再允许独立覆盖。
- 将业务路径统一拼为 `/agenteval/api/v1/...`。
- 归一化结尾 `/`，避免 `//` 或重复 `/agenteval`。
- 更新所有 help、README、Skill 和 transport 测试中的旧路径。
- 继续拒绝 loopback endpoint，除非用户另行改变“仅线上执行”的既有决策。

### 3.2 `+validate_run`

当前 API：`POST /evaluation-runs/{id}/validate`，无 request body、无 `lock_version`。

要求：

- 删除 `--lock-version` flag。
- dry-run 与 execute 均不发送 body。
- Skill 工作流中 validate 不再要求先读取 lock version；`+start_run` 仍必须使用最新 `lock_version`。

### 3.3 Run 创建与更新

当前 CLI 强制 `execution_mode=LIVE_AGENT`，不支持已发布评测集版本。当前产品支持：

- `LIVE_AGENT`：被测对象为 `AGENT` 或 `MODEL`。
- `PRESET_RESULT`：直接从已发布评测集字段评分，不调用 Agent/模型。
- `IMPORTED_OUTPUT`：仅为服务端历史数据兼容，不应作为新 CLI 工作流推荐或默认暴露。

修改 `+create_run`、`+update_run`：

- 新增 `--dataset-version-id <uuid>` → `dataset_version_id`。
- 新增 `--execution-mode LIVE_AGENT|PRESET_RESULT`；默认仍为 `LIVE_AGENT`。
- `PRESET_RESULT` 下不得要求或发送 `agent_config_id` / `model_config_id`。
- `LIVE_AGENT + AGENT` 使用 `--agent-config-id`；`LIVE_AGENT + MODEL` 使用 `--model-config-id`。
- 更新 flags 描述和 Skill 示例，明确 Run 必须选择发布版本。
- 保留 `--dataset-id` 仅当当前 API/服务仍要求或允许；不要自行删除兼容字段。

### 3.4 固定评估器版本

修改 `+select_run_evaluators`：

- 保留 `--evaluator-ids`。
- 新增可选 `--evaluator-versions-json`，发送：

```json
[
  {"evaluator_id":"<uuid>","version_id":"<uuid>"}
]
```

- 本地校验每项都包含字符串 `evaluator_id` 和 `version_id`。
- 文档说明一个 Run 应固定已发布评估器版本，不能猜 UUID。

### 3.5 `+run_cases` 查询能力

在现有参数上补充：

| CLI flag | Query field | 约束 |
|---|---|---|
| `--evidence-completeness` | `evidence_completeness` | `NONE|PARTIAL|COMPLETE|UNKNOWN` |
| `--search` | `search` | 最长 128；会匹配 Agent 输出、公开错误、外部 run/session ID 和 runtime fingerprint |
| `--evaluation-status` | `evaluation_status` | `PENDING|RUNNING|SUCCEEDED|PARTIALLY_FAILED|FAILED|CANCELLED` |
| `--score-status` | `score_status` | `PENDING|RUNNING|SUCCEEDED|FAILED|CANCELLED` |
| `--evaluator-id` | `evaluator_id` | 单个 run evaluator UUID |
| `--evaluator-ids` | `evaluator_ids` | 1—8 个 run evaluator UUID，按 API 需要发送逗号分隔字符串 |
| `--score-gte` | `score_gte` | 0—1 |
| `--score-lte` | `score_lte` | 0—1 |
| `--field-filters-json` | `field_filters` | 最多 5 个类型化过滤条件，序列化为 JSON query string |
| `--sort-evaluator-id` | `sort_evaluator_id` | `sort=EVALUATOR_SCORE` 时使用 |
| `--offset` | `offset` | 非负整数 |

现有 `--min-score`、`--max-score`、`--sort`、`--order`、`--cursor`、`--limit` 保留。查询日志不得记录 query 值；`eval-client` 当前 URL redaction 行为必须保持。

### 3.6 现有集成类型说明

- `+create_model_config` 和 `+update_model_config` 的 provider 文档补充 `TE_CLAUDE_WEB`。
- `+create_credential` 支持 `AI_MONITOR_SESSION`，新增：
  - `--data-token` → `data_token`，最长 512，敏感。
  - `--report-source` → `report_source`，最长 128，敏感。
  - 两者在 `AI_MONITOR_SESSION` 下必填；普通 credential 不发送。
  - dry-run 必须对 `secret`、`data_token`、`report_source` 脱敏。
- Agent 文档补充 Hermes 直连：`AGENT_CONFIG_V2.config.hermes.transport_mode=DIRECT`。不要新增未经服务端契约支持的顶层 flag。
- 字段映射文档补充 `FIELD_MAPPING_V5`：支持 `TEMPLATE` 输入，以及 `AGENT_TOOL_SUMMARY`、`AGENT_ARTIFACT_SUMMARY`、`AGENT_EXECUTION_STATUS` 证据源。

## 4. P1：新增 27 个当前公开 operation 的 CLI 入口

沿用 evaluation 域现有 `+snake_case` 命名与独立文件模式。所有源码字符串、注释、flag 描述和 CLI 输出必须是英文。

### 4.1 版本管理（7 个）

| 建议命令 | Method + path（省略 `/agenteval/api/v1`） | Flags | Risk |
|---|---|---|---|
| `+list_dataset_versions` | `GET /datasets/{id}/versions` | `--id` dataset UUID | read |
| `+publish_dataset_version` | `POST /datasets/{id}/versions` | `--id --lock-version` | write |
| `+get_dataset_version` | `GET /datasets/{id}/versions/{versionId}` | `--id --version-id` | read |
| `+list_evaluator_versions` | `GET /evaluators/{id}/versions` | `--id` evaluator UUID | read |
| `+publish_evaluator_version` | `POST /evaluators/{id}/versions` | `--id --lock-version` | write |
| `+create_next_task_version_draft` | `POST /evaluation-runs/{id}/new-version` | `--id` source Run UUID | write |
| `+list_evaluation_task_versions` | `GET /evaluation-tasks/{taskId}/versions` | `--task-id` | read |

版本语义必须写入 Skill：工作副本与已发布版本不同；发布无变化时返回 `ASSET_VERSION_NO_CHANGES`；Run 和 schedule 固定版本，旧版本不可被覆盖。

### 4.2 TE 回传、AI Monitor 与目录发现（7 个）

| 建议命令 | Method + path | Flags | Risk |
|---|---|---|---|
| `+get_te_report_config` | `GET /te-report-config` | 无业务 flag | read |
| `+save_te_report_config` | `PUT /te-report-config` | `--base-url --app-id [--lock-version]` | write |
| `+get_ai_monitor_connection` | `GET /ai-monitor-connection` | 无业务 flag | read |
| `+save_ai_monitor_connection` | `PUT /ai-monitor-connection` | `--base-url --credential-id --session-claims-json [--lock-version]` | write |
| `+verify_ai_monitor_connection` | `POST /ai-monitor-connection/verify` | 无业务 flag | read |
| `+import_ai_monitor_traces` | `POST /datasets/ai-monitor-imports` | `--name [--description] --selection-json [--idempotency-key]` | write |
| `+list_te_claude_catalog` | `POST /agents/te-claude/catalog` | `--endpoint-url --credential-id` | read |

补充约束：

- `save_*` 的 `lock_version` 在首次创建时省略，更新已有配置时从对应 get 命令读取。
- `--session-claims-json` 至少包含 `user_id`、`te_user_id`、`name`、`company_id`；支持 `is_root`、`platform_access`。日志和 dry-run 不得泄露不必要的身份/权限内容。
- `--selection-json`：
  - FILTER：`mode,start_time,end_time`，可带 `agent,channel,search_term`。
  - TRACE_IDS：`mode,trace_ids`，1—1000 个 ID。
- AI Monitor 导入成功返回 dataset 和 import job；复用现有 `+dataset_import_status` 轮询 dataset，不要把 201 解释为导入完成。

### 4.3 评估器优化、健康与校准（10 个）

| 建议命令 | Method + path | Flags | Risk |
|---|---|---|---|
| `+optimize_evaluator_prompt` | `POST /evaluators/prompt-optimization` | `--model-config-id --prompt` | write |
| `+get_evaluator_health` | `GET /evaluators/{id}/health` | `--id` evaluator UUID | read |
| `+list_calibration_suites` | `GET /evaluators/{id}/calibration-suites` | `--id` evaluator UUID | read |
| `+create_calibration_suite` | `POST /evaluators/{id}/calibration-suites` | `--id --name [--description]` | write |
| `+list_calibration_cases` | `GET /calibration-suites/{id}/cases` | `--id` suite UUID | read |
| `+create_calibration_case` | `POST /calibration-suites/{id}/cases` | `--id --variables-json --expected-score --tolerance --tags-json` | write |
| `+delete_calibration_case` | `DELETE /calibration-cases/{id}` | `--id --lock-version` | high-risk-write |
| `+start_calibration_run` | `POST /calibration-suites/{id}/runs` | `--id` suite UUID | write |
| `+get_calibration_run` | `GET /calibration-runs/{id}` | `--id` calibration run UUID | read |
| `+list_calibration_results` | `GET /calibration-runs/{id}/results` | `--id` calibration run UUID | read |

`+optimize_evaluator_prompt` 会调用模型并消耗额度，所以不要标成纯 read。Prompt 优化只返回预览，不应自动覆盖评估器。

产品 UI 将 calibration suite 视为内部/default container；Skill 的推荐流程应以“获取默认 suite → 管理 Golden Cases → 启动校准”为主，不鼓励用户无目的创建多个 suite，但 CLI 仍需完整覆盖当前公开 API。

### 4.4 运行失败重试与 Trace（3 个）

| 建议命令 | Method + path | Flags | Risk |
|---|---|---|---|
| `+retry_failed_run_cases` | `POST /evaluation-runs/{id}/retry-failed-cases` | `--id --lock-version` | write |
| `+get_run_case_trace` | `GET /evaluation-runs/{id}/cases/{caseRunId}/trace` | `--id --case-run-id` | read |
| `+retry_run_case_trace` | `POST /evaluation-runs/{id}/cases/{caseRunId}/trace:retry` | `--id --case-run-id` | write |

语义：

- failed-case retry 只重跑 Agent 阶段为 `FAILED|BLOCKED|UNKNOWN` 的 Case，保留成功 Case，沿用不可变 Run 快照，增加 execution epoch，并重算聚合。
- Trace 仅适用于 `LIVE_AGENT + AGENT`；capture 状态独立于 Run/Case 成败。
- Trace 最多 500 spans，可能截断；不得把 `PARTIAL` 或只有外部引用描述成完整轨迹。
- Trace retry 是 ADMIN-only，只适用于可重试的 AI Monitor-backed capture；不需要 body。
- Skill 必须提醒 Agent 不回显隐藏思维链、credential、Cookie、认证 Header 或未经脱敏的工具输入输出。

完成 P0 + 全部 P1 后，evaluation 命令总数应从 75 变为 102。

## 5. P2：历史公开 API 遗漏，必须显式决策

以下 6 个 operation 在旧基线中已存在，但当前 CLI 没有命令。不要混入“本轮新增 27 个”的计数；实施时按 `docs/capability-command-admission.md` 明确决定收录或记录排除理由：

| Operation | 建议命令 | 建议 |
|---|---|---|
| `getFile` | `+get_file` | 收录；补齐 export → metadata → download-url 链路。 |
| `listDatasetReferences` | `+list_dataset_references` | 收录；删除/版本决策前有明确安全价值。 |
| `getRunDistribution` | `+run_distribution` | 可收录；提供按 `--run-evaluator-id` 查看固定分桶。 |
| `copyRunCase` | `+copy_run_case` | 谨慎收录；确认 POST 的原因、脱敏保证和输出边界。 |
| `transferRunOwner` | `+transfer_run_owner` | 收录时必须 `high-risk-write`、ADMIN、`--lock-version`。 |
| `listProjectMembers` | `+list_project_members` | 可收录，便于 transfer-owner 发现真实 user UUID；ADMIN/read。 |

如果 6 个全部收录，总数为 108。健康检查和 3 个 auth-session operation 不属于普通 evaluation 业务命令，不收录。

## 6. 文件改动清单

最低要求：

- 修改 `src/commands/evaluation/shared.ts`：统一路由前缀和必要 helper。
- 修改已有命令：
  - `validate-run.ts`
  - `create-run.ts`
  - `update-run.ts`
  - `select-run-evaluators.ts`
  - `run-cases.ts`
  - `create-model-config.ts`
  - `update-model-config.ts`
  - `create-credential.ts`
- 新增 P1 对应的 27 个命令文件。
- 在 `src/commands/evaluation/index.ts` 中同时完成 import、commands 数组注册和具名 export。
- 更新 `skills/ae-evaluation/SKILL.md`：版本号、命令表、工作流、JSON 示例、安全约束、Transitional 记录。
- 更新 `README.md` 的 evaluation 简介和主流程示例。
- 更新 `docs/evaluation-full-api-coverage.md`：当前“已关闭全部 workflow gap”的表述已过时；追加 superseded/补充说明或改为准确状态。
- 更新 `scripts/verify-evaluation-tools.mjs` 的计数，并避免只用数量代表 API 契约正确。
- 更新 `tests/evaluation-client.test.ts` 的 `/agenteval/api/v1` 预期。
- 新增命令请求契约测试，建议 `tests/evaluation-command-contract.test.ts`，至少断言 method、path、params、body、risk、敏感字段脱敏和注册。

所有新 Transitional 命令应在 Skill 中集中记录：

```text
Transition status: transitional
Owning module: agent-test
Current transport: Agent Evaluation REST API
Gateway target: TBD
Review after: 2026-12-12
Exit condition: migrate to capability gateway or retain only commands with L1/L2 value
```

## 7. 必测契约

至少添加以下自动化断言：

1. 默认 endpoint + 命令 path 精确生成 `/agenteval/api/v1/...`，不重复前缀。
2. `+validate_run` 无 body、无 lock flag。
3. `+create_run` / `+update_run` 正确发送 `dataset_version_id` 和 `PRESET_RESULT`，且不偷偷强制 LIVE_AGENT。
4. `+select_run_evaluators` 正确发送 `evaluator_versions`。
5. `+run_cases` 的新增 query 全部正确映射，`field_filters` 只序列化一次。
6. `AI_MONITOR_SESSION` 的三个敏感值不会出现在 command log 或 dry-run。
7. `save_te_report_config`、`save_ai_monitor_connection` 首次创建可省略 lock，更新可发送 0 及以上版本；不要用 truthy 判断误丢失 `0`。
8. dataset/evaluator publish body 为 `{lock_version}`。
9. retry failed cases body 为 `{lock_version}`；trace retry 无 body。
10. `delete_calibration_case` 和所有 transfer/delete 命令保持 high-risk confirmation。
11. Prompt、search、field filters、Trace 内容不会进入 URL 日志。
12. `evaluation --help` 展示全部已登记命令，且所有 flag 均有英文 desc。

## 8. 验证命令与交付证据

实施 Agent 完成后执行：

```bash
npm run build
npm test
npm run verify:evaluation-tools
npm run self-check
git diff --check
```

同时执行代表性 dry-run，至少覆盖：

```bash
ae-cli evaluation +validate_run --id <uuid> --dry-run
ae-cli evaluation +create_run --name test --dataset-version-id <uuid> --execution-mode PRESET_RESULT --dry-run
ae-cli evaluation +select_run_evaluators --id <uuid> --evaluator-ids '["<uuid>"]' --evaluator-versions-json '[{"evaluator_id":"<uuid>","version_id":"<uuid>"}]' --lock-version 0 --dry-run
ae-cli evaluation +import_ai_monitor_traces --name test --selection-json '{"mode":"TRACE_IDS","trace_ids":["trace-1"]}' --idempotency-key test-key --dry-run
ae-cli evaluation +retry_failed_run_cases --id <uuid> --lock-version 0 --dry-run
ae-cli evaluation +retry_run_case_trace --id <uuid> --case-run-id <uuid> --dry-run
```

交付时提供：

- `git diff --stat`。
- 新增/修改命令清单和最终命令总数。
- 每条验证命令的通过/失败摘要。
- 未执行的 live 验证及原因。
- P2 六个历史遗漏各自的收录或排除决定。
- 不创建 commit。

## 9. 本 Agent 后续复核清单

收到实施结果后，本 Agent 将独立验证：

- 重新读取两个仓库 HEAD，确认没有基线漂移。
- 将 OpenAPI operation、server router 和 CLI 注册重新做三方映射。
- 检查所有 P0 body/query/path 差异。
- 检查每个新增命令的 risk、required flags、lock_version、dry-run 和敏感字段。
- 运行 build、smoke、evaluation 专项测试和 diff check。
- 对代表命令做 help/dry-run 黑盒检查。
- 若用户提供可安全使用的线上测试环境，再单独设计只读优先、精确清理的 live E2E；本文不授权生产写测试。


## 2026-10-22 安全迁移补充

用户已明确要求修复评测安全扫描发现的问题。保留全部命令、Skill 入口和旧 flag 的解析，但 `--endpoint` / `AE_EVAL_BASE_URL` 不再切换请求目标：与当前 AE Host 等价的旧值继续接受，其他值返回结构化校验错误，迁移到 `--host`。评测和会话请求沿用当前 AE Host 的 HTTP/HTTPS 协议（与其他 AE 域一致），拒绝 URL 用户信息、查询串、片段和本机地址；会话换取拒绝重定向并增加 30 秒超时。路径 ID 保留既有字母、数字、下划线和连字符形式，拒绝路径/查询注入，不改变请求体中的业务字段。取消运行改为 high-risk-write，非交互调用需经授权后传全局 `--yes`。

这些客户端安全边界在本地验证，不改变服务端 API；没有验证线上部署、服务端版本组合或 TLS 配置。按正常发布流程随 CLI 和现有 ae-evaluation Skill 一起发布，调用方先移除独立 endpoint 配置并使用当前 AE Host；取消任务脚本补充显式授权流程。若需回滚，不恢复不安全的跨 Host 凭证发送，应停用受影响调用并保留安全边界。未新增 Skill。


### 第二轮安全复核修复

用户已授权修复凭证启停门禁和错误回显泄露。`+enable_credential` / `+disable_credential` 保留原命令、参数和 API 请求体，改为 high-risk-write，非交互调用需经授权后带全局 `--yes`。评测 API 错误对当前请求携带的认证头、secret、data_token、report_source 和评测会话令牌做请求级脱敏，覆盖原文、JSON 转义和 URL 编码形式；会话换取失败同时保护 CLI token 和返回的 session token。message、hint 和结构化 details 中的匹配值脱敏；符合业务错误码格式的 code 原样保留，不作凭证子串替换。保留普通业务错误码和非敏感诊断，框架不再把评测远端错误正文或提示写入本地日志。无新增 Skill，现有入口和职责不变。回归覆盖旧命令经 --yes 授权仍发送原请求，以及未授权时零请求；未验证线上服务组合。


### AE Host 兼容性复核修正

对照 agent-test 项目后，用户明确要求 AE Host 与其他域保持一致。取消评测独有的强制 HTTPS 限制，评测请求、下载和会话换取均跟随所选 AE Host 的 HTTP/HTTPS 协议；继续禁止独立 endpoint 跨 Host 覆盖、重定向和路径注入。错误脱敏保留稳定业务 code；远端 code 必须符合大写字母、数字、下划线的业务错误码格式且不超过 128 字符，否则使用 EVAL_API_HTTP_<status>。例如 secret 为 VERSION 时，CREDENTIAL_VERSION_CONFLICT 仍原样返回，message/hint 中回显的 secret 继续脱敏。未新增命令、参数或 Skill，已有入口与职责不变。通过当前 HTTP AE Host 的本地 dry-run 和提供项目的 OpenAPI 契约回归验证；不以此代替线上联调。本轮修正尚未获授权提交。


### 样例输入日志脱敏补充

用户已授权修复第三轮审查发现的输入日志问题。单条创建/修改样例的 `--data` 与批量 `--cases-json` 一致标为敏感参数；请求体和显式 dry-run 预览保持原样，仅命令日志脱敏。共享 RuntimeContext.json() 对已标记敏感的 JSON 参数，解析失败时抛出结构化 validation 错误，只含参数名与语法修正提示，不回显原文，不把原文写入日志。非敏感参数的原有诊断行为保持兼容；命令、flag、API 请求和正常输出契约不变。回归覆盖单条样例有效执行/预览与五种敏感参数的执行/预览解析失败路径，检查日志、错误输出、请求内容和失败前零请求。扩展现有 ae-evaluation Skill/reference，无新增 Skill，尚未获授权提交。
