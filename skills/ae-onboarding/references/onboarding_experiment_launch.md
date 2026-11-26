# analysis onboarding experiment-launch

```sh
ae-cli analysis onboarding experiment-launch --session-id <session-id> --run-id <run-id> --wait-report --format json
```

Use the session and run IDs from the confirmed Demo proposal. For both checkout recovery and coupons, `--wait-report` starts the experiment, replays the events and waits for exposure data in one call. `--dry-run` previews these stages without making changes.

Callers that explicitly need to pause after startup can still pass `--start-only`. If an in-progress onboarding run returns `upload_experiment_replay`, immediately resume it with `--wait-report` and the same IDs.

The replay command must include `--wait-report` in onboarding. It queries sample size internally for up to 25 seconds with five-second intervals, using the replay receipt's project-local start and end dates. Missing exposure views and the specific report-unavailable response remain pending. When the Receiver has accepted the replay and a receipt is available, begin [event verification](demo-operations.md#report-verified-results) even if the command returns `wait_experiment_report` or `inspect_experiment_report`. If events are still arriving, wait `poll_after_ms` when supplied and continue with the same session and run IDs. An accepted replay is reused without resending events. Poll an active process handle until it returns before starting another invocation.

`phase=complete` means the Receiver accepted the batch. A successful sample-size query returns `sample_size_report` and `report_dates`. Follow `next_action=verify_experiment_results` in the current turn. Verify the persisted events against the receipt and show their results in the conversation. Use `experiment_url` for the report link in the completion message.

See [launch handling](demo-operations.md#start-and-replay-the-confirmed-experiment) for resuming an interrupted launch and verifying ingestion.
