# analysis asset search

Use when the user needs to search visible saved analysis assets by keyword.

For first-pass asset discovery, do not pass `--asset-types`. The default intentionally searches both analysis dashboards and reports together, so the agent does not miss a relevant dashboard after guessing report-only, or miss a relevant report after guessing dashboard-only. Pass `--asset-types` only when the user explicitly asks for one type or when refining after a broad search.

Do not use it to query report/dashboard result data; it discovers saved report and analysis dashboard records only. It does not return metrics, events, properties, clusters, tags, alerts, or BI dashboards.

Command:

```bash
ae-cli analysis asset search --project-id <project_id> --queries '["revenue"]' --limit 50 --offset 0
```

Capability id: `analysis.asset.search`.

Input sends `project_id`, `queries`, optional `asset_types`, optional `own_types`, `limit`, and `offset`. Omit `asset_types` by default for unified discovery.

Output always uses the directory envelope: `data.items[]`, `total`, `limit`, `offset`, `has_more`, and `next_offset`, plus `searched_asset_types` and `counts_by_type`.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--queries` | Yes | JSON array of 1 to 20 keyword filters. Search is OR across keywords. |
| `--asset-types` | No | JSON array containing `dashboard`, `report`, or both. Omit by default for first-pass discovery so the same query searches both dashboards and reports. |
| `--own-types` | No | JSON array containing `CREATED`, `SHARED`, or both. |
| `--limit` / `-l` | No | Page size. Default: 50, maximum: 200. |
| `--offset` / `-o` | No | Zero-based page offset. Default: 0. |
