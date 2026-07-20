---
name: ae-experiment
version: 1.0.0
description: "Use when managing Atlas AB experiments, traffic layers, Features, metrics, buckets, and experiment reports through ae-cli"
---

# ae-experiment

AE CLI (`ae-cli`) exposes Atlas AB Experiment MCP capabilities through the `experiment` domain.

## Global Rules

- Prefer `ae-cli experiment <command>` for Atlas AB Experiment work.
- Use `--project_id` / `-p` for project-scoped commands.
- Use `--req` JSON for complex save, status, and delete DTOs.
- Do not invent experiment IDs, traffic layer IDs, bucket IDs, Feature keys, metric IDs, or payload field names.
- Read commands can run directly after IDs are verified.
- Write commands require explicit user intent and normally keep the confirmation prompt. Use `--dry-run` before write calls when composing JSON.

## Typical Workflow

1. Discover reusable assets:
   - `+query_bucket_list`
   - `+query_traffic_layer_list`
   - `+query_feature_list`
   - `+query_metric_list`
2. Create missing assets if needed:
   - `+save_traffic_layer`
   - `+save_feature`
   - `+save_metric`
3. Create or patch the experiment draft with `+save_experiment`.
4. Check readiness with `+check_experiment_ready`.
5. Move status with `+manage_experiment`.
6. Query reports with summary, sample-size, and metric-trend commands.

## Parameter Conventions

```bash
ae-cli experiment +query_experiment_detail --project_id 1 --exp_id exp_123
ae-cli --dry-run experiment +save_experiment --project_id 1 --req '{"expName":"Demo"}'
ae-cli experiment +query_experiment_metric_trend --project_id 1 --exp_id exp_123 --metric_id metric_1 --start_time 2026-07-01 --end_time 2026-07-07
```

Optional global parameters work as in other domains: `--host`, `--mcp-url`, `--format`, `--jq`, `--dry-run`, and `--yes`.

## References

Open the matching file in `references/` before using a command, especially for write operations and JSON payloads.

### Experiment

`+save_experiment`, `+save_submit_experiment`, `+query_experiment_list`, `+query_experiment_detail`, `+check_experiment_ready`, `+manage_experiment`, `+batch_delete_experiment`

### Traffic Layer and Buckets

`+save_traffic_layer`, `+query_traffic_layer_detail`, `+query_traffic_layer_list`, `+batch_delete_traffic_layer`, `+query_bucket_list`

### Reports

`+query_experiment_report_summary`, `+query_experiment_sample_size_report`, `+query_experiment_metric_trend`, `+cancel_experiment_query_by_request_id`

### Metric and Feature

`+save_metric`, `+query_metric_detail`, `+query_metric_list`, `+delete_metric`, `+save_feature`, `+manage_feature_status`, `+query_feature_detail`, `+query_feature_list`, `+batch_delete_feature`
