# tracking check get

Use only when the user asks to get one tracking validation result.

Command:

```bash
ae-cli tracking check get --project-id <project_id> --uuid <uuid>
```

Capability id: `tracking.check.get`

Input sends `project_id`, `uuid`, and lifecycle fields when exposed. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |
| `--uuid` | Tracking check task UUID. | Yes |
| `--request-id` | Optional caller-supplied cli_<32 lowercase hex> lifecycle ID. ae-cli generates and prints one before dispatch when omitted. | No |
| `--timeout-seconds` | Optional capability execution timeout in seconds. | No |

