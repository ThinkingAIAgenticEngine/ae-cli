# analysis event-detail run

Run a bounded event detail query through the capability gateway.

Read `analysis_data_retrieval.md` before choosing this command. Use `run` only when inline rows are enough; use `event-detail export` for bounded artifact retrieval up to the detail export row cap.

Use this command for the first small event detail preview that fits inline. It is not a pagination API; do not loop with offsets to collect more rows.

```bash
ae-cli analysis event-detail run \
  --project-id <project_id> \
  --definition '{"event":"login","time_range":{"mode":"absolute","start_time":"2026-07-01 00:00:00","end_time":"2026-07-01 23:59:59"},"properties":["#event_time",{"name":"country","type":"user_property"}],"sort":[{"field":"#event_time","order":"desc"}]}' \
  --limit 100
```

Input:
- `--project-id` numeric project ID.
- `--definition` AI-facing JSON object. Required keys: `event`, `time_range`. Optional keys: `filters`, `properties`, `sort`.
- `--request-id` optional `cli_<32 lowercase hex>` lifecycle ID.
- `--use-cache` optional boolean.
- `--zone-offset` optional number, for example `8` for UTC+8.
- `--limit` first inline preview rows, default 100, max 1000.
- `--timeout-seconds` sync timeout, default 120, max 180.

Definition shape:

```json
{
  "event": "login",
  "time_range": {
    "mode": "absolute",
    "start_time": "2026-07-01 00:00:00",
    "end_time": "2026-07-01 23:59:59"
  },
  "filters": {
    "relation": "and",
    "items": [
      {
        "field": { "name": "country", "type": "user_property" },
        "operator": "eq",
        "values": ["US"]
      }
    ]
  },
  "properties": ["#event_time", { "name": "country", "type": "user_property" }],
  "sort": [{ "field": "#event_time", "order": "desc" }]
}
```

Use `{"mode":"relative","relative_date_range":"0-7"}` for recent-day queries.

Do not pass raw QP, `eventView`, `taFilters`, `columnName`, or `tableType`.

Do not use this command for full, unknown-size, or later-page detail retrieval. Use `analysis event-detail export` and check its artifact metadata for `truncated`.

Output:

Returns JSON with `items`, `total`, `limit`, `returned_rows`, `truncated`, `column_meta`, and `request_id`. `truncated=true` means the preview hit its row cap or the backend reported more rows; use `analysis event-detail export` instead of trying to page or claiming completeness.
