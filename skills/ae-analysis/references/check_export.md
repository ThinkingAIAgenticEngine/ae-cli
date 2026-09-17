# tracking check export

Use only when the user asks to export one tracking validation result.

Command:

```bash
ae-cli tracking check export --project-id <project_id> --uuid <uuid> --output <file>
```

Capability id: `tracking.check.export`

Input sends `project_id`, `uuid`, and lifecycle fields when exposed. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Use `--output` to wait and download the completed artifact. To resume an interrupted export, use [`analysis run wait`](run_wait.md) with its returned `run_id`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |
| `--uuid` | Tracking check task UUID. | Yes |
| `--request-id` | Optional caller-supplied cli_<32 lowercase hex> lifecycle ID. ae-cli generates and prints one before dispatch when omitted. | No |
| `--timeout-seconds` | Async runtime in seconds. Default and max: 21600 (6 hours); cancel earlier with analysis query cancel --run-id <run_id>. | No |
| `--output` | Wait and download to this local file. | No |
