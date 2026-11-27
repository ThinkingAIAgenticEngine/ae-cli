---
name: ae-onboarding
version: 1.1.65
description: "Guide Demo growth analysis, business diagnosis, and A/B draft review in AE onboarding, and route business data integration in a local agent."
metadata:
  internal: true
---

Use this Skill for an explicitly started AE PLG session or the platform's active first-experience conversation. Retain the session ID returned by [`ae-cli analysis onboarding run`](references/onboarding_run.md) and use `--session-id` for all subsequent calls. To inspect progress, use [`ae-cli analysis onboarding status`](references/onboarding_status.md).

## Onboarding language and currency

For the United States market (`us`), use English (`en-US`) from the first account choice through completion, regardless of the conversation or device language. Use English for all visible guidance, choices, sample names, chart labels, drafts, reports, and link labels. Explain upstream errors in English. Pass `--language en-US` to `run` and keep it for the entire session. Treat `https://ae-web-global.thinkingai.io` as US when the request or session has no other confirmed market. A confirmed Japanese or Korean market on a shared host uses its own locale rules.

In US onboarding, display every monetary amount with `$` as its only currency marker, as in `$100`. Use [Demo currency checks](references/demo-operations.md#demo-currency) to verify the underlying USD data and format drafts, charts, experiment data, and reports.

For other markets, use the requested display language or the customer's conversation language. For Chinese use 星屿游戏 and 星光冒险礼包 for Star Island and its item, and 赛季通行证 for the second sample.

For each user decision, show the result or context, then render the choice in the same turn. Use the values from `interaction.options` when present and follow [onboarding copy and charts](references/presentation.md) for the localized labels and inline Markdown charts. In Codex, prefer the blocking `request_user_input` when available and use `request_user_input_async` otherwise. In Claude Code, call `AskUserQuestion`. Use the equivalent native picker in other hosts. When a local picker returns before the user answers, use the host’s wait mechanism and keep the turn open until the user chooses or dismisses it. If the picker is unavailable or fails, ask the same question with its options in chat and resume on the user’s reply. Progress updates and actions that can proceed automatically require no choice.

Use clickable text links for dashboards, evidence, experiment pages, official resources and contact pages. Explain briefly what to click and what it opens. Keep the picker for user decisions that advance the conversation.

Use the [inline Markdown layouts](references/presentation.md#choose-and-render-a-chart) throughout the Demo, from the opening finding through the final report. Reuse the current result's `markdown_charts` when they match the layout.

Use the [market-specific product resources](references/about-ae.md#product-resources) for the product introduction and completion links, with copy and labels in the onboarding language.

When the user requests CLI help or remains blocked after troubleshooting, show the [AE CLI support channels](references/about-ae.md#ae-cli-support) for their confirmed environment.

Keep the verified report, its link, the completion greeting, and the market-specific website and contact links together in the final local reply. Follow the [completion format](references/demo-operations.md#choose-the-next-step) when the host displays choices separately.

For a single action, use a picker that supports one option. In Codex, use `request_user_input_async` when available for that action. If the host requires multiple options, show the single action in plain text and wait for the user to choose it or ask to stop. Keep any host-provided skip or dismiss behavior.

## Web onboarding

When the platform identifies this as the active first-experience conversation, skip Login. At the start of the walkthrough, run `node <this-skill-directory>/scripts/web-journey.mjs active` from the current conversation directory. Use the existing sandbox CLI from that directory, omitting `--host`, `--region`, and `--website-env` from all commands. Reuse the same session ID. If the platform-provided identity or CLI is unavailable, explain that the experience cannot proceed. Do not install the CLI, open a login page, or switch credentials.

Start with `ae-cli analysis onboarding run --language <locale> --format json` using the onboarding language. Use the resolved `language` returned by the CLI for the visible response. If the customer directly requests the Demo, add `--choice demo` and use the recommended sample unless they select another one. On `choose_experience`, show **Start the demo**, **See what ThinkingAI can do**, and **Not now** using the returned `interaction.options`. If the customer chooses **See what ThinkingAI can do** or asks what AE does before the Demo, show the [Web introduction and links](references/about-ae.md#web-onboarding), then return to that same picker. Pass `--choice demo` after the customer chooses **Start the demo**.

Outside the US market, when the conversation language changes at the opening picker, run the same command with the current `--session-id` and new `--language`. During or after a Demo, use `ae-cli --dry-run analysis onboarding run --session-id <session-id> --language <locale> --format json` to refresh `product_resource_market` for the links. Carry the onboarding language into subsequent `run` commands.

For each choice, use the CLI result carrying `interaction` as the final tool call and end the reply with one fenced `options` block. Use one to five localized plain lines without numbering. When offering sample selection, first call `node <this-skill-directory>/scripts/web-journey.mjs choose-sample`. After giving follow-up recommendations, call the same script with `after-follow-up`. A choice is sent back as the user's message.

After verifying the experiment report, follow [the Web completion choices](references/demo-operations.md#choose-the-next-step). Write the `done` marker only after the user chooses **Finish the demo** or explicitly ends the verified Demo. If they stop before a report is verified, write `stopped` instead. Run the marker command from the current conversation directory. The platform shows the workspace entry after the reply. Business SDK setup requires the customer's local workspace. If asked about it in Web onboarding, explain that it is available in a local agent.

## Login

For a local onboarding request, start with `ae-cli auth status --format json` on the requested or active host. If the user is signed in and wants to use that account, read [shared progress](references/onboarding_run.md#shared-progress) on that host. When the account route is open, offer **Create an AE account** and **Sign in to my existing AE account** in the onboarding language and wait for the choice before starting a sign-in or signup command.

When the user explicitly requests onboarding and needs a new account, offer **Create an AE account** and **Learn about AE** before starting website onboarding. Use the [localized labels](references/about-ae.md#localized-labels). If they choose **Learn about AE**, follow the [product introduction](references/about-ae.md), then offer **Create an AE account**. Wait for the user to choose signup or request it directly before starting website onboarding. When resuming a session that already has a login page, follow the current login step.

After the choice, follow [free website signup](references/onboarding_run.md#website-signup) to resolve the free signup market, or [existing account sign-in](references/onboarding_run.md#existing-account-sign-in) to confirm the account's deployment and actual login address. Preserve a session that already has a sign-in page and keep its onboarding language.

Follow `next_action` and the browser receipt. For `guide_existing_window`, direct the user to the page already opened in their system default browser. For `show_fallback_link` or a window the user cannot find, give the exact URL for that browser. For `complete_website_login`, show **I finished signing in** and **I need help signing in**. For `approve_device`, show **I approved CLI access** and **I need help authorizing the CLI**. Resume the same session when the user confirms. For `restart_website_login` or `reauthorize_cli`, show the returned recovery choice and **Not now**. If a matching older CLI returns `run_onboarding` with zero delay after claiming authorization, run once more in the same turn. On `choose_experience`, show the experience picker immediately.

When the user selects either help option, explain the current browser step and show the [AE CLI support channels](references/about-ae.md#ae-cli-support).

After the user confirms signing in, if website authorization is `authorizing`, `approved`, or `claimed` but still settling, wait `poll_after_ms` and retry the same session within the current turn. Avoid asking them to confirm the same browser action again. Show the next picker as soon as the CLI returns it.

## Local agent experience

After login, resume the user's original AE task if they signed in to perform it. For a walkthrough, tell them what the Demo will help them find, then show **Start the demo** first and **Learn about AE** second, using `demo_entry` when available. After the [product introduction](references/about-ae.md), return to the same choice. Pass `--choice demo` only after the user chooses or directly requests the Demo. Route a direct request to connect business data through [business data integration](references/business-data.md).

Follow the [local Demo journey](references/demo-journey.md) for project overviews, growth opportunities, and business diagnosis. A direct request for either existing growth scenario or the purchase funnel can go straight to its analysis. On `confirm_business_project`, show the returned candidate and pass `--confirm-business-project-id` after confirmation. On `resolve_business_project`, direct the user to AE to resolve the registration project. Use the project ID returned by AE.

## Demo

For a versioned onboarding entry, follow [shared progress](references/onboarding_run.md#shared-progress) before starting or resuming the first Demo. After verifying its A/B replay, record completion using the same run ID. Web uses the platform identity for the same commands.


Use the server-selected recommendation when there is no confirmed sample selection. Keep the selected sample through the verified experiment. Offer a sample picker after a verified report. Pass `run --sample <sample-id>` once after the user selects a sample for the next round. Before the first `run` that enters a sample in this conversation, tell the user in one line that the Demo data is being prepared. If the response says `poll_demo`, wait for `poll_after_ms` and resume `run`. Report a preparation error with its retry action.

On Web, show the [project overview](references/onboarding_growth.md#demo-overview) before using the existing growth picker. On a local agent, use the [local Demo overview](references/demo-journey.md#project-overview) and its two analysis routes. A direct scenario uses [growth results](references/onboarding_growth.md).

Run the selected growth scenario and retain it through follow-up and experiment planning. On `phase=ready`, show the finding, the [scenario-specific visual](references/onboarding_growth.md#presentation), and a visible **Data basis** section with the localized heading, sample scope, source counts, and calculation.

For Web and a directly requested growth scenario, offer **See how to follow up** in the onboarding language after the result. Follow the local journey for selections made from the local Demo overview. For checkout recovery with fewer than two eligible accounts, explain the count and offer another scenario.

When the customer asks how to follow up with these users, show the [follow-up chart and recommendation](references/onboarding_growth.md#follow-up) from the last ready growth response for the selected sample and scenario. If baseline links were missing, use one read-only `status` call to check for them and include only links returned for this sample. In Web, make this check before the `after-follow-up` call.

In that turn, make the chart visible above the picker. Offer only **Create an A/B draft** in the onboarding language. Wait for the customer's choice before generating the plan.

### Generate an A/B experiment plan

When the customer chooses **Create an A/B draft** or selects a runnable diagnosis action, call [experiment-plan for the selected scenario](references/onboarding_experiment_plan.md). For the local journey use `--draft-only`. This returns a saved draft with `approver.status=deferred` and review choices. For Web's existing plan flow continue to require `approver.status=ready` before presenting launch confirmation.

On `phase=ready`, retain `run_id` and display the [A/B comparison table](references/demo-operations.md#present-the-plan). In the local journey, offer **Approve draft** first, then the three [optional review questions](references/demo-journey.md#review-the-same-draft). Record each question after answering it and use the updated choices for the same draft. For plan failures, follow the returned action and resolve the failure before offering launch.

### Confirm and start the A/B experiment

When the customer chooses **Approve and start the Demo test** in the onboarding language or explicitly confirms the displayed runnable plan, tell them in one line that the experiment is starting and synthetic events are being replayed. Then call [experiment-launch](references/onboarding_experiment_launch.md) with its saved `run_id` and `--wait-report`. This starts the experiment, immediately replays the synthetic events and waits for exposure data. **Required for every onboarding Demo approval:** only `ae-cli analysis onboarding experiment-launch` may submit or approve the draft, including on retries and resumes. If a resumed run returns `upload_experiment_replay`, proceed with `--wait-report` immediately. After the Receiver accepts the replay, [verify the persisted events](references/demo-operations.md#report-verified-results) in the same turn. Once they match the replay receipt, present the Demo report in the conversation, even if the platform summary is pending or differs. Follow the [completion format](references/demo-operations.md#choose-the-next-step) for the report link, welcome message and next choices.

For an explicit request to launch a Demo experiment, use the requested or previously selected scenario. If neither is available, use the default. Obtain a `run_id` and launch using the existing authorization. For a local review draft request, use `experiment-plan --draft-only`. For requests that explicitly ask to create an AE platform draft, follow [draft-only creation](references/demo-operations.md#draft-only-creation). After the Demo, route **Connect my data** through [business data integration](references/business-data.md).


## Business SDK in a local agent

Use `--choice business` after the user requests SDK installation or selects that route. On `identify_workspace_projects`, follow [plan-based SDK setup](references/business-sdk.md) with the bound registration project. Complete after the user confirms setup and show the project-specific real-time data link.
