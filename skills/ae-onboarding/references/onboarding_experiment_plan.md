# analysis onboarding experiment-plan

```sh
ae-cli analysis onboarding experiment-plan --session-id <session-id> --upload-metric-event --format json
ae-cli analysis onboarding experiment-plan --session-id <session-id> --scenario checkout-recovery --format json
```

Use the active PLG Demo session. Both commands always add the signed-in account to the Demo approvers and return `approver.status` as `ready` or `failed`. The legacy `--prepare-approver` flag is accepted for compatibility. Report an approver preparation failure explicitly and resolve it by rerunning this plan command before offering launch confirmation. The first command is for the default coupon scenario. Its optional `--upload-metric-event` sends one synthetic payment and returns `metric_event`.

Use the second command for checkout recovery. It saves the verified checkout cohort and proposal locally and prepares the approver in the Demo project. If it returns `run_checkout_recovery_growth`, run [growth](onboarding_growth.md) for that scenario and retry the plan. If it returns `choose_growth_scenario`, show the returned picker and explain the minimum of two eligible accounts.

A ready response returns the proposal, `plan_preview_markdown` for display, and its `run_id` for confirmation. `--dry-run` previews the operation without changing the approver list, sending an event, or saving a plan.

See [plan handling](demo-operations.md#present-the-plan) for confirmation and other outcomes.
