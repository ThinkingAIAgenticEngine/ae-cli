# analysis-meta asset abnormal-list

Use when the user needs to list abnormal assets by resource type.

Do not use this command for unrelated analysis queries, ad-hoc query construction, or MCP metadata discovery when an existing specialized command already fits the user's request.

Command:

```bash
ae-cli analysis-meta asset abnormal-list --project-id <project_id> --resource-types <resource_types>
ae-cli analysis-meta asset abnormal-list --dry-run
```

Capability id: `metadata.asset_abnormal.list`.

Input sends `project_id`, `resource_types`.

Output is the gateway envelope. `data` contains the common-service capability result.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--resource-types` | Yes | Resource types to query. |
