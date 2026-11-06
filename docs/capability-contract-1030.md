# 当前契约补修（2026-10-30）

继续 `fix/capability-contract-1029`，CLI 固定基线 `226aaa36272e095adbcfdbc114646795c30aa8ef`；配对后端固定基线 `a8bbe366a818b105ba7e24beb870fb012b8c4f49`。本轮完整需求是13组当前契约与30项空输出Schema；后端逐项记录位于其 `docs/cli/capability-contract-1030-followup.md`，原测试文档为 https://thinkingdata.feishu.cn/wiki/SvyRwyggRihdaAkrUdpcKUHonae 。

## CLI 修复

| 问题 | 修复及回归 |
| --- | --- |
| ST01 | Generic L3和curated runner共用确认helper。stdin/stderr非双TTY且无全局 `--yes` 时返回结构化 `CONFIRMATION_REQUIRED`（退出1），关闭stdin或管道y都不执行。TTY yes/no/EOF/SIGINT收敛。保留runner旧导出。validate/dry-run不执行变更。 |
| ST02 | 12个精选权限/认证/owner命令升级high-risk-write，另2个Space/Folder由服务端metadata驱动L3；14份reference同步。修复过程中发现System旧helper按risk自动注入yes会导致新两项认证请求被严格服务Schema拒绝；改为仅后端明确支持yes的18项注入。OAuth2/upsert经过真实Commander→runner→严格HTTP替身验证，保留原SMTP删除yes正控。 |
| ST03 | Generic PermissionError保留Gateway外层request_id/invocation_id等meta、code、hint；原transport没有装入403业务details，本轮不声称该字段已完整保留。 |
| ST04 | 恢复Dashboard export旧 `--use-cache true|false`，显式值透传，省略仍省略。服务端按deprecated兼容no-op接受且结构化告警，导出保持不读缓存。原run缓存语义不变。 |
| SP03/SP06/SP08/SP09 | PublicLink用真实access_id并保留旧camel selector说明；mark-time说明200字符及条件时区；Adhoc export明确fields精确有序投影、未知列失败、use-cache为兼容no-op。 |

复用ae-analysis与ae-capability原Skill入口和职责，分别递增为4.2.54、1.3.16；不新增Skill、不更名或移除已发布入口。生成command_index同步risk/flag；L3分享示例显式风险表可由release gate校验。

## 验证与兼容

证据根目录：workspace `.scratch/common-service-cli-history-audit-1029/fixes/`。正确模拟token与断言下的固定基线红测为 `cli-contract-red.log`（3过6失败）、`cli-risk-red.log`（12失败）；先前错误token/断言的初始日志不作为产品复现证据。

四个新测试文件24例全过：generic确认/403 meta、12精选风险、旧export参数与缓存帮助、TTY确认EOF。原Dashboard否定use-cache和System风险集合断言按批准的兼容行为更新，覆盖true/false/省略及原run行为。System严格字段测试另发现并关闭yes注入回归，见 `cli-review-*-strict-red.log` / `cli-review-*-green.log`。

最终16项QA全exit0（`cli-qa-results.json`）：新/前轮契约回归、runner、project-member-group、output、capability-command/API、metadata、analysis-four-modules/contract/system/agent、project-semantic-export、npm test、check:release。最终 `npm run build` 与 `tsc --noEmit` 通过。测试将共享CLI配置文件访问重定向到本轮临时目录，不更改HOME、全局安装或活动账号；最初错误会话隔离产生的假失败单独保存，不计为产品失败。

风险门禁变化是修复范围；能力ID、命令路径、已有参数、同步run缓存行为与Skill职责保持。完整跨版本组合、真实权限写入矩阵和生产缓存命中不能从本地HTTP替身推断。同步2构建46565/Jenkins5047已成功部署后端3d9a3634（2026-10-30 14:23:47）；线上预检32/32、30 Schema与14risk回读通过。真实CSV/JSONL投影、未知列失败、旧cache flag三种调用和跨wait告警通过；本轮临时看板/文件夹与真实token副本已清理。

本轮只在隔离worktree构建，不修改另一个会话的主CLI checkout、dist、bin、npm link、已安装Skills或共享活动账号。最终使用安装前后64文件指纹核验，不提交凭证、测试token副本或构建产物。

## 最终交付

原测试文档已追加并回读（revision92、warnings空、13组与30行表格/2截图完整）：https://thinkingdata.feishu.cn/wiki/SvyRwyggRihdaAkrUdpcKUHonae#doxcn2PTTKDODyFOZifSkGu37cW。部署代码SHA为3d9a3634，CLI代码/fixture SHA为5f77941e；后续仅文档提交不改变实际部署代码。

真实客户端关闭stdin/管道y均CONFIRMATION_REQUIRED；lds-test真实403保留invocation_id（该响应无request_id，双trace由合成回归验证）。线上权限/认证/owner没有实际写入；缓存命中、全部版本组合及大型数据导出不在本轮实测范围。

最终保护检查：入口与主bin/dist共63个文件hash不变；主package.json存在并行会话变更，当前干净release/6.1、6.1.30，本轮未写入/还原。共享活动账号仍lds-test。源目录隔离，不影响另一个会话安装。
