> **Current synchronization (2026-10-21):** 121 business commands cover the 126-operation platform contract excluding five health/session operations. See [synchronization review](evaluation-platform-drift-2026-10-21.md). New operations use hierarchical kebab-case commands; existing + commands remain compatible.

# Evaluation Domain Full API Coverage (2026-08-20)

> **Superseded (2026-09-18):** the 2026-09-12 sync brought the domain from 75 to 108 commands. The next synchronization added transactional Dataset field/case batch creation, bringing the current business-command total to 110, plus Run case sampling, optional TE Claude catalog credentials, and `MODEL_PARAMETERS_V2` guidance. Contract assertions live in `tests/evaluation-command-contract.test.ts`.

This change expanded the `ae-cli evaluation` domain from 22 commands to 77, closing every workflow gap between the CLI and the agent-test platform's HTTP API surface at the time. The CLI exposed 75 commands afterwards because pre-generated-output imports and `IMPORTED_OUTPUT` runs were retired in favor of the live-agent workflow. All request/response shapes were extracted from the platform source (`~/agent-test/apps/server/internal/transport/http/*.go`), not guessed.

## Background

A hands-on session (creating and running a content-safety evaluation end to end) exposed that the CLI covered reads plus run start, but none of the configuration, mutation, or lifecycle routes. Three workflow dead-ends were hit directly:

1. Binding evaluators to a run (required before start) had no command - `EVALUATOR_NOT_ACTIVE` on `+start_run`.
2. Setting result filter fields (required before start, even when empty) had no command - `RESULT_FILTER_FIELD_UNAVAILABLE`.
3. Setting field mapping after creation had no command - `FIELD_MAPPING_INCOMPLETE`.

An audit against the platform router then enumerated all remaining gaps; this change implements all of them.

## What was added

### Run domain (9 commands)

| Command | Route | Notes |
|---|---|---|
| `+update_run` | `PATCH /evaluation-runs/{id}` | Draft updates without recreating. |
| `+delete_run` | `DELETE /evaluation-runs/{id}` | DRAFT runs only. high-risk-write. |
| `+select_run_evaluators` | `PUT /evaluation-runs/{id}/evaluators` | Bind active evaluators; start prerequisite. |
| `+update_run_field_mapping` | `PUT /evaluation-runs/{id}/field-mapping` | Start prerequisite. |
| `+update_run_result_filter_fields` | `PUT /evaluation-runs/{id}/result-filter-fields` | Start prerequisite, including an explicit empty field list. |
| `+validate_run` | `POST /evaluation-runs/{id}/validate` | Same preflight as start, without starting. |
| `+list_run_evaluators` | `GET /evaluation-runs/{id}/evaluators` | Per-evaluator progress and score counts. |
| `+get_run_case` | `GET /evaluation-runs/{id}/cases/{caseRunId}` | Full case detail: input/output/scores/reasons. |
| `+export_run_low_scores` | `POST /evaluation-runs/{id}/low-score-export` | Requires `--max-score`; same filters as `+run_cases`. |

### Dataset domain (16 commands)

- Import observability: `+dataset_import_status`, `+dataset_import_errors` (the async import pipeline was previously a black box after the 202 return).
- Lifecycle: `+update_dataset`, `+delete_dataset` (high-risk), `+transfer_dataset_owner` (high-risk), `+export_dataset`.
- Fields: `+list_dataset_fields`, `+create_dataset_field`, `+batch_create_dataset_fields`, `+update_dataset_field`, `+delete_dataset_field` (high-risk), `+reorder_dataset_fields`.
- Cases: `+list_dataset_cases`, `+get_dataset_case`, `+create_dataset_case`, `+batch_create_dataset_cases`, `+update_dataset_case`, `+delete_dataset_case` (high-risk).
- Locking: field mutations use the dataset lock_version; case mutations use the per-case lock_version from `+get_dataset_case`.

### Credentials (9 commands) - previously absent entirely

`+list_credentials`, `+get_credential`, `+create_credential`, `+update_credential`, `+rotate_credential`, `+disable_credential`, `+enable_credential`, `+delete_credential` (high-risk), `+transfer_credential_owner` (high-risk). Secrets are write-only: `sensitive` flag on input, redacted in `--dry-run`, never returned by the platform.

### Model configs (5 commands)

`+create_model_config`, `+update_model_config` (full-replace; e.g. raise `timeout_ms`), `+delete_model_config` (high-risk), `+test_model_config_connectivity`, `+transfer_model_config_owner` (high-risk). New `--parameters-json` values use `MODEL_PARAMETERS_V2`, which delegates output limits to the provider; capabilities use `MODEL_CAPABILITIES_V1`.

### Agents (6 commands)

`+create_agent`, `+update_agent` (full-replace), `+delete_agent` (high-risk), `+test_agent_connectivity`, `+agent_snapshot_preview`, `+transfer_agent_owner` (high-risk). `--input-schema-json` / `--config-json` pass `AGENT_INPUT_SCHEMA_V1` / `AGENT_CONFIG_V*` through; `+get_agent` on a working agent is the template.

### Evaluators and templates (7 commands)

`+create_evaluator` (ACTIVE with model config, draft without), `+update_evaluator`, `+delete_evaluator` (high-risk), `+transfer_evaluator_owner` (high-risk), `+list_evaluator_templates`, `+create_evaluator_template`, `+disable_evaluator_template` (high-risk).

### Schedules

`+update_schedule`.

## Supporting changes

- `src/commands/evaluation/shared.ts`: new `lockVersionFlag` / `idAndLockFlags` helpers used by all lock-version mutations.
- `src/framework/output.ts`: `--jq` now treats an undefined payload (HTTP 204 no-content) as jq `null` input instead of failing with "Invalid --jq expression".
- `export-dataset`: flag is `--export-format` because `--format` collides with the global output flag.
- `scripts/verify-evaluation-tools.mjs`: expected count 22 -> 77; now 75 after retiring offline evaluation-set imports.
- `skills/ae-evaluation/SKILL.md`: rewritten for the full command set (v2.0.0), including the corrected run-start workflow (evaluators + field mapping + result filter fields are all start prerequisites) and a bring-your-own-model walkthrough.

## Risk model

- `read`: gets/lists, `+validate_run`, connectivity tests (they send a probe request but mutate nothing).
- `write`: creates, updates, binds, exports, enable/disable/rotate.
- `high-risk-write` (confirmation unless `--yes`): all deletes, all transfer-owner (permission changes), `+delete_schedule`, template disable.

## Verification

- `npm run build` green; `npm test` smoke passed.
- `npm run verify:evaluation-tools`: 75 commands registered and aligned with `evaluation --help`.
- `--dry-run` spot checks for `+validate_run`, `+export_dataset`, `+update_run_field_mapping` produce the expected method/URL/body.
- Live checks against a local agent-test service: `+list_dataset_fields`, `+dataset_import_status`, `+list_run_evaluators`, `+list_credentials`, `+list_evaluator_templates` return correct data; `+validate_run` on a started run correctly returns `RUN_ALREADY_STARTED`.

## Known platform behaviors encoded in flag docs

- Start prerequisites fail with distinct codes: `EVALUATOR_NOT_ACTIVE`, `FIELD_MAPPING_INCOMPLETE`, `RESULT_FILTER_FIELD_UNAVAILABLE` (an explicit empty `fields` array satisfies the last one).
- `MODEL_CONFIG_INVALID` unless capabilities set `chat_completions: true` and `max_context_tokens >= 1`.
- Model-config/agent updates are full-replace; the CLI docs instruct `+get_*` first and pass every field back.
