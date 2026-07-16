# analysis query create-result-cluster

Precondition: the upstream response must have `result_cluster_available=true` and the selected source must contain `target_contract`. If either is absent, do not call this command or reconstruct a target from display text.

Save users matched by a previous analysis result target as a reusable result cluster.

Use this after any analysis data command that returns `query_context_id`:

- `analysis adhoc run`
- `analysis adhoc export`
- `analysis report-data run`
- `analysis report-data export`
- `analysis dashboard-report-data run`
- `analysis dashboard-report-data export`

Do not pass raw QP.

## Command

```bash
ae-cli analysis query create-result-cluster \
  --query-context-id <query_context_id> \
  --target '<json>' \
  --cluster-name <cluster_name> \
  [--display-name <display_name>] \
  [--zone-offset 8] \
  [--timeout-seconds 60]
```

## Input

- `--query-context-id`: returned by an analysis data run/export submit response, or by the first metadata line of a JSONL artifact.
- `--target`: pass the selected source's `target_contract.default_target` directly, or copy it and replace only fields named by `target_contract.copy_from_selected_result` for a specific row or cell.
- `--cluster-name`: result cluster name.
- `--display-name`: optional display name.

Do not use raw QP or reconstruct the first query request. The server resolves the source QP from Redis by `query_context_id`.

## Target

`--target` uses the same machine-readable `sources[].target_contract` contract as [`drilldown_users_run.md`](drilldown_users_run.md).

If one `query_context_id` contains multiple report sources, include `report_id`. If it contains multiple BI chart sources, include `chart_id`. BI SQL chart contexts normally return `result_cluster_available=false`; do not create a result cluster unless the first response explicitly says `result_cluster_available=true`.

## Output

The response contains the result cluster creation result from the analysis service.
