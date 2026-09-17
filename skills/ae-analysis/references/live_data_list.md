# tracking live-data list

Use only when the user asks to list recent tracking live data.

Command:

```bash
ae-cli tracking live-data list --project-id <project_id>
```

Capability id: `tracking.live_data.list`

Input sends `project_id`, optional `data_type`, optional `request_id`, and optional `timeout_seconds`. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |
| `--data-type` | Live data type: normal (default) or error. | No |
| `--request-id` | Optional caller-supplied cli_<32 lowercase hex> lifecycle ID. ae-cli generates and prints one before dispatch when omitted. | No |
| `--timeout-seconds` | Optional capability execution timeout in seconds. | No |

