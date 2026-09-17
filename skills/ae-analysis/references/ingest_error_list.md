# tracking ingest-error list

Use only when the user asks to list tracking ingest errors for one data name.

Command:

```bash
ae-cli tracking ingest-error list --project-id <project_id> --data-name <data_name> --start-time <start_time> --end-time <end_time>
```

Capability id: `tracking.ingest_error.list`

Input sends `project_id`, `data_name`, `start_time`, and `end_time`. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |
| `--data-name` | Event or property name used to list ingest errors. | Yes |
| `--start-time` | Query start time. | No |
| `--end-time` | Query end time. | No |

