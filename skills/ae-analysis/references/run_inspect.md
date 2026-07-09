# analysis run inspect

Use after an export command returns `run_id`.

Do not use for MCP query cancellation or old `request_id` lifecycle. This is only for capability-gateway export `run_id`.

Command:

```bash
ae-cli analysis run inspect --run-id <run_id>
```

Input sends `run_id`.

Output is the gateway envelope. `data` contains run status, artifact status, and error fields when the run failed.

Polling rule:

- Continue polling while status is running or pending.
- Treat `COMPLETED` or `SUCCEEDED` as success.
- Treat `FAILED`, `CANCELED`, or `CANCELLED` as terminal failure.
- After success, download with `ae-cli analysis artifact download --run-id <run_id> --artifact-id <artifact_id> --output <file>`.
