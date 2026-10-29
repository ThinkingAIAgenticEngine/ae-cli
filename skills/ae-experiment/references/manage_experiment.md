# experiment experiment manage

Manage experiment status.

```bash
ae-cli experiment experiment manage --project-id <id> --exp-id <expId> --target-status <status> [--remark <text>]
```

Flags:
- `--project-id`, `-p`: Project ID.
- `--exp-id`: Experiment ID.
- `--target-status`: One of `draft`, `testing`, `pending`, `running`, `paused`, `ended`, `archive`.
- `--remark`: Optional operation remark.

When target status is `pending`, `testing`, or `running`, Hermes performs a ready
check before changing status, except when resuming `paused` to `running`.
Resume uses the shared status transition service, which checks permissions,
deadline, and audience readiness and re-enables the Feature rules and RCC sync.
It preserves the first start time and the existing day-based or fixed deadline.
Do not run the standalone `ready-check` as a prerequisite for resuming a paused
experiment; that command accepts only pre-launch states.

For Feature scheduling, save `startTime` first and use `pending` to submit. The
server checks submitted experiments every half hour. `running` starts immediately;
read fresh detail and disclose `start_time_adjustment_required=true` before an
early manual start. No extra confirmation field is required. See
[Feature timing](save_experiment.md#feature-timing) for lifecycle and deadline rules.

Response shape: the operation or blocking readiness result is in `data.result`, with object keys recursively converted to snake_case.

An outer `ok=true` does not mean the status changed when `data.result.valid=false`.
Report the returned issues and read `experiment experiment get` to confirm the
actual status. A successful resume normally returns `data.result=true`; do not
report the experiment as running until an independent read confirms it.
