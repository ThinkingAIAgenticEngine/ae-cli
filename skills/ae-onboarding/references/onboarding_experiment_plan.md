# analysis onboarding experiment-plan

```sh
ae-cli analysis onboarding experiment-plan --session-id <session-id> --scenario checkout-recovery --draft-only --format json
ae-cli analysis onboarding experiment-plan --session-id <session-id> --run-id <run-id> --answered-question review_audience --format json
ae-cli analysis onboarding status --session-id <session-id> --run-id <run-id> --format json
ae-cli analysis onboarding experiment-plan --session-id <session-id> --upload-metric-event --format json
ae-cli analysis onboarding experiment-plan --session-id <session-id> --scenario checkout-recovery --format json
```

Use `--draft-only` for local guided review. It saves the draft and returns `approver.status=deferred` and the review choices. A read-only `status --run-id` resumes the same draft for the same signed-in session and sample. Review takes place before approver registration and event upload. After the user approves, `experiment-launch` prepares the approver within the confirmed launch.

After answering a clicked review question, save its option value with `--answered-question` and the same run ID. The supported values are `review_audience`, `review_pilot`, and `review_no_reward`. Repeating an answer record returns the same draft and choices. The `launch` option stays first throughout review.

Legacy planning without `--draft-only` prepares the signed-in approver and reports `ready` or `failed`. The compatibility flag `--prepare-approver` remains available. The coupon-only flag `--upload-metric-event` sends one synthetic payment and returns `metric_event`. Use `--draft-only` separately from both flags.

Checkout recovery uses the verified cohort in the same session and sample. If the command returns `run_checkout_recovery_growth`, rerun [growth](onboarding_growth.md) for that scenario before planning. On `choose_growth_scenario`, explain the minimum of two eligible accounts and offer the same sample's coupon draft.

A ready response returns the proposal, `plan_preview_markdown` for display, and its `run_id` for confirmation. `--dry-run` previews the operation without changing the approver list, sending an event, or saving a plan.

See [plan handling](demo-operations.md#present-the-plan) for confirmation and other outcomes.
