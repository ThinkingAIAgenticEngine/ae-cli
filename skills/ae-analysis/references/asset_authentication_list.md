# analysis-meta asset-authentication list

Use when the user needs to list authenticatable project assets and authentication status.

Do not use it as a complete asset search or to change status; use `asset search` or `asset authentication-update` respectively.

Command:

```bash
ae-cli analysis-meta asset-authentication list --project-id <project_id>
ae-cli analysis-meta asset-authentication list --dry-run
```

Capability id: `metadata.asset_authentication.list`.

Input sends `project_id`.

Output `data.assets[]` contains authenticatable asset identities and their current authentication status.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
