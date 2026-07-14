# analysis-meta asset recent-list

Use when the user needs to list recently visited assets for the current user.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis-meta asset recent-list --project-id <project_id> --payload '{}'
ae-cli analysis-meta asset recent-list --dry-run
```

Capability id: `metadata.asset.recent_list`.

Input sends `project_id`, `payload`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--payload` | Yes | Capability payload JSON. |
