# AI Monitor read command reference

Use `ai-monitor <resource> <action>` or `ae-cli ai-monitor <resource> <action>`. All commands are read-only against AI Monitor; exports additionally create a local file. They use the AI Monitor capability gateway and the existing CLI token lifecycle. These typed L2 commands add bounded pagination, typed fields, platform/environment resolution and safe export handling; no parallel transport or additional Skill is introduced.

## Shared flags and compatibility

Every command except `platform list` accepts `--platform <name-or-id>` and `--environment <name-or-id>`. If both are known, pass both directly. Otherwise `platform list` discovers the permitted choices. The raw compatibility flags `--data-token` (default `AE-AGENT`) and `--report-source` (default `__default__`) remain available; never mix friendly and raw scope flags. `__default__` is a concrete source, not a wildcard. No client field can override company or tenant identity.

Global options include `--host`, `--cli-token-file`, `--format json|table`, `--jq`, `--validate`, and `--dry-run`. JSON-valued flags accept inline JSON; quote it for your shell. `--validate` and `--dry-run` are mutually exclusive, and neither runs an export or diagnosis. Errors stay structured; 403 is permission denial, not a reason to try another company. New optional fields require a server advertising the corresponding capability/schema. Old commands without new flags retain their original requests. An older server can reject new commands; use `capability inspect` to inspect availability rather than retrying guessed endpoints.

Existing response fields and unknown additive fields are retained. Conversation list IDs remain `te_agent_conversation_id`; detail accepts `--conversation-id` and returns `conversation_id`. Trace list keeps its existing flattened items/page shape.

## Original seven commands

| Command | Capability | Parameters |
| --- | --- | --- |
| `platform list` | `ai_monitor.platform.list` | None |
| `trace list` | `ai_monitor.trace.list` | Date/search/filter fields below; limit 20 (1..100), offset 0; sort-by start-time/end-time/duration/total-tokens/span-count/error-span-count/recorded-costs (default start-time), sort-order asc/desc (default desc) |
| `trace count` | `ai_monitor.trace.count` | Same date/search/filter fields; no pagination or sorting |
| `trace get` | `ai_monitor.trace.get` | Required trace-id |
| `conversation list` | `ai_monitor.conversation.list` | Same date/search/filter fields; limit 20 (1..100), offset 0; sort-by trace-count/total-duration/avg-duration/max-duration/min-duration/total-token-count/prompt-token-count/completion-token-count/total-error-span-count/total-span-count/error-trace-count/start-time/end-time/recorded-costs (default start-time); sort-order asc/desc (default desc) |
| `conversation count` | `ai_monitor.conversation.count` | Same date/search/filter fields; no pagination or sorting |
| `conversation get` | `ai_monitor.conversation.get` | Required conversation-id; optional include-spans boolean (false), span-limit (20, 1..100), span-offset (0) |

`recorded-costs` sorts recorded amounts within fee-unit groups for both lists; it never sums monetary values across currencies.

Date/search fields: `--last-days` defaults to 7 (1..30); paired `--start-date/--end-date` YYYY-MM-DD override it and include both dates; `--agent/--channel` are exact; `--search` is bounded free text. The search field is not a status-message/error-text search.

## Advanced Trace and Conversation filtering

`--status` is one of `STATUS_CODE_OK`, `STATUS_CODE_ERROR`, `STATUS_CODE_UNSET`. `--user-cancelled` preserves true and false and follows explicit product cancellation semantics, independently of status. `--quality-flags` is a nonempty JSON array of formal flag names (AND). `--filter-groups` is the strict page tree below (all nodes need id; no unknown keys; at most 10 rules and one nested group level):

```json
{"id":"root","type":"group","logic":"AND","conditions":[{"id":"error","type":"rule","field":"status_code","operator":"eq","value":"STATUS_CODE_ERROR"},{"id":"duration","type":"rule","field":"duration","operator":"gte","value":10}]}
```

Group logic: AND/OR. Numeric fields: duration, input_token, output_token, total_token, span_cnt, error_span_cnt; operators eq/ne/gt/gte/lt/lte/between. For between, include value plus value1/value2; bounds must be finite and ordered. String fields: status_code, llm_model_name, te_agent_name, te_user_id, te_login_name; operators eq/ne/contains/not_contains/empty (legacy contains_any is also accepted). project_id supports eq/ne/contains/empty using a scalar string or JSON-string array; equality compares the normalized entire set. Trace and Bad Trace additionally allow client_aborted_turn_cnt/max_tokens_turn_cnt, plus cost_user_cancelled eq 0/1. Conversation filters apply to Trace rows before aggregation; no Trace-only fields in its filter tree.

Formal quality flag names:

```text
l0_trace_error
l0_step_error
l0_client_aborted
l0_model_downgraded
l0_context_pruned
l0_output_truncated
l0_empty_output
l0_no_end_turn
l1_slow
l1_expensive
l1_heavy
l2_infra_llm_error
l2_infra_instant_death
l2_infra_auth_or_license
l2_infra_upstream_down
l2_tool_error
l2_tool_param_fail
l2_tool_result_overflow
l2_tool_context_overflow
l2_tool_query_empty
l2_model_downgraded
l2_model_thinking_heavy
l2_model_output_truncated
l2_model_not_found
l2_prompt_runaway
l2_prompt_forced_stop
l2_prompt_verbose_output
l2_prompt_identity_leak
l2_arch_deep_nesting
l2_arch_tool_overload
l2_arch_mcp_unavailable
l2_arch_max_turns_hit
```

Formal Bad Trace inclusion requires L2 hits plus the page's L0/L1 abnormality predicate. Its date range filters observation pd; results select the latest observation per company/Trace. `l2_infra_instant_death` reads the formal startup-failure flag; it is not guessed from errors. Quality returns `available`, `availability` (`available`, `not_found`, or `unavailable`), per-flag boolean/null, `matched_flags`, `evidence`, and `stats_date`. `not_found`, `unavailable`, and null flags never establish a false tag. When no `quality_flags` filter is supplied, a quality-metadata lookup failure may preserve the same base rows with a `QUALITY_METADATA_UNAVAILABLE` limitation; Trace snapshots are marked `PARTIAL`. A request with `quality_flags` must fail if the formal metadata is unavailable: it never falls back to unfiltered base rows.

## New read commands

All commands below also accept the shared scope and global flags. Unmarked fields are optional; defaults and enumerations are shown for each command. CLI names use kebab-case; gateway fields and capability IDs use snake_case.

### `bad-trace list`

Capability: `ai_monitor.bad_trace.list`. List formal Bad Trace observations; dates filter warehouse observation pd, quality flags use AND.

Result: Latest observation per company/Trace with formal quality flags, evidence and pagination.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--last-days` | integer | Default 7; min: 1; max: 30 |
| `--start-date` | string | YYYY-MM-DD |
| `--end-date` | string | YYYY-MM-DD |
| `--filter-groups` | JSON object | Strict tree described above |
| `--status` | string | Choices: STATUS_CODE_OK, STATUS_CODE_ERROR, STATUS_CODE_UNSET |
| `--user-cancelled` | boolean | Optional |
| `--quality-flags` | JSON array | min items: 1; max items: 32; Formal names above; AND |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |
| `--search` | string | max characters: 500 |
| `--limit` | integer | Default 20; min: 1; max: 100 |
| `--offset` | integer | Default 0; min: 0; max: 9007199254740991 |

### `bad-trace count`

Capability: `ai_monitor.bad_trace.count`. Count formal Bad Traces with the same filters as bad_trace.list.

Result: Count and applied filters.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--last-days` | integer | Default 7; min: 1; max: 30 |
| `--start-date` | string | YYYY-MM-DD |
| `--end-date` | string | YYYY-MM-DD |
| `--filter-groups` | JSON object | Strict tree described above |
| `--status` | string | Choices: STATUS_CODE_OK, STATUS_CODE_ERROR, STATUS_CODE_UNSET |
| `--user-cancelled` | boolean | Optional |
| `--quality-flags` | JSON array | min items: 1; max items: 32; Formal names above; AND |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |
| `--search` | string | max characters: 500 |

### `bad-trace get`

Capability: `ai_monitor.bad_trace.get`. Read the latest formal Bad Trace observation in the authenticated scope.

Result: Formal Bad Trace observation and evidence, or not-found error.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--trace-id` | string | Required; max characters: 512 |

### `overview get`

Capability: `ai_monitor.overview.get`. Read dashboard metrics, trends and expensive or slow traces.

Result: Dashboard summary, trend, agents and insight evidence.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--last-days` | integer | Default 7; min: 1; max: 30 |
| `--start-date` | string | YYYY-MM-DD |
| `--end-date` | string | YYYY-MM-DD |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |

### `agent list`

Capability: `ai_monitor.agent.list`. Read Agent execution statistics and recorded costs.

Result: Current and previous period statistics plus recorded costs by Agent.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--last-days` | integer | Default 7; min: 1; max: 30 |
| `--start-date` | string | YYYY-MM-DD |
| `--end-date` | string | YYYY-MM-DD |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |

### `agent get`

Capability: `ai_monitor.agent.get`. Read execution statistics and daily trend for one Agent.

Result: Agent period metrics, daily trend and recorded costs.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--last-days` | integer | Default 7; min: 1; max: 30 |
| `--start-date` | string | YYYY-MM-DD |
| `--end-date` | string | YYYY-MM-DD |
| `--agent` | string | Required; max characters: 255 |
| `--channel` | string | max characters: 255 |

### `tool list`

Capability: `ai_monitor.tool.list`. List observed Tool execution statistics.

Result: Tool call counts, errors and latency statistics.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--last-days` | integer | Default 7; min: 1; max: 30 |
| `--start-date` | string | YYYY-MM-DD |
| `--end-date` | string | YYYY-MM-DD |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |

### `tool get`

Capability: `ai_monitor.tool.get`. Read Tool metrics, time series and error types.

Result: Tool metrics, time series and error type distribution.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--last-days` | integer | Default 7; min: 1; max: 30 |
| `--start-date` | string | YYYY-MM-DD |
| `--end-date` | string | YYYY-MM-DD |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |
| `--tool-name` | string | Required; max characters: 255 |

### `tool calls`

Capability: `ai_monitor.tool.calls`. Read paginated Tool calls and execution results.

Result: Call items, total and aggregate call statistics.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--last-days` | integer | Default 7; min: 1; max: 30 |
| `--start-date` | string | YYYY-MM-DD |
| `--end-date` | string | YYYY-MM-DD |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |
| `--limit` | integer | Default 20; min: 1; max: 100 |
| `--offset` | integer | Default 0; min: 0; max: 9007199254740991 |
| `--tool-name` | string | Required; max characters: 255 |
| `--search` | string | max characters: 255 |
| `--status-filter` | JSON array | max items: 20 |
| `--sort-by` | string | Default "start_time_unix_nano"; Choices: start_time_unix_nano, duration_ms |
| `--sort-order` | string | Default "desc"; Choices: asc, desc |

### `model list`

Capability: `ai_monitor.model.list`. List the latest model monitoring statistics.

Result: Model and Agent pairs, issue indicators and total count; latest snapshot date is returned per row.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--limit` | integer | Default 20; min: 1; max: 100 |
| `--offset` | integer | Default 0; min: 0; max: 9007199254740991 |
| `--search` | string | max characters: 255 |
| `--has-issue` | boolean | Optional |
| `--issue-type` | string | Choices: thinking_heavy, truncated, not_found |

### `model get`

Capability: `ai_monitor.model.get`. Read model summary and historical trend.

Result: Summary at stats_date (latest by default), and trend in the selected date range.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--last-days` | integer | Default 30; min: 1; max: 90 |
| `--start-date` | string | YYYY-MM-DD |
| `--end-date` | string | YYYY-MM-DD |
| `--model-key` | string | Required; max characters: 255 |
| `--agent` | string | max characters: 255 |
| `--stats-date` | string | YYYY-MM-DD |

### `model compare`

Capability: `ai_monitor.model.compare`. Compare model and Agent pairs using the monitoring summary metrics.

Result: One summary per selected model and Agent pair.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--models` | JSON array | Required; min items: 2; max items: 10; Objects: model_key required, agent optional |
| `--stats-date` | string | YYYY-MM-DD |

### `skill list`

Capability: `ai_monitor.skill.list`. List observed Skill usage statistics.

Result: Skill totals, daily Trace counts and Agent call distribution.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--last-days` | integer | Default 7; min: 1; max: 30 |
| `--start-date` | string | YYYY-MM-DD |
| `--end-date` | string | YYYY-MM-DD |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |

### `skill get`

Capability: `ai_monitor.skill.get`. Read observed usage and trend for one Skill.

Result: Skill totals, daily Trace counts and Agent call distribution.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--last-days` | integer | Default 7; min: 1; max: 30 |
| `--start-date` | string | YYYY-MM-DD |
| `--end-date` | string | YYYY-MM-DD |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |
| `--skill-name` | string | Required; max characters: 255 |

### `skill traces`

Capability: `ai_monitor.skill.traces`. Read paginated traces using a Skill.

Result: Trace items and total count.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--last-days` | integer | Default 7; min: 1; max: 30 |
| `--start-date` | string | YYYY-MM-DD |
| `--end-date` | string | YYYY-MM-DD |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |
| `--limit` | integer | Default 20; min: 1; max: 100 |
| `--offset` | integer | Default 0; min: 0; max: 9007199254740991 |
| `--skill-name` | string | Required; max characters: 255 |
| `--sort-by` | string | Default "start_time"; Choices: duration, token_count_total, span_cnt, error_span_cnt, start_time, end_time |
| `--sort-order` | string | Default "desc"; Choices: asc, desc |

### `cost summary`

Capability: `ai_monitor.cost.summary`. Read Token cost summary. Uses a [start, end) interval, maximum 90 days.

Result: Existing cost analysis payload including metric version, coverage and warnings where available.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--start` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--end` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--project-ids` | JSON array | max items: 50 |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |

### `cost trend`

Capability: `ai_monitor.cost.trend`. Read Token consumption trend. Uses a [start, end) interval, maximum 90 days.

Result: Existing cost analysis payload including metric version, coverage and warnings where available.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--start` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--end` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--project-ids` | JSON array | max items: 50 |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |

### `cost actual-summary`

Capability: `ai_monitor.cost.actual_summary`. Read recorded monetary cost summary. Uses a [start, end) interval, maximum 90 days.

Result: Existing cost analysis payload including metric version, coverage and warnings where available.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--start` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--end` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--project-ids` | JSON array | max items: 50 |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |

### `cost actual-trend`

Capability: `ai_monitor.cost.actual_trend`. Read recorded monetary cost trend. Uses a [start, end) interval, maximum 90 days.

Result: Existing cost analysis payload including metric version, coverage and warnings where available.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--start` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--end` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--project-ids` | JSON array | max items: 50 |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |

### `cost actual-change`

Capability: `ai_monitor.cost.actual_change`. Compare recorded monetary cost with the previous equal period. Uses a [start, end) interval, maximum 90 days.

Result: Existing cost analysis payload including metric version, coverage and warnings where available.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--start` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--end` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--project-ids` | JSON array | max items: 50 |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |

### `cost insight`

Capability: `ai_monitor.cost.insight`. Read the existing cost overview insight. Uses a [start, end) interval, maximum 90 days.

Result: Existing cost analysis payload including metric version, coverage and warnings where available.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--start` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--end` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--project-ids` | JSON array | max items: 50 |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |

### `cost value-health`

Capability: `ai_monitor.cost.value_health`. Read usage value and technical health indicators. Uses a [start, end) interval, maximum 90 days.

Result: Existing cost analysis payload including metric version, coverage and warnings where available.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--start` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--end` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--project-ids` | JSON array | max items: 50 |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |

### `cost distribution`

Capability: `ai_monitor.cost.distribution`. Read Trace cost and Token distributions. Uses a [start, end) interval, maximum 90 days.

Result: Existing cost analysis payload including metric version, coverage and warnings where available.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--start` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--end` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--project-ids` | JSON array | max items: 50 |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |

### `cost subject-change`

Capability: `ai_monitor.cost.subject_change`. Read subject cost changes against the previous equal period. Uses a [start, end) interval, maximum 90 days.

Result: Existing cost analysis payload including metric version, coverage and warnings where available.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--start` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--end` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--project-ids` | JSON array | max items: 50 |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |

### `cost rankings`

Capability: `ai_monitor.cost.rankings`. Rank subjects by Token consumption.

Result: Subject rankings, effective subject and coverage metadata.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--start` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--end` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--project-ids` | JSON array | max items: 50 |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |
| `--subject` | string | Required; Choices: user, agent, actual_model, primary_model |
| `--limit` | integer | Default 10; min: 1; max: 50 |

### `cost subject-rankings`

Capability: `ai_monitor.cost.subject_rankings`. Read paginated subject consumption rankings by cost or Token.

Result: Ranking items and service pagination metadata.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--start` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--end` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--project-ids` | JSON array | max items: 50 |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |
| `--dimension` | string | Required; Choices: user, agent, primary_model, trace |
| `--metric` | string | Required; Choices: cost, token |
| `--limit` | integer | Default 10; min: 1; max: 50 |
| `--page` | integer | min: 1; max: 1000000 |

### `cost subject-get`

Capability: `ai_monitor.cost.subject_get`. Read cost metrics for a subject.

Result: Subject metrics, peer comparison and value health.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--start` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--end` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--project-ids` | JSON array | max items: 50 |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |
| `--subject` | string | Required; Choices: user, agent, actual_model, primary_model |
| `--subject-key` | string | Required; max characters: 255 |

### `cost attribution`

Capability: `ai_monitor.cost.attribution`. Read cost attribution and supporting Trace evidence for a subject.

Result: Attribution drivers, associations, evidence and coverage.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--start` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--end` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--project-ids` | JSON array | max items: 50 |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |
| `--subject` | string | Required; Choices: user, agent, actual_model, primary_model |
| `--subject-key` | string | Required; max characters: 255 |

### `cost driver-get`

Capability: `ai_monitor.cost.driver_get`. Read existing drilldown evidence for a cost attribution driver.

Result: Driver evidence and availability; this does not start AI analysis.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--start` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--end` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--project-ids` | JSON array | max items: 50 |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |
| `--subject` | string | Required; Choices: user, agent, actual_model, primary_model |
| `--subject-key` | string | Required; max characters: 255 |
| `--driver-id` | string | Required; Choices: turn_cnt, llm_span_cnt, tool_cnt, tool_span_cnt, tool_error_span_cnt, max_request_messages_count, max_context_size_chars, trace_input_chars, llm_output_chars, thinking_output_chars, max_tokens_rate, subagent_rate, max_agent_depth, model_mismatch_rate, context_pruned_rate, client_aborted_rate, tracker_recovered_rate |

### `cost trace-cost`

Capability: `ai_monitor.cost.trace_cost`. Read Trace cost overview, optionally for one Agent.

Result: Trace cost overview and metric coverage.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--start` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--end` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--project-ids` | JSON array | max items: 50 |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |
| `--agent-key` | string | max characters: 255 |

### `cost change`

Capability: `ai_monitor.cost.change`. Compare Token consumption with the previous equal [start, end) period.

Result: Period summaries, decomposition and behavior drivers.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--start` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--end` | string | Required; Date or ISO timestamp with timezone; [start,end), max 90 days |
| `--project-ids` | JSON array | max items: 50 |
| `--agent` | string | max characters: 255 |
| `--channel` | string | max characters: 255 |
| `--directions` | string | Default "both"; Choices: increase, both |
| `--execution-status` | string | Choices: final |

### `cost report-list`

Capability: `ai_monitor.cost.report_list`. List the current account’s existing cost analysis reports.

Result: Owned cost analysis cases with run status, summary and pagination.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--limit` | number | Default 20; Choices: 10, 20, 50 |
| `--offset` | integer | Default 0; min: 0; max: 9999999 |
| `--keyword` | string | max characters: 80 |
| `--status` | string | Choices: pending, running, completed, failed, cancelled |
| `--period-start` | string | YYYY-MM-DD |
| `--period-end` | string | YYYY-MM-DD |

### `cost report-get`

Capability: `ai_monitor.cost.report_get`. Read an existing owned cost analysis report.

Result: Run progress, frozen range and compatible report; no new analysis is started.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--case-id` | string | Required; max characters: 512 |
| `--run-id` | string | Required; max characters: 512 |

### `security overview`

Capability: `ai_monitor.security.overview`. Read security audit overview for the selected company.

Result: Risk totals, categories and recent tasks.

No command-specific parameters.

### `security issues`

Capability: `ai_monitor.security.issues`. List security issues using the existing cursor pagination.

Result: Issue items, has_more and next_cursor.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--limit` | integer | Default 20; min: 1; max: 100 |
| `--decision` | string | Choices: pending, confirmed, false_positive |
| `--rule-key` | string | max characters: 255 |
| `--before-last-seen-at` | string | Optional |
| `--before-issue-id` | string | max characters: 512 |

### `security issue-get`

Capability: `ai_monitor.security.issue_get`. Read a security issue and recent findings and reviews.

Result: Issue details, recent findings and reviews.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--issue-id` | string | Required; max characters: 512 |

### `security issue-findings`

Capability: `ai_monitor.security.issue_findings`. Read additional findings for a security issue.

Result: Finding items and next_cursor.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--issue-id` | string | Required; max characters: 512 |
| `--limit` | integer | Default 20; min: 1; max: 100 |
| `--before-occurred-at` | string | Optional |
| `--before-finding-id` | string | max characters: 512 |

### `security evidence`

Capability: `ai_monitor.security.evidence`. Read security finding evidence and source availability.

Result: Finding details, evidence and source Trace availability.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--task-finding-id` | string | Required; max characters: 512 |

### `security tasks`

Capability: `ai_monitor.security.tasks`. List existing security audit tasks.

Result: Task items, list snapshot and next cursor.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--limit` | integer | Default 20; min: 1; max: 100 |
| `--list-snapshot-at` | string | Optional |
| `--before-created-at` | string | Optional |
| `--before-task-id` | string | max characters: 512 |

### `security task-get`

Capability: `ai_monitor.security.task_get`. Read security audit task progress and detail.

Result: The existing task detail DTO.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--task-id` | string | Required; max characters: 512 |

### `security task-traces`

Capability: `ai_monitor.security.task_traces`. Read paginated traces in an existing security task.

Result: Task Trace items and next ordinal cursor.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--task-id` | string | Required; max characters: 512 |
| `--limit` | integer | Default 20; min: 1; max: 100 |
| `--after-ordinal` | integer | min: 0; max: 9007199254740991 |

### `security task-findings`

Capability: `ai_monitor.security.task_findings`. Read risk traces and findings in an existing task.

Result: Risk Trace items with findings and next ordinal cursor.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--task-id` | string | Required; max characters: 512 |
| `--limit` | integer | Default 20; min: 1; max: 100 |
| `--after-ordinal` | integer | min: 0; max: 9007199254740991 |
| `--trace-id` | string | max characters: 512 |

### `security rules`

Capability: `ai_monitor.security.rules`. List security detection rules and effective bindings.

Result: Rule items, total and pagination.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--page` | integer | Default 1; min: 1; max: 9007199254740991 |
| `--limit` | integer | Default 20; min: 1; max: 100 |
| `--status` | string | Default "all"; Choices: all, enabled, disabled |
| `--query` | string | max characters: 255 |

### `security rule-get`

Capability: `ai_monitor.security.rule_get`. Read a detection rule and its effective binding.

Result: Rule definition and selected scope binding.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--rule-key` | string | Required; max characters: 255 |

### `diagnosis list`

Capability: `ai_monitor.diagnosis.list`. Read paginated diagnosis task history in one data scope.

Result: Task summaries and best-effort pagination; no new diagnosis is started.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--limit` | integer | Default 20; min: 1; max: 100 |
| `--offset` | integer | Default 0; min: 0; max: 9007199254740991 |
| `--entity-type` | string | Choices: trace, conversation, tool, prompt, global |
| `--entity-key` | string | max characters: 512 |

### `diagnosis queue`

Capability: `ai_monitor.diagnosis.queue`. Read queued and running diagnosis tasks.

Result: Task summaries, queue positions, and pagination.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--limit` | integer | Default 20; min: 1; max: 100 |
| `--offset` | integer | Default 0; min: 0; max: 9007199254740991 |

### `diagnosis get`

Capability: `ai_monitor.diagnosis.get`. Read one diagnosis task state without starting or retrying it.

Result: Public task state, current step, queue position and errors.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--task-id` | string | Required; max characters: 512 |

### `diagnosis report`

Capability: `ai_monitor.diagnosis.report`. Read the latest existing diagnosis report for an entity.

Result: Latest report or null when no report exists; never starts a model request.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--entity-type` | string | Default "global"; Choices: trace, conversation, tool, prompt, global |
| `--entity-key` | string | max characters: 512 |

### `investigation modes`

Capability: `ai_monitor.investigation.modes`. List supported investigation modes and sample requirements.

Result: Analysis mode definitions for the selected entity type.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--entity-type` | string | Default "trace"; Choices: trace, agent, model, tool, conversation, skill, cost_analysis |

### `investigation list`

Capability: `ai_monitor.investigation.list`. List accessible investigation cases in one data scope.

Result: Case summaries and best-effort pagination, respecting owner and scope visibility.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--limit` | integer | Default 20; min: 1; max: 100 |
| `--offset` | integer | Default 0; min: 0; max: 9007199254740991 |
| `--entity-type` | string | Choices: trace, agent, model, tool, conversation, skill, cost_analysis |
| `--status` | string | Choices: pending, running, completed, failed, cancelled |
| `--analysis-mode` | string | max characters: 512 |
| `--search` | string | max characters: 500 |
| `--agent` | string | max characters: 255 |

### `investigation get`

Capability: `ai_monitor.investigation.get`. Read one accessible investigation case.

Result: Case details, selection, and optionally its existing runs.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--case-id` | string | Required; max characters: 512 |
| `--include-runs` | boolean | Default false |

### `investigation runs`

Capability: `ai_monitor.investigation.runs`. List existing runs for an accessible investigation case.

Result: Run summaries and pagination.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--limit` | integer | Default 20; min: 1; max: 100 |
| `--offset` | integer | Default 0; min: 0; max: 9007199254740991 |
| `--case-id` | string | Required; max characters: 512 |

### `investigation run-get`

Capability: `ai_monitor.investigation.run_get`. Read a specific investigation run and its existing result.

Result: Run status, progress, result, completeness and errors; no run is created.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--case-id` | string | Required; max characters: 512 |
| `--run-id` | string | Required; max characters: 512 |

### `trace export`

Capability: `ai_monitor.trace.export`. Export a bounded batch of traces with spans and a result manifest.

Result: A base64 ZIP archive with SHA-256, byte length and a per-trace manifest. Partial failures remain explicit.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--trace-ids` | JSON array | Required; min items: 1; max items: 100 |

`--output <new-file.zip>` is required and local-only. Exclusive creation, mode 0600, SHA-256/length validation; stdout omits base64. Validate/dry-run never create a file. Check the manifest for partial failures.

### `conversation export`

Capability: `ai_monitor.conversation.export`. Export conversations and all their trace spans within export limits.

Result: A base64 ZIP archive with SHA-256, byte length and per-conversation/trace completeness. At most 200 traces per batch.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--conversation-ids` | JSON array | Required; min items: 1; max items: 20 |

`--output <new-file.zip>` is required and local-only. Exclusive creation, mode 0600, SHA-256/length validation; stdout omits base64. Validate/dry-run never create a file. Check the manifest for partial failures.

### `model agent-channels`

Capability: `ai_monitor.model.agent_channels`. Read model usage by Agent and Channel over a window ending at the latest data date.

Result: Agent and Channel usage, errors and latency; latest-date window semantics match the model page.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--model-key` | string | Required; exact observed model key |
| `--last-days` | number | Default 30; min 1; max 90; anchored to latest data day, not start-date/end-date |
| `--limit` | number | Default 50; min 1; max 100 |

### `model traces`

Capability: `ai_monitor.model.traces`. Read model-related bad traces over a window ending at the latest data date.

Result: Bad Trace items and total count with model issue evidence.

| Flag | Type | Requirement / bounds |
| --- | --- | --- |
| `--model-key` | string | Required; exact observed model key |
| `--last-days` | number | Default 30; min 1; max 90; anchored to latest data day, not start-date/end-date |
| `--limit` | number | Default 20; min 1; max 100 |
| `--offset` | number | Default 0; min 0 |

## Pagination, task and evidence boundaries

- Offset pages: reuse the same filters; live data is BEST_EFFORT and can move between requests. List/count share filtering but are not an atomic snapshot.
- Security issue cursors pair before-last-seen-at/before-issue-id; finding cursors pair before-occurred-at/before-finding-id; task cursors pair before-created-at/before-task-id and retain list-snapshot-at. Use returned values exactly. task-findings trace-id and after-ordinal are mutually exclusive.
- Diagnosis history requires entity-type/entity-key together when either is used. Diagnosis report defaults to global; other types require entity-key. Read tasks do not enqueue jobs; report null means no existing report.
- Investigation case state and selected run state differ. Inspect run-get using both IDs. Human Bad/Good sample roles are not automatic Bad Trace flags.
- Cost core queries use [start,end), not inclusive end dates. cost report-list uses paired inclusive historical period-start/period-end. model list always reads the latest snapshot.
- Conversation get without span flags remains the previous request. With spans, read trace_failures, spans_page, spans_completeness and spans_limitations; PARTIAL/PAGINATED calls for another page, not a silent completeness claim.
- Export batches retain per-item failures. A successfully saved ZIP does not mean every requested item was available. Never infer startup root cause from generic Operation aborted or summary error counts.
