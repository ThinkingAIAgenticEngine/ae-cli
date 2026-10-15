# analysis feedback submit

Command: `ae-cli analysis feedback submit`.
Capability id: `analysis.feedback.submit`.
Risk: `write`. Supports `--validate` and `--dry-run`; neither emits a feedback event.

## Trigger

Only after an analysis data query has completed and the Agent has delivered its final business analysis answer, ask once in the user's language whether the analysis met expectations. A successful empty result with an explanation is eligible. Individual tool calls, discovery, metadata inspection, asset governance, asset writes, configuration, help and unrelated questions are not triggers. Query submission, running exports, permission errors and failed queries are not completed analysis results. Do not ask after each CLI call or intermediate analysis step.

No feedback means no submit command, event, case creation or answer upload. Submit only an explicit user evaluation of the completed analysis. A follow-up question, new requirement, silence or a topic change is not a rating. If the target is ambiguous, do not guess. A spontaneous explicit evaluation of a completed analysis can also be submitted without repeating the question.

## Input and correlation

- `--query-completed`: confirms that results and the final analysis answer have already been delivered.
- `--query-capability-id`: one actual analysis data-query capability executed in the evaluated turns, such as `analysis.report_data.run`, `analysis.adhoc.run`, or a completed export. Never substitute asset discovery or writes.
- `--satisfaction`: `satisfied`, `partially_satisfied`, `dissatisfied`, or `unable_to_judge`, based solely on the explicit user evaluation.
- `--feedback-text`: original user feedback, up to 2048 characters.
- `--target-turn-ids`: JSON array of existing analysis turn IDs in this conversation, at most 32. Preserve all relevant turns for a multi-turn analysis and exclude the current feedback turn. Do not generate new analysis IDs. If IDs cannot be reliably recovered, omit them; the event declares session-level association and cannot identify a specific analysis path.
- `--route-summary`: optional short business-purpose and asset-selection rationale supported by the actual analysis route. Do not submit answer content, result rows, a full transcript, or private internal reasoning. The existing CLI events remain the execution evidence; omit details that cannot be verified.
- `--feedback-id`: optional stable submission ID to reuse on retries. With a current feedback turn ID, the CLI derives a stable fingerprint. If that ID is unavailable, supply and retain one feedback ID for retries.
- `--project-id`: the evaluated analysis project when available.

The CLI reads `agent_session_id` from the existing context file; the backend requires it to match the current Agent context and uses the authenticated user identity. Preserve the current feedback turn in `agent_turn_id`; do not overwrite it with the target analysis turn. On model switches, assess the analysis route using models from the linked original call events, not the model collecting feedback.

```bash
ae-cli analysis feedback submit --query-completed \
  --query-capability-id analysis.report_data.run \
  --satisfaction dissatisfied --feedback-text '<original explicit user feedback>' \
  --target-turn-ids '["<existing-analysis-turn-id>"]' --project-id 196
```

## Result and failure

The result contains `accepted`, `feedback_id`, `event_name`, `delivery` and `association_scope`. `accepted=true, delivery=best_effort` means the feedback endpoint accepted the submission; it does not prove downstream ingestion or event visibility. The dedicated `cli_analysis_feedback` event carries the rating and target turns. Reconstruct the path from `cli_gateway_call` using the same user and `agent_session_id`, then the target `agent_turn_id` values; exclude `analysis.feedback.submit` from analysis steps. Ratings produce Good/Bad candidates, not verified business-correctness labels.

Feedback is auxiliary. A submission failure must not block or delay the user's next analysis, change the completed query result, replace credentials or trigger a login just for telemetry. Preserve the feedback ID for an explicitly requested retry and do not claim it was recorded when submission failed.
