# analysis scenario append

Command: `ae-cli analysis scenario append`. Capability: `analysis.scenario.append`. Risk: `write`.

## Project opt-in

The source analysis project's `agent_analysis_scenario_collection_enabled` configuration defaults to `off`. Only explicit `on` permits scenario samples. Read its live value through `ae-cli project info get --project-id <id>` (`data.analysis_scenario_collection_enabled`); do not reuse a grant across scenarios or appends. The curated command checks again before sending content, without a persistent cache, and the service rechecks before emitting a sample. Ordinary invocation/intent logs remain unchanged.

The optional `--project-id` flag remains accepted for compatibility, but omission skips collection (`PROJECT_REQUIRED`). Disabled/missing/invalid configuration skips with `PROJECT_COLLECTION_DISABLED`; unavailable configuration skips with `PROJECT_COLLECTION_CONFIG_UNAVAILABLE`. A normal skip has `ok=true`, `accepted=false`, `skipped=true`, and `reason`; no scenario event is emitted. A returned `event_name` identifies the sample type, not proof of emission. Missing policy fields on an older backend are treated as disabled by the new CLI. No force override, automatic configuration writes, retry, historical backfill, or legacy-feedback bypass is permitted. `--validate` and `--dry-run` retain their side-effect-free parameter-checking contracts.

Append user feedback or a revised answer to the original [scenario](scenario_collect.md); never create a second scenario simply because the user corrected, challenged or clarified the original answer. No correctness rating is accepted. `--validate`/`--dry-run` do not emit entries.

Required: `--question-id` original scenario ID, `--entry-type` user_feedback or answer_revision, `--target-answer-id` actual answer being challenged/revised, and `--text` exact user message (max4096) or exact revised answer (max16384). Preserve the user's words even when you disagree. Do not classify an objection as proof of error. A new requirement or ordinary follow-up is not automatically negative feedback. If the target cannot be reliably identified, do not guess a scenario or answer ID. Preserve the text for clarification rather than misattributing it.

After any substantive reply to the same scenario (recheck, explanation, correction or scope clarification), append answer_revision even when the conclusion stays the same. This records how the Agent responded to feedback; it does not assert that the previous answer was wrong. Reuse actual earlier call references when no new query is needed. If the triggering user request was not already captured as user_feedback, pass its exact original text as --user-message (max4096) on answer_revision. This preserves neutral scope changes, ordinary explanations and refinements without calling them negative feedback. Omit this flag when the same text is already stored in user_feedback; never duplicate it. Acknowledgments such as thanks alone need no entry. For answer_revision, also supply `--query-path` as described in collect (ordered existing call references only, no query results) and a new `--answer-id` (defaults to answer:<current-turn-id>); target_answer_id still points at the old answer. Do not overwrite old answers or feedback. Feedback accepts no answer_id/query_path/user_message. `--project-id` must identify the source analysis project to append a sample. `--entry-id` defaults to current-turn-id:entry-type; preserve it on retries. It is independent of text so retries do not become new entries. If multiple distinct entries of the same type are intentionally submitted in one turn, assign distinct stable suffixes from real message identities.

```bash
ae-cli analysis scenario append --question-id '<original-question-id>' \
  --entry-type user_feedback --target-answer-id '<previous-answer-id>' \
  --text '<verbatim user objection or correction>' --project-id 196
```

cli_analysis_scenario_entry links by authenticated user + agent_session_id + question_id, and target_answer_id links the actual answer. Entry deduplication uses the same scope plus entry_id. A separate evaluator determines whether the feedback is supported and whether a later revision resolves the original problem. Preserve both versions even if the latest is correct. Collection does not validate historical ID existence; unresolved links must be marked unknown by evaluation, not treated as verified associations.

Output contains accepted, question_id, event_name and delivery. On unavailable capability, permission/auth failure or transport failure, continue normal answering; do not login, automatically retry or claim recording. accepted=true with delivery=best_effort is not ingestion proof. An older explicit standalone satisfaction command remains available but do not double-report the same collected-scenario feedback through it.
