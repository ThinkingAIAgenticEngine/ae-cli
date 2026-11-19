# analysis onboarding growth

Use this command for a growth opportunity or purchase funnel in the active PLG Demo. Reuse the `session_id` from `analysis onboarding run`.

```bash
ae-cli analysis onboarding growth --session-id <session-id> --format json
ae-cli analysis onboarding growth --session-id <session-id> --scenario checkout-recovery --format json
```

Use the first command for **Find a growth opportunity** or a request for the purchase funnel alone. Use the second command when the user selects checkout recovery or asks about players who started checkout and did not pay. Keep the returned `scenario` for [experiment planning](onboarding_experiment_plan.md). Both scenarios share one query and cache.

The CLI scopes the query to the session's Demo project, item and sample dates. It uses only seed events in that seven-day window to keep later experiment replay out of the baseline. On `phase=ready`, `single_day` and `multi_day` provide distinct viewers and buyers. `purchase_rates` gives ratios from 0 to 1, or `null` for an empty group. `difference_pp` is in percentage points. `funnel` gives the ordered viewer, checkout and buyer counts.

`follow_up_count` counts eligible accounts for the selected scenario. For checkout recovery, `checkout_recovery.unpaid_count` counts accounts that viewed the item, then started checkout, and had no payment for the item in the seed window. `unpaid_rate` divides this count by checkout starters and is `null` when there are none.

The account IDs are stored in the private `cohort_path` receipt for the same session and sample. The checkout experiment reads this cohort automatically. Show only aggregate counts in chat.

For `poll_demo`, resume `analysis onboarding run` to advance sample preparation. For `retry_growth`, repeat the same growth command after `poll_after_ms`. For `action_required`, report the returned blocker. Use `analysis onboarding run` to select another sample before calling `growth` for it.

Use `--dry-run` only to preview the CLI workflow without querying AE. `cached`, `query_ms`, and `elapsed_ms` report cache use and command timings.

## Presentation

Show the sample and dates with the counts. For `item-coupon`, use `charts.purchase_rate` with viewer and buyer counts and describe the difference as an observed association. For `checkout-recovery`, lead with the checkout starters, unpaid count and rate. Use `charts.funnel` as the main chart. Describe the behavior as checkout without payment.

Web uses the native `chart` fence with localized labels. External agents use short inline bars with exact values, or a Markdown table if the host cannot display the bars. Render from the current result without building a file or running another analysis query.

Place the returned `evidence.dashboard_url` and `evidence.funnel_report_url` below the chart as clickable links. Include `evidence.purchase_rate_report_url` when pointing to the comparison itself. Web uses the relative product links. If evidence is still preparing, show the result and the next choice immediately. A later normal status or growth response can supply the links once ready.

## Follow-up

Lead with `follow_up_count` and the target audience. Show one chart from `follow_up_chart` before giving the recommendation and the next choice. In Web, use the native `chart` fence with the returned `type` and `data`. In a local agent, display the returned `markdown` as visible Markdown with its bars and counts. Translate labels only. If the host cannot show the bars, show the same rows and counts in a Markdown table. Reuse the last ready growth response for this sample and scenario. Render inline without creating an asset or issuing an extra analysis query for the chart.

With an older CLI, use a Markdown table built from the existing counts. For `checkout-recovery`, show `funnel.checkout`, `funnel.buyers` (paid after checkout), and `checkout_recovery.unpaid_count`. For `item-coupon`, show multi-day unpaid, single-day unpaid, and paid viewers from `multi_day` and `single_day`. If a matching ready result is unavailable in the conversation, resume growth for the selected sample and scenario.

For `item-coupon`, compare a full-price reminder with a 20% coupon for multi-day viewers who did not buy. For `checkout-recovery`, compare a reminder leading to item details with one leading directly to checkout for the same unpaid audience. Keep the price and timing the same in that scenario. Compare distinct buyers, payment rate, and paid amount.
