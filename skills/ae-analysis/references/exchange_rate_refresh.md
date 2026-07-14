# analysis-meta exchange rate-refresh

Use when the user needs to refresh exchange-rate data manually.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis-meta exchange rate-refresh --project-id <project_id>
ae-cli analysis-meta exchange rate-refresh --dry-run
```

Capability id: `metadata.exchange_rate.refresh`.

Input sends `project_id`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
