---
name: ae-onboarding
version: 1.1.38
description: "Guide Demo analysis and a follow-up A/B experiment in AE onboarding, with SDK integration available in a local agent."
metadata:
  internal: true
---

Use this Skill for an explicitly started AE PLG session or the platform's active first-experience conversation. Retain the session ID returned by [`ae-cli analysis onboarding run`](references/onboarding_run.md) and use `--session-id` for all subsequent calls. To inspect progress, use [`ae-cli analysis onboarding status`](references/onboarding_status.md). Translate labels into the customer's language. For Chinese use 星屿游戏 and 星光冒险礼包 for Star Island and its item, and 赛季通行证 for the second sample.

For each user decision, show the result or context, then render the choice in the same turn. Use `interaction.options` from the last CLI result when present. In Codex, call `request_user_input` or `request_user_input_async`, whichever is available. In Claude Code, call `AskUserQuestion`. Use the equivalent native picker in other hosts. Wait for the selection. Fall back to short text choices only if the picker is unavailable or fails. Progress updates and actions that can proceed automatically require no choice.

## Web onboarding

When the platform identifies this as the active first-experience conversation, skip Login. Run onboarding from the current conversation directory with the existing sandbox CLI, omitting `--host`, `--region`, and `--website-env` from all commands. Reuse the same session ID. If the platform-provided identity or CLI is unavailable, explain that the experience cannot proceed. Do not install the CLI, open a login page, or switch credentials.

Web onboarding offers the Demo only. For an explicit start request, pass `--choice demo` and use the recommended sample. Otherwise offer **Start the demo** or **Not now**. For each choice, use the CLI result carrying `interaction` as the final tool call and end the reply with one fenced `options` block for older Web clients. Use two to five localized plain lines without numbering. When offering sample selection, first call `node <this-skill-directory>/scripts/web-journey.mjs choose-sample`. After giving follow-up recommendations, call the same script with `after-follow-up`. A choice is sent back as the user's message.

After the verified experiment report is ready to deliver, run `node <this-skill-directory>/scripts/web-journey.mjs done` from the current conversation directory and deliver the results. If the user explicitly stops the walkthrough, write `stopped` instead. The platform shows the workspace entry after the reply. Pending ingestion, unverified reports, and ordinary follow-up questions do not end the journey. Business SDK setup requires the user's local workspace. If asked about it in Web onboarding, explain that it is available in a local agent without starting that flow or offering it as a choice.

## Login

For a new local onboarding session, use the customer's explicit or already confirmed market. Otherwise infer it from the local language and the language of the customer's own request. Chinese maps to China, English to the United States, Japanese to Japan, and Korean to South Korea. If the two hints differ, render exactly the two corresponding markets. For Chinese and English, show only China and the United States. Treat the CLI's `markets` list as supported-market metadata. Use either hint alone when the other is unavailable, or the United States when neither is available.

Start website onboarding with the resolved `--region cn`, `--region jp`, `--region kr`, or `--region us`. Existing accounts use their original host.

Follow `next_action` and the browser receipt. For `guide_existing_window`, direct the user to the page already opened in their system default browser. For `show_fallback_link` or a window the user cannot find, give the exact URL for that browser. For `complete_website_login`, show **I finished signing in** and **I need help signing in**. For `approve_device`, show **I approved CLI access** and **I need help authorizing the CLI**. Resume the same session when the user confirms. For `restart_website_login` or `reauthorize_cli`, show the returned recovery choice and **Not now**. If a matching older CLI returns `run_onboarding` with zero delay after claiming authorization, run once more in the same turn. On `choose_experience`, show the experience picker immediately.

After the user confirms signing in, if website authorization is `authorizing`, `approved`, or `claimed` but still settling, wait `poll_after_ms` and retry the same session within the current turn. Avoid asking them to confirm the same browser action again. Show the next picker as soon as the CLI returns it.

## Choose an experience in a local agent

Show Start the demo and Connect my business data. Pass `--choice demo` or `--choice business` only after the user chooses. For `confirm_business_project`, show the server-returned candidate name and send `--confirm-business-project-id` after confirmation. For `resolve_business_project`, direct the user to AE to resolve the registration project. Never infer an ID from the display name, current browser tab, or a Demo.

## Demo

Use the server-selected recommendation. To change samples, display `samples` and call `run --sample <sample-id>` after the user chooses. If the response says `poll_demo`, wait for `poll_after_ms` and resume `run`. Report a preparation error when the server asks for action.

When the sample is ready, open the growth picker from `interaction.options`. Offer **Find a growth opportunity**, **Win back players who started checkout but did not pay**, and **Change sample**. In Chinese use **帮我找一个增长机会**, **找回结账未支付的玩家**, and **更换样例**. For a direct request for either scenario or the purchase funnel, go straight to [growth results](references/onboarding_growth.md).

Run the selected growth scenario and retain it through follow-up and experiment planning. On `phase=ready`, show the dates, aggregate counts, and one chart using [growth presentation and links](references/onboarding_growth.md#presentation).

After presenting the growth opportunity, open the picker with **How should we follow up with these users?** and **Change sample** in that order. In Chinese use **这批用户该怎么跟进？** and **更换样例**. For checkout recovery with fewer than two eligible accounts, offer the growth picker again and explain the count. Wait for the customer to choose before presenting follow-up strategies.

When the customer asks how to follow up with these users, show the [follow-up chart and recommendation](references/onboarding_growth.md#follow-up) from the last ready growth response for the selected sample and scenario. If baseline links were missing, use one read-only `status` call to check for them and include only links returned for this sample. In Web, make this check before the `after-follow-up` call.

In that turn, make the chart visible above the picker. Then offer **Generate an A/B experiment plan** and **Change sample** in that order. In a local agent only, add **Connect my business data**. In Chinese, use these exact labels: **生成 A/B 实验方案**, **更换样例**, and **接入我的业务数据**. Wait for the customer's choice before proceeding.

### Generate an A/B experiment plan

When the customer chooses **生成 A/B 实验方案** or asks for the plan, call [experiment-plan for the selected scenario](references/onboarding_experiment_plan.md).

For every Demo experiment plan, require `approver.status=ready` before offering launch confirmation. On `failed`, report the returned reason and retry plan preparation after resolving it.

On `phase=ready`, retain `run_id` and show the [A/B comparison table](references/demo-operations.md#present-the-plan) in chat before opening the confirmation picker in the same turn. Follow the same reference for pending and blocked plans.

### Confirm and start the A/B experiment

When the customer chooses **确认并启动 A/B 实验** or confirms the displayed plan, call [experiment-launch](references/onboarding_experiment_launch.md) with its saved `run_id` and `--wait-report`. **Required for every onboarding Demo approval:** only `ae-cli analysis onboarding experiment-launch` may submit or approve the draft. This applies after creation and on every retry or resume. Never substitute standalone approval writes. For checkout recovery, use `--start-only` first. On `upload_experiment_replay`, show the link in a progress update and resume the same run with `--wait-report` to send the replay. On `wait_experiment_report`, wait `poll_after_ms` and resume that same launch command in the current turn. Use this command's internal wait for exposure-view readiness before separate report reads. Follow [launch handling](references/demo-operations.md#start-and-replay-the-confirmed-experiment) for other actions. After Receiver acceptance, continue [result verification](references/demo-operations.md#report-verified-results) in the same turn.

For an explicit request to launch a Demo experiment, use the requested or previously selected scenario. If neither is available, use the default. Obtain a `run_id` and launch using the existing authorization. For a draft-only request, follow [draft-only creation](references/demo-operations.md#draft-only-creation). In a local agent, if the customer chooses business data, use the same onboarding session with `--choice business` and follow Business SDK.


## Business SDK in a local agent

On `identify_workspace_projects`, follow [plan-based SDK setup](references/business-sdk.md) with the bound registration project. Complete after the user confirms setup and show the project-specific real-time data link.
