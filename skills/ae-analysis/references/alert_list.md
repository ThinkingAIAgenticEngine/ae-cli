# analysis alert list

Use when list project alerts.

Do not use for commands listed under the sheet's non-CLI section or for unrelated metadata/report operations. If the command needs a complex JSON object, read the backend schema or existing asset first and send snake_case fields only.

Command:

```bash
ae-cli analysis alert list [options]
```

Capability id: `analysis.alert.list`

Input sends `project_id`, optional `query`, `limit`, and `offset`. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`. Export commands return lifecycle data such as `run_id` and `artifact_id` for inspect/download.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | See command help | Yes |
| `--query` | See command help | No |
| `--limit` | See command help | No |
| `--offset` | See command help | No |

