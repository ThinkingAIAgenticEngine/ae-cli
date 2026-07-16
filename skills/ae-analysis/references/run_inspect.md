# analysis run inspect

Inspect an async analysis capability-gateway run returned by export commands.

Use for `analysis adhoc export`, `analysis report-data export`, `analysis dashboard-report-data export`, `analysis bi-panel-page-data export`, and other analysis exports that return `run_id`.

Do not use this for MCP `request_id` cancellation or status. MCP query lifecycle uses the specific MCP command contract.

Input:

- `run_id`: required async run ID returned by the export response.

Use the exact `run_id` from the same export response that supplied the artifact; do not substitute a request ID, invocation ID, path segment, or an older run ID.

```bash
ae-cli analysis run inspect --run-id <run_id>
```

Input sends `run_id`.

Output is the gateway run descriptor with run status, artifact status, and error fields when the run failed. Keep the `run_id` from the same export result; do not invent or reuse it across artifacts.

Polling rule:

- Continue polling while status is running or pending.
- Treat `COMPLETED` or `SUCCEEDED` as success.
- Treat `FAILED`, `CANCELED`, or `CANCELLED` as terminal failure.
- After success, download with `ae-cli analysis artifact download --run-id <run_id> --artifact-id <artifact_id> --output <file>`.
