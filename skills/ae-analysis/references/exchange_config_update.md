# analysis-meta exchange config-update

Use when the user needs to update exchange-rate configuration switch or value.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis-meta exchange config-update --project-id <project_id> --config-val <config_val>
ae-cli analysis-meta exchange config-update --dry-run
```

Capability id: `metadata.exchange_config.update`.

Input sends `project_id`, `config_val`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--config-val` | Yes | Exchange-rate configuration value. |
