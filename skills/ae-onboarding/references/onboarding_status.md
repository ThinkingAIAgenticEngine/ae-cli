# analysis onboarding status

Use `ae-cli analysis onboarding status --session-id <session-id>` only when checking an existing PLG session. The output includes the current next action, browser receipt if applicable, and sample preparation state. To advance, follow the session Skill and run the action the user selected.

For a signed-in local session, `business_data.interaction` and `business_data.tools` give the choices for [business data integration](business-data.md). `business_project` identifies the registration project candidate and `project_id` identifies the bound business project when confirmed. `demo_project_id` identifies the sample project.

Use `ae-cli analysis onboarding status --help` to look up the available flags.
