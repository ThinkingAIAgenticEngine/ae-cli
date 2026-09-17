# analysis-meta event-property-bundle export

Use when the user needs to export super event and super property configuration.

Do not use it for result data, a partial metadata subset, or import. The artifact is the complete super-event/super-property configuration export.

Command:

```bash
ae-cli analysis-meta event-property-bundle export --project-id <project_id> --output <file>
```

Capability id: `metadata.event_property_bundle.export`.

Input sends `project_id`, and optional `request_id`, `timeout_seconds`.

Output is the gateway envelope. `data` contains an async export descriptor with `run_id`, `artifact_id`, status fields, and expiration fields. The CLI handles waiting and download with `--output`.

Use `--output` to wait and download the completed artifact. If interrupted, resume with `ae-cli analysis run wait --run-id <run_id> --output <file>` using the same export response. See [`run_wait.md`](run_wait.md).

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--request-id` | No | Optional `cli_<32 lowercase hex>` request ID. |
| `--timeout-seconds` | No | Timeout in seconds, 1 to 21600. Default 21600 (6 hours). |
| `--output` | No | Wait and download to this local file. |
