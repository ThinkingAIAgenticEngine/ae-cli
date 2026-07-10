# analysis super-metadata export

Use when the user needs to export super event and super property configuration.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis super-metadata export --project-id <project_id>
ae-cli analysis super-metadata export --project-id <project_id> --request-id cli_0123456789abcdef0123456789abcdef --timeout-seconds 3600
ae-cli analysis super-metadata export --dry-run
```

Capability id: `metadata.super_metadata.export`.

Input sends `project_id`, and optional `request_id`, `timeout_seconds`.

Output is the gateway envelope. `data` contains an async export descriptor with `run_id`, `artifact_id`, status fields, and expiration fields. It does not expose inspect/download API paths; use the CLI commands below.

Follow-up workflow:

1. Save `data.run_id` and `data.artifact_id` from the export response.
2. Poll status with `ae-cli analysis run inspect --run-id <run_id>`.
3. Continue polling while status is running or pending. Treat `COMPLETED` or `SUCCEEDED` as success, and `FAILED`, `CANCELED`, or `CANCELLED` as terminal failure.
4. On success, download with `ae-cli analysis artifact download --run-id <run_id> --artifact-id <artifact_id> --output <file>.xlsx`.
5. If the export is no longer needed, cancel with `ae-cli analysis query cancel --run-id <run_id> --yes`.

Do not write custom Python/curl for polling or download unless the CLI command itself is unavailable.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--request-id` | No | Optional `cli_<32 lowercase hex>` request ID. |
| `--timeout-seconds` | No | Timeout in seconds, 1 to 7200. Default 3600. |
