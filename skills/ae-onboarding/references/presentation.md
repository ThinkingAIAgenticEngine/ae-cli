# Onboarding copy and charts

Use a short question or action as the choice label. Name the item or audience when that helps the user decide. Put sample scope, expected effects and approval consequences in the message immediately above the picker. Keep report, product and contact URLs in Markdown links. Localize visible copy and retain the underlying option values. Understand earlier labels when a user types them or replies to an older picker.

## Common choices

| Moment | 中文 |
| --- | --- |
| Account entry | 创建 AE 账号 · 先了解 ThinkingAI |
| Website sign-in | 我已完成登录 · 登录遇到问题 |
| CLI access | 我已授权 CLI · 授权遇到问题 |
| Resume sign-in | 重新打开登录页 · 稍后再试 |
| Reconnect CLI | 重新授权 CLI · 稍后再试 |
| Demo entry | 开始样例体验 · 看看 ThinkingAI 能做什么 |
| After a finding | 看看怎么跟进 |
| Generate a draft | 生成 A/B 草稿 |
| Confirm a runnable draft | 审核通过并启动 |
| Confirm a review-only draft | 确认这份草稿 |
| Draft questions | 为什么选这批人？ · 小批试点怎么做？ · 不加奖励可以测什么？ |
| Web opening | 开始样例体验 · 先了解 ThinkingAI · 稍后再试 |
| Web after verification | 换个 Demo 继续 · 完成体验 |
| Local completion | 继续体验Demo · 接入数据 |
| Sample selection | 星屿游戏 · 星光冒险礼包 / 赛季通行证 · 从结账到付款 |

For draft review, keep the approval choice first until the user confirms. Continue to remove only answered questions. For a runnable draft, explain that approval starts the Demo and replays simulated events. For a review-only draft, explain that confirmation records the user's review. Accept the earlier **审核通过** label for the action already shown. Use the [business data choices](business-data.md) for data integration.

## Differentiate the samples

| Stage | 星屿游戏 | 赛季通行证 |
| --- | --- | --- |
| Opening question | 玩家反复看礼包，后来更容易买吗？ | 有多少玩家开始结账，最后没有付款？ |
| Opening visual | Horizontal bars comparing single-day and multi-day purchase rates | Ring chart of checkout outcomes with the unpaid count and share emphasized |
| Start of business diagnosis | Seven-day line showing interest in the bundle | Seven-day line showing interest in the pass |
| Main visual in purchase diagnosis | Step widths and losses from viewing the bundle to paying | Step widths and losses from opening the pass to paying |
| Audience follow-up | Bars for the follow-up counts | 100% stacked bar for the disjoint audience groups |
| Explore route | 深挖礼包购买表现 | 深挖通行证转化 |
| Follow-up route for revisits | 找出回访未购玩家 | 找出回看通行证的玩家 |
| Follow-up route for checkout | 找出结账未付玩家 | 找出可召回的通行证玩家 |
| Follow-up route for conversion | 找出礼包购买卡点 | 找出通行证购买卡点 |
| Diagnosis topics | 礼包回访 · 礼包结账未付 · 礼包购买漏斗 | 通行证回访 · 通行证结账未付 · 通行证购买漏斗 |
| A/B result | Compare purchase rates for the bundle and show the cost if a coupon was tested | Compare payment completion for the pass and show both exposure denominators |

Use the sample's initial finding when entering its overview. Use the rotated `featured_topic` for the follow-up choice. Keep the question and its counts specific to the selected item. In Season Pass, consider the overlap between checkout and repeat viewing when presenting audience choices. Use sample-specific arm labels in the report, such as **返回礼包详情** or **返回通行证详情** when relevant.

## Choose and render a chart

Use pure Markdown for the default walkthrough in every host. Place one primary visual above the next choice. Use the current verified result in the same reply, without images, render jobs, or extra queries. Copy the matching field from `markdown_charts` when present. Translate table headers, labels and legends, and preserve the exact values, shapes and whitespace inside `text` fences. With an older CLI, use the underlying counts to reproduce the same layout.

| Finding | Markdown layout | Field from `markdown_charts` |
| --- | --- | --- |
| Compare purchase rates | Horizontal bars on a common 0–100% scale | `purchase_rate` |
| Show the checkout split | Ring with a legend and exact counts and shares | `checkout_share` |
| Show change over the sample week | Text line chart with axes, plus exact daily counts | `daily_viewers` |
| Show loss along the purchase flow | Centered funnel with loss and conversion columns | `purchase_funnel` |
| Compare eligible audiences | Horizontal bars with exact counts | `follow_up` |
| Show audience overlap | 100% stacked bar for the three disjoint parts | `audience_overlap` |
| Review or read A/B results | Side-by-side Markdown table | Saved plan or verified event counts |

Use the host's Markdown typography. Use blue for a single series and blue and purple for different series when using colored blocks. Pair each color or texture with a text label. Keep the main result in bold once, use short metric titles and right-align numbers. Put units, dates, timezone and the counting rule where they help interpret the figure. Use `▲` or `▼` with the actual signed change and unit. Show a missing value as `—` and leave a gap in a trend. Preserve verified zeroes.

If the user requests an interactive chart and the host supports native `chart`, use strict JSON with `type`, localized `title`, and `data` entries. Use numeric `value` with `label` for `bar`, `line` and `pie`. Leave the colors and typography to the host theme. When a native pie groups small slices, keep their exact counts and shares beside it.

### Markdown layouts

**Rate or count comparison.** Use a zero-based scale of 12 blue blocks. Use a shared 100% maximum for rates and the largest count for counts. Keep the exact value in a right-aligned column.

**Composition.** For checkout, draw the two verified parts of the total as a ring inside a `text` fence with two distinguishable textures. Keep the precise count and percentage in the legend table. For audience overlap, divide 20 blocks at cumulative share boundaries so the bar sums to 100%. The three parts are intersection, checkout-only and revisit-only. Label each segment with its exact count and share. Omit a composition visual with a zero denominator.

**Seven-day trend.** Use a `text` fence with the y-axis ticks, dates along the x-axis, and connected points. Keep dates in chronological order and include the exact daily counts in a compact table. When the source has no verified trend, continue with the current finding.

**Purchase funnel.** Keep steps in the order they happen. Center the marks, and use the first stage as the width reference throughout. Next to each later stage show the loss and the conversion rate from the preceding one. A verified zero has an empty bar and a displayed zero. An undefined transition rate is unavailable.

| 通行证购买步骤 | 人数 | 规模 | 较上一步流失 | 较上一步转化率 |
| --- | ---: | :---: | ---: | ---: |
| 浏览详情 | 120 | `━━━━━━━━━━━━` | — | — |
| 开始结账 | 48 | `━━━━━` | 72 | 40.0% |
| 完成付款 | 20 | `━━` | 28 | 41.7% |

**A/B draft and report.** Use a side-by-side Markdown table. For a draft, use the two destinations or offers, split and price from the plan. For a verified report, lead with the rate difference in percentage points and show both denominators, buyers, rates and amounts. Include claims, order costs and profit for a coupon test. Use the experiment's saved currency and the scenario-specific labels.
