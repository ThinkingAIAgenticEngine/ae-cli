# analysis-meta asset-abnormal list

Use when the user needs to list abnormal assets by resource type.

Do not use it for one known asset's detailed reason or for a general asset inventory; use `asset abnormal-get` or `asset search`.

Command:

```bash
ae-cli analysis-meta asset-abnormal list --project-id <project_id> --resource-types <resource_types>
ae-cli analysis-meta asset-abnormal list --dry-run
```

Capability id: `metadata.asset_abnormal.list`.

Input sends `project_id`, `resource_types`.

Output `data.resources[]` contains abnormal assets in the requested resource types.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--resource-types` | Yes | Resource types to query. |
