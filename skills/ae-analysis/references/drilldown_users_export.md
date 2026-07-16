# analysis drilldown-users export

Export all users for a selected result target from a previous analysis query context. Do not pass raw QP.

## Command

```bash
ae-cli analysis drilldown-users export \
  --query-context-id <query_context_id> \
  --target '<json>' \
  [--artifact-format jsonl] \
  [--timeout-seconds 21600]
```

Use the same `query_context_id`, `target`, and optional `properties` contract as `analysis drilldown-users run`. Export does not accept `--limit` or `--offset`; Common reads backend batches internally and writes one JSONL artifact.

Inspect the returned `run_id` with `analysis run inspect`, then download the completed artifact with `analysis artifact download`. The final metadata line includes `rows`, `total`, and `drilldown_context_id`.
