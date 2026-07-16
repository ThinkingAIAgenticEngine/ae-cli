# analysis-meta asset search

Use when the user needs to search project assets by keyword.

Do not use it to query report/dashboard result data; it discovers asset records only.

Command:

```bash
ae-cli analysis-meta asset search --project-id <project_id> --payload '{"keyword":"revenue"}'
ae-cli analysis-meta asset search --dry-run
```

Capability id: `metadata.asset.search`.

Input sends `project_id`, `payload`.

Output `data.resources[]` contains matching assets. A blank keyword returns an empty array rather than a full asset list.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--payload` | Yes | Search object. Required semantic field: non-blank `keyword`. Optional filters are `own_types` and `res_cats`; do not pass server-owned identity or pagination-test fields. |
