# analysis-meta asset-authentication list

Use when the user needs to list authenticatable project assets and authentication status.

Do not use it as a complete asset search or to change status; use `asset search` or `asset authentication-update` respectively.

Command:

```bash
ae-cli analysis-meta asset-authentication list --project-id <project_id> --limit 50 --offset 0
ae-cli analysis-meta asset-authentication list --dry-run
```

Capability id: `metadata.asset_authentication.list`.

Input sends `project_id`, `limit`, and `offset`.

Output always uses the directory envelope: `data.items[]`, `total`, `limit`, `offset`, `has_more`, and `next_offset`.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--limit` / `-l` | No | Page size. Default: 50, maximum: 200. |
| `--offset` / `-o` | No | Zero-based page offset. Default: 0. |
