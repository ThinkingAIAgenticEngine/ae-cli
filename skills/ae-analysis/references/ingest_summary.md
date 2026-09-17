# tracking ingest summary

Use only when the user asks to get tracking ingest summary.

Command:

```bash
ae-cli tracking ingest summary --project-id <project_id> --start-time <start_time> --end-time <end_time>
```

Capability id: `tracking.ingest.summary`

Input sends `project_id`, `start_time`, and `end_time`. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |
| `--start-time` | Query start time. | No |
| `--end-time` | Query end time. | No |

