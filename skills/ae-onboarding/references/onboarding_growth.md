# analysis onboarding growth

Use this command for a growth opportunity or purchase funnel in the active PLG Demo. Reuse the `session_id` from `analysis onboarding run`.

```bash
ae-cli analysis onboarding growth --session-id <session-id> --format json
ae-cli analysis onboarding growth --session-id <session-id> --scenario checkout-recovery --format json
```

Use the first command for **Find a growth opportunity** or a request for the purchase funnel alone. Use the second command when the user selects checkout recovery or asks about players who started checkout and did not pay. Keep the returned `scenario` for [experiment planning](onboarding_experiment_plan.md). Both scenarios share one query and cache.

The CLI scopes the query to the session's Demo project, item and sample dates. It uses only seed events in that seven-day window to keep later experiment replay out of the baseline. On `phase=ready`, `single_day` and `multi_day` provide distinct viewers and buyers. `purchase_rates` gives ratios from 0 to 1, or `null` for an empty group. `difference_pp` is in percentage points. `funnel` gives the ordered viewer, checkout and buyer counts.

`follow_up_count` counts eligible accounts for the selected scenario. For checkout recovery, `checkout_recovery.unpaid_count` counts accounts that viewed the item, then started checkout, and had no payment for the item in the seed window. `unpaid_rate` divides this count by checkout starters and is `null` when there are none.

`data_basis` identifies the seed-event source and distinct-account counting unit. Its `funnel_transitions` give each pair of ordered events, the distinct accounts at each step, the difference in counts (`dropoff_accounts`), and the next-step count divided by the prior-step count (`conversion_rate`). A conversion rate is `null` when the prior step is empty. With an older CLI, derive these counts and rates from `funnel`.

`charts.daily_viewers` is a seven-day line series with a distinct count of item-detail viewers per sample-local date, in chronological order. A player can appear on several dates. The series comes from the same query and cache as the funnel. A zero means nobody viewed the item that day. If the series is absent in an older CLI or an existing cached result, continue with the verified overview or diagnosis without a trend.

Use the ready response's `markdown_charts` for the inline figures. They use the same scoped counts as `charts`, `visuals` and `data_basis`. Select the layout for the current finding using the [Markdown chart guide](presentation.md#choose-and-render-a-chart).

The account IDs are stored in the private `cohort_path` receipt for the same session and sample. The checkout experiment reads this cohort automatically. Show only aggregate counts in chat.

For `poll_demo`, resume `analysis onboarding run` to advance sample preparation. For `retry_growth`, repeat the same growth command after `poll_after_ms`. For `action_required`, report the returned blocker. Use `analysis onboarding run` to select another sample before calling `growth` for it.

Use `--dry-run` only to preview the CLI workflow without querying AE. `cached`, `query_ms`, and `elapsed_ms` report cache use and command timings.

## Demo overview

For the local V5 picker, follow [Project overview](demo-journey.md#project-overview). The following steps describe the baseline read and the existing Web picker.

Start the overview with the localized Demo name and the [sample's opening question](presentation.md#differentiate-the-samples). Use the item, sample dates and time zone from the ready `run` response.

For the first overview of a sample, reuse a matching ready growth response when one is already in the conversation. Otherwise call `growth --session-id <session-id> --format json` once to read the baseline. Use only a ready response for the same project, sample, item and date range. Show one finding and one [sample-specific chart](presentation.md#choose-and-render-a-chart). For older CLI versions, build the chart from `purchase_rates` or subtract `checkout_recovery.unpaid_count` from `funnel.checkout` to obtain the remainder of the checkout group. Save the audience recommendation for after the user picks a question. If the read is pending, blocked or fails, show the sample scope and available links, then show the picker.

Link the available Demo dashboard and funnel using `evidence` from the ready `run` response or the matching baseline. In Web, keep the two routes by value. Use **找出回访未购玩家** and **找出结账未付玩家** for Star Island, and **看看谁在回看通行证** and **找出可召回的通行证玩家** for Season Pass. After a baseline read use one read-only `status --session-id <session-id> --format json` call to refresh the sample-ready interaction before the `options` block. If the status read fails, use the last confirmed ready interaction.

## Presentation

Present the finding and one visual suited to the selected question. Then show a visible evidence section. Use **数据依据** in Chinese, **Data basis** in English, **データの根拠** in Japanese, or **데이터 근거** in Korean. Identify the selected sample and item, date range, time zone and distinct-account counting unit. Use the current sample's seed activity and translate the visible labels. Render inline using the current result.

If the preceding overview already showed the same comparison, state the finding with exact counts and use the [seven-day trend](presentation.md#markdown-layouts) as additional context when available. Keep the daily count separate from the weekly purchase rate.

### Growth opportunity

For `item-coupon`, compare one-day and multi-day viewers. Use the [purchase-rate comparison](presentation.md#choose-and-render-a-chart) from `charts.purchase_rate`. Read counts from `single_day` and `multi_day` and rates from `purchase_rates`. Include both denominators in the data note. Display unavailable rates as unavailable.

In the evidence section, explain that each rate is buyers divided by viewers, that `difference_pp` is a percentage-point difference, and that eligible follow-up accounts equal multi-day viewers minus multi-day buyers. Describe the gap as an observed association in the sample.

### Checkout recovery

For `checkout-recovery`, lead with checkout starters, the unpaid count and unpaid share. Use a three-stage funnel with **Viewed item → Started checkout → Paid** and the account count at each stage from `funnel`. Annotate each transition with `data_basis.funnel_transitions[].dropoff_accounts`. With an older CLI, subtract the next-stage count from the preceding count.

Use the [Markdown funnel](presentation.md#markdown-layouts) to show the ordered purchase stages with their transition labels. Use the checkout share when the finding is about the final step alone and the split has not just been shown.

In the evidence section, identify the stage with the largest account loss and show `checkout_recovery.unpaid_count` divided by `funnel.checkout` for the unpaid share. If nobody started checkout, show the share as unavailable. Describe the observed behavior as checkout without payment. Explain the reason only if the evidence supports it.

### Report links

Place the returned `evidence.dashboard_url` and `evidence.funnel_report_url` below the evidence as clickable links. Include `evidence.purchase_rate_report_url` when pointing to the comparison itself. Web uses the relative product links. If evidence is still preparing, show the result and the next choice immediately. A later normal status or growth response can supply the links once ready.

## Follow-up

Lead with `follow_up_count` and the target audience. For Season Pass, show the audience overlap composition when comparing follow-up groups. For Star Island, show a count comparison based on `follow_up_chart.data`. Give the recommendation below the chart. Reuse the last ready growth response for this sample and scenario and the matching [chart layout](presentation.md#choose-and-render-a-chart). Use the exact counts beside the chart; the Markdown fallback also works when the CLI supplies only the base counts.

With an older CLI, apply the Markdown layouts to the existing counts. For `checkout-recovery`, use `funnel.checkout`, `funnel.buyers` (paid after checkout), and `checkout_recovery.unpaid_count`. For `item-coupon`, derive the multi-day unpaid, single-day unpaid, and paid viewers from `multi_day` and `single_day`. If a matching ready result is unavailable in the conversation, resume growth for the selected sample and scenario.

For `item-coupon`, compare a full-price reminder with a 20% coupon for multi-day viewers who did not buy. For `checkout-recovery`, compare a reminder leading to item details with one leading directly to checkout for the same unpaid audience. Keep the price and timing the same in that scenario. Compare distinct buyers, payment rate, and paid amount.
