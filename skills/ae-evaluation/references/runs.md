# Evaluation runs and results

Commands use `ae-cli evaluation +<command>`. Read the shared endpoint, authentication, and mutation rules in [SKILL.md](../SKILL.md). Use command `--help` for optional flags.

Run cancellation is a high-risk write and requires confirmation. Non-interactive cancellation requires explicit authorization and global `--yes`; use `--dry-run` to preview without cancelling.

### Evaluation runs

```bash
ae-cli evaluation +list_runs [--search <text>] [--status <status>] [--cursor <cursor>] [--limit 50]
ae-cli evaluation +get_run --id <run-uuid>
ae-cli evaluation +create_run --name "<name>" \
  [--dataset-id <uuid>] --dataset-version-id <dataset-version-uuid> \
  [--execution-mode LIVE_AGENT|PRESET_RESULT] [--subject-type AGENT|MODEL] \
  [--agent-config-id <uuid>] [--model-config-id <uuid>] \
  [--report-to-te true] \
  [--field-mapping-json '<json>'] [--result-filter-fields-json '<json>'] \
  [--pass-threshold 0.8] [--case-sample-size 100] [--idempotency-key "<key>"]
ae-cli evaluation +update_run --id <run-uuid> --name "<name>" [same optional fields as +create_run] --lock-version <n>
ae-cli evaluation +delete_run --id <run-uuid> --lock-version <n>
ae-cli evaluation +select_run_evaluators --id <run-uuid> --evaluator-ids '["<evaluator-uuid>"]' \
  [--evaluator-versions-json '[{"evaluator_id":"<uuid>","version_id":"<uuid>"}]'] --lock-version <n>
ae-cli evaluation +list_run_evaluators --id <run-uuid>
ae-cli evaluation +update_run_field_mapping --id <run-uuid> --field-mapping-json '<json>' --lock-version <n>
ae-cli evaluation +update_run_result_filter_fields --id <run-uuid> --result-filter-fields-json '{"fields":[],"schema_version":"RESULT_FILTER_FIELDS_V1"}' --lock-version <n>
ae-cli evaluation +validate_run --id <run-uuid>
ae-cli evaluation +start_run --id <run-uuid> --lock-version <n>
ae-cli evaluation +cancel_run --id <run-uuid> --lock-version <n>
ae-cli evaluation +retry_failed_run_cases --id <run-uuid> --lock-version <n>
ae-cli evaluation +run_overview --id <run-uuid>
ae-cli evaluation +run_distribution --id <run-uuid> [--run-evaluator-id <uuid>]
ae-cli evaluation +run_cases --id <run-uuid> \
  [--status <status>] [--evidence-completeness NONE|PARTIAL|COMPLETE|UNKNOWN] [--search <text>] \
  [--evaluation-status <status>] [--score-status <status>] [--evaluator-id <uuid>] \
  [--evaluator-ids '["<uuid>"]'] [--min-score 0.8] [--max-score 1] [--score-gte 0.2] [--score-lte 0.8] \
  [--field-filters-json '[...]'] [--sort AVERAGE_SCORE] [--sort-evaluator-id <uuid>] [--order desc] \
  [--cursor <cursor>] [--limit 50] [--offset 0]
ae-cli evaluation +get_run_case --id <run-uuid> --case-run-id <case-run-uuid>
ae-cli evaluation +get_run_case_trace --id <run-uuid> --case-run-id <case-run-uuid>
ae-cli evaluation +retry_run_case_trace --id <run-uuid> --case-run-id <case-run-uuid>
ae-cli evaluation +copy_run_case --id <run-uuid> --case-run-id <case-run-uuid>
ae-cli evaluation +transfer_run_owner --id <run-uuid> --owner-user-id <user-uuid> --lock-version <n>
ae-cli evaluation +list_project_members
ae-cli evaluation +create_next_task_version_draft --id <run-uuid>
ae-cli evaluation +list_evaluation_task_versions --task-id <task-uuid>
ae-cli evaluation +export_run_results --id <run-uuid> [--export-format CSV|JSONL] --idempotency-key "<fresh-key>"
ae-cli evaluation +export_run_low_scores --id <run-uuid> --max-score 0.5 [--min-score 0] [--status SUCCEEDED] [--export-format CSV|JSONL] --idempotency-key "<fresh-key>"
ae-cli evaluation file download --id <file-uuid> --output ./results.csv
ae-cli evaluation +get_file --id <file-uuid>
```

- Field mapping JSON follows the platform `FIELD_MAPPING_V*` contract (`FIELD_MAPPING_V5` adds `TEMPLATE` input and `AGENT_TOOL_SUMMARY` / `AGENT_ARTIFACT_SUMMARY` / `AGENT_EXECUTION_STATUS` evidence sources); result-filter-fields is `RESULT_FILTER_FIELDS_V1` with at most 5 fields. Do not guess shapes — inspect an existing run with `+get_run` for a working example.
- `--case-sample-size` randomly selects 1-1000 cases when the run starts; omit it to run every case. Start fails with `RUN_SAMPLE_SIZE_EXCEEDS_CASES` when the requested sample exceeds the selected dataset version's case count.
- Start prerequisites: bound evaluator(s) (`EVALUATOR_NOT_ACTIVE`), complete field mapping (`FIELD_MAPPING_INCOMPLETE`), and result filter fields — an explicit empty filter is required (`RESULT_FILTER_FIELD_UNAVAILABLE`).
- Retry semantics: `+retry_failed_run_cases` requeues only Agent-stage `FAILED|BLOCKED|UNKNOWN` cases in the same immutable snapshot, bumps the execution epoch and recomputes aggregates. `+retry_run_case_trace` is ADMIN-only and only for retryable AI Monitor-backed captures.
- `+create_next_task_version_draft` copies `case_sample_size` and selects the latest published evaluator versions for the new draft. Run and overview responses expose separate succeeded, failed, and cancelled case/score counts for progress tracking.

### Create and run an evaluation

1. Pick a published dataset version and create a draft run from it plus an agent or model:

```bash
ae-cli evaluation +list_dataset_versions --id <dataset-uuid>
ae-cli evaluation +create_run \
  --name "release-checkout-run" \
  --dataset-id <dataset-uuid> \
  --dataset-version-id <dataset-version-uuid> \
  --execution-mode LIVE_AGENT \
  --subject-type AGENT \
  --agent-config-id <agent-uuid>
```

For scoring pre-stored dataset fields without calling an Agent/Model, use `--execution-mode PRESET_RESULT` (then omit `--agent-config-id` / `--model-config-id`).

2. Configure the draft. Before `+start_run` the run needs: at least one ACTIVE evaluator (pin published evaluator versions when possible), a complete field mapping, and result filter fields (an explicit empty filter is fine). Each mutation consumes one lock_version — re-read with `+get_run` in between:

```bash
ae-cli evaluation +list_evaluator_versions --id <evaluator-uuid>
ae-cli evaluation +select_run_evaluators --id <run-uuid> \
  --evaluator-ids '["<evaluator-uuid>"]' \
  --evaluator-versions-json '[{"evaluator_id":"<evaluator-uuid>","version_id":"<evaluator-version-uuid>"}]' \
  --lock-version <n>
ae-cli evaluation +get_run --id <run-uuid>
ae-cli evaluation +update_run_field_mapping --id <run-uuid> \
  --field-mapping-json '{"schema_version":"FIELD_MAPPING_V5","agent":{"input":{"field_key":"input","source_type":"DATASET_FIELD"}},"evaluators":{"<evaluator-uuid>":{"input":{"field_key":"input","source_type":"DATASET_FIELD"},"output":{"source_type":"AGENT_OUTPUT"}}}}' \
  --lock-version <n>
ae-cli evaluation +get_run --id <run-uuid>
ae-cli evaluation +update_run_result_filter_fields --id <run-uuid> \
  --result-filter-fields-json '{"fields":[],"schema_version":"RESULT_FILTER_FIELDS_V1"}' \
  --lock-version <n>
```

3. Validate (optional, same preflight as start, no lock_version needed), then start:

```bash
ae-cli evaluation +validate_run --id <run-uuid>
ae-cli evaluation +get_run --id <run-uuid>
ae-cli evaluation +start_run --id <run-uuid> --lock-version <n>
```

4. Watch the results and drill into failures:

```bash
ae-cli evaluation +run_overview --id <run-uuid>
ae-cli evaluation +run_distribution --id <run-uuid> --run-evaluator-id <run-evaluator-uuid>
ae-cli evaluation +run_cases --id <run-uuid> --status FAILED --evaluation-status FAILED
ae-cli evaluation +get_run_case --id <run-uuid> --case-run-id <case-run-uuid>
ae-cli evaluation +get_run_case_trace --id <run-uuid> --case-run-id <case-run-uuid>
ae-cli evaluation +retry_failed_run_cases --id <run-uuid> --lock-version <n>
```

### Export results and download

```bash
ae-cli evaluation +export_run_results --id <run-uuid> --export-format CSV --idempotency-key "export-$(date +%s)"
ae-cli evaluation +export_run_low_scores --id <run-uuid> --max-score 0.5 --idempotency-key "low-$(date +%s)"
# Poll the returned file until COMPLETED before downloading.
ae-cli evaluation +get_file --id <file-uuid>
ae-cli evaluation file download --id <file-uuid> --output ./results.csv
```

Traces are available only for LIVE_AGENT runs with subject AGENT. Capture status is independent of case/run success. Captures contain at most 500 spans and may be truncated; PARTIAL or reference-only evidence must not be described as complete. Never include hidden chain-of-thought, credentials, cookies, auth headers, or unredacted tool input/output in reports. Ownership transfer and project-member discovery require ADMIN.

### Process evidence mapping (FIELD_MAPPING_V6)

For LIVE_AGENT runs whose subject is AGENT, V6 adds `AGENT_EXECUTION_TRACE` and
`AGENT_TOOL_CALLS`. Keep the existing V5 mappings for final-output-only scoring.
Use real dataset field keys, evaluator IDs and a published evaluator version:

```json
{
  "schema_version": "FIELD_MAPPING_V6",
  "agent": {"input": {"source_type": "DATASET_FIELD", "field_key": "input"}},
  "evaluators": {
    "<evaluator-uuid>": {
      "input": {"source_type": "DATASET_FIELD", "field_key": "input"},
      "output": {"source_type": "AGENT_OUTPUT"},
      "execution_trace": {"source_type": "AGENT_EXECUTION_TRACE"}
    }
  }
}
```

An evaluator declaring `tool_calls` may map it to `{ "source_type": "AGENT_TOOL_CALLS" }`.
Only map variables the evaluator declares. Send the complete mapping through
`+update_run_field_mapping` with the latest lock version, validate, then start.

The process projection is `PROCESS_EVIDENCE_V1`; TE Claude A2A tool artifacts use
`TE_CLAUDE_TOOL_CALLS_V1`. Scoring requires a READY/COMPLETE/non-truncated snapshot
from the current execution epoch and limits the projection to 64 KiB. Missing,
pending or unusable evidence fails only the dependent score with a null score;
Agent status stays independent and final-output evaluators can still score.

Score `input_variables` holds resource references (`content_location=CASE_EXECUTION_TRACE`),
not full tool payloads. Inspect `+get_run_case_trace` separately. TE Claude evidence
covers recorded tool/sub-Agent calls and explicit parent-child relationships,
not hidden model reasoning, delegated internal steps, timing or cost. Preserve
redaction and completeness limits when reporting results.

See [files.md](files.md) for authenticated downloads and file readiness checks.
