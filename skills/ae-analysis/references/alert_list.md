# analysis alert list

Use only when the user asks to list project alerts.

Command:

```bash
ae-cli analysis alert list --project-id <project_id>
```

Capability id: `analysis.alert.list`

Input sends `project_id`, optional `queries`, `limit`, and `offset`. `queries` accepts 1 to 20 non-empty strings with OR semantics; matching rows include `matched_queries` and `matched_fields`. Do not send singular `query` or camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |
| `--queries` | JSON array of 1 to 20 keyword filters | No |
| `--limit` | Directory page size. Default: 50, max: 200. Values outside 1..200 are rejected. | No |
| `--offset` | Zero-based directory page offset. Default: 0. Negative values are rejected. | No |
