# analysis scenario get

Command: `ae-cli analysis scenario get`. Capability: `analysis.scenario.get`. Risk: `read`.

## Input

Required `--project-id`, `--open-id`, `--agent-session-id`, `--question-id`: copy the exact identity from a scenario list initial record. Requires project configuration permission, even when open-id names another user. Optional `--days` defaults to 7 (1..90); `--end-time` is the exclusive snapshot boundary. Reuse the list's days, exact end_time and explicit `--host`.

## Output

Returns `initial`, `entries`, `conflicting_records`, and `call_archive`. Answers include optional duration_ms plus calls and call_summary. See [execution evidence and presentation rules](scenario_list.md#answer-duration-and-cli-execution-detail). Missing or ambiguous references do not mean success. Async submission status and final execution_status are different. Parameters are sanitized and may be truncated; full result rows are not archived.

## Errors

Missing identity is rejected. SCENARIO_NOT_FOUND means no matching archived scenario in the chosen window, not no activity. Permission, I/O and scan-limit errors must be surfaced. Never switch company/project or use an unrestricted path to bypass a failure. validate/dry-run check input and access without scanning HDFS. This command requires the upgraded Common service; older services may report capability unavailable.
