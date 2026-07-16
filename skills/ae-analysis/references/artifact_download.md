# analysis artifact download

Download an async analysis artifact returned by an export command.

Use after an export returns both `run_id` and `artifact_id`; keep this pair bound together. Before downloading, inspect the run and wait until `status=SUCCEEDED` and `artifact_status=COMPLETED`.

Both IDs must come from the same export response. A valid `run_id` paired with a different export's `artifact_id` is invalid even if each ID exists separately.

Do not use a raw `download_path` without preserving the `run_id`/`artifact_id` pair. Do not use this for synchronous `run` responses; it only downloads async artifacts. If the artifact is still running, this command returns `ARTIFACT_NOT_READY`; call `analysis run inspect` again later instead of retrying download in a loop.

Input:

- `run_id`: required async run ID returned by the export response.
- `artifact_id`: required artifact ID from the same export response.
- `output`: required local output path.

```bash
ae-cli analysis artifact download --run-id <run_id> --artifact-id <artifact_id> --output /tmp/result.jsonl.gz
```

Output is local file metadata. The command writes the artifact bytes to `--output` and returns JSON with `run_id`, `artifact_id`, absolute `output_path`, `bytes`, and response content headers. The artifact may be gzip-compressed depending on the backend; preserve the returned/downloaded extension unless you intentionally decompress it yourself.

Do not paste large artifact content into chat. Inspect the local file or summarize only the needed rows.
