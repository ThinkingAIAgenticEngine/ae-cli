# analysis onboarding experiment-launch

```sh
ae-cli analysis onboarding experiment-launch --session-id <session-id> --run-id <run-id> --start-only --format json
ae-cli analysis onboarding experiment-launch --session-id <session-id> --run-id <run-id> --format json
```

Use the session and run IDs from the confirmed Demo proposal. For checkout recovery, run with `--start-only`. On `upload_experiment_replay`, show the experiment link and immediately run the second command with the same IDs. For the coupon flow, the second command can start and replay in one call. `--dry-run` previews the stages without making changes.

Show the returned `experiment_url` as soon as the command confirms running. Use it again as the report link after verification. `phase=complete` means the Receiver accepted the batch. Follow `next_action=verify_experiment_results` in the current turn to wait for ingestion and reports.

See [launch handling](demo-operations.md#start-and-replay-the-confirmed-experiment) for resuming an interrupted launch and verifying ingestion.
