# Automation command contract

Shared workspace automations require an enabled company Team. Personal Teams can be used in personal workspaces. Validate the saved workspace and target in the server dry-run.

Transition status: transitional
Owning module: te-claude automation and team scheduling
Current transport: authenticated TE REST /api/cli/automation/v1
Gateway target: TBD (automation lifecycle)
Review after: 2026-12-15
Exit condition: equivalent gateway capabilities preserve permissions, idempotency, typed configuration and read-only results.

## Discovery and management

- `ae-cli automation list [--agent-space-id ID] [--target-type agent|team] [--q NAME] [--status active|paused] [--limit 20] [--cursor CURSOR]`
- `ae-cli automation get --id ID`
- `ae-cli automation create --target-type agent --agent-id ID --name NAME --message TEXT --schedule-kind daily --time 09:00 [--model MODEL_CONFIG_ID] [--effort adaptive|low|medium|high|max] [--reuse-conversation true|false]`
- `ae-cli automation create --target-type team --team-id ID --name NAME --message TEXT --trigger-type manual [--scope JSON] [--channels JSON_ARRAY]`
- `ae-cli automation update --id ID --target-type agent|team <changed fields>`
- `ae-cli automation enable|disable --id ID`
- `ae-cli automation delete --id ID --yes`

Scheduled creation needs `--schedule-kind` or `--cron-expression`. Frequencies: hourly with `--minute 0..59`; daily with `--time HH:mm`; weekly also `--weekdays '[1,3,5]'` (0=Sunday through 6=Saturday); monthly also `--days-of-month '[1,15,31]'` (integers 1–31 and `"L"` for the actual last day of the month). Existing single-day flags `--weekday 0..6` and `--day-of-month 1..31` remain supported; do not combine a single-day flag with its plural array. Arrays must be non-empty; duplicates are removed and dates sorted. Dates absent in the current month are skipped, never shifted into the next month. `"L"` follows the actual month end in the server timezone (including leap years). It can be selected alone or with numeric dates; overlapping selections at the same time run only once. Any minute 00–59 is valid in `--time`. Times use the server timezone. Manual creation does not require a schedule. `--trigger-immediately` executes after creation; `--wait` then waits for that execution. Creation and immediate execution have separate results: do not create another automation if only its execution failed.

On update, omitted fields retain their values. `--model null`, `--scope null`, destination IDs set to `null`, and `--save-to-knowledge-base-id null` clear nullable fields. `--channels '[]'` clears notifications; `--clear-message` clears instructions; `--reuse-conversation false` disables reuse. An automation's target is immutable on update. Target-specific fields are rejected on the other target, except for `--effort` on Team automations.

For a single Agent, `--effort` accepts `adaptive`, `low`, `medium`, `high`, or `max`. Omit it on create for adaptive reasoning. Omit it on update to keep the saved depth, or pass `--effort adaptive` to clear an override. Verify the saved `effort` with `automation get` (`null` means adaptive). Never infer a depth from the current chat.

For an Agent Team, ignore any `--effort` value before validating the other fields. Create or update with the remaining settings. An update containing only `--effort` verifies the existing target and update permission and returns `unchanged: true` without writing. Preflight and successful command results identify an explicit Team depth in `ignoredFields: ["effort"]`. An effort-only success means the team kept its own settings. For a mixed update, report the saved changes and the ignored depth. Report permission and validation errors from their error envelope.

Team configuration supports `--scope`, `--channels`, `--feishu-chat-id`, `--lark-chat-id`, `--slack-channel-id`, `--save-to-knowledge-base-id`. Other supported notification channels use the team's existing notification configuration. Team visibility and management permissions follow the Web application.

`--dry-run` returns a redacted local request preview plus the server preflight result. The preflight applies the same authentication, space, schema, permissions, target state, run state, field applicability and idempotency checks as execution, but does not write data, create or cancel runs, or emit product events. A later real request validates current state again.

Disable stops future schedules and leaves the current execution running. Stop cancels one execution and leaves the schedule enabled. Delete soft-deletes the automation and cancels active execution.

Delete and stop are high-risk writes. Interactive shells ask for confirmation. Non-interactive shells require global `--yes` and otherwise exit with `CONFIRMATION_REQUIRED` before sending a request.

## Executions and results

```bash
ae-cli automation run --id ID --command-id REQUEST_ID
ae-cli automation runs list --id ID --limit 20
ae-cli automation runs get --id ID --run-id RUN_ID
ae-cli automation runs result --id ID --run-id RUN_ID
ae-cli automation runs stop --id ID --run-id RUN_ID --yes
ae-cli automation runs retry --id ID --run-id FAILED_RUN_ID --command-id REQUEST_ID --wait --timeout 300
```

Retry creates a new complete execution from current configuration after failure or cancellation. It retains the original result and returns a new run ID with a source reference. It does not resume failed steps or erase the old run.

`--command-id` makes run/retry repeatable after uncertain responses. Within each target type, reuse the same value for the same request; changing its automation ID or source run produces a conflict. Preserve the generated command ID from output or an error hint. A network timeout is not proof that execution was rejected.

Without `--wait`, success means accepted. With `--wait`, output includes completion or timeout information; timeout preserves the run ID and does not restart or cancel the execution. Read the same result later. If polling fails, the accepted response and identifiers remain available with an `observation` error; query that run instead of triggering again. `partial_success` is distinct from success. Result availability is `pending`, `available`, `empty` or `unavailable`; missing historical links are not replaced with newer output.

`--format json` produces scriptable envelopes; `--format table` is available for interactive inspection. Full conversations, tool traces and terminal continuation are outside this interface. URLs are optional Web references and contain no credentials. The CLI does not automatically open a browser.

## Compatibility

The retired Agent-domain automation commands are unavailable. Use the `automation` domain for the complete lifecycle, including teams.

## Shared result notifications and identity

Agent and Agent Team both accept `--channels '["feishu","slack"]'`, `--feishu-chat-id`, `--lark-chat-id` and `--slack-channel-id`. Supported channels: `feishu`, `lark`, `slack`, `discord`, `dingtalk`, `wecom`, `mattermost`, `google_chat`, `zoom_chat`, `whatsapp`. Availability and destination permissions are validated by the server. Omitted update fields keep the existing values; `--channels '[]'` disables external delivery, and a receiver value of `null` clears that override. Results remain available in the application.

Automation requests use the current user's `cli-token`, including in a shared sandbox. They do not infer an owner from `SandboxUser` or fall back to a different member. `--agent-space-id` takes precedence over `TE_AGENT_CURRENT_AGENT_SPACE_ID` or the current AgentSpace working directory. When the shell has changed directories, `TE_AGENT_CONVERSATION_ID` resolves the space through the existing authenticated workspace target API; a resolution failure never falls back to the personal space. Membership and write permissions are enforced by the server.

For conversational creation, keep the supplied prompt editable until the user sends it. Resolve missing or ambiguous targets, then run `automation create --dry-run` and present the complete draft. Wait for the user to approve that specific preview before the real create, including paused tasks. Each new task in the same chat and each revised configuration requires a fresh preview and confirmation. A clarification or an earlier approval does not authorize this write. After saving, share the complete `detailPath` returned by `automation get`, including the space query. A single Agent inherits its model unless explicitly overridden. Include its reasoning depth (adaptive by default) in the confirmation and ask only about ambiguous or conflicting depth requests. For an Agent Team, ignore any requested depth and state that the team uses its own settings. Omit `--trigger-immediately` unless the user requests an immediate run.

## Multi-date examples

```bash
ae-cli automation create --target-type agent --agent-id ID --name "Weekly report" --message "Summarize the latest metrics" --schedule-kind weekly --weekdays '[1,3,5]' --time 09:17
ae-cli automation update --id ID --target-type team --schedule-kind monthly --days-of-month '[1,15,"L"]' --time 18:59
```

Each schedule has one execution time. Select `[1,2,3,4,5]` for Monday–Friday or `[0,6]` for weekends; these are weekdays, not a regional holiday calendar. Five-field cron accepts equivalent comma-separated weekday or month-day lists, such as `17 9 * * 1,3,5` and `59 18 1,15,L * *`. `L` is supported only in the month-day field. Ranges, steps and multiple execution times are not supported. `get` returns the saved `cronExpression` and notification configuration. On a scheduled active task, `nextRunAt`, `scheduleTimeZone` and `serverUtcOffset` describe the server's next execution.
