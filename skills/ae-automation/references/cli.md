# Automation command contract

Transition status: transitional
Owning module: te-claude automation and team scheduling
Current transport: authenticated TE REST /api/cli/automation/v1
Gateway target: TBD (automation lifecycle)
Review after: 2026-12-15
Exit condition: equivalent gateway capabilities preserve permissions, idempotency, typed configuration and read-only results.

## Discovery and management

- `ae-cli automation list [--agent-space-id ID] [--target-type agent|team] [--q NAME] [--status active|paused] [--limit 20] [--cursor CURSOR]`
- `ae-cli automation get --id ID`
- `ae-cli automation create --target-type agent --agent-id ID --name NAME --message TEXT --schedule-kind daily --time 09:00 [--model MODEL_CONFIG_ID] [--reuse-conversation true|false]`
- `ae-cli automation create --target-type team --team-id ID --name NAME --message TEXT --trigger-type manual [--scope JSON] [--channels JSON_ARRAY]`
- `ae-cli automation update --id ID --target-type agent|team <changed fields>`
- `ae-cli automation enable|disable --id ID`
- `ae-cli automation delete --id ID --yes`

Scheduled creation needs `--schedule-kind` or `--cron-expression`. Frequencies: hourly with `--minute 0..59`; daily with `--time HH:mm`; weekly also `--weekday 0..6`; monthly also `--day-of-month 1..28`. Times use the server timezone. Manual creation does not require a schedule. `--trigger-immediately` executes after creation; `--wait` then waits for that execution. Creation and immediate execution have separate results: do not create another automation if only its execution failed.

On update, omitted fields retain their values. `--model null`, `--scope null`, destination IDs set to `null`, and `--save-to-knowledge-base-id null` clear nullable fields. `--channels '[]'` clears notifications; `--clear-message` clears instructions; `--reuse-conversation false` disables reuse. An automation's target is immutable on update. Team fields are rejected for Agent targets and vice versa.

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
