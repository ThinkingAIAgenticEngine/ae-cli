# analysis onboarding run

Run `ae-cli analysis onboarding run` when the customer starts or resumes AE PLG, or from the platform's active Web onboarding guide. Read the returned `skill_path` and preserve `session_id` for continuation.

In an external Agent, the CLI opens new login and authorization pages in the system default browser. If opening fails, give the user the exact returned URL. Web onboarding uses the platform identity and does not open these pages.

Use `interaction.options` as the choices for a user decision and `next_action` for what to run next. A successful sign-in can return `choose_experience` immediately. If Demo evidence links are ready, `evidence` contains links for the current Demo project.

Use `ae-cli analysis onboarding run --help` to look up the available flags.

In Web, pass the conversation locale with `--language`. The Web `run` result and its `--dry-run` preview include `product_resource_market` (`cn`, `us`, `jp`, `kr`, or `null`) for selecting [public product links](about-ae.md#web-onboarding).

## Website signup

For a new production account, use the market the user specified or confirmed. Otherwise compare `local_language` in the install report with the language of the user's own request. Without a current report, read `data.local_language` from `ae-cli --dry-run analysis onboarding run --format json`. Infer the request language from the user's prose, excluding commands, links, quoted text, and picker labels. A missing locale or `C.UTF-8` provides no language signal. Treat `onboarding_market` and `device_market` as defaults that may include a fallback.

Map Chinese (including Traditional Chinese) to China (`cn`), English to the United States (`us`), Japanese to Japan (`jp`), and Korean to South Korea (`kr`). If both signals point to different markets, show exactly those two markets in the user's language and wait for their selection. If they agree or only one maps to a market, use that market directly. With neither, use `us`.

After the user chooses to create an account, run `ae-cli analysis onboarding run --region <market> --browser system --format json`. Pass `--source` for the current AI tool and `--language` for the display preference or conversation language when known. For overseas testing, add `--website-env test` with `--region us`, `jp`, or `kr`. Use `us` for an overseas test request without a specific market. Resume with the returned `--session-id` to keep the original environment. Start a separate continuation when the user requests a different environment.

## Shared progress

Use `ae-cli analysis onboarding progress --format json` to read the signed-in account's current version. When the user enters the Demo, `run --choice demo` starts or resumes the shared round. Retain the latest `session_id` returned by `run`.

- `not_started` offers the current Demo. `in_progress` resumes it. `completed` routes returning users to their ordinary AE task.
- If the response has a bound `run_id`, reuse it. If a different conversation owns that run, use the existing run's report and wait for its replay checkpoint. Continue experiment launch from its original session if the checkpoint is still missing.
- Once the replay events are persisted, run `ae-cli analysis onboarding progress --run-id <run-id> --format json`. This checks the events in the Demo project and records completion on both surfaces. If it still returns `in_progress`, retry the same run after ingestion. For `unavailable`, preserve the current run and retry the completion call.
- On `check_demo_license`, explain that the Demo needs active Operations and Experiment permissions. Keep the same session to retry after those permissions take effect.
- A `disabled` result uses the existing unversioned flow. The completion choice in Web still controls when to show the workspace entry.
