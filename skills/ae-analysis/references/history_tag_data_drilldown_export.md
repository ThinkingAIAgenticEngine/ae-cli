# analysis history-tag-data-drilldown export

Export all users for one value/bucket returned by `history-tag-data run/export` as an async jsonl artifact.

Do not use it for an inline sample or for a group value that did not come from the upstream statistics response. Output is an async descriptor with `run_id` and `artifact_id`, not the user rows themselves.

Flags: `--project-id`, `--tag-name`, `--snapshot-date`, `--group-col`, `--view` required. Optional: `--property-names`, `--fields`, `--query`, `--use-cache`, `--request-id`, `--artifact-format jsonl`, `--timeout-seconds`.

Use the same `--view` that produced the statistic row. `--group-col` must be the exact statistic value or bucket label. Download the artifact only after `analysis run inspect` reports success.

```bash
ae-cli analysis history-tag-data-drilldown export --project-id <project_id> --tag-name user_level --snapshot-date 2026-07-01 --group-col VIP --view '{"recent_day":"0-31","time_particle_size":"T1","first_day_of_week":1,"interval_type":"default","array_group_type":"array_item_group"}' --artifact-format jsonl
ae-cli analysis run inspect --run-id <run_id>
ae-cli analysis artifact download --run-id <run_id> --artifact-id <artifact_id> --output history-tag-drilldown.jsonl.gz
```
