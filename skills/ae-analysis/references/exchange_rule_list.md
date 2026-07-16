# analysis-meta exchange rule-list

Use when the user needs to list exchange-rate conversion rules.

Do not use it to validate or persist proposed rules; use `exchange rule-validate` then `exchange rule-update`.

Command:

```bash
ae-cli analysis-meta exchange rule-list --project-id <project_id>
ae-cli analysis-meta exchange rule-list --dry-run
```

Capability id: `metadata.exchange_rule.list`.

Input sends `project_id`.

Output `data.rules[]` contains the project's current exchange rules.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
