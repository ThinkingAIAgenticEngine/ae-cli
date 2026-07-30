# Engage 旧 MCP 命令迁移状态地图

更新时间：2026-07-22

本文件记录 `te-engage` 旧 MCP 命令迁移到 Capability Gateway 的可续跑状态。迁移硬约束：

- te-cli 完成迁移后删除对应旧 `+` 命令，不保留 alias。
- Hermes 保留原 MCP Tool、MCP Service 和 MCP 注册。
- L2 命令使用 kebab-case flag，Capability 输入输出使用 snake_case。
- 低频报表和复杂 JSON 能力默认保留为 L3，通过 `ae-cli capability ...` 调用。
- 每完成一个目录批次，更新本表并记录自动化验证结果。

状态说明：`todo` 尚未迁移；`in-progress` 正在迁移；`done` 已完成代码和批次验证；`hold` 因新侧未安全就绪而保留旧入口。

## 总览

| 批次 | 映射总数 | 基线已完成 | 本轮待迁 | 当前状态 |
| --- | ---: | ---: | ---: | --- |
| flow → engage-flow | 12 | 0 | 12 | done |
| task → engage-task | 10 | 0 | 10 | done |
| setting → engage-setting / engage-scene | 13 | 4 | 9 | done |
| config → engage-scene | 10 | 0 | 10 | done |
| 合计 | 45 | 4 | 41 | done |

## flow 批次

| 旧命令 | 目标 Capability | CLI 层级 | 状态 | 验证 |
| --- | --- | --- | --- | --- |
| `+flow_list` | `engage-flow.flow.list` | L2 | done | Hermes + CLI + Skill |
| `+flow_detail` | `engage-flow.flow.get` | L2 | done | Hermes + CLI + Skill |
| `+save_flow` | `engage-flow.flow.save` | L2 | done | Hermes + CLI + Skill + dry-run test |
| `+flow_node_config_schema` | `engage-flow.node-config.schema` | L2 | done | Hermes + CLI + Skill |
| `+validate_flow_node_config` | `engage-flow.node-config.validate` | L2 | done | Hermes + CLI + Skill |
| `+modify_flow_base_info` | `engage-flow.flow.modify-base-info` | L2 | done | Hermes + CLI + Skill |
| `+manage_flow` | `engage-flow.flow.manage` | L2 | done | Hermes + CLI + Skill |
| `+delete_flow` | `engage-flow.flow.delete` | L2 | done | Hermes + CLI + Skill + dry-run test |
| `+flow_node_overview_report` | `engage-flow.report.node-overview` | L3 | done | Hermes + L3 Skill |
| `+flow_process_report` | `engage-flow.report.process` | L3 | done | Hermes + L3 Skill |
| `+flow_node_detail_report` | `engage-flow.report.node-detail` | L3 | done | Hermes + L3 Skill |
| `+flow_ab_split_node_report` | `engage-flow.report.ab-split-node` | L3 | done | Hermes + L3 Skill |

## task 批次

| 旧命令 | 目标 Capability | CLI 层级 | 状态 | 验证 |
| --- | --- | --- | --- | --- |
| `+task_list` | `engage-task.task.list` | L2 | done | Hermes + CLI + Skill + dry-run test |
| `+task_detail` | `engage-task.task.get` | L2 | done | Hermes + CLI + Skill |
| `+task_stats` | `engage-task.task.stats` | L2 | done | Hermes + CLI + Skill |
| `+save_task` | `engage-task.task.save` | L2 | done | Hermes + CLI + Skill |
| `+build_task_save_guide` | `engage-task.task.build-save-guide` | L2 | done | Hermes + CLI + Skill |
| `+manage_task` | `engage-task.task.manage` | L2 | done | Hermes + CLI + Skill + dry-run test |
| `+task_data_overview` | `engage-task.task-data.overview` | L3 | done | Hermes + L3 Skill |
| `+task_data_detail` | `engage-task.task-data.detail` | L3 | done | Hermes + L3 Skill |
| `+task_metric_detail` | `engage-task.task-data.metric-detail` | L3 | done | Hermes + L3 Skill |
| `+task_experiment_report` | `engage-task.task-data.experiment-report` | L3 | done | Hermes + L3 Skill |

## setting 批次

| 旧命令 | 目标 Capability | CLI 层级 | 状态 | 验证 |
| --- | --- | --- | --- | --- |
| `+channel_list` | `engage-setting.channel.list` | L2 | done | Hermes + CLI + Skill + dry-run test |
| `+channel_detail` | `engage-setting.channel.get` | L2 | done | Hermes + CLI + Skill |
| `+add_channel` | `engage-setting.channel.create` | L2 | done | Hermes + CLI + Skill |
| `+update_channel_status` | `engage-setting.channel.update-status` | L2 | done | Hermes + CLI + Skill |
| `+delete_channel` | `engage-setting.channel.delete` | L2 | done | Hermes + CLI + Skill |
| `+whitelist_list` | `engage-setting.whitelist.list` | L2 | done | Hermes + CLI + Skill |
| `+add_approver` | `engage-setting.approval-approver.add` | L2 | done | Hermes + CLI + Skill + dry-run test |
| `+approver_list` | `engage-setting.approval-approver.list` | L2 | done | Hermes + CLI + Skill |
| `+config_channel_list` | `engage-scene.config-channel.list` | L2 | done（基线已有） | existing CLI + Hermes capability |
| `+config_channel_detail` | `engage-scene.config-channel.get` | L2 | done（基线已有） | existing CLI + Hermes capability |
| `+update_config_channel_status` | `engage-scene.config-channel.update-status` | L2 | done（基线已有） | existing CLI + Hermes capability |
| `+delete_config_channel` | `engage-scene.config-channel.delete` | L2 | done（基线已有） | existing CLI + Hermes capability |
| `+cancel_query_by_request_id` | `engage-setting.query.cancel` | L3 | done | Hermes + L3 Skill |
| `query_cluster_qp_skill` | `engage-setting.query.cluster-qp-skill` | L2 | removed | 已删除过期 semantic-contract Capability/CLI；语义条件改走 Analysis 模型 + Hermes compile |

## config 批次

| 旧命令 | 目标 Capability | CLI 层级 | 状态 | 验证 |
| --- | --- | --- | --- | --- |
| `+config_item_list` | `engage-scene.config-item.list` | L2 | done | existing Gateway + CLI/Skill contract |
| `+config_item_detail` | `engage-scene.config-item.get` | L2 | done | Hermes + CLI + Skill |
| `+delete_config_item` | `engage-scene.config-item.delete` | L2 | done | Hermes + CLI + Skill + dry-run test |
| `+copy_config_template` | `engage-scene.template.copy` | L2 | done | Hermes + CLI + Skill |
| `+strategy_list` | `engage-scene.strategy.list` | L2 | done | Hermes + CLI + Skill + dry-run test |
| `+strategy_detail` | `engage-scene.strategy.get` | L2 | done | Hermes + CLI + Skill |
| `+manage_strategy` | `engage-scene.strategy.manage` | L2 | done | Hermes + CLI + Skill + action validation |
| `+config_item_trigger_report` | `engage-scene.report.config-item-trigger` | L3 | done | Hermes + L3 Skill |
| `+config_item_analysis_report` | `engage-scene.report.config-item-analysis` | L3 | done | Hermes + L3 Skill |
| `+config_item_strategy_comparison` | `engage-scene.report.strategy-comparison` | L3 | done | Hermes + L3 Skill + minItems validation |

## 批次验证记录

| 时间 | 批次 | 验证命令 | 结果 |
| --- | --- | --- | --- |
| 2026-07-22 | 基线 | `git status --short`、`git diff --check`（hermes、ta-multiverse、te-cli） | 三个仓库均干净，通过 |
| 2026-07-22 | flow | Hermes compile；25 个 Flow Capability 测试；te-cli build、smoke、Engage Capability contract、flow save dry-run、release gate；新命令 help；旧命令拒绝 | 通过 |
| 2026-07-22 | task | Hermes compile/checkstyle；33 个 Task Capability 测试；te-cli build、smoke、Engage Capability contract、release gate；L2 dry-run/help；旧命令拒绝；smoke 脚本语法检查 | 通过 |
| 2026-07-22 | setting | Hermes reactor compile/checkstyle；42 个 Setting Capability 测试；te-cli build、Engage command/Skill contract、release gate；L2 dry-run/help；旧命令拒绝；smoke 脚本语法检查 | 通过 |
| 2026-07-22 | config | Hermes reactor compile/checkstyle；17 个 Scene Config Capability 测试；te-cli build、41 个 scene L2 注册/help 合同、3 个 L3 Skill 合同、release gate；L2 dry-run 路由；旧命令拒绝；smoke 脚本语法检查 | 通过 |
| 2026-07-22 | 最终收口 | Hermes 四批次合并 124 个测试；te-cli build、npm test、Capability/Skill contract、release gate；四个 smoke 脚本语法；旧目录/旧命令注册消失；Hermes MCP 源码保留；三仓 `git diff --check` | 通过 |
| 2026-07-22 | Review 修复 | 高频 Skill 响应 envelope/snake_case 契约；嵌套 DTO camelCase 边界；channel status 0/1；旧 MCP 空目录删除；新增 Skill 回归合同 | 通过 |
| 2026-07-24 | setting 补迁 | `query_cluster_qp_skill` → `engage-setting.query.cluster-qp-skill`；te-cli build；Skill 工作流更新 | te-cli build 通过；Hermes 单测待 reactor compile 通过后补跑 |
| 2026-07-27 | semantic QP 收口 | `cluster-qp-skill` 改为本地 semantic contract；移除 ae-engage 手写执行 QP 指导 | Hermes/te-cli 定向验证 |
| 2026-07-29 | semantic QP / flow | Flow `nodes[]`/`slotAnswer`/`validate` 补齐 compile；删除 `engage-setting.query.cluster-qp-skill` Capability 与 CLI | Hermes 定向单测 + te-cli build |

## 续跑规则

1. 从第一个 `in-progress` 批次继续，先核对该批次当前 Git diff。
2. 单条完成后更新目标 Capability、L2/L3、代码状态和最小测试结果。
3. 目录批次只有在 Hermes 相关测试、te-cli build/test/help/dry-run、旧命令不可调用和 `git diff --check` 全部完成后才标记 `done`。
4. 出现权限、资源归属或业务语义歧义时标记 `hold` 并记录证据，不猜测实现。
