# tracking plan-change-log export

Use only when the user asks to export one tracking plan change log.

Command:

```bash
ae-cli tracking plan-change-log export --project-id <project_id> --log-id <log_id> --output <file>
```

Capability id: `tracking.plan_change_log.export`

Input sends `project_id`, `log_id`, optional `request_id`, and optional `timeout_seconds`. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Use `--output` to wait and download the completed artifact. To resume an interrupted export, use [`analysis run wait`](run_wait.md) with its returned `run_id`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |
| `--log-id` | Tracking plan change log ID. | Yes |
| `--request-id` | Optional caller-supplied cli_<32 lowercase hex> lifecycle ID. ae-cli generates and prints one before dispatch when omitted. | No |
| `--timeout-seconds` | Async runtime in seconds. Default and max: 21600 (6 hours); cancel earlier with analysis query cancel --run-id <run_id>. | No |
| `--output` | Wait and download to this local file. | No |
