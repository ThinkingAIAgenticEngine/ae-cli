# analysis query cancel

Use to cancel an async capability-gateway query or export by `run_id`.

This is the only analysis-query cancellation command exposed by ae-cli. Cancellation is bound to the capability-gateway `run_id`; ae-cli does not expose MCP `request_id` cancellation.

Command:

```bash
ae-cli analysis query cancel --run-id <run_id> --dry-run
ae-cli analysis query cancel --run-id <run_id> [--reason <reason>] --yes
```

Input sends `run_id` and optional `reason`.

Cancellation is a high-risk write. Obtain explicit user confirmation before canceling; non-interactive execution requires global `--yes`. Validate and dry-run remain available without confirmation.

Output is the gateway envelope. `data` contains the cancellation result.

Typical workflow: submit an async export, preserve its `run_id`, inspect that run, and call this command only when that same run no longer needs to continue. Do not substitute a lifecycle `request_id` for `run_id`.
