# analysis-meta catalog list

Use for a metadata lookup across selected resource types when their definitions or identities are still missing.

Reuse known candidates or search an existing project catalog locally. Do not use it to search saved reports; use `analysis report list`. Follow [`metadata_resolution.md`](metadata_resolution.md).

Online search:

```bash
ae-cli analysis-meta catalog list \
  --project-id <project_id> \
  --queries '["付费事件","支付事件","充值事件"]' \
  --resource-types '["event","metric"]' \
  --limit-per-type 20
```

Capability id: `metadata.catalog.list`.

## Input

Sends `project_id`, `queries`, `resource_types`, and optional `limit_per_type`. Queries are OR matched only inside the selected resource types.

## Output

The response returns unified rows with:

- `resource_type`: `event`, `metric`, `event_property`, `user_property`, `cluster`, or `tag`
- `resource_key`: canonical server-defined identifier
- `display_name`
- `remark`
- `scope`: `event` or `user` for property rows
- property type fields when applicable

Online rows also contain `matched_query`, `matched_field`, and `match_type`. Results are limited independently per resource type. `has_more=true` and `truncated_resource_types` identify types with additional matches; do not page them in the structured resolution workflow.

## Parameters

| Parameter | Required | Description |
|---|---|---|
| `--project-id` | Yes | Numeric project ID. |
| `--queries` | Online mode | JSON array of 1–20 deduplicated keywords, OR matched. |
| `--resource-types` | Online mode | JSON array containing only `event`, `metric`, `event_property`, `user_property`, `cluster`, or `tag`. |
| `--limit-per-type` | No | Online result limit per selected resource type; default 20, maximum 200. |
Use the task's terms and relevant English words in the same batch, deduplicated; split only when more than 20 are needed. Match applies literally to `resource_key`, `display_name` and `remark`, without automatic translation. Suitable candidates advance to definition inspection or confirmation. A missing match does not imply metadata is absent; choose the next lookup for the specific missing information. [Catalog export](catalog_export.md) is for complete-directory requests.
