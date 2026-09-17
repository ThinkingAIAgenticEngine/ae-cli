# analysis history-tag-data export

Export history tag statistics as an async jsonl artifact. Read `analysis_data_retrieval.md` first.

Flags: `--project-id`, `--tag-name`, `--view` required. Optional: `--request-id`, `--artifact-format jsonl`, `--timeout-seconds`.

If you provide `--request-id`, use `cli_<32 lowercase hex>`. Omit it unless you need to correlate logs or cancel a known running query.

`--view` is AI-facing history tag view JSON. It must include a history date range (`recent_day` or `start_time`/`end_time`) and `time_particle_size:"T1"`. Optional fields include `interval_type`, `property_range`, `time_particle`, `array_group_type`, and `column_splited_str`. Do not pass raw frontend wrapper DTOs.

```bash
ae-cli analysis history-tag-data export --project-id <project_id> --tag-name user_level --view '{"recent_day":"0-31","time_particle_size":"T1","first_day_of_week":1,"interval_type":"default","array_group_type":"array_item_group"}' --artifact-format jsonl --output <file>
```

Use `--output` to wait and download the completed artifact. If interrupted, resume with `ae-cli analysis run wait --run-id <run_id> --output <file>` using the same export response. See [`run_wait.md`](run_wait.md).
