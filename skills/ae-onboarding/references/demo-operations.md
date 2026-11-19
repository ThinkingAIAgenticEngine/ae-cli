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
| Coupon arms | Full-price reminder at 100 CNY vs. item coupon at 80 CNY |
| Checkout recovery arms | Reminder to product details vs. reminder directly to checkout, both at 100 CNY |
| Delivery | Same placement and timing, one exposure per account at most, stop after purchase |
| Cycle | Start as soon as eligible, evaluate over seven days |
| Metrics | Primary: distinct buyers. Secondary: sum of paid order amount. Both use `payment_success` filtered by the active sample and item |
| Economics | 50 CNY cost per paid order, zero other costs. Profit equals paid order revenue minus order costs |

Use the same saved preset selection and audience for plan display, targeting and replay. Reuse the sample's revenue metric and the Feature key generated for the run. Checkout recovery replays one exposure per assigned account and simulated full-price payments.

## Present the plan

Show the Demo audience, hypothesis, and evaluation period from the ready `experiment-plan` response. Insert `plan_preview_markdown` as a visible two-column Markdown table in the conversation. Translate labels and descriptions, keeping both columns, prices, and allocation values. With an older CLI, build the same **A · Control** and **B · Treatment** table from `plan.arms` and `plan.currency`. Show each group's path, price, and split side by side.

Show the metrics and cost per paid order below the table. Both groups use the same placement and timing, with at most one exposure per account and no follow-up after purchase. Localize the preview to the customer's language. Keep the local `plan_path` private.

Every ready Demo plan includes `approver`. Require `approver.status=ready` before offering launch confirmation, and report any preparation failure. When a coupon plan returns `metric_event`, report its status. If delivery is uncertain, check the saved event ID before sending another event. For `poll_demo`, resume Demo preparation. For `action_required`, follow the returned `next_action`.

After showing the preview, use the host's choice control with **Confirm and start the A/B experiment** (**确认并启动 A/B 实验**) and, if a second option is required, **Start later** (**暂不启动**). Explain that confirmation authorizes the Demo experiment, approval by the signed-in account when eligible, and replay of synthetic events. If the customer defers or dismisses the dialog, keep the plan pending.

## Start and replay the confirmed experiment

Use [`experiment-launch`](onboarding_experiment_launch.md) with the confirmed plan and `--wait-report` when replaying. It creates the Feature and metrics, saves the draft, checks readiness, approves the exact round as the signed-in approver, and verifies that the experiment is running. Replay sends exposure and payment events in one Receiver batch. The coupon scenario also sends coupon claims. Outcomes are timestamped five seconds after the account's exposure.

- Use the launch command as the sole path for approval writes, including after the draft already exists. Do not invoke standalone `experiment approval submit` or `experiment approval approve`, the corresponding raw capabilities, or a UI approval as a fallback. A read-only approval check can help diagnose a blocker.
- While the command is running, wait for the same process in the current turn. If the execution tool returns a process handle, keep polling that handle. The CLI already polls the approval round and retries recoverable errors. A pending round or a generic `CAPABILITY_EXECUTION_FAILED` does not justify stopping an active invocation or switching commands.
- On `wait_experiment_report`, wait `poll_after_ms` and resume `experiment-launch --wait-report` with the same session and run IDs in this turn. Keep using the saved replay.
- When the CLI returns `experiment_url` with a running experiment, show **View experiment** as a clickable progress link. For `upload_experiment_replay`, resume the same run without `--start-only`. For `verify_experiment_results` or an older `phase=complete` response, continue to [Report verified results](#report-verified-results) in the same turn.
- On `wait_for_other_demo_experiment`, show the existing experiment link when present. The user can still explore either scenario. Resume the confirmed run after the other experiment has ended.
- On `run_checkout_recovery_growth`, refresh the baseline, generate a new proposal and get confirmation for the new plan.
- On `resume_experiment_launch` for a recoverable error, or if the execution tool times out or interrupts the process, resume `experiment-launch` in the same turn with the same `session_id`, `run_id`, and launch flags once the original process has exited. Keep the existing draft and original confirmation. Stop and explain the blocker if credentials, permissions, or approval state prevent continuation, or if the user asks to stop.
- On `reconcile_replay_delivery`, check the saved event UUIDs in AE. Continue to report verification if all events are present. Resolve uncertain delivery before submitting again.

Use a CLI build that provides both onboarding commands for this flow.

### Draft-only creation

For an explicit draft-only request, build the payloads with [experiment-requests.mjs](../scripts/experiment-requests.mjs) using the saved industry, experiment type, sample, item, and run ID. For checkout recovery, pass `checkout_cohort.account_ids` from the private plan as `accountIds` in the request builder's private input file. Save the revenue metric if needed, then save the Feature, primary metric, and draft. Return the draft ID.

## Report verified results

Use the experiment ID, run ID, and replay receipt returned by `experiment-launch`. Check the expected replay events against AE. Match exposures by experiment and group IDs, and outcomes by run ID, sample, item, and event or order IDs. If the expected events are still arriving, wait between read-only checks with bounded backoff and keep polling in the same turn. Reuse the saved receipt for each check.

Once ingestion is verified, request the experiment report reads in parallel. Pass `--project-id` and `--exp-id` to each. Refresh `ae-cli experiment report summary` with `--force-refresh true`. For `ae-cli experiment report sample-size` and `ae-cli experiment report metric-trend`, use `--start-time` and `--end-time` for the project-local replay dates and pass `--metric-id` for each trend. The sample dashboard describes the historical growth baseline. Keep replay results scoped to the experiment report.

Wait for the exposure view through `experiment-launch --wait-report`. If a separate sample-size read finds the view missing or returns the specific temporary report-unavailable message, return to that same launch command with the saved IDs. It handles the wait internally and returns a normal pending result for continuation. Keep the turn open and repeat on `wait_experiment_report`; do not repeatedly invoke a failing standalone sample-size command. Use the returned `report_dates` for subsequent report reads, including a replay crossing local midnight. Reuse `sample_size_report` when present. Continue event-ingestion verification and summary/trend reads; sample-size query success alone does not prove the replay has arrived.

Use the saved assignment receipt for assigned counts, and use query results for exposure, coupon claims, purchases, and order amounts. Match outcome accounts to the verified exposure groups, keep the run and item filters, and deduplicate buyers by account and orders by `order_id`.

Use verified distinct buyers divided by exposed users for each arm's payment rate. For checkout recovery, show a compact comparison table with exposure, buyers, payment rate and paid amount. For the coupon scenario, show one A/B purchase-rate chart and the table with assigned and exposed users, coupon claims, buyers, net revenue, costs and profit. Calculate costs from verified unique orders at 50 CNY each. Mark the result as a Demo simulation. If a group has no verified exposure, show its rate as unavailable. For pending reports, read status again without forcing a new refresh. Deliver the result after ingestion and report verification for the replay dates.

### Choose the next step

Show **View experiment report** with the same `experiment_url` after verification. If an older CLI omits it, use `/#/atlas/experiment/detail?expId=<exp-id>&currentProjectId=<demo-project-id>` in Web, or prepend the verified host in an external agent. On the Web, follow the Skill's journey completion step before delivering the result. If verification stops at a blocker, report the exact blocker and retain the existing run ID and running experiment link.

On the Web, end the reply after reporting the verified result or the blocker. The workspace entry is the next step after verified results.

In a local agent, present the host's single-choice control in the same turn in either case. Offer **Connect my business data** (**接入我的业务数据** in Chinese). When a native dialog requires two options, add **Not now** (**暂不接入** in Chinese) as the second option.

Wait for the customer's selection. To connect business data, run onboarding with the same `--session-id` and `--choice business`. If the customer asks to stop, chooses **Not now**, or dismisses the dialog, retain the run ID and end the turn. Offer the same choices in chat if the host lacks a native dialog tool or the tool call fails.
