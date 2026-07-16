# analysis query cancel

Use to cancel an async capability-gateway query or export by `run_id`.

Do not use for MCP query cancellation by `request_id`; use `analysis +cancel_query`.

Command:

```bash
ae-cli analysis query cancel --run-id <run_id> [--reason <reason>]
```

Input sends `run_id` and optional `reason`.

Output is the gateway envelope. `data` contains the cancellation result.
