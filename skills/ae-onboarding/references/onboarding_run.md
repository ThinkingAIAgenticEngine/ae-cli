# analysis onboarding run

Run `ae-cli analysis onboarding run` when the customer starts or resumes AE PLG, or from the platform's active Web onboarding guide. Read the returned `skill_path` and preserve `session_id` for continuation.

In an external Agent, the CLI opens new login and authorization pages in the system default browser. If opening fails, give the user the exact returned URL. Web onboarding uses the platform identity and does not open these pages.

Use `interaction.options` as the choices for a user decision and `next_action` for what to run next. A successful sign-in can return `choose_experience` immediately. If Demo evidence links are ready, `evidence` contains links for the current Demo project.

Use `ae-cli analysis onboarding run --help` to look up the available flags.

In Web, pass the [onboarding language](../SKILL.md#onboarding-language-and-currency) with `--language` and use the resolved `language` in the response. The Web `run` result and its `--dry-run` preview include `product_resource_market` (`cn`, `us`, `jp`, `kr`, or `null`) for selecting [public product links](about-ae.md#web-onboarding).

## Website signup

Offer free website signup entries for new accounts. Use a market the user specified or confirmed first. Otherwise read `local_language` from the installation report or `data.local_language` from `ae-cli --dry-run analysis onboarding run --format json`. For an `en-US` device, select the US free entry. For a `zh-CN` device, select the China free entry.

For other or unavailable local languages, consider Japanese (`jp`) and Korean (`kr`) as supported free markets and use the customer's request as a secondary language signal. Map English to `us` and Chinese, including Traditional Chinese, to `cn`. Infer the signal from the customer's prose, excluding commands, links, and quoted labels. If the signals disagree, offer the two corresponding free markets and wait. If neither supplies a market, use the US free entry as the fallback. A missing locale or `C.UTF-8` provides no language signal. The legacy `onboarding_market` and `device_market` can contain a fallback.

After the user chooses to create an account, run `ae-cli analysis onboarding run --region <market> --website-env production --browser system --format json`. Pass `--source` for the current AI tool and `--language` for the onboarding language. For the United States use `--region us --language en-US`. For overseas testing, use `--website-env test` with `--region us`, `jp`, or `kr`. Use `us` for an overseas test request without a specific market. Resume with the returned `--session-id` to keep the original environment. Start a separate continuation when the user requests a different environment.

## Existing account sign-in

1. **Use a confirmed account route.** Use the login address or AE host the user supplied or confirmed first. If no route was supplied, use an active account when the user wants to use it. An account already signed in on that route can go directly to [shared progress](#shared-progress). Use its actual AE host for `auth status`, login, and subsequent calls.
2. **Identify the deployment when the route is open.** Read `existing_account_options` from the installation report or `data.existing_account_options` from `ae-cli --dry-run analysis onboarding run --format json`. Present the `deployment` picker for SaaS (`saas`), private deployment (`private`), or not sure (`unsure`). After SaaS, present the `saas` picker. Keep the returned option values and render the question and labels in the onboarding language. When `default_value` is `us`, show the US option as the suggested entry and wait for confirmation or another choice before opening it. For private deployment, not sure, or `other_address`, ask for the usual login URL. If the user cannot find it, direct them to their AE administrator.
3. **Follow the confirmed entry.** For `login_method=website` or a known free SaaS entry, pass its `ae_host` and `website_market` to `ae-cli analysis onboarding run --host <AE_HOST> --region <MARKET> --website-env production --browser system --format json`. Pass `--source` for the current AI tool and `--language` for the onboarding language. Use the command's browser page to bind sign-in to the CLI session, then resume the returned `session_id`. For the China paid entry (`cn_paid`), `https://ta.thinkingdata.cn/` is the browser login entry. Confirm the AE service host for that account, then use the device flow. For private deployment or another confirmed login address, use its confirmed AE host for the device flow. Each login uses the host for the selected account and tier.
4. **Verify the connection.** For the device flow, run `ae-cli auth login --host <AE_HOST> --no-wait`, open its `verification_url`, and wait for the user to approve. Then run `ae-cli auth login --host <AE_HOST> --device-code <DEVICE_CODE>` with the returned device code. Check `ae-cli auth status --host <AE_HOST> --format json` and then read [shared progress](#shared-progress) on that host.

If the CLI predates `existing_account_options`, offer the same deployment picker. For SaaS, use the local language from the installation report or dry-run response with this fallback picker:

| Local language | Entries |
| --- | --- |
| English (`en-US`) | United States SaaS, China paid SaaS, China free SaaS, or another login address. Suggest the US entry and wait for confirmation. |
| Chinese (`zh-CN`) | China paid SaaS, China free SaaS, or another login address. |
| Other or unknown | United States SaaS, China paid SaaS, China free SaaS, or another login address. |

In a Chinese-language picker, show the China entries in this order:

1. **中国SAAS高配版** (`cn_paid`)
2. **中国SAAS低配版(免费体验)** (`cn_free`)

The free US entry is `https://thinkingai.io/en/experience-login/` and its AE host is `https://ae-web-global.thinkingai.io`. The free China entry is `https://www.thinkingai.cn/experience-login/` and its AE host is `https://ae-web.thinkingai.cn`. Run the website command in step 3 with the confirmed free entry so it opens a session-bound sign-in page.

### Existing US account sign-in

For a confirmed existing US account, use the website command above with `--region us --language en-US`. For an explicitly requested US test environment, use the confirmed test host and set `--website-env test`. Reuse the returned `session_id` after the user confirms sign-in.

## Shared progress

Use `ae-cli analysis onboarding progress --format json` to read the signed-in account's current version. In a local Agent, pass `--host <AE_HOST>` when the intended account's host is known. When the user enters the Demo, `run --choice demo` starts or resumes the shared round. Retain the latest `session_id` returned by `run`.

- `not_started` offers the current Demo. `in_progress` resumes it. `completed` routes returning users to their ordinary AE task.
- If the response has a bound `run_id`, reuse it. If a different conversation owns that run, use the existing run's report and wait for its replay checkpoint. Continue experiment launch from its original session if the checkpoint is still missing.
- Once the replay events are persisted, run `ae-cli analysis onboarding progress --run-id <run-id> --format json`. This checks the events in the Demo project and records completion on both surfaces. If it still returns `in_progress`, retry the same run after ingestion. For `unavailable`, preserve the current run and retry the completion call.
- On `check_demo_license`, explain that the Demo needs active Operations and Experiment permissions. Keep the same session to retry after those permissions take effect.
- A `disabled` result uses the existing unversioned flow. The completion choice in Web still controls when to show the workspace entry.
