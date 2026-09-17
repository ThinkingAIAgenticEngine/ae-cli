# analysis event-detail export

Submit a bounded event detail query as an async gzip artifact.

Read `analysis_data_retrieval.md` for the run/export choice. Use `--output` to wait and download the completed artifact. To resume an interrupted export, use [`analysis run wait`](run_wait.md) with the returned `run_id` and `--output <file>`.

Use this command for full or unknown-size event detail data. Common reads backend batches internally and writes one artifact.

```bash
ae-cli analysis event-detail export \
  --project-id <project_id> \
  --definition '{"event":"login","time_range":{"mode":"relative","relative_date_range":"0-7"}}' \
  --artifact-format jsonl --output <file>
```

Input:
- `--project-id` numeric project ID.
- `--definition` same AI-facing shape as `event-detail run`.
- `--intent-snapshot` optional local snapshot containing `schema_version: 1`, non-empty `requirement`, and the exact final `definition`; omit `model_type` for detail commands. It checks JSON drift locally and is never sent to Gateway. A passing check does not establish user confirmation or correct business semantics.
- `--request-id` optional `cli_<32 lowercase hex>` lifecycle ID.
- `--use-cache` optional boolean.
- `--zone-offset` optional number.
- `--artifact-format` `jsonl` or `csv`; default `jsonl`.
- `--timeout-seconds` optional async runtime guard.

Do not pass `--limit`; async export rejects inline limits. Use `--artifact-format`, not global `--format`, for artifact format.

Export does not accept `--limit` or `--offset`; backend batching is internal.

`definition.properties` uses the same exact projection as `event-detail run`. The artifact may include required system event columns, but it must not expand to every visible event property.

Output:

Returns an async descriptor with opaque `run_id` / `artifact_id`, lifecycle status, expiration, and effective timeout/deadline fields. JSONL artifacts start with metadata and schema lines; CSV artifacts start directly with the header and contain only valid CSV records.
