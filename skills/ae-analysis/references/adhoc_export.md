# analysis adhoc export

Submit one unified ad-hoc analysis export from an AI-facing model definition.

Routing: read [`analysis_data_retrieval.md`](analysis_data_retrieval.md) before choosing this `export` command instead of `adhoc run`.

## Command

```bash
ae-cli analysis adhoc export \
  --project-id <project_id> \
  --model-type <model_type> \
  --definition '<json>' \
  [--request-id cli_<32 lowercase hex>] \
  [--use-cache true|false] \
  [--zone-offset <hours>] \
  [--fields '["列名"]'] \
  [--artifact-format jsonl|csv] \
  [--timeout-seconds <n>]
```

## AI models

Read [`ai_models.md`](ai_models.md) for the single 12-model `model_type` registry, AI-facing `definition`, and SQL dynamic params contract.

For SQL model definitions, do not invent table or column names. If the table is unknown, call `analysis sql-table list --project-id <project_id>`; then inspect the selected `table_ref` with `analysis sql-table columns --project-id <project_id> --table-ref <table_ref>` before writing SQL.

## Definition contract

Rules:

- `export` does not accept `--limit` or `--offset`; use `--fields` for column projection and download the full artifact.

## Input

- `--project-id`: target project ID.
- `--model-type`: one of the 12 AI-facing model names from [`ai_models.md`](ai_models.md). Do not pass `scenario`, `history_tag`, or `cluster`; tags and cohorts/clusters are separate capabilities.
- `--definition`: model-specific AI-facing definition JSON.
- `--artifact-format`: `jsonl` or `csv`.

Async export has no inline row limit. Runtime defaults to and is capped at 21600 seconds (6 hours); cancel earlier with `analysis query cancel --run-id <run_id>`. The routing rule lives in [`analysis_data_retrieval.md`](analysis_data_retrieval.md).

Do not use raw QP, `events`, `event_view`, `visual_view`, removed ad-hoc QP builder outputs, or schema helper outputs as `--definition`.

## Output

The response is an async artifact descriptor:

- `run_id`: poll or cancel this run.
- `artifact_id`: download this artifact after completion.
- `status` / `artifact_status`: initial lifecycle states.
- `format`: actual logical artifact format (`jsonl` or `csv`).
- `compression` / `content_encoding`: actual compression/encoding; analysis ad-hoc exports currently return `gzip`.
- `file_name` / `content_type`: actual downloadable file contract. Do not infer compression from `--artifact-format` alone.
- `expires_at` / `expires_at_iso`: artifact expiration.
- `effective_timeout_seconds`, `timeout_source`, `deadline_at`: effective lifecycle policy.
- `query_context_id` / `query_context_expires_at`: reusable follow-up context when Redis context creation succeeds.

Preserve the `run_id` and `artifact_id` from this exact submit response as one pair. Do not infer either ID from a path or reuse an ID from another export.

Use:

```bash
ae-cli analysis run inspect --run-id <run_id>
ae-cli analysis artifact download --run-id <run_id> --artifact-id <artifact_id> --output <file>
ae-cli analysis query cancel --run-id <run_id>
```

If query execution fails, `run inspect` reaches `FAILED`; it must not produce a completed empty artifact. Download only after the successful terminal states documented in `analysis_data_retrieval.md`.

Use the submit response `query_context_id` immediately with `analysis drilldown-users run` or `analysis query create-result-cluster` when present. JSONL artifacts repeat query context plus `format`, `compression`, `content_type`, and `content_encoding` in the first metadata line. Source metadata includes `effective_time_range`, `time_range_adjustments`, and `clipping_reasons`. Date rows expose stable `drilldown_date` and separate `display_date`; copy only `drilldown_date` into a drilldown target. CSV remains pure CSV and carries context/format metadata only in the submit and run-inspect descriptors. Do not pass raw QP.
