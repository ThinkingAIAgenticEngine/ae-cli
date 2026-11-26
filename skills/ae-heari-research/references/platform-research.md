# 研究与提纲

## 从研究目标开始

明确研究要支持的决策、目标人群、已有证据和约束。目标不清楚时先澄清，不自行编造业务背景或受访者事实。问题优先围绕具体经历、行为和原因，避免诱导与将多件事混成一个问题；区分探索性访谈和量化结论，不将少量访谈泛化为总体比例。

```sh
ae-cli heari research --goal '研究目标与已知背景' --no-input --format json
```

先取得实际预览返回。只有返回澄清问题时，才保留这些问题与选项，将用户回答写成临时 JSON 文件；不要自行编造一组问题当作后端返回的澄清：

澄清题是问研究员的，不是让 Agent 代答。写入 `answers.json` 前，逐项核对 answer 的事实是否来自研究员实际消息或已核实材料；后端给出的题目、选项和行业常识都不是答案来源。用户未提供的投诉、指标、使用习惯或原因不能为了推进流程而补造，也不能提交后再把工具回显当作独立佐证。缺失的事实先询问用户；用户回答“不知道/没有证据”时如实保留未知，不强行补成假设或事实。模型自行提出的研究假设只作带标签的建议，不写成研究员已确认的回答。

### 处理实际澄清问题

收到 `NEEDS_CLARIFICATION` 后，按实际返回的问题及已有信息选择：

- 用户已明确回答：沿用原答案；用户后来修正时使用其新回答，不重复询问。
- 缺少会改变决策、目标人群或研究范围的必要信息：停止依赖该信息的工具调用，向用户提出实际问题，等待回答后再写文件和继续预览。
- 目标和人群已明确，仅缺可选的既有证据或假设：可按来源状态“研究员未提供已知线索或假设；保持未知，不表示没有”继续准备，不必反复追问。只有实际问题允许保留未知时才据此继续；若仍要求必要回答，则等待用户补充，不循环预览或绕过要求。

保留未知是在说明输入缺失，不是研究员的事实性回答。不能自行选择“暂无假设”“不设门槛”“优先改产品”等选项，也不能把“用户未提供”解释为“用户确认没有”。用户明确回答“不知道/没有证据”时保留其原意。每次提交完整累计 answers，保留此前实际回答，只按用户新回答修正对应项；逐条核对来源，不新增投诉或原因，不连续运行预览代替提问。

```json
[{"question":"返回的实际问题","answer":"用户的回答"}]
```

最多 20 条、64 KiB。用相同目标和完整回答数组继续预览：

```sh
ae-cli heari research --goal '研究目标与已知背景' --answers-file answers.json --no-input
```

### 审阅并保存就绪简报

展示返回的名称、决策问题、人群、警告和研究简报，将完整就绪 JSON（含 confirmation）保存到新的临时文件，按用户授权运行 `ae-cli heari research --brief-file reviewed.json --confirm --no-input`，不能重新用 --goal 生成另一份简报后确认。没有 confirmation 的澄清中结果不能创建。文件含研究内容，仅用于获准的平台操作，不提交到版本库或上传到无关服务；摘要仅做完整性检查，不提供幂等回放。检查 `created` 和 `status`；`created: false`、`NEEDS_CLARIFICATION` 或 `READY_FOR_REVIEW` 不能表述为已经创建。

用户要求先预览时，澄清回复不是简报预览。若用户在简报尚未就绪或未展示时说“预览无误、请创建”，先取得并展示实际就绪简报，再等待针对这份简报的确认；不能把这句话当作对尚未生成内容的审阅。只有名称变更时，可先用下述 `--name` 展示更名预览，保留其他已审阅内容。

展示的状态、名称、警告及文件路径都必须来自实际执行结果。`NEEDS_CLARIFICATION` 不能在回复中变成 `READY_FOR_REVIEW`；没有实际保存的完整就绪 JSON 就没有可提交的预览路径。不要从回答文件名推造 reviewed 文件名，不以重新生成简报代替保存已有返回。

`research` 只向 stdout 输出 JSON，不会替你创建预览文件。“简报已生成”和“文件已保存”是两件事：先用宿主文件/终端工具把实际就绪 JSON 写入新的临时文件，等待写入成功，再用 `ae-cli heari research --brief-file '实际保存路径' --no-input` 离线校验。校验成功后才可说“文件已保存并验证”，并沿用该路径。写入未执行、失败或路径无法确认时，说明“预览已返回，文件尚未确认保存”，不能先宣布成功再补写。宿主没有文件工具时，只交付 JSON 和保存步骤，不声称已保存。该离线校验不创建研究；用户已授权创建时，也可直接对已写入的真实路径加 `--confirm`，它会先执行同一套文件校验；成功返回后可说明已保存并在提交前验证，不必重复索要授权。

离线校验成功返回 `source_preview_verified: true`，证明输入路径的就绪预览已读入且通过完整性检查；不代表创建了研究、改写了文件或将 `--name` 的更名写回原文件。此时不要循环另存和校验，继续使用已验证路径即可。

需要时在目标/回答中明确访谈时长预算（10–90 分钟），并审阅计划中的 estimated_minutes 和 warnings。草稿创建与研究发布是两次不同操作。

### 选择创建入口与处理变更

只有完整简报已明确、且用户授权直接创建时才用 `studies create`。该命令要求 `--name`、`--goal`、`--brief`、`--population`，立即创建草稿，无额外确认。这里 `--brief` 是研究背景的纯文本，不是文件路径，不要求 confirmation；`studies create` 没有 `--brief-file` 参数。含 confirmation 的就绪预览文件只能交给 `research --brief-file ... --confirm`。

一次新建只选择一个入口：`research --brief-file ... --confirm` 已创建后，不再调用 `studies create`；反之亦然。保存实际返回的 study_id，后续读取或修改同一对象。若确认时用户修改目标或人群，先处理变化并审阅更新后的简报，不忽略修改，也不改写旧 confirmation 后直接提交。仅名称变化按下段显式参数处理。创建返回错误或结果不确定时，按 [认证与恢复](platform-auth.md) 先核对副作用，不能直接换入口重建。

用户只修改名称并明确要求创建时，用 `ae-cli heari research --brief-file reviewed.json --name '用户指定名称' --confirm --no-input`。CLI 会先校验原预览，再只替换名称，其他已审阅内容不变；不需要重生成简报或让用户重复授权。仅预览更名时省略 `--confirm`。用户未授权创建时不能自行加上该标记。目标/人群改变仍需重新准备并审阅，不能手改旧 confirmation。创建后核对返回的实际 name，不把旧名称描述为新名称。

### 核对创建结果

`created: true` 只表示研究已存在。若返回 `guide_drafted: false`、`engine: incomplete` 和 `fallback_reason: GUIDE_REPAIR_INCOMPLETE`，说明质量修复未完成，生成候选未保存，现有基础草稿仍在。展示警告，保留实际 study_id，通过 `guide show` 审查并在同一研究继续编辑，不报告提纲已完成或重新创建。退出 0 也不能替代这项业务状态检查。旧后端创建错误若有 `operation_may_have_completed: true`，按未知结果先回读。

## 修改已有提纲

```sh
ae-cli heari guide show STUDY_UUID --no-input
ae-cli heari guide edit STUDY_UUID --message '明确的修改要求' --no-input
```

`guide edit` 会保存对话和候选建议，不保存提纲。展示 edit_proposal 的 before、after 和 items，以及警告。获准后使用实际返回的 ID：

```sh
ae-cli heari guide apply STUDY_UUID --chat CHAT_UUID --proposal PROPOSAL_UUID --confirm --no-input
```

检查 `applied`，不能把预览、过期或已处理候选说成再次保存成功。继续同一轮编辑可给 `guide edit` 加 `--chat CHAT_UUID`。发布后的提纲不能原地修改，应通过网页现有流程创建新草稿版本。CLI 未提供逐题 CRUD 或选项排序命令，不要编造这些入口。完整逐字稿通过 `interviews transcript` 分页读取，见 [结果与执行](platform-results.md)。
