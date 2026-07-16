# analysis entity-detail run

Run a bounded entity detail query through the capability gateway.

Read `analysis_data_retrieval.md` before choosing this command. Use `run` only when inline rows are enough; use `entity-detail export` for bounded artifact retrieval up to the detail export row cap.

Use this command for the first small entity detail preview that fits inline. It is not a pagination API; do not loop with offsets to collect more rows.

```bash
ae-cli analysis entity-detail run \
  --project-id <project_id> \
  --definition '{"entity":"user","cohort":{"relation":"and","items":[{"field":{"name":"level","type":"user_property"},"operator":"gte","values":[1]}]},"properties":["#user_id",{"name":"country","type":"user_property"}],"sort":[{"field":"#user_id","order":"asc"}]}' \
  --limit 100
```

Input:
- `--project-id` numeric project ID.
- `--definition` bounded entity detail JSON object with `entity`, `cohort`, optional `properties`, and optional `sort`.
- `--request-id` optional `cli_<32 lowercase hex>` lifecycle ID.
- `--use-cache` optional boolean.
- `--zone-offset` optional number.
- `--limit` first inline preview rows, default 100, max 1000.
- `--timeout-seconds` sync timeout, default 120, max 180.

`entity` may be `"user"` for the default user entity or `{ "id": 123 }` in multi-entity projects.

`cohort` is AI-facing for simple entity-set filters and uses the same filter item shape as report/detail filters:

```json
{
  "relation": "and",
  "items": [
    {
      "field": { "name": "level", "type": "user_property" },
      "operator": "gte",
      "values": [1]
    }
  ]
}
```

Supported `cohort.items[].field.type` values are `user_property`, `tag`, and `cluster`. Event behavior cohort conditions are not supported by this command yet; do not invent raw cluster QP for them.

Do not put raw QP at the capability top level. Use `properties` items as strings or `{ "name": "...", "type": "user_property" }`, not `columnName/tableType`.

Do not use this command for full, unknown-size, or later-page detail retrieval. Use `analysis entity-detail export` and check its artifact metadata for `truncated`.

Output:

Returns JSON with `items`, `total`, `limit`, `returned_rows`, `truncated`, `column_meta`, and `request_id`. `truncated=true` means the preview hit its row cap or the backend reported more rows; use `analysis entity-detail export` instead of trying to page or claiming completeness.
