# Demo operations

Use the active PLG session's `demo_project_id`, sample, item, and reporting timezone throughout. Pass the project explicitly. In an external agent, use the session's verified host for commands that accept it; in Web onboarding, omit `--host` and use the platform credential. Resolve the ingestion target from the same Demo project. The PLG sample data already provides the analysis baseline.

## Fixed Demo experiment

Use the [preset catalog](../scripts/experiment-preset.json) to resolve the active sample and item to an industry, then select one of that sample's supported experiment types. Save `industry` and `experimentType` with the run and use the same selection for request creation and replay.

| Industry | Samples | Experiment type |
| --- | --- | --- |
| `game` | `star-island`, `season-pass` | `item-coupon`, `checkout-recovery` |

Industry entries define the sample and item IDs and fixed coupon audiences. Checkout recovery uses the queried audience saved in the plan. Experiment-type entries define the Feature, hypothesis, groups, metrics, economics and replay rules. Both samples use their own project, sample and item scope.

The `item-coupon` replay exposes up to 12 accounts per arm and simulates up to eight treatment coupon claims, one control purchase and seven treatment purchases. Counts are capped by the available accounts in each arm. Report observed counts from AE.

| Setting | Value |
| --- | --- |
| Coupon audience | Accounts with at least two reporting dates of item views and no purchase for the same item |
| Checkout recovery audience | Accounts that viewed the item, then started checkout, and did not buy within the sample window |
| Randomization | Exclusive account-ID bucket, 100% of the eligible audience, split 50/50 |
| Coupon arms | Full-price reminder at 100 vs. item coupon at 80, in the saved plan currency |
| Checkout recovery arms | Reminder to product details vs. reminder directly to checkout, both at 100 in the saved plan currency |
| Delivery | Same placement and timing, one exposure per account at most, stop after purchase |
| Cycle | Start as soon as eligible, evaluate over seven days |
| Metrics | Distinct buyers and paid order amount from `payment_success` for the active sample and item. USD metrics include a currency filter. |
| Economics | Cost of 50 per paid order in the saved plan currency. Profit equals paid order revenue minus order costs. |

Use the same saved preset selection and audience for plan display, targeting and replay. Reuse the sample's revenue metric and the Feature key generated for the run. Checkout recovery replays one exposure per assigned account and simulated full-price payments.

## Present the plan

Show the Demo audience, hypothesis, and evaluation period from the ready `experiment-plan` response. Insert `plan_preview_markdown` as a visible two-column Markdown table in the conversation. Translate labels and descriptions, keeping both columns, prices, and allocation values. With an older CLI, build the same **A · Control** and **B · Treatment** table from `plan.arms` and `plan.currency`. Show each group's path, price, and split side by side.

Show the metrics and cost per paid order below the table. Both groups use the same placement and timing, with at most one exposure per account and no follow-up after purchase. Localize the preview to the customer's language. Format amounts from `plan.currency` as USD or CNY, independent of the response language. Keep the local `plan_path` private.

Every ready Demo plan includes `approver`. In the local journey, `approver.status=deferred` means the draft is available for [review](demo-journey.md#review-the-same-draft). The confirmed launch prepares the approver. For legacy plans require `approver.status=ready` before offering launch and report preparation failures. When a coupon plan returns `metric_event`, report its status. If delivery is uncertain, check the saved event ID before sending another event. For `poll_demo`, resume Demo preparation. For `action_required`, follow the returned `next_action`.

Present the draft and its returned review choices. Use **审核通过并启动** for launchable drafts in Chinese. Explain that confirmation authorizes the Demo experiment, the signed-in account's approval when eligible, and replay of synthetic events. Keep the same draft when the customer asks a question or dismisses the picker. Launch only after explicit confirmation.

## Start and replay the confirmed experiment

Use [`experiment-launch`](onboarding_experiment_launch.md) with the confirmed plan and `--wait-report` as soon as the customer approves. It creates the Feature and metrics, saves the draft, checks readiness, approves the exact round as the signed-in approver, and verifies that the experiment is running. It immediately sends exposure and payment events in one Receiver batch. The coupon scenario also sends coupon claims. Outcomes are timestamped five seconds after the account's exposure.

- Use the launch command as the sole path for approval writes, including after the draft already exists. Do not invoke standalone `experiment approval submit` or `experiment approval approve`, the corresponding raw capabilities, or a UI approval as a fallback. A read-only approval check can help diagnose a blocker.
- While the command is running, wait for the same process in the current turn. If the execution tool returns a process handle, keep polling that handle. The CLI already polls the approval round and retries recoverable errors. A pending round or a generic `CAPABILITY_EXECUTION_FAILED` does not justify stopping an active invocation or switching commands.
- On `wait_experiment_report` or `inspect_experiment_report` with an accepted replay and a receipt, start event verification in the same turn. For a pending report, use `poll_after_ms` if the events still need time to arrive. Keep using the saved replay.
- For `upload_experiment_replay`, immediately resume the same run with `--wait-report`. For `verify_experiment_results` or an older `phase=complete` response, continue to [Report verified results](#report-verified-results) in the same turn. Briefly describe progress in the conversation while the data is being prepared.
- On `wait_for_other_demo_experiment`, show the existing experiment link when present. The user can still explore either scenario. Resume the confirmed run after the other experiment has ended. If this is a versioned round with an active experiment from an earlier Demo, the user can also choose the other sample before binding a new run.
- On `run_checkout_recovery_growth`, refresh the baseline, generate a new proposal and get confirmation for the new plan.
- On `resume_experiment_launch` for a recoverable error, or if the execution tool times out or interrupts the process, resume `experiment-launch` in the same turn with the same `session_id`, `run_id`, and launch flags once the original process has exited. Keep the existing draft and original confirmation. Stop and explain the blocker if credentials, permissions, or approval state prevent continuation, or if the user asks to stop.
- On `reconcile_replay_delivery`, check the saved event UUIDs in AE. Continue to report verification if all events are present. Resolve uncertain delivery before submitting again.

Use a CLI build that provides both onboarding commands for this flow.

### Draft-only creation

For an explicit draft-only request, build the payloads with [experiment-requests.mjs](../scripts/experiment-requests.mjs) using the saved industry, experiment type, sample, item, run ID and `plan.currency` (as `currency`). For checkout recovery, pass `checkout_cohort.account_ids` from the private plan as `accountIds` in the request builder's private input file. Save the revenue metric if needed, then save the Feature, primary metric, and draft. Return the draft ID.

## Report verified results

Use the experiment ID, run ID and replay receipt returned by `experiment-launch`. Begin checking the persisted events as soon as the Receiver accepts the replay, including when the platform report is pending. Match exposures by experiment and group IDs, and outcomes by run ID, sample, item, and event or order IDs. If the expected events are still arriving, wait between read-only checks with bounded backoff and keep polling in the same turn. Reuse the saved receipt for each check.

Use the platform report as a cross-check. Pass `--project-id` and `--exp-id` to each read. Refresh `ae-cli experiment report summary` with `--force-refresh true` once after ingest. Reuse `sample_size_report` when present. For `ae-cli experiment report sample-size` and `ae-cli experiment report metric-trend`, use `--start-time` and `--end-time` from `report_dates` when available and pass `--metric-id` for each trend. Run independent reads in parallel. If the exposure view is still pending, reuse the existing `--wait-report` response instead of repeatedly issuing the same failing platform query.

Use the saved assignment receipt for assigned counts, and use query results for exposure, coupon claims, purchases, and order amounts. Match outcome accounts to verified exposure groups, keep the run and item filters, and match payment currency to the saved receipt or plan. Treat a legacy receipt without currency as CNY. Deduplicate buyers by account and orders by `order_id`.

Use verified distinct buyers divided by exposed users for each arm's payment rate. Follow the [Markdown A/B report layout](presentation.md#markdown-layouts) for the selected sample. Show exposure, buyers, payment rate and amount side by side. For the coupon scenario, include assigned users, coupon claims, costs and profit. Compute costs using `plan.cost_per_paid_order` and the verified unique order count. Format amounts in the saved currency (USD or CNY). Mark the result as a Demo simulation. If a group has no verified exposure, show its rate as unavailable.

The Demo result is ready when the persisted events reconcile with the saved replay receipt. For a versioned round, record completion with [shared progress](onboarding_run.md#shared-progress) before showing the final choices. If the platform report is pending, unavailable or disagrees, identify the affected metrics and label the event-derived figures as the source. Omit disputed platform statistics and continue to the completion message and choices in the same turn. A receiver acknowledgement or an exposure-only report does not establish that all expected events are present.

### Completion message

After delivering the verified result in either host, display the matching message before the next-step picker. Replace `{item}` with the localized item from this run, or the localized Demo name if the item is unavailable. After a later round in the same session, congratulate the user on completing that round.

| Language | Message |
| --- | --- |
| 中文 | **恭喜你完成了首次增长体验！** 你已经用「{item}」样例走完了从业务诊断到 A/B 实验验证的流程。ThinkingAI 是一套基于数据和 Agent 的增长引擎，把数据分析、用户触达、用户访谈和 A/B 实验连成完整的增长闭环。你可以用自己的 Agent 体验这套增长流程。 |
| English | **Congratulations on completing your first growth demo!** You used the {item} sample to go from business diagnosis to verifying an A/B test. ThinkingAI is a growth engine powered by data and agents. It connects data analysis, user engagement, user interviews, and A/B testing into a complete growth loop you can explore with your own agent. |
| 日本語 | **初めてのグロース体験の完了、おめでとうございます！** 「{item}」のサンプルで、課題の分析から A/B テストの検証まで体験しました。ThinkingAI はデータとエージェントを活用するグロースエンジンです。データ分析、ユーザーへのアプローチ、ユーザーインタビュー、A/B テストをつなぐ一連の流れを、ご自身のエージェントでも体験できます。 |
| 한국어 | **첫 성장 체험을 마쳤습니다. 축하합니다!** ‘{item}’ 샘플로 비즈니스 진단부터 A/B 테스트 검증까지 진행했습니다. ThinkingAI는 데이터와 에이전트를 기반으로 한 성장 엔진입니다. 데이터 분석, 사용자 접점 관리, 사용자 인터뷰, A/B 테스트가 이어지는 성장 과정을 자신의 에이전트로 경험할 수 있습니다. |

### Choose the next step

Present the verified Demo report directly in the conversation. Lead with one finding that answers the draft hypothesis and show the two groups side by side. Below the figures, show **View A/B experiment report** (**查看 A/B 实验报告** in Chinese) as a text link using the `experiment_url` for that exact run. For an older CLI without `experiment_url`, build `/#/atlas/experiment/detail?expId=<exp-id>&currentProjectId=<demo-project-id>` from the verified experiment and project IDs, and prepend the verified host in an external agent. The report link is optional reading. Continue to the welcome and choices without waiting for a click. If expected event verification stops at a blocker, report it and keep the existing run ID so the customer can resume.

Show the [completion message](#completion-message) before opening the picker after verified results. Use the [localized labels](about-ae.md#localized-labels) for both pickers.

**Web.** After the report and completion message, include the localized **Product website** and **Contact us** text links using the [Web market rule](about-ae.md#web-onboarding). Call `node <this-skill-directory>/scripts/web-journey.mjs after-experiment` as the final tool call. Finish the reply with one fenced `options` block with **Try another demo** and **Finish the demo**, in that order. If an older script lacks this command, show the same `options` block. Keep the journey open while you await the selection. Only on **Finish the demo** or an explicit request to end the verified Demo, call `node <this-skill-directory>/scripts/web-journey.mjs done` from the current conversation directory and close the reply. The platform then shows the workspace entry.

**External agent.** Keep the closing section together in the final user-visible reply, in this order:

1. The verified result and the report link for this run.
2. The localized completion greeting and ThinkingAI introduction from [Completion message](#completion-message).
3. Separate **Learn about AE** and **Contact us** text links from the [account's market](about-ae.md#product-resources). In Chinese use **了解我们（官网）** and **联系我们**.

Keep all three parts in the final reply even if the host already showed them in a progress message or the user selected their next action before the reply finished. Keep the website and contact links directly under the greeting, including when those same URLs appeared earlier in the conversation.

Open the host's single-choice control with **Continue the demo** and **Connect my data**, in that order. In Chinese use **继续体验Demo** and **接入数据**. If the host cannot display the picker, show those same two choices in chat after the closing section.

- **Continue the demo** in an external agent or **Try another demo** in Web. List both available samples, put the current sample last and label it **Just tried**. Keep it selectable. Use the same session and run `ae-cli analysis onboarding run --session-id <session-id> --choice demo --sample <sample-id> --format json` after selection. Present the new overview as a new round and retain the prior report in the conversation. Use the existing `choose-sample` step in Web.
- **Connect my data.** In an external agent, use [business data integration](business-data.md) to act on the customer's intent or show the data source choices. Keep the same onboarding session.
- If the customer asks about the product in the conversation, share [the introduction and resources](about-ae.md) and return to the same report choices.
- If the customer asks to end the experience or replies **Not now** to an earlier completion picker, close the guided flow and retain the result and run ID.
