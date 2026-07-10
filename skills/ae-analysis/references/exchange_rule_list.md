# analysis exchange rule-list

Use when the user needs to list exchange-rate conversion rules.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis exchange rule-list --project-id <project_id>
ae-cli analysis exchange rule-list --dry-run
```

Capability id: `metadata.exchange_rule.list`.

Input sends `project_id`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
