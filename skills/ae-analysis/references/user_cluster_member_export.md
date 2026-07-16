# analysis user-cluster-member export

Export cluster members as an async jsonl artifact. Read `analysis_data_retrieval.md` first.

Flags: `--project-id`, `--cluster-name` required. Optional: `--property-names`, `--fields`, `--query`, `--use-cache`, `--request-id`, `--artifact-format jsonl`, `--timeout-seconds`.

If you provide `--request-id`, use `cli_<32 lowercase hex>`. Omit it unless you need to correlate logs or cancel a known running query.

Export does not accept `--offset`. Common streams backend pages until `has_more=false` and writes a final metadata line with the exported row count. Do not claim a fixed 10000-row cap and do not collect full data through repeated list calls.

```bash
ae-cli analysis user-cluster-member export --project-id <project_id> --cluster-name retained_users --artifact-format jsonl
ae-cli analysis run inspect --run-id <run_id>
ae-cli analysis artifact download --run-id <run_id> --artifact-id <artifact_id> --output members.jsonl.gz
```
