# analysis asset search

Use when the user needs to search readable saved analysis assets by keyword. Results include self-created assets, shared read-only assets, and shared editable assets; assets without read permission remain excluded.

For first-pass asset discovery, do not pass `--asset-types`. The default intentionally searches both analysis dashboards and reports together, so the agent does not miss a relevant dashboard after guessing report-only, or miss a relevant report after guessing dashboard-only. Use a large first page, usually `--limit 100` or `--limit 200`.

Results are ranked before pagination. Ranking first uses keyword match quality (exact/name matches outrank description-only matches), then certification, recent 90-day heat, recent 90-day users, and governance impact. Certification is a trust signal among semantically suitable candidates; do not choose an unrelated certified asset over a more exact uncertified match.

If the page has `has_more: true` and there is no strong candidate in `items[]`, continue with `--offset <next_offset>` before narrowing the asset type. After checking the broad pages, refine by changing keywords: try the business object, metric name, domain term, and shorter asset-name fragments. Pass `--asset-types` only when the user explicitly asks for one type or when refining after a broad search.

Do not use it to query report/dashboard result data; it discovers saved report and analysis dashboard records only. It does not return metrics, events, properties, clusters, tags, alerts, or BI dashboards.

Prefer this command over `analysis report list` or `analysis dashboard list` for viewing, finding, or selecting assets. Those list commands are manageable-asset directories and intentionally exclude read-only shared assets.

Command:

```bash
ae-cli analysis asset search --project-id <project_id> --queries '["revenue"]' --limit 100 --offset 0
```

Capability id: `analysis.asset.search`.

Input sends `project_id`, `queries`, optional `asset_types`, optional `own_types`, `limit`, and `offset`. Omit `asset_types` by default for unified discovery.

Output always uses the directory envelope: `data.items[]`, `total`, `limit`, `offset`, `has_more`, and `next_offset`, plus `searched_asset_types` and `counts_by_type`. Items include ranking and governance signals: `authentication_status`, `heat_count90d`, `user_count90d`, `impact_degree`, `rank_signals`, and `rank_reasons`.

## Parameters
| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--queries` | Yes | JSON array of 1 to 20 keyword filters. Search is OR across keywords. |
| `--asset-types` | No | JSON array containing `dashboard`, `report`, or both. Omit by default for first-pass discovery so the same query searches both dashboards and reports. |
| `--own-types` | No | JSON array containing `CREATED`, `SHARED`, or both. |
| `--limit` / `-l` | No | Page size. Default: 50, maximum: 200. Use 100 or 200 for first-pass discovery when broad keywords may hit many assets. |
| `--offset` / `-o` | No | Zero-based page offset. Default: 0. |
