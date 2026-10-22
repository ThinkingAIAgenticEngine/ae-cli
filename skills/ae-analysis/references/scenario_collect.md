# analysis scenario collect

Command: `ae-cli analysis scenario collect`. Capability: `analysis.scenario.collect`. Risk: `write`.

## Project opt-in

The source analysis project's `agent_analysis_scenario_collection_enabled` configuration defaults to `off`. Only explicit `on` permits scenario samples. Read its live value through `ae-cli project info get --project-id <id>` (`data.analysis_scenario_collection_enabled`); do not reuse a grant across scenarios or appends. The curated command checks again before sending content, without a persistent cache, and the service rechecks before emitting a sample. Ordinary invocation/intent logs remain unchanged.

The optional `--project-id` flag remains accepted for compatibility, but omission skips collection (`PROJECT_REQUIRED`). Disabled/missing/invalid configuration skips with `PROJECT_COLLECTION_DISABLED`; unavailable configuration skips with `PROJECT_COLLECTION_CONFIG_UNAVAILABLE`. A normal skip has `ok=true`, `accepted=false`, `skipped=true`, and `reason`; no scenario event is emitted. A returned `event_name` identifies the sample type, not proof of emission. Missing policy fields on an older backend are treated as disabled by the new CLI. No force override, automatic configuration writes, retry, historical backfill, or legacy-feedback bypass is permitted. `--validate` and `--dry-run` retain their side-effect-free parameter-checking contracts.

Read [append](scenario_append.md) for later user feedback and answer revisions. Both commands support `--validate` and `--dry-run`, which do not emit collection events.

## Collection only

Once a complete scenario answer is ready, collect one sample and deliver the exact captured answer. Keep the original request plus confirmed scope clarifications together in question; do not replace the original goal with the last short user message. Do not self-rate or ask for a rating. Multiple CLI data queries are one sample. Metadata/discovery/help or asset writes alone are not scenarios. An attempted failed query still qualifies when its existing call ID is available. Do not conduct extra queries just for collection.

Required flags: `--question` original request and confirmed clarifications, max8192; `--answer` exact final answer, max16384; `--query-path` an ordered JSON array of 1..64 actual CLI call references, total max20000 characters. Each step accepts only `capability_id`, at least one existing `invocation_id` or `client_request_id`, and optional short `purpose` (max256). Preserve execution order, including relevant discovery/definition calls and failed attempts; at least one step must be an attempted analysis data query. Exclude collection/feedback calls. Prefer only the actual response meta.invocation_id. If it is unavailable, use the gateway meta.client_request_id only when actually returned. The business request_id in query parameters or stderr is NOT client_request_id; never relabel it. Do not add client_request_id alongside an available invocation_id. Never invent IDs or rerun business queries just to obtain one; if no gateway ID is available, do not fabricate a reference. A revision can reuse relevant earlier calls and add new calls in their original order, without rerunning them.

Do not upload result rows, data/error excerpts, query parameters, full transcripts, credentials or private reasoning. Purpose is a short operation label, not a reasoning trace or self-evaluation. Do not summarize large result sets for collection. Existing call telemetry already records parameters/status/timing; this event only links the path. Pass decoded JSON directly to --query-path; @file syntax is not supported by this command.

`--question-id` defaults to the current Agent turn on the first collection. Preserve that original ID through clarification, queries and corrections; never use a content hash or create a new ID for each call. `--answer-id` defaults to `answer:<current-turn-id>`. The existing context file must contain agent_session_id; omit unknown model metadata. `--project-id` records the source analysis project and must be supplied to collect a sample. Preserve these identities in conversation context; use append for follow-up feedback/revisions. A genuinely separate user scenario gets a new question ID.

```bash
ae-cli analysis scenario collect --question-id '<original-user-turn-id>' \
  --question '<original question and confirmed clarifications>' \
  --answer '<exact final answer to deliver>' \
  --query-path '[{"capability_id":"analysis.report.get","invocation_id":"<definition-call-id>","purpose":"Inspect metric definition"},{"capability_id":"analysis.report_data.run","invocation_id":"<query-call-id>","purpose":"Compare requested weeks"}]' \
  --project-id 196
```

The cli_analysis_scenario event has collection_source=external_agent and query_path_json containing the ordered references. Resolve them against existing cli_gateway_call events using authenticated user/session plus invocation_id or client_request_id; verify capability_id matches and report missing, ambiguous or truncated records. No new call telemetry is introduced. A path records how the answer was obtained; it does not prove source numbers or overall correctness. A separate task follows [the evaluation guide](scenario_evaluation.md).

Existing SDK trackFirst uses authenticated user/session/question as its stable key, independent of answer wording. This is downstream deduplication, not a transactional guarantee. One distinct question_id represents one scenario; revisions and feedback are supplemental entries, not new scenarios. No collection-time good/bad label exists.

accepted=true, delivery=best_effort means endpoint acceptance, not confirmed ingestion. Do not automatically retry/login or delay business work if collection is unavailable. Do not claim it was saved on failure. This Skill needs a collection tool call before the final response because an external CLI cannot run after an arbitrary Agent's final response. It does not promise zero latency or token overhead.
