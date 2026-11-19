# analysis onboarding experiment-launch

```sh
ae-cli analysis onboarding experiment-launch --session-id <session-id> --run-id <run-id> --start-only --format json
ae-cli analysis onboarding experiment-launch --session-id <session-id> --run-id <run-id> --wait-report --format json
```

Use the session and run IDs from the confirmed Demo proposal. For checkout recovery, run with `--start-only`. On `upload_experiment_replay`, show the experiment link and immediately run the second command with the same IDs. For the coupon flow, the second command can start and replay in one call. `--dry-run` previews the stages without making changes.

The replay command must include `--wait-report` in onboarding. It queries sample size internally for up to 25 seconds with five-second intervals, using the replay receipt's project-local start and end dates. Missing exposure views and the specific report-unavailable response remain pending. On `phase=pending` and `next_action=wait_experiment_report`, wait `poll_after_ms` and repeat the same command with the same session and run IDs. An accepted replay is reused without resending events. Poll an active process handle until it returns before starting another invocation. A permission, validation or unrelated query failure returns `inspect_experiment_report`; report that blocker.

Show the returned `experiment_url` as soon as the command confirms running. Use it again as the report link after verification. `phase=complete` means the Receiver accepted the batch. A successful sample-size query returns `sample_size_report` and `report_dates`; it does not verify event persistence or all other reports. Follow `next_action=verify_experiment_results` in the current turn to wait for ingestion and reports.

See [launch handling](demo-operations.md#start-and-replay-the-confirmed-experiment) for resuming an interrupted launch and verifying ingestion.
