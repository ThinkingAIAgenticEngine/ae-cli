# analysis onboarding run

Run `ae-cli analysis onboarding run` when the customer starts or resumes AE PLG, or from the platform's active Web onboarding guide. Read the returned `skill_path` and preserve `session_id` for continuation.

In an external Agent, the CLI opens new login and authorization pages in the system default browser. If opening fails, give the user the exact returned URL. Web onboarding uses the platform identity and does not open these pages.

For local website onboarding, use the customer's production market (`jp`, `kr`, or `us`). If a saved test session cannot resume, keep its original account and start a separate session only when the customer asks to register in a supported production market.

Use `interaction.options` as the choices for a user decision and `next_action` for what to run next. A successful sign-in can return `choose_experience` immediately. If Demo evidence links are ready, `evidence` contains links for the current Demo project.

Use `ae-cli analysis onboarding run --help` to look up the available flags.
