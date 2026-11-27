# Local Demo journey

Use this flow in a local Agent after login. Keep the `session_id`, selected sample, selected analysis route, and current experiment `run_id` through the conversation. Preserve earlier reports when a user starts another round.

## Project overview

If AE supplies a registration industry, use the corresponding sample as the initial selection. Games, software and SaaS, and other industries use `star-island`. Commerce and retail, and content and community use `season-pass`. When the industry is unavailable, use the server recommendation. Advance pending preparation with `run` and the same session after `poll_after_ms`. If preparation fails, offer to retry the same sample.

Use one matching baseline `growth` read as described in [Demo overview](onboarding_growth.md#demo-overview). Use the [opening finding and chart for this sample](presentation.md#differentiate-the-samples). Give the item, dates and timezone in a short data note. Invite the user to click the available **View Demo dashboard** or **View purchase funnel** links to check the data.

After the overview, render the two choices in `demo_overview.interaction`. Use the [sample-specific labels](presentation.md#differentiate-the-samples) and the localized `featured_question` to explain the follow-up choice. `featured_question` and `featured_topic` rotate when the user starts another round with the same sample. The sample picker appears after a verified experiment report.

## Growth opportunity

Answer the current `featured_question` from the matching baseline and show the reason to follow up, with source counts. Use returning viewers for `product_revisits`, checkout abandoners for `checkout_recovery`, and the ordered funnel for `purchase_conversion`. For Season Pass show the overlap when comparing the two audiences. Offer the strategy that fits the result and wait for the user to select it. Use `item-coupon` for a discount-versus-reminder comparison and `checkout-recovery` for a product-details-versus-checkout comparison. Read the selected `growth --scenario` when the confirmed evidence does not match or when checkout recovery needs its saved cohort. Then generate the review draft.

## Business diagnosis

1. **Choose a topic.** Use the ready overview to show the [seven-day viewers and change table](presentation.md#choose-and-render-a-chart) for the selected item, when available. Label it as daily unique viewers of the item detail page. Show the three item-specific topics in `demo_overview.diagnosis`, with the featured topic first. Ask which part of the item's purchase flow the user wants to understand.
2. **See the topic's data and choose a question.** For revisits use the purchase-rate comparison. For checkout use the share bar or the audience overlap when comparing follow-up audiences. For conversion use the three-step purchase path. Lead with the finding and show one [matching layout](presentation.md#choose-and-render-a-chart). When the overview already showed the same numbers for the same question, show exact counts or the next relevant detail instead of repeating the visual. Show the three short follow-up questions for that topic below the result.
3. **See the answer and choose an action.** Answer the chosen question with the finding, supporting counts and any hypothesis that needs a test. Show the three corresponding actions. Add one sentence per action explaining what it would test. Label a review-only proposal here so its scope is clear before the user selects it.
4. **Generate the draft.** Carry the chosen action and its audience into the plan. For runnable scenarios, use the verified replay preset and show that the draft can be replayed before presenting review choices.

Render the questions in the onboarding language. The table gives the Chinese wording and evidence for each topic.

| Topic | Questions to offer | Evidence to use |
| --- | --- | --- |
| Product revisits | 回看后没买，适合测什么？ · 哪些回访玩家值得先跟进？ · 能看出为什么不再回来吗？ | `single_day`, `multi_day`, `purchase_rates`, and `candidate_cohorts`. Distinct viewing days measure item revisits during the sample period. The data does not identify a player's motive or game retention. |
| Checkout without payment | 先改结账入口还是付款信息？ · 先跟进所有未付玩家还是回访者？ · 能判断是离开结账还是游戏流失吗？ | `funnel`, `checkout_recovery`, and `candidate_cohorts`. Compare the unpaid count and share, and distinguish the overlapping cohort. The observed event order cannot establish the cause of a checkout interruption. |
| Purchase conversion | 哪些玩家更接近付款？ · 哪一步掉队最多？ · 价格会影响回访后的购买吗？ | `data_basis.funnel_transitions`, `purchase_rates`, and `candidate_cohorts`. Compare both transitions and keep hypotheses about price, item information, and checkout separate. |

Use the three actions for the selected question, in this order. Localize the labels as short actions. In Chinese, use **测试礼包八折券** for the Star Island coupon or **测试通行证八折券** for the Season Pass coupon. For direct checkout, use **提醒玩家直接回到结账**. For other actions, put the single change in the label, such as **付款前先显示金额和商品详情**.

| Topic and question | Actions |
| --- | --- |
| Product revisits 1 | Test a coupon for repeat viewers, improve item information, test a direct checkout link |
| Product revisits 2 | Test a coupon for repeat viewers, target the overlapping cohort, test a direct checkout link |
| Product revisits 3 | Preview gameplay for single-day viewers, improve item information, test a coupon for repeat viewers |
| Checkout 1 | Test a direct checkout link, show an amount and item summary before payment, target the overlapping cohort |
| Checkout 2 | Test a direct checkout link, target the overlapping cohort, test a coupon for repeat viewers |
| Checkout 3 | Test a direct checkout link, show an amount and item summary before payment, target the overlapping cohort |
| Conversion 1 | Test a coupon for repeat viewers, test a direct checkout link, improve item information |
| Conversion 2 | Test a direct checkout link, preview gameplay for single-day viewers, show an amount and item summary before payment |
| Conversion 3 | Test a coupon for repeat viewers, improve item information, test a direct checkout link |

Map the coupon and direct checkout actions to their existing Demo presets and generate a saved draft. If the checkout cohort has fewer than two accounts, offer the same sample's coupon draft. For other actions, write a review-only proposal in the conversation with the matching cohort and one change to test. Use the same optional review questions and put **Approve draft** first. Explain up front that approval records the review in the conversation. If the user wants a Demo report, offer an existing replayable action for the current sample and start review of its new draft separately.

## Review the same draft

Generate a launchable draft with `experiment-plan --draft-only --session-id <session-id> --scenario <scenario>`. Keep the returned `run_id`. Lead with the audience, the difference between the two arms, and the primary metric. Give allocation, timing and delivery rules in a short detail section. Before the picker, tell the user what approval does. Use the [short review labels](presentation.md#common-choices) for the returned `interaction`, with approval first.

| Choice | How to answer |
| --- | --- |
| 为什么选这批人？ | Use the selected cohort, funnel or viewing-day criterion, sample dates, and verified count. Explain the relationship between the cohort's behavior and the hypothesis. |
| 小批试点怎么做？ | Use `review.pilot_accounts_per_arm` to suggest a small workflow check. Explain how to verify allocation, exposure, and data collection. Keep the saved draft's original audience and allocation for this Demo. |
| 不加奖励可以测什么？ | For checkout recovery, explain that the current draft already varies the destination at the same price. For a coupon draft, describe a separate same-price hypothesis about item information. |

Answer the selected question about the same draft. After the answer, record the option value with `experiment-plan --session-id <session-id> --run-id <run-id> --answered-question <value>` for a saved draft. Use the returned choices in the same turn. The list drops just the answered options, and approval stays first even after the third answer. Use `status --session-id <session-id> --run-id <run-id>` to resume the saved draft and its remaining questions. For a review-only proposal or an older CLI without this flag, track the answered questions for this draft in the conversation and apply the same picker rule. Launch requires the user to select approval for a runnable draft. Explain that this prepares the signed-in Demo approver, starts the experiment and replays synthetic events. Generate a new draft when the selected scenario, audience, or arms change.

If launch is blocked, keep the same `run_id` and follow the returned action. After approval and event ingestion, follow [report verification](demo-operations.md#report-verified-results) and show the chart for the selected sample.
